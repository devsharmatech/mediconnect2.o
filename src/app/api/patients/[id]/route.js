import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(_, { params }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      phone_number,
      created_at,
      profile_picture,
      patient_details (
        full_name,
        email,
        gender,
        date_of_birth,
        blood_group,
        address,
        emergency_contact
      )
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_, { params }) {
  const { id } = await params;
  try {
    await sql.begin(async (sqlTrans) => {
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE financial_transaction_log DISABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE lab_order_consents DISABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE nursing_consent_logs DISABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE nursing_export_logs DISABLE TRIGGER USER`;

      const ids = [id];

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
      await sqlTrans`DELETE FROM users WHERE id = ${id}`;

      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE financial_transaction_log ENABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE lab_order_consents ENABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE nursing_consent_logs ENABLE TRIGGER USER`;
      await sqlTrans`ALTER TABLE nursing_export_logs ENABLE TRIGGER USER`;
    });
    return NextResponse.json({ success: true, message: "Patient deleted" });
  } catch (dbErr) {
    console.error("Database deletion error:", dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
}
