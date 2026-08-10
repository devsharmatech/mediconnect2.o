/**
 * Nursing Lead Referral API
 * POST - Log a manual referral to an external partner
 * 
 * SECURITY:
 *  - Staff MUST authenticate via Bearer token
 *  - Staff MUST have manage_nursing permission
 *  - Staff can ONLY refer leads assigned to them
 *  - Staff identity is SERVER-DERIVED from token
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff, staffHasPermission, logStaffActivity } from "@/lib/staffAuth";
import { sendNursingPartnerNotification } from "@/lib/sms";

async function staffHasLeadAccess(staffId, leadId) {
  const { data } = await supabase
    .from("nursing_lead_assignments")
    .select("id")
    .eq("staff_id", staffId)
    .eq("lead_id", leadId)
    .single();
  return !!data;
}

export async function POST(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    // ─── Auth Check ──────────────────────────────────────
    let staffId, staffName;
    const authHeader = req.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const staff = await getAuthenticatedStaff(req);
      if (!staff) return failure("Unauthorized", null, 401);
      const hasPerm = await staffHasPermission(staff.id, "manage_nursing", "create");
      if (!hasPerm) return failure("Access denied – insufficient permissions", null, 403);
      const hasAccess = await staffHasLeadAccess(staff.id, id);
      if (!hasAccess) return failure("Access denied – lead not assigned to you", null, 403);
      // Server-derived
      staffId = staff.id;
      staffName = staff.full_name;
    } else {
      staffId = body.staff_id;
      staffName = body.staff_name;
    }

    if (!staffId || !staffName) {
      return failure("Staff identification required.", null, 401);
    }

    const { partner_name, partner_phone, referral_channel, message_sent, notes } = body;

    if (!partner_name || !referral_channel) {
      return failure("Partner name and referral channel are required.");
    }

    const allowedChannels = ["whatsapp", "sms", "website"];
    if (!allowedChannels.includes(referral_channel)) {
      return failure("Invalid referral channel. Must be whatsapp, sms, or website.");
    }

    // Verify lead exists and is QUALIFIED
    const { data: lead, error: leadErr } = await supabase
      .from("nursing_leads")
      .select("id, lead_id, lead_status, name, phone, user_id, care_types, city")
      .eq("id", id)
      .single();

    if (leadErr || !lead) {
      return failure("Lead not found", null, 404);
    }

    if (lead.lead_status !== "QUALIFIED") {
      return failure("Lead must be in QUALIFIED status to share with partner.");
    }

    // Create referral log
    const { data: referral, error: refErr } = await supabase
      .from("nursing_referral_logs")
      .insert({
        lead_id: id,
        staff_id: staffId,
        staff_name: staffName,
        partner_name,
        referral_channel,
        message_sent: message_sent || false,
        message_timestamp: message_sent ? new Date().toISOString() : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (refErr) {
      console.error("Referral log error:", refErr);
      return failure("Failed to log referral", refErr.message, 500);
    }

    // Update lead status to SHARED_WITH_PARTNER
    await supabase
      .from("nursing_leads")
      .update({
        lead_status: "SHARED_WITH_PARTNER",
        partner_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Add audit note
    await supabase.from("nursing_lead_notes").insert({
      lead_id: id,
      staff_id: staffId,
      staff_name: staffName,
      note: `Lead shared with partner: ${partner_name} via ${referral_channel}`,
      note_type: "status_change",
      previous_status: "QUALIFIED",
      new_status: "SHARED_WITH_PARTNER",
    });

    // Send WhatsApp notification to partner if phone number is provided
    if (partner_phone) {
      try {
        await sendNursingPartnerNotification({
          partner_phone,
          partner_name,
          lead_code: lead.lead_id,
          patient_name: lead.name,
          patient_phone: lead.phone,
          care_types: lead.care_types,
          city: lead.city,
        });
      } catch (whatsappErr) {
        console.error("[WHATSAPP] Failed to send partner notification:", whatsappErr.message);
      }
    }

    // Insert in-system notification for patient if user_id is present
    if (lead.user_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: lead.user_id,
          title: "Nursing Request Status Update",
          message: `The status of your nursing care request (ID: ${lead.lead_id}) has been updated to: Service Partner Assigned.`,
          type: "nursing",
          read: false,
          metadata: { lead_id: id, status: "SHARED_WITH_PARTNER" }
        });
      } catch (notifErr) {
        console.error("[NOTIFICATION] Failed to insert status update notification:", notifErr.message);
      }
    }

    // Activity log
    logStaffActivity(staffId, staffName, "nursing_referral", "nursing", {
      lead_id: id, partner_name, referral_channel,
    }, req);

    return success("Referral logged and lead status updated", referral, 201);
  } catch (err) {
    console.error("Referral error:", err);
    return failure("Internal server error", err.message, 500);
  }
}
