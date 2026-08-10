"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Clock, Calendar,
  FileText, Shield, CheckCircle2, AlertCircle, Loader2,
  MessageSquare, Send, Activity, Heart, RefreshCw,
  ChevronDown, ExternalLink, AlertTriangle
} from "lucide-react";

const STATUS_CONFIG = {
  NEW: { label: "New", color: "bg-blue-100 text-[#004F7C]", dot: "bg-blue-500" },
  CONTACTED: { label: "Contacted", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  QUALIFIED: { label: "Qualified", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  SHARED_WITH_PARTNER: { label: "Shared with Partner", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  SERVICE_STARTED: { label: "Service Started", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  NOT_CONVERTED: { label: "Not Converted", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700", dot: "bg-gray-500" },
};

const SLA_COLORS = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const formatCompactDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "—";
  const mins = Number(minutes);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(mins / 1440);
  return `${days}d`;
};

const CALL_OUTCOMES = [
  { value: "connected", label: "Connected" },
  { value: "no_answer", label: "No Answer" },
  { value: "call_back_requested", label: "Call Back Requested" },
];

const NOT_CONVERTED_REASONS = [
  { value: "cost_issue", label: "Cost Issue" },
  { value: "availability_issue", label: "Availability Issue" },
  { value: "patient_changed_mind", label: "Patient Changed Mind" },
  { value: "already_arranged", label: "Already Arranged" },
  { value: "other", label: "Other" },
];

function getNextStatuses(current) {
  const map = {
    NEW: ["CONTACTED"],
    CONTACTED: ["QUALIFIED", "NOT_CONVERTED"],
    QUALIFIED: ["SHARED_WITH_PARTNER", "NOT_CONVERTED"],
    SHARED_WITH_PARTNER: ["SERVICE_STARTED", "NOT_CONVERTED"],
    SERVICE_STARTED: ["CLOSED"],
    NOT_CONVERTED: ["CLOSED"],
  };
  return map[current] || [];
}

export default function AdminNursingLeadDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Action forms
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [notConvertedReason, setNotConvertedReason] = useState("");

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [showReferralForm, setShowReferralForm] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [referralChannel, setReferralChannel] = useState("whatsapp");
  const [messageSent, setMessageSent] = useState(false);
  const [referralNotes, setReferralNotes] = useState("");

  const [showIntentForm, setShowIntentForm] = useState(false);
  const [leadIntent, setLeadIntent] = useState("");

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [staffList, setStaffList] = useState([]);

  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Get admin info
  const getAdminInfo = () => {
    try {
      // Try admin first, then staff
      const admin = JSON.parse(localStorage.getItem("adminUser") || "null");
      if (admin) return { id: admin.user_id || admin.id, name: admin.user?.details?.full_name || "Admin" };
      const staff = JSON.parse(localStorage.getItem("staffUser") || "null");
      if (staff) return { id: staff.id, name: staff.full_name || "Staff" };
    } catch { /* ignore */ }
    return { id: "unknown", name: "Admin" };
  };

  const loadLead = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nursing/leads/${id}`);
      const data = await res.json();
      if (data.success) {
        setLead(data.data);
        setLeadIntent(data.data.lead_intent || "");
      }
    } catch (err) {
      console.error("Failed to load lead", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff?status=active&limit=100");
      const data = await res.json();
      if (data.success) setStaffList(data.data.staff || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadLead(); loadStaff(); }, [id]);

  const handleStatusChange = async () => {
    if (!newStatus || !statusNote.trim()) {
      setError("Please select a status and add a note.");
      return;
    }
    if (newStatus === "NOT_CONVERTED" && !notConvertedReason) {
      setError("Please select a reason for not converted.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const admin = getAdminInfo();
      const res = await fetch(`/api/nursing/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_status: newStatus,
          not_converted_reason: notConvertedReason || undefined,
          note: statusNote,
          call_outcome: callOutcome || undefined,
          staff_id: admin.id,
          staff_name: admin.name,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setSuccessMsg("Status updated successfully!");
      setShowStatusForm(false);
      setStatusNote("");
      setCallOutcome("");
      setNotConvertedReason("");
      loadLead();
    } catch { setError("Failed to update status."); }
    finally { setSaving(false); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) { setError("Note text is required."); return; }
    setSaving(true);
    setError("");
    try {
      const admin = getAdminInfo();
      const res = await fetch(`/api/nursing/leads/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: admin.id,
          staff_name: admin.name,
          note: noteText,
          note_type: "general",
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setSuccessMsg("Note added!");
      setNoteText("");
      setShowNoteForm(false);
      loadLead();
    } catch { setError("Failed to add note."); }
    finally { setSaving(false); }
  };

  const handleReferral = async () => {
    if (!partnerName.trim()) { setError("Partner name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const admin = getAdminInfo();
      const res = await fetch(`/api/nursing/leads/${id}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: admin.id,
          staff_name: admin.name,
          partner_name: partnerName,
          partner_phone: partnerPhone || undefined,
          referral_channel: referralChannel,
          message_sent: messageSent,
          notes: referralNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setSuccessMsg("Referral logged!");
      setShowReferralForm(false);
      setPartnerName("");
      setPartnerPhone("");
      setReferralNotes("");
      loadLead();
    } catch { setError("Failed to log referral."); }
    finally { setSaving(false); }
  };

  const handleIntentUpdate = async () => {
    if (!leadIntent) { setError("Select an intent level."); return; }
    setSaving(true);
    setError("");
    try {
      const admin = getAdminInfo();
      const res = await fetch(`/api/nursing/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_intent: leadIntent,
          note: `Intent marked as ${leadIntent}`,
          staff_id: admin.id,
          staff_name: admin.name,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setSuccessMsg("Intent updated!");
      setShowIntentForm(false);
      loadLead();
    } catch { setError("Failed to update intent."); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    setSaving(true);
    setError("");
    try {
      const admin = getAdminInfo();
      const staffName = staffList.find(s => s.id === assignStaffId)?.full_name || "Unassigned";

      if (assignStaffId) {
        // Assign: create assignment record (also updates legacy field via API)
        const res = await fetch(`/api/nursing/leads/${id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: assignStaffId,
            admin_id: admin.id,
          }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.message); return; }
      } else {
        // Unassign: remove all assignments and clear legacy field
        const currentStaffId = lead.assigned_staff_id;
        if (currentStaffId) {
          await fetch(`/api/nursing/leads/${id}/assign?staff_id=${currentStaffId}`, {
            method: "DELETE",
          });
        }
        // Also clear legacy field
        await fetch(`/api/nursing/leads/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assigned_staff_id: null,
            note: "Unassigned",
            staff_id: admin.id,
            staff_name: admin.name,
          }),
        });
      }

      setSuccessMsg("Assignment updated!");
      setShowAssignForm(false);
      loadLead();
    } catch { setError("Failed to assign."); }
    finally { setSaving(false); }
  };

  const handleFollowUp = async () => {
    if (!followUpDate) { setError("Select a follow-up date."); return; }
    setSaving(true);
    setError("");
    try {
      const admin = getAdminInfo();
      const res = await fetch(`/api/nursing/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follow_up_date: followUpDate,
          note: `Follow-up scheduled: ${new Date(followUpDate).toLocaleString("en-IN")}`,
          staff_id: admin.id,
          staff_name: admin.name,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setSuccessMsg("Follow-up set!");
      setShowFollowUp(false);
      loadLead();
    } catch { setError("Failed to set follow-up."); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0067A1]" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Lead not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-[#0067A1] hover:underline cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  const nextStatuses = getNextStatuses(lead.lead_status);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#0067A1]" />
            {lead.lead_id}
          </h1>
          <p className="text-sm text-gray-500">{lead.patient_name || lead.name} • {lead.patient_phone || lead.phone}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_CONFIG[lead.lead_status]?.color || "bg-gray-100 text-gray-700"}`}>
          {STATUS_CONFIG[lead.lead_status]?.label || lead.lead_status}
        </span>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${SLA_COLORS[lead.sla]}`}>
          {formatCompactDuration(lead.minutes_since_created)}
        </span>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError("")} className="ml-auto text-red-400 cursor-pointer">×</button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column: Patient + Lead Info ─────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Card — data from patient_details table when available */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0067A1]" /> Patient Details (Read-only)
              {lead.has_patient_record && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Verified Record</span>
              )}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Name</p><p className="font-medium text-gray-800">{lead.patient_name || lead.name}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium text-gray-800">{lead.patient_phone || lead.phone}</p></div>
              <div><p className="text-gray-500">Email</p><p className="font-medium text-gray-800">{lead.patient_email || lead.email || "—"}</p></div>
              <div><p className="text-gray-500">Age / DOB</p><p className="font-medium text-gray-800">{lead.patient_dob ? new Date(lead.patient_dob).toLocaleDateString("en-IN") : lead.patient_age || lead.age || "—"}</p></div>
              <div><p className="text-gray-500">Gender</p><p className="font-medium text-gray-800">{lead.patient_gender || lead.gender || "—"}</p></div>
              <div><p className="text-gray-500">Location</p><p className="font-medium text-gray-800">{lead.patient_address || `${lead.city || ""}${lead.locality ? `, ${lead.locality}` : ""}`}</p></div>
              {lead.patient_blood_group && (
                <div><p className="text-gray-500">Blood Group</p><p className="font-medium text-gray-800">{lead.patient_blood_group}</p></div>
              )}
              {lead.patient_emergency_contact && (
                <div><p className="text-gray-500">Emergency Contact</p><p className="font-medium text-gray-800">{lead.patient_emergency_contact}</p></div>
              )}
            </div>
          </div>

          {/* Care Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0067A1]" /> Care Requirements
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Care Types</p>
                <div className="flex flex-wrap gap-2">
                  {(lead.care_types || []).map((ct, i) => (
                    <span key={i} className="px-2 py-1 bg-[#0067A1]/10 text-[#0067A1] text-xs font-medium rounded">{ct}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-medium text-gray-800 text-sm">
                  {lead.duration === "single_visit" ? "Single Visit" : lead.duration === "short_term" ? "Short-term (few days)" : "Long-term (weeks/months)"}
                </p>
              </div>
              {lead.patient_notes && (
                <div>
                  <p className="text-xs text-gray-500">Patient Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">{lead.patient_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">Status Pipeline</h2>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg], i) => {
                const isActive = key === lead.lead_status;
                const isPast = Object.keys(STATUS_CONFIG).indexOf(key) < Object.keys(STATUS_CONFIG).indexOf(lead.lead_status);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${
                      isActive ? `${cfg.color} border-current` : isPast ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}>
                      {isPast && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {cfg.label}
                    </div>
                    {i < Object.entries(STATUS_CONFIG).length - 1 && (
                      <span className="text-gray-300">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consent Log */}
          {lead.consent && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0067A1]" /> Consent Log (Immutable)
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
                <p>Data Consent: <strong className="text-green-700">{lead.consent.data_consent ? "Yes" : "No"}</strong></p>
                <p>Communication Consent: <strong className="text-green-700">{lead.consent.communication_consent ? "Yes" : "No"}</strong></p>
                <p>Timestamp: {new Date(lead.consent.consent_timestamp).toLocaleString("en-IN")}</p>
                <p>IP: {lead.consent.ip_address || "—"} | Device: {lead.consent.device_type || "—"} | Form v{lead.consent.form_version}</p>
              </div>
            </div>
          )}

          {/* Referral Logs */}
          {lead.referrals?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#0067A1]" /> Referral History
              </h2>
              <div className="space-y-3">
                {lead.referrals.map((ref) => (
                  <div key={ref.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800">Partner: {ref.partner_name}</p>
                      <span className="text-xs text-gray-500">{new Date(ref.created_at).toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Channel: {ref.referral_channel} | Message Sent: {ref.message_sent ? "Yes" : "No"} | By: {ref.staff_name}
                    </p>
                    {ref.notes && <p className="text-xs text-gray-500 mt-1">{ref.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Audit Trail */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0067A1]" /> Notes & Audit Trail
              </h2>
              <button onClick={() => setShowNoteForm(!showNoteForm)}
                className="text-sm text-[#0067A1] font-medium hover:underline cursor-pointer">
                + Add Note
              </button>
            </div>

            {showNoteForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add an internal note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddNote} disabled={saving}
                    className="px-4 py-2 bg-[#0067A1] text-white text-sm rounded-lg hover:bg-[#004F7C] disabled:opacity-50 cursor-pointer">
                    {saving ? "Saving..." : "Save Note"}
                  </button>
                  <button onClick={() => setShowNoteForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(lead.notes_list || []).length === 0 ? (
                <p className="text-sm text-gray-400">No notes yet.</p>
              ) : (
                (lead.notes_list || [])
                  .map((note) => (
                    <div key={note.id} className={`p-3 rounded-lg text-sm border ${
                      note.note_type === "status_change" ? "border-blue-200 bg-blue-50" :
                      note.note_type === "call_outcome" ? "border-yellow-200 bg-yellow-50" :
                      "border-gray-200 bg-gray-50"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{note.staff_name}</span>
                          {note.note_type === "status_change" && (
                            <span className="text-xs bg-blue-200 text-[#004F7C] px-2 py-0.5 rounded">
                              {note.previous_status} → {note.new_status}
                            </span>
                          )}
                          {note.call_outcome && (
                            <span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded">
                              Call: {note.call_outcome.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-gray-700">{note.note}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column: Actions ─────────────────────── */}
        <div className="space-y-4">
          {/* Status Change */}
          {nextStatuses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">Update Status</h3>
              {!showStatusForm ? (
                <button onClick={() => setShowStatusForm(true)}
                  className="w-full py-2.5 bg-[#0067A1] text-white text-sm rounded-lg hover:bg-[#004F7C] cursor-pointer">
                  Change Status
                </button>
              ) : (
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
                  >
                    <option value="">Select Status</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                    ))}
                  </select>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
                  >
                    <option value="">Call Outcome (optional)</option>
                    {CALL_OUTCOMES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {newStatus === "NOT_CONVERTED" && (
                    <select
                      value={notConvertedReason}
                      onChange={(e) => setNotConvertedReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Select Reason *</option>
                      {NOT_CONVERTED_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  )}
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Note is mandatory for status change *"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleStatusChange} disabled={saving}
                      className="flex-1 py-2 bg-[#0067A1] text-white text-sm rounded-lg disabled:opacity-50 cursor-pointer">
                      {saving ? "Saving..." : "Update"}
                    </button>
                    <button onClick={() => setShowStatusForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Referral (only when QUALIFIED) */}
          {lead.lead_status === "QUALIFIED" && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">Share with Partner</h3>
              {!showReferralForm ? (
                <button onClick={() => setShowReferralForm(true)}
                  className="w-full py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 cursor-pointer">
                  Log Referral
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="Partner name *"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    placeholder="Partner phone (e.g. +91XXXXXXXXXX)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <select
                    value={referralChannel}
                    onChange={(e) => setReferralChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="website">Partner Website</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={messageSent} onChange={(e) => setMessageSent(e.target.checked)}
                      className="accent-[#0067A1]" />
                    Message sent to partner
                  </label>
                  <textarea
                    value={referralNotes}
                    onChange={(e) => setReferralNotes(e.target.value)}
                    placeholder="Referral notes (optional)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleReferral} disabled={saving}
                      className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-50 cursor-pointer">
                      {saving ? "Saving..." : "Log Referral"}
                    </button>
                    <button onClick={() => setShowReferralForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Intent */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Lead Intent</h3>
            {!showIntentForm ? (
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                  lead.lead_intent === "HIGH" ? "bg-red-100 text-red-700" :
                  lead.lead_intent === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                  lead.lead_intent === "LOW" ? "bg-gray-100 text-gray-700" :
                  "text-gray-400"
                }`}>
                  {lead.lead_intent || "Not Set"}
                </span>
                <button onClick={() => setShowIntentForm(true)}
                  className="text-sm text-[#0067A1] cursor-pointer hover:underline">Edit</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {["HIGH", "MEDIUM", "LOW"].map((i) => (
                    <button key={i} onClick={() => setLeadIntent(i)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg cursor-pointer ${
                        leadIntent === i
                          ? i === "HIGH" ? "bg-red-500 text-white" : i === "MEDIUM" ? "bg-yellow-500 text-white" : "bg-gray-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleIntentUpdate} disabled={saving}
                    className="flex-1 py-2 bg-[#0067A1] text-white text-sm rounded-lg disabled:opacity-50 cursor-pointer">Save</button>
                  <button onClick={() => setShowIntentForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Assign Staff */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Assigned Staff</h3>
            {!showAssignForm ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{lead.staffs?.full_name || "Unassigned"}</span>
                <button onClick={() => { setAssignStaffId(lead.assigned_staff_id || ""); setShowAssignForm(true); }}
                  className="text-sm text-[#0067A1] cursor-pointer hover:underline">Change</button>
              </div>
            ) : (
              <div className="space-y-3">
                <select value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleAssign} disabled={saving}
                    className="flex-1 py-2 bg-[#0067A1] text-white text-sm rounded-lg disabled:opacity-50 cursor-pointer">Save</button>
                  <button onClick={() => setShowAssignForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Follow-Up */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Follow-Up</h3>
            {lead.follow_up_date && (
              <p className="text-sm text-gray-600 mb-2">
                Scheduled: {new Date(lead.follow_up_date).toLocaleString("en-IN")}
              </p>
            )}
            {!showFollowUp ? (
              <button onClick={() => setShowFollowUp(true)}
                className="w-full py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 cursor-pointer">
                {lead.follow_up_date ? "Reschedule" : "Set Follow-Up"}</button>
            ) : (
              <div className="space-y-3">
                <input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <div className="flex gap-2">
                  <button onClick={handleFollowUp} disabled={saving}
                    className="flex-1 py-2 bg-[#0067A1] text-white text-sm rounded-lg disabled:opacity-50 cursor-pointer">Save</button>
                  <button onClick={() => setShowFollowUp(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Compliance Reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-bold text-amber-700 text-xs mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Staff Call Boundaries
            </h3>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Do NOT give medical advice</li>
              <li>• Do NOT recommend specific providers</li>
              <li>• Do NOT quote prices</li>
              <li>• Do NOT promise outcomes</li>
              <li>• Do NOT collect payment</li>
            </ul>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(lead.created_at).toLocaleString("en-IN")}</p>
            <p>Updated: {new Date(lead.updated_at).toLocaleString("en-IN")}</p>
            {lead.partner_name && <p>Partner: {lead.partner_name}</p>}
            {lead.not_converted_reason && <p>Not Converted: {lead.not_converted_reason.replace(/_/g, " ")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
