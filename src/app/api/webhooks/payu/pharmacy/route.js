import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { getPayUConfig, verifyPayUResponseHash } from "@/lib/payu";
import { resolveChemistPayoutDestination } from "@/lib/chemistPayoutHelper";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    let params = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      params = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      params = Object.fromEntries(formData.entries());
    } else {
      const rawText = await req.text();
      try {
        params = JSON.parse(rawText);
      } catch (_) {
        const searchParams = new URLSearchParams(rawText);
        params = Object.fromEntries(searchParams.entries());
      }
    }

    const {
      status,
      txnid,
      amount,
      mihpayid,
      bank_ref_num,
      error_Message,
      udf1: order_id,
      udf2: patient_id,
      udf3: chemist_id,
      mode,
      bankcode,
      hash,
    } = params;

    if (!txnid && !order_id) {
      return failure("Missing txnid or order_id in PayU webhook payload", null, 400, {
        headers: corsHeaders,
      });
    }

    const payuConfig = getPayUConfig();
    const isHashValid = verifyPayUResponseHash(params, payuConfig.salt);

    if (!isHashValid) {
      console.error("PayU Webhook Signature mismatch for txnid:", txnid);

      if (order_id) {
        try {
          await sql`
            INSERT INTO medicine_payment_logs (
              order_id,
              patient_id,
              chemist_id,
              payu_txnid,
              payu_mihpayid,
              payu_hash,
              amount,
              currency,
              status,
              source,
              audit_details,
              created_at
            ) VALUES (
              ${order_id},
              ${patient_id || null},
              ${chemist_id || null},
              ${txnid || null},
              ${mihpayid || null},
              ${hash || null},
              ${parseFloat(amount) || 0},
              'INR',
              'webhook_signature_mismatch',
              'payu_webhook',
              ${JSON.stringify({ error: "Cryptographic hash verification failed", payload: params })}::jsonb,
              NOW()
            )
          `;
        } catch (e) {
          console.warn("Could not log webhook signature failure:", e.message);
        }
      }

      return failure("Invalid PayU webhook signature", null, 401, { headers: corsHeaders });
    }

    // Resolve order via order_id (udf1) or payu_txnid along with chemist bank/UPI details
    let order = null;
    if (order_id) {
      const rows = await sql`
        SELECT 
          mo.*, 
          cd.pharmacy_name,
          cd.owner_name,
          cd.bank_name,
          cd.bank_account_number,
          cd.bank_ifsc_code,
          cd.bank_branch,
          cd.upi_id,
          cd.payment_qr_url,
          cd.payment_qr_payload
        FROM medicine_orders mo
        LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
        WHERE mo.id = ${order_id} 
        LIMIT 1
      `;
      order = rows[0];
    } else if (txnid) {
      const rows = await sql`
        SELECT 
          mo.*, 
          cd.pharmacy_name,
          cd.owner_name,
          cd.bank_name,
          cd.bank_account_number,
          cd.bank_ifsc_code,
          cd.bank_branch,
          cd.upi_id,
          cd.payment_qr_url,
          cd.payment_qr_payload
        FROM medicine_orders mo
        LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
        WHERE mo.payu_txnid = ${txnid} 
        LIMIT 1
      `;
      order = rows[0];
    }

    if (!order) {
      console.warn("PayU Webhook: Medicine order not found for txnid:", txnid);
      return success("Webhook received, order not mapped", { txnid }, 200, { headers: corsHeaders });
    }

    // Process status update idempotently
    if (String(status).toLowerCase() === "success") {
      // Resolve Chemist Payout Routing (Bank Account first, fallback to UPI)
      const payoutRouting = resolveChemistPayoutDestination(order);

      if (order.payment_status !== "paid") {
        const paidTotal = parseFloat(amount) || parseFloat(order.total_amount) || 0;
        const chemistPayout = parseFloat((paidTotal * 0.90).toFixed(2));
        const platformFee = parseFloat((paidTotal - chemistPayout).toFixed(2));

        await sql`
          UPDATE medicine_orders
          SET 
            status = 'approved',
            payment_status = 'paid',
            payu_txnid = ${txnid || order.payu_txnid},
            payu_mihpayid = ${mihpayid || null},
            payu_bank_ref_num = ${bank_ref_num || null},
            payu_status = 'success',
            payment_method = 'payu',
            chemist_payout_amount = COALESCE(chemist_payout_amount, ${chemistPayout}),
            platform_commission_amount = COALESCE(platform_commission_amount, ${platformFee}),
            chemist_payout_method = COALESCE(chemist_payout_method, ${payoutRouting.method}),
            chemist_payout_destination = COALESCE(chemist_payout_destination, ${JSON.stringify(payoutRouting.destination)}::jsonb),
            payment_verified_at = NOW(),
            updated_at = NOW()
          WHERE id = ${order.id}
        `;

        // Record in provider_payout_ledger for Chemist/Pharmacy payout accounting with destination audit
        if (order.chemist_id) {
          try {
            await sql`
              INSERT INTO provider_payout_ledger (
                provider_id,
                order_id,
                gross_amount,
                platform_fee,
                net_payout,
                status,
                payu_split_status,
                payout_method,
                payout_destination,
                audit_metadata,
                created_at
              ) VALUES (
                ${order.chemist_id},
                ${order.id},
                ${paidTotal},
                ${platformFee},
                ${chemistPayout},
                'SETTLED_VIA_PAYU',
                '90_PERCENT_SPLIT',
                ${payoutRouting.method},
                ${JSON.stringify(payoutRouting.destination)}::jsonb,
                ${JSON.stringify({
                  routing_summary: payoutRouting.summary,
                  order_id: order.id,
                  unid: order.unid,
                  txnid,
                  mihpayid,
                  paid_at: new Date().toISOString(),
                })}::jsonb,
                NOW()
              )
            `;
          } catch (ledgerErr) {
            console.warn("Could not record provider_payout_ledger in webhook:", ledgerErr.message);
          }
        }

        try {
          await sql`
            INSERT INTO medicine_payment_logs (
              order_id,
              patient_id,
              chemist_id,
              payu_txnid,
              payu_mihpayid,
              payu_hash,
              amount,
              currency,
              status,
              source,
              audit_details,
              created_at
            ) VALUES (
              ${order.id},
              ${order.patient_id},
              ${order.chemist_id},
              ${txnid},
              ${mihpayid || null},
              ${hash},
              ${paidTotal},
              'INR',
              'verified',
              'payu_webhook',
              ${JSON.stringify({
                gateway: "PayU",
                mode,
                bankcode,
                bank_ref_num,
                mihpayid,
                txnid,
                status: "success",
                split: {
                  total_paid: paidTotal,
                  chemist_net_payout_90_percent: chemistPayout,
                  platform_commission_10_percent: platformFee,
                },
                payout_routing: {
                  method: payoutRouting.method,
                  status: payoutRouting.status,
                  summary: payoutRouting.summary,
                  destination: payoutRouting.destination,
                },
                verified_at: new Date().toISOString(),
              })}::jsonb,
              NOW()
            )
          `;
        } catch (auditErr) {
          console.warn("Webhook audit insert warning:", auditErr.message);
        }

        // Send Push & In-app Notifications
        try {
          if (order.chemist_id) {
            await sendPushAndInAppNotification({
              userId: order.chemist_id,
              title: "Payment Received 💳",
              message: `₹${order.total_amount} received via PayU for Order #${order.unid || ""}. Please begin packing medicines!`,
              type: "medicine_payment_confirmed",
              metadata: {
                order_id: order.id,
                unid: order.unid,
                mihpayid,
                payment_gateway: "PayU",
                amount: order.total_amount,
              },
            });
          }

          if (order.patient_id) {
            await sendPushAndInAppNotification({
              userId: order.patient_id,
              title: "Payment Confirmed 💊",
              message: `Your payment of ₹${order.total_amount} was received via PayU. Pharmacy is packing your order.`,
              type: "medicine_order_paid",
              metadata: {
                order_id: order.id,
                unid: order.unid,
                mihpayid,
                payment_gateway: "PayU",
              },
            });
          }
        } catch (notifErr) {
          console.warn("Notification error in PayU webhook:", notifErr.message);
        }
      }
    } else {
      // Payment Failed in Webhook
      await sql`
        UPDATE medicine_orders
        SET 
          payu_status = 'failed',
          payment_failed_reason = ${error_Message || "Payment declined or cancelled on PayU"},
          updated_at = NOW()
        WHERE id = ${order.id}
      `;

      try {
        await sql`
          INSERT INTO medicine_payment_logs (
            order_id,
            patient_id,
            chemist_id,
            payu_txnid,
            payu_mihpayid,
            payu_hash,
            amount,
            currency,
            status,
            source,
            audit_details,
            created_at
          ) VALUES (
            ${order.id},
            ${order.patient_id},
            ${order.chemist_id},
            ${txnid || null},
            ${mihpayid || null},
            ${hash || null},
            ${parseFloat(amount) || order.total_amount || 0},
            'INR',
            'failed',
            'payu_webhook',
            ${JSON.stringify({ error: error_Message, params })}::jsonb,
            NOW()
          )
        `;
      } catch (logErr) {
        console.warn("Could not log failed PayU webhook audit:", logErr.message);
      }
    }

    return success("PayU webhook processed successfully", { txnid, status }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("PayU Webhook Error:", err);
    return failure("Failed to process PayU webhook", err.message, 500, { headers: corsHeaders });
  }
}
