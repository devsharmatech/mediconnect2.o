import sql from "@/lib/db";
import Razorpay from "razorpay";
import { broadcastEmitter } from "@/lib/broadcastEmitter";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";
import { getPayUConfig, generatePayUHash, buildPayUSplitRequest } from "@/lib/payu";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { broadcast_id, quote_id } = await req.json();

    if (!broadcast_id || !quote_id) {
      return failure("broadcast_id and quote_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch broadcast details
    const broadcastRows = await sql`
      SELECT * FROM medicine_order_broadcasts WHERE id = ${broadcast_id} LIMIT 1
    `;
    const broadcast = broadcastRows[0];

    if (!broadcast) {
      return failure("Broadcast not found", null, 404, { headers: corsHeaders });
    }

    if (broadcast.status === "completed") {
      // Check if there is an existing pending order that can proceed to payment
      const existingOrderRows = await sql`
        SELECT * FROM medicine_orders
        WHERE (prescription_id = ${broadcast.prescription_id} OR patient_id = ${broadcast.patient_id})
          AND status IN ('payment_pending', 'pending')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const existingOrder = existingOrderRows[0];
      if (existingOrder) {
        const quoteRows = await sql`
          SELECT q.*, cd.pharmacy_name, cd.payu_child_key, cd.payu_vendor_id
          FROM medicine_order_quotes q
          LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
          WHERE q.id = ${quote_id}
          LIMIT 1
        `;
        const quote = quoteRows[0];
        const finalAmount = parseFloat(existingOrder.total_amount);
        const payuConfig = getPayUConfig();

        let originClean = "";
        try {
          const originHdr = req.headers.get("origin") || req.headers.get("referer") || "";
          if (originHdr) originClean = new URL(originHdr).origin;
        } catch (_) {}
        const baseUrl = originClean || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const surl = `${baseUrl}/api/patients/orders/medicine/payu/response`;
        const furl = `${baseUrl}/api/patients/orders/medicine/payu/response`;

        const txnid = `PAYU_MED_${existingOrder.unid || existingOrder.id.slice(0, 8)}_${Date.now()}`;
        const formattedAmount = finalAmount.toFixed(2);
        const productinfo = `Medicine Order #${existingOrder.unid} - ${(quote?.pharmacy_name || "Pharmacy").slice(0, 50)}`;

        const patientRows = await sql`
          SELECT pd.full_name, pd.email, u.phone_number 
          FROM users u 
          LEFT JOIN patient_details pd ON pd.id = u.id 
          WHERE u.id = ${broadcast.patient_id} 
          LIMIT 1
        `;
        const patient = patientRows[0] || {};
        const firstname = (patient.full_name || "Customer").trim().split(" ")[0] || "Customer";
        const email = patient.email || "patient@mediconnect.fit";
        const phone = (patient.phone_number || broadcast.contact_phone || "9999999999").replace(/\D/g, "").slice(-10) || "9999999999";

        const hash = generatePayUHash({
          key: payuConfig.key,
          txnid,
          amount: formattedAmount,
          productinfo,
          firstname,
          email,
          udf1: String(existingOrder.id),
          udf2: String(broadcast.patient_id),
          udf3: String(quote?.chemist_id || existingOrder.chemist_id),
          udf4: String(existingOrder.unid),
          udf5: "pharmacy_order",
          salt: payuConfig.salt,
        });

        await sql`
          UPDATE medicine_orders 
          SET payu_txnid = ${txnid}, payu_status = 'initiated', updated_at = NOW() 
          WHERE id = ${existingOrder.id}
        `;

        return success("Resuming payment for existing order", {
          order: existingOrder,
          payu: {
            action_url: payuConfig.actionUrl,
            payment_params: {
              key: payuConfig.key,
              txnid,
              amount: formattedAmount,
              productinfo,
              firstname,
              email,
              phone,
              surl,
              furl,
              hash,
              udf1: String(existingOrder.id),
              udf2: String(broadcast.patient_id),
              udf3: String(quote?.chemist_id || existingOrder.chemist_id),
              udf4: String(existingOrder.unid),
              udf5: "pharmacy_order",
            }
          },
          amount: finalAmount,
          pharmacy_name: quote?.pharmacy_name || "Pharmacy",
        }, 200, { headers: corsHeaders });
      }

      return failure("An offer has already been completed for this broadcast", null, 409, { headers: corsHeaders });
    }

    // 2. Fetch the selected quote with chemist details
    const quoteRows = await sql`
      SELECT 
        q.*,
        cd.pharmacy_name,
        cd.address as chemist_address,
        cd.payment_qr_url,
        cd.payment_qr_payload,
        cd.payu_child_key,
        cd.payu_vendor_id
      FROM medicine_order_quotes q
      LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
      WHERE q.id = ${quote_id} AND q.broadcast_id = ${broadcast_id}
      LIMIT 1
    `;
    const quote = quoteRows[0];

    if (!quote) {
      return failure("Selected quote not found", null, 404, { headers: corsHeaders });
    }

    // 3. Financial calculations & SLA
    const now = new Date();
    const deliveryMins = Number(quote.delivery_time_minutes || 30);
    const promisedDeliveryAt = new Date(now.getTime() + deliveryMins * 60 * 1000);
    const warningAt = new Date(now.getTime() + Math.floor(deliveryMins * 0.8) * 60 * 1000);
    const breachAt = promisedDeliveryAt;

    const finalAmount = Number(quote.final_amount || quote.estimated_cost);
    const medicineSubtotal = Number(quote.medicine_subtotal || quote.estimated_cost);
    const deliveryCharge = Number(quote.delivery_charge || 0);
    const discount = Number(quote.discount || 0);

    // 4. Mark chosen quote as selected, others as not_selected
    await sql`
      UPDATE medicine_order_quotes 
      SET status = 'selected' 
      WHERE id = ${quote_id}
    `;

    await sql`
      UPDATE medicine_order_quotes 
      SET status = 'not_selected' 
      WHERE broadcast_id = ${broadcast_id} AND id != ${quote_id}
    `;

    // 5. Complete broadcast status
    await sql`
      UPDATE medicine_order_broadcasts 
      SET status = 'completed' 
      WHERE id = ${broadcast_id}
    `;

    try {
      broadcastEmitter.emit(`status:${broadcast_id}`, {
        status: "completed",
        selected_quote_id: quote_id,
      });
    } catch (e) {
      console.warn("Emitter warning:", e.message);
    }

    // 6. Generate sequential BIGINT UNID
    const maxUnidRows = await sql`
      SELECT COALESCE(MAX(unid), 25) + 1 AS next_unid FROM medicine_orders
    `;
    const nextUnid = maxUnidRows[0]?.next_unid || 26;

    const orderRows = await sql`
      INSERT INTO medicine_orders (
        unid,
        prescription_id,
        patient_id,
        chemist_id,
        status,
        medicine_subtotal,
        delivery_charge,
        discount,
        total_amount,
        payment_qr_url,
        payment_qr_payload,
        promised_delivery_at,
        warning_at,
        breach_at,
        sla_status,
        delivery_type,
        patient_notes,
        created_at,
        updated_at
      ) VALUES (
        ${nextUnid},
        ${broadcast.prescription_id},
        ${broadcast.patient_id},
        ${quote.chemist_id},
        'payment_pending',
        ${medicineSubtotal},
        ${deliveryCharge},
        ${discount},
        ${finalAmount},
        ${quote.payment_qr_url || null},
        ${quote.payment_qr_payload || null},
        ${promisedDeliveryAt},
        ${warningAt},
        ${breachAt},
        'ON_TRACK',
        'delivery',
        ${`Offer Selected: ₹${finalAmount} — Promised Delivery: ${deliveryMins} mins`},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    const order = orderRows[0];

    // 7. Extract prescription medicines and insert into medicine_order_items
    if (broadcast.prescription_id) {
      const rxRows = await sql`
        SELECT medicines FROM prescriptions WHERE id = ${broadcast.prescription_id} LIMIT 1
      `;
      const rx = rxRows[0];

      if (rx?.medicines) {
        let parsedMeds = [];
        try {
          parsedMeds = typeof rx.medicines === "string" ? JSON.parse(rx.medicines) : rx.medicines;
        } catch (e) {
          parsedMeds = [];
        }

        if (Array.isArray(parsedMeds)) {
          for (const m of parsedMeds) {
            await sql`
              INSERT INTO medicine_order_items (
                order_id,
                medicine_name,
                dosage,
                frequency,
                duration,
                quantity,
                price
              ) VALUES (
                ${order.id},
                ${m.name || m.medicine_name || "Prescribed Medicine"},
                ${m.dosage || m.dosage_instruction || ""},
                ${m.frequency || ""},
                ${m.duration || ""},
                ${parseInt(m.quantity || "1", 10)},
                ${parseFloat(m.price || 0)}
              )
            `;
          }
        }
      }
    }

    // 8. Generate PayU Checkout Details (Dedicated for Chemist / Pharmacy Orders)
    const payuConfig = getPayUConfig();
    let payuPayload = null;

    if (payuConfig.key && payuConfig.salt && finalAmount > 0) {
      try {
        const patientRows = await sql`
          SELECT 
            pd.full_name, 
            pd.email, 
            u.phone_number 
          FROM users u
          LEFT JOIN patient_details pd ON pd.id = u.id 
          WHERE u.id = ${broadcast.patient_id} 
          LIMIT 1
        `;
        const patient = patientRows[0] || {};

        const txnid = `PAYU_MED_${order.unid || nextUnid}_${Date.now()}`;
        const formattedAmount = finalAmount.toFixed(2);
        const productinfo = `Medicine Order #${order.unid || nextUnid} - ${(quote.pharmacy_name || "Partner Pharmacy").slice(0, 50)}`;
        const firstname = (patient.full_name || "Customer").trim().split(" ")[0] || "Customer";
        const email = patient.email || "patient@mediconnect.fit";
        const phone = (patient.phone_number || broadcast.contact_phone || "9999999999").replace(/\D/g, "").slice(-10) || "9999999999";

        const udf1 = String(order.id);
        const udf2 = String(broadcast.patient_id);
        const udf3 = String(quote.chemist_id);
        const udf4 = String(order.unid || nextUnid);
        const udf5 = "pharmacy_order";

        // ── 90% Chemist Settlement / 10% Platform Commission Split ──
        const chemistAmount = parseFloat((finalAmount * 0.90).toFixed(2));
        const platformAmount = parseFloat((finalAmount - chemistAmount).toFixed(2));

        const childMerchantKey = quote.payu_child_key || quote.payu_vendor_id || process.env.PAYU_PHARMACY_CHILD_KEY || null;
        let splitRequest = null;
        if (childMerchantKey) {
          splitRequest = buildPayUSplitRequest({
            childMerchantKey,
            chemistAmount,
            platformAmount,
            subTxnId: `${txnid}_sub1`,
          });
        }

        const hash = generatePayUHash({
          key: payuConfig.key,
          txnid,
          amount: formattedAmount,
          productinfo,
          firstname,
          email,
          udf1,
          udf2,
          udf3,
          udf4,
          udf5,
          splitRequest,
          salt: payuConfig.salt,
        });

        let originClean = "";
        try {
          const originHdr = req.headers.get("origin") || req.headers.get("referer") || "";
          if (originHdr) originClean = new URL(originHdr).origin;
        } catch (_) {}
        const baseUrl = originClean || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const surl = `${baseUrl}/api/patients/orders/medicine/payu/response`;
        const furl = `${baseUrl}/api/patients/orders/medicine/payu/response`;

        await sql`
          UPDATE medicine_orders 
          SET 
            payu_txnid = ${txnid},
            payment_method = 'payu',
            payu_status = 'initiated',
            chemist_payout_amount = ${chemistAmount},
            platform_commission_amount = ${platformAmount},
            payu_split_request = ${splitRequest ? JSON.parse(splitRequest) : null}::jsonb,
            payu_split_status = ${splitRequest ? 'split_configured' : 'ledger_only'},
            updated_at = NOW()
          WHERE id = ${order.id}
        `;

        payuPayload = {
          action_url: payuConfig.actionUrl,
          payment_split: {
            chemist_share: chemistAmount,
            platform_commission: platformAmount,
          },
          payment_params: {
            key: payuConfig.key,
            txnid,
            amount: formattedAmount,
            productinfo,
            firstname,
            email,
            phone,
            surl,
            furl,
            hash,
            udf1,
            udf2,
            udf3,
            udf4,
            udf5,
            ...(splitRequest ? { splitRequest } : {}),
          },
        };
      } catch (payuErr) {
        console.warn("Could not generate PayU order payload:", payuErr.message);
      }
    }

    // 9. Chemist notification is deferred until payment is confirmed via PayU callback or verification

    return success("Offer selected and payment initiated", {
      order,
      payu: payuPayload,
      amount: finalAmount,
      pharmacy_name: quote.pharmacy_name || "Partner Pharmacy",
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error in select-quote route:", err);
    return failure("Failed to select quote", err.message, 500, { headers: corsHeaders });
  }
}
