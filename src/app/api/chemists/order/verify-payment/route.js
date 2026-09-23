import { supabase } from "@/lib/supabaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, chemist_id } = await req.json();

    if (!order_id || !chemist_id) {
      return failure("order_id & chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    /* --------------------------------------------------
       1️⃣ UPDATE ORDER STATUS → FULFILMENT_RELEASED
    -------------------------------------------------- */
    const { data: order, error } = await supabase
      .from("medicine_orders")
      .update({
        status: "fulfilment_released", // V3 canonical state: verified payment releases fulfilment
        payment_verified_at: new Date(),
        updated_at: new Date(),
      })
      .eq("id", order_id)
      .eq("chemist_id", chemist_id)
      .select("id, patient_id, total_amount")
      .single();

    if (error || !order) {
      return failure("Order not found or not authorized", null, 404, {
        headers: corsHeaders,
      });
    }

    /* --------------------------------------------------
       2️⃣ FETCH PATIENT FCM TOKEN
    -------------------------------------------------- */
    const { data: patient } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", order.patient_id)
      .single();

    /* --------------------------------------------------
       3️⃣ SEND FIREBASE PUSH TO PATIENT & NOTIFICATION TO CHEMIST
    -------------------------------------------------- */
    if (patient?.fcm_token) {
      await admin.messaging().send({
        token: patient.fcm_token,
        notification: {
          title: "Payment Verified ✅",
          body: `Your payment of ₹${order.total_amount} has been verified successfully. Medicines are being prepared for dispatch.`,
        },
        data: {
          type: "payment_verified",
          order_id: order.id,
          amount: String(order.total_amount),
        },
      }).catch(() => null);
    }

    // In-app notification to chemist unlocking full delivery address
    try {
      await supabase.from("notifications").insert({
        user_id: chemist_id,
        title: "Fulfilment Released 🚀",
        message: `Payment verified for Order ${order.id.slice(0, 8).toUpperCase()}. Full delivery address and contact are now available. Please dispense and dispatch.`,
        type: "medicine_order",
        metadata: { order_id: order.id },
      });
    } catch (notifErr) {
      console.warn("Chemist notification error:", notifErr?.message);
    }

    /* --------------------------------------------------
       4️⃣ FETCH CHEMIST DETAILS FOR LEDGER
    -------------------------------------------------- */
    const { data: chemistData } = await supabase
      .from("chemist_details")
      .select("pharmacy_name")
      .eq("id", chemist_id)
      .single();

    /* --------------------------------------------------
       5️⃣ RECORD IN FINANCIAL LEDGER
    -------------------------------------------------- */
    await createLedgerEntry({
      patient_id: order.patient_id,
      care_episode_id: null,
      service_type: "pharmacy",
      reference_id: order.id,
      debit_credit: "credit",
      amount: order.total_amount || 0,
      payment_mode: "UPI",
      status: "completed",
      description: `Payment for Medicine Order ${order.id.slice(0, 8).toUpperCase()} at ${chemistData?.pharmacy_name || 'Pharmacy'}`,
    });

    return success(
      "Payment verified successfully",
      {
        order_id: order.id,
        status: "payment_verified",
      },
      200,
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error("Verify payment error:", err);
    return failure("Failed to verify payment", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
