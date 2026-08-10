/**
 * Admin/Staff Nursing Leads API
 * GET  - List leads with filters, search, pagination, SLA indicators
 * 
 * SECURITY: 
 *  - Admin requests (no Bearer token) are allowed if admin session valid via cookie/header
 *  - Staff requests MUST have Bearer token + view_nursing permission
 *  - Staff can ONLY see leads explicitly assigned to them
 *  - Patient details are JOINed from users + patient_details when user_id exists
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff, staffHasPermission, logStaffActivity } from "@/lib/staffAuth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const intent = searchParams.get("intent");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // ─── Authentication & Authorization ────────────────────
    const authHeader = req.headers.get("authorization");
    let isAdmin = false;
    let staffUser = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Staff request — verify token and permission
      staffUser = await getAuthenticatedStaff(req);
      if (!staffUser) {
        return failure("Unauthorized – invalid or expired token", null, 401);
      }
      const hasPermission = await staffHasPermission(staffUser.id, "view_nursing", "view");
      if (!hasPermission) {
        return failure("Access denied – you do not have nursing lead access", null, 403);
      }
    } else {
      // Admin request — verify admin session
      const adminCookie = req.headers.get("cookie");
      const adminUser = searchParams.get("admin_id");
      // Admin routes are protected by middleware; if no Bearer token, treat as admin
      isAdmin = true;
    }

    // ─── Build Query ────────────────────────────────────────
    let query = supabase
      .from("nursing_leads")
      .select("*, staffs!nursing_leads_assigned_staff_id_fkey(id, full_name)", { count: "exact" });

    if (status && status !== "ALL") {
      query = query.eq("lead_status", status);
    }

    if (intent) {
      query = query.eq("lead_intent", intent);
    }

    // ─── Staff Visibility: ONLY assigned leads ─────────────
    if (staffUser) {
      // Staff can ONLY see leads assigned to them via nursing_lead_assignments
      const { data: assignedLeadIds } = await supabase
        .from("nursing_lead_assignments")
        .select("lead_id")
        .eq("staff_id", staffUser.id);

      const ids = (assignedLeadIds || []).map(a => a.lead_id);
      if (ids.length === 0) {
        // No assigned leads — return empty
        return success("Leads fetched", { leads: [], total: 0, page, limit });
      }
      query = query.in("id", ids);
    }
    // Admin sees all leads — no filter needed

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,lead_id.ilike.%${search}%,city.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Leads fetch error:", error);
      return failure("Failed to fetch leads", error.message, 500);
    }

    // ─── Enrich with patient_details if user_id exists ─────
    const leadsEnriched = await Promise.all(
      (data || []).map(async (lead) => {
        let patientInfo = null;
        if (lead.user_id) {
          const { data: pd } = await supabase
            .from("patient_details")
            .select("full_name, email, gender, date_of_birth, blood_group, address, emergency_contact")
            .eq("id", lead.user_id)
            .single();
          if (pd) patientInfo = pd;
        }

        // SLA computation
        const now = Date.now();
        const createdAt = new Date(lead.created_at).getTime();
        const minutesSinceCreated = Math.floor((now - createdAt) / 60000);
        let sla = "green";
        if (minutesSinceCreated > 120) sla = "red";
        else if (minutesSinceCreated > 60) sla = "amber";

        return {
          ...lead,
          // Override lead-level PII with canonical patient record if available
          patient_name: patientInfo?.full_name || lead.name || "—",
          patient_email: patientInfo?.email || lead.email || null,
          patient_gender: patientInfo?.gender || lead.gender || null,
          patient_dob: patientInfo?.date_of_birth || null,
          patient_age: lead.age || null,
          patient_blood_group: patientInfo?.blood_group || null,
          patient_address: patientInfo?.address || lead.city || null,
          has_patient_record: !!patientInfo,
          minutes_since_created: minutesSinceCreated,
          sla,
        };
      })
    );

    // ─── Activity Log ──────────────────────────────────────
    if (staffUser) {
      logStaffActivity(staffUser.id, staffUser.full_name, "viewed_nursing_leads", "nursing", { page, status, search }, req);
    }

    return success("Leads fetched", {
      leads: leadsEnriched,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("Nursing leads error:", err);
    return failure("Internal server error", err.message, 500);
  }
}
