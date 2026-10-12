import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { getPayUConfig, generatePayUHash, buildPayUSplitRequest } from "@/lib/payu";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, customer_name, customer_email, customer_phone } = await req.json();

    if (!order_id) {
      return failure("order_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch order from AWS RDS
    const orderRows = await sql`
      SELECT 
        mo.*, 
        cd.pharmacy_name,
        cd.payu_child_key,
        cd.payu_vendor_id,
        pd.full_name AS patient_full_name,
        pd.email AS patient_email,
        COALESCE(u.phone_number, '9999999999') AS patient_phone
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      LEFT JOIN patient_details pd ON pd.id = mo.patient_id
      LEFT JOIN users u ON u.id = mo.patient_id
      WHERE mo.id = ${order_id}
      LIMIT 1
    `;
    const order = orderRows[0];

    if (!order) {
      return failure("Medicine order not found", null, 404, { headers: corsHeaders });
    }

    if (order.payment_status === "paid" || order.status === "approved" || order.status === "delivered") {
      return failure("Order is already paid and confirmed", null, 400, { headers: corsHeaders });
    }

    const finalAmount = parseFloat(order.total_amount || 0);
    if (finalAmount <= 0) {
      return failure("Invalid payable amount for order", null, 400, { headers: corsHeaders });
    }

    // ── 90% Chemist Settlement / 10% Platform Commission Split ──
    const chemistAmount = parseFloat((finalAmount * 0.90).toFixed(2));
    const platformAmount = parseFloat((finalAmount - chemistAmount).toFixed(2));

    // 2. PayU Configuration
    const payuConfig = getPayUConfig();
    if (!payuConfig.key || !payuConfig.salt) {
      return failure("PayU payment gateway credentials not configured", null, 500, { headers: corsHeaders });
    }

    // 3. Prepare Parameters
    const txnid = `PAYU_MED_${order.unid || order.id.slice(0, 8)}_${Date.now()}`;
    const formattedAmount = finalAmount.toFixed(2);
    const productinfo = `Medicine Order #${order.unid || order.id.slice(0, 8)} - ${order.pharmacy_name || "Pharmacy"}`;
    
    const rawName = customer_name || order.patient_full_name || "Customer";
    const firstname = rawName.trim().split(" ")[0] || "Customer";
    const email = customer_email || order.patient_email || "patient@mediconnect.fit";
    const phone = customer_phone || order.patient_phone || "9999999999";

    const udf1 = String(order.id);
    const udf2 = String(order.patient_id || "");
    const udf3 = String(order.chemist_id || "");
    const udf4 = String(order.unid || "");
    const udf5 = "pharmacy_order";

    // 4. Construct PayU Split Request (if child merchant account is linked)
    const childMerchantKey = order.payu_child_key || order.payu_vendor_id || process.env.PAYU_PHARMACY_CHILD_KEY || null;
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

    const hostOrigin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originClean = "";
    try {
      if (hostOrigin) {
        originClean = new URL(hostOrigin).origin;
      }
    } catch (_) {}

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || originClean || "https://mediconnect.fit";
    const surl = `${baseUrl}/api/patients/orders/medicine/payu/response`;
    const furl = `${baseUrl}/api/patients/orders/medicine/payu/response`;

    // 5. Update AWS RDS Order with PayU txnid & 90/10 split
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

    // 5. Initial Audit Log
    try {
      await sql`
        INSERT INTO medicine_payment_logs (
          order_id,
          patient_id,
          chemist_id,
          payu_txnid,
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
          ${hash},
          ${finalAmount},
          'INR',
          'initiated',
          'payu_gateway',
          ${JSON.stringify({
            gateway: "PayU",
            env: payuConfig.env,
            action_url: payuConfig.actionUrl,
            txnid,
            amount: formattedAmount,
            initiated_at: new Date().toISOString(),
          })}::jsonb,
          NOW()
        )
      `;
    } catch (auditErr) {
      console.warn("Could not insert PayU initiate log:", auditErr.message);
    }

    return success("PayU payment checkout initiated", {
      order_id: order.id,
      unid: order.unid,
      action_url: payuConfig.actionUrl,
      payment_gateway: "payu",
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
      payment_split: {
        chemist_share: chemistAmount,
        platform_commission: platformAmount,
      },
      amount: finalAmount,
      pharmacy_name: order.pharmacy_name || "Partner Pharmacy",
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error initiating medicine order payment:", err);
    return failure("Failed to initiate PayU payment gateway", err.message, 500, { headers: corsHeaders });
  }
}
