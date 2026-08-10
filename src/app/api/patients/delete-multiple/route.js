import { supabase } from "@/lib/supabaseAdmin";
import { deleteFromS3, extractKeyFromUrl } from "@/lib/s3";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!ids?.length) {
      return NextResponse.json({ error: "No patient IDs provided" }, { status: 400 });
    }

    const { data: users, error: fetchError } = await supabase
      .from("users")
      .select("id, profile_picture")
      .in("id", ids);

    if (fetchError) throw fetchError;

    // Delete profile pictures from S3
    const deletePromises = users
      .filter(u => u.profile_picture)
      .map(u => {
        const key = extractKeyFromUrl(u.profile_picture);
        return key ? deleteFromS3(key) : Promise.resolve();
      });

    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises);
    }

    try {
      await sql.begin(async (sqlTrans) => {
        await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE financial_transaction_log DISABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE lab_order_consents DISABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE nursing_consent_logs DISABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE nursing_export_logs DISABLE TRIGGER USER`;

        // 1. Delete activity_log entries referencing the patient's care episodes or patient_id
        await sqlTrans`DELETE FROM activity_log WHERE patient_id = ANY(${ids}) OR actor_id = ANY(${ids})`;
        const careEpisodes = await sqlTrans`SELECT id FROM care_episodes WHERE patient_id = ANY(${ids})`;
        if (careEpisodes.length > 0) {
          const episodeIds = careEpisodes.map(e => e.id);
          await sqlTrans`DELETE FROM activity_log WHERE care_episode_id = ANY(${episodeIds})`;
        }

        // 2. Delete medicine orders for the patient
        const medOrders = await sqlTrans`SELECT id FROM medicine_orders WHERE patient_id = ANY(${ids})`;
        if (medOrders.length > 0) {
          const orderIds = medOrders.map(o => o.id);
          await sqlTrans`DELETE FROM medicine_order_items WHERE order_id = ANY(${orderIds})`;
          await sqlTrans`DELETE FROM medicine_orders WHERE id = ANY(${orderIds})`;
        }

        // 3. Delete lab test orders for the patient
        const labOrders = await sqlTrans`SELECT id FROM lab_test_orders WHERE patient_id = ANY(${ids})`;
        if (labOrders.length > 0) {
          const orderIds = labOrders.map(o => o.id);
          await sqlTrans`DELETE FROM lab_test_order_items WHERE order_id = ANY(${orderIds})`;
          await sqlTrans`DELETE FROM lab_payment_logs WHERE order_id = ANY(${orderIds})`;
          await sqlTrans`DELETE FROM lab_test_orders WHERE id = ANY(${orderIds})`;
        }

        // 4. Delete generic lab_reports, lab_payment_logs, lab_order_consents, user_insurance_applications
        await sqlTrans`DELETE FROM lab_reports WHERE patient_id = ANY(${ids})`;
        await sqlTrans`DELETE FROM lab_payment_logs WHERE patient_id = ANY(${ids})`;
        await sqlTrans`DELETE FROM user_insurance_applications WHERE user_id = ANY(${ids})`;

        // 5. Delete from users (will cascade to patient_details, care_episodes, breathing_sessions, health_assessments)
        await sqlTrans`DELETE FROM users WHERE id = ANY(${ids})`;

        await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE financial_transaction_log ENABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE lab_order_consents ENABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE nursing_consent_logs ENABLE TRIGGER USER`;
        await sqlTrans`ALTER TABLE nursing_export_logs ENABLE TRIGGER USER`;
      });
    } catch (dbErr) {
      console.error("Database deletion error:", dbErr);
      throw dbErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
