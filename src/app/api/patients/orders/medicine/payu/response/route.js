import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getPayUConfig, verifyPayUResponseHash } from "@/lib/payu";
import { resolveChemistPayoutDestination } from "@/lib/chemistPayoutHelper";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const params = Object.fromEntries(formData.entries());

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
      udf4: unid,
      mode,
      bankcode,
      hash,
    } = params;

    const payuConfig = getPayUConfig();
    const isHashValid = verifyPayUResponseHash(params, payuConfig.salt);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || "https://mediconnect.fit";

    // 1. Security Check: Validate Cryptographic Response Hash
    if (!isHashValid) {
      console.error("PayU Signature Validation FAILED for txnid:", txnid);

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
              'tampered_signature',
              'payu_callback',
              ${JSON.stringify({ error: "Cryptographic reverse hash mismatch", params })}::jsonb,
              NOW()
            )
          `;
        } catch (logErr) {
          console.warn("Could not log tampered signature audit:", logErr.message);
        }
      }

      return NextResponse.redirect(
        `${baseUrl}/medicine-order?status=payment_failed&reason=security_hash_mismatch`,
        303
      );
    }

    // 2. Fetch existing order & chemist bank/UPI details from AWS RDS
    const orderRows = await sql`
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
    const order = orderRows[0];

    if (!order) {
      console.warn("PayU callback order not found:", order_id);
      return NextResponse.redirect(
        `${baseUrl}/medicine-order?status=payment_failed&reason=order_not_found`,
        303
      );
    }

    // 3. Process Success vs Failure
    if (String(status).toLowerCase() === "success") {
      // Resolve Chemist Payout Routing (Bank Account first, fallback to UPI)
      const payoutRouting = resolveChemistPayoutDestination(order);

      // Idempotency: If already marked paid, avoid duplicate notification/writes
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
            console.warn("Could not record provider_payout_ledger:", ledgerErr.message);
          }
        }

        // Record Immutable Audit Log with full payout destination
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
              'payu_callback',
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
          console.warn("Could not insert successful PayU audit log:", auditErr.message);
        }

        // Send Real-time Push & In-app Notifications
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
              message: `Your payment of ₹${order.total_amount} was received via PayU. ${order.pharmacy_name || "Pharmacy"} is packing your order.`,
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
          console.warn("PayU notification dispatch error:", notifErr.message);
        }
      }

      return NextResponse.redirect(
        `${baseUrl}/medicine-order?status=payment_success&order_id=${order.id}&unid=${order.unid || unid || ""}`,
        303
      );
    } else {
      // Payment Failed / Cancelled
      await sql`
        UPDATE medicine_orders
        SET 
          payu_status = 'failed',
          payment_failed_reason = ${error_Message || "Transaction failed or cancelled on PayU"},
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
            'payu_callback',
            ${JSON.stringify({
              gateway: "PayU",
              status: "failed",
              error: error_Message,
              params,
            })}::jsonb,
            NOW()
          )
        `;
      } catch (logErr) {
        console.warn("Could not log failed PayU audit:", logErr.message);
      }

      const errMsg = encodeURIComponent(error_Message || "Payment declined or cancelled");
      return NextResponse.redirect(
        `${baseUrl}/medicine-order?status=payment_failed&order_id=${order.id}&msg=${errMsg}`,
        303
      );
    }
  } catch (err) {
    console.error("Critical error in PayU response handler:", err);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mediconnect.fit";
    return NextResponse.redirect(
      `${baseUrl}/medicine-order?status=payment_failed&reason=server_error`,
      303
    );
  }
}
