/**
 * Nursing Dashboard Metrics API
 * GET - Admin/Staff dashboard metrics
 * 
 * SECURITY:
 *  - Staff MUST authenticate via Bearer token + view_nursing permission
 *  - Staff metrics are SCOPED to their assigned leads only
 *  - Admin sees global metrics (no Bearer token = admin request)
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff, staffHasPermission } from "@/lib/staffAuth";

export async function GET(req) {
  try {
    // ─── Auth Check ──────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    let staffUser = null;
    let assignedLeadIds = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      staffUser = await getAuthenticatedStaff(req);
      if (!staffUser) {
        return failure("Unauthorized – invalid or expired token", null, 401);
      }
      const hasPerm = await staffHasPermission(staffUser.id, "view_nursing", "view");
      if (!hasPerm) {
        return failure("Access denied – insufficient permissions", null, 403);
      }
      // Get assigned lead IDs for scoping
      const { data: assignments } = await supabase
        .from("nursing_lead_assignments")
        .select("lead_id")
        .eq("staff_id", staffUser.id);
      assignedLeadIds = (assignments || []).map(a => a.lead_id);
    }

    // ─── Helper: Build query with optional lead scope ────
    const buildScopedQuery = (table, selectCols = "id", opts = {}) => {
      let q = supabase.from(table).select(selectCols, opts);
      if (assignedLeadIds !== null) {
        if (assignedLeadIds.length === 0) return null; // no assigned leads
        q = q.in(table === "nursing_leads" ? "id" : "lead_id", assignedLeadIds);
      }
      return q;
    };

    // 1. Status counts
    const statusList = ["NEW", "CONTACTED", "QUALIFIED", "SHARED_WITH_PARTNER", "SERVICE_STARTED", "NOT_CONVERTED", "CLOSED"];
    const statusCounts = {};
    for (const s of statusList) {
      const q = buildScopedQuery("nursing_leads", "id", { count: "exact", head: true });
      if (!q) { statusCounts[s] = 0; continue; }
      const { count } = await q.eq("lead_status", s);
      statusCounts[s] = count || 0;
    }

    const totalLeads = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // 2. SLA Compliance
    let slaQuery = supabase
      .from("nursing_lead_notes")
      .select("lead_id, created_at, nursing_leads!inner(created_at)")
      .eq("note_type", "status_change")
      .eq("new_status", "CONTACTED");
    if (assignedLeadIds !== null) {
      if (assignedLeadIds.length === 0) {
        slaQuery = null;
      } else {
        slaQuery = slaQuery.in("lead_id", assignedLeadIds);
      }
    }

    let slaCompliant = 0, slaTotal = 0;
    const callTimes = []; // collect individual call times for median
    if (slaQuery) {
      const { data: contactedLeads } = await slaQuery;
      if (contactedLeads) {
        for (const note of contactedLeads) {
          slaTotal++;
          const leadCreated = new Date(note.nursing_leads?.created_at).getTime();
          const contacted = new Date(note.created_at).getTime();
          const minutesToCall = Math.round((contacted - leadCreated) / 60000);
          callTimes.push(minutesToCall);
          if (minutesToCall <= 60) slaCompliant++;
        }
      }
    }
    const slaRate = slaTotal > 0 ? Math.round((slaCompliant / slaTotal) * 100) : 100;

    // Median time to call
    let medianTimeToCall = 0;
    if (callTimes.length > 0) {
      const sorted = [...callTimes].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianTimeToCall = sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
    }

    // 3. Conversion funnel
    const funnel = {
      new: statusCounts.NEW,
      contacted: statusCounts.CONTACTED + statusCounts.QUALIFIED + statusCounts.SHARED_WITH_PARTNER + statusCounts.SERVICE_STARTED + statusCounts.NOT_CONVERTED + statusCounts.CLOSED,
      qualified: statusCounts.QUALIFIED + statusCounts.SHARED_WITH_PARTNER + statusCounts.SERVICE_STARTED + statusCounts.CLOSED,
      service_started: statusCounts.SERVICE_STARTED + statusCounts.CLOSED,
    };

    // 4. Urgent leads (NEW, oldest first) — only assigned for staff
    let urgentQuery = supabase
      .from("nursing_leads")
      .select("id, lead_id, name, city, created_at")
      .eq("lead_status", "NEW")
      .order("created_at", { ascending: true })
      .limit(10);
    if (assignedLeadIds !== null) {
      if (assignedLeadIds.length === 0) urgentQuery = null;
      else urgentQuery = urgentQuery.in("id", assignedLeadIds);
    }

    let urgentLeads = [];
    if (urgentQuery) {
      const { data: recentNew } = await urgentQuery;
      const now = Date.now();
      urgentLeads = (recentNew || []).map((l) => {
        const min = Math.floor((now - new Date(l.created_at).getTime()) / 60000);
        return { ...l, minutes_since_created: min, sla: min > 120 ? "red" : min > 60 ? "amber" : "green" };
      });
    }

    // 5. Consent Integrity — check leads missing consent records
    let consentIntegrity = { total: totalLeads, with_consent: 0, missing: 0 };
    if (totalLeads > 0) {
      let consentQuery = supabase
        .from("nursing_consent_logs")
        .select("lead_id", { count: "exact", head: false });
      if (assignedLeadIds !== null) {
        if (assignedLeadIds.length > 0) {
          consentQuery = consentQuery.in("lead_id", assignedLeadIds);
        }
      }
      const { data: consentData } = await consentQuery;
      // Get unique lead_ids with consent
      const uniqueConsentLeads = new Set((consentData || []).map(c => c.lead_id));
      consentIntegrity.with_consent = uniqueConsentLeads.size;
      consentIntegrity.missing = totalLeads - uniqueConsentLeads.size;
    }

    // 6. Partner Stats — conversion by partner
    let partnerStats = {};
    let partnerQuery = supabase
      .from("nursing_referral_logs")
      .select("partner_name, lead_id, nursing_leads!inner(lead_status)");
    if (assignedLeadIds !== null) {
      if (assignedLeadIds.length > 0) {
        partnerQuery = partnerQuery.in("lead_id", assignedLeadIds);
      } else {
        partnerQuery = null;
      }
    }
    if (partnerQuery) {
      const { data: referrals } = await partnerQuery;
      if (referrals) {
        for (const ref of referrals) {
          const name = ref.partner_name || "Unknown";
          if (!partnerStats[name]) partnerStats[name] = { shared: 0, converted: 0 };
          partnerStats[name].shared++;
          if (["SERVICE_STARTED", "CLOSED"].includes(ref.nursing_leads?.lead_status)) {
            partnerStats[name].converted++;
          }
        }
      }
    }

    return success("Dashboard metrics fetched", {
      total_leads: totalLeads,
      status_counts: statusCounts,
      sla_compliance_rate: slaRate,
      median_time_to_call: medianTimeToCall,
      consent_integrity: consentIntegrity,
      funnel,
      urgent_leads: urgentLeads,
      partner_stats: partnerStats,
    });
  } catch (err) {
    console.error("Nursing metrics error:", err);
    return failure("Internal server error", err.message, 500);
  }
}
