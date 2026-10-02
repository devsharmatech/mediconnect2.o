"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  X, Phone, Mail, MapPin, Calendar, Clock,
  Package, Heart, ShieldCheck, ExternalLink,
  MessageSquare, User, CheckCircle2, AlertCircle,
  FileText, Check, Navigation, Send
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New Lead", color: "bg-blue-100 text-blue-700" },
  { value: "CONTACTED", label: "Contacted / Called", color: "bg-amber-100 text-amber-700" },
  { value: "QUALIFIED", label: "Requirement Verified", color: "bg-purple-100 text-purple-700" },
  { value: "SERVICE_STARTED", label: "Service Active / Delivered", color: "bg-emerald-100 text-emerald-700" },
  { value: "CLOSED", label: "Completed / Closed", color: "bg-gray-100 text-gray-700" },
  { value: "NOT_CONVERTED", label: "Not Converted / Cancelled", color: "bg-rose-100 text-rose-700" },
];

export default function PatientDetailModal({ lead, partnerId, onClose, onUpdated }) {
  if (!lead) return null;

  const [status, setStatus] = useState(lead.lead_status || "NEW");
  const [notes, setNotes] = useState(lead.partner_notes || "");
  const [saving, setSaving] = useState(false);

  const isEquipment = lead.type === "equipment" || !!lead.equipment_types;
  const cleanPhone = String(lead.phone || "").replace(/\D/g, "").slice(-10);

  // Address assembly
  const fullAddress = [
    lead.address,
    lead.locality,
    lead.city,
    lead.state,
    lead.pincode,
  ].filter(Boolean).join(", ");

  const mapQuery = encodeURIComponent(fullAddress || lead.city || "India");

  const handleSaveStatus = async () => {
    if (!partnerId) {
      toast.error("Partner session missing. Please refresh.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Updating patient lead...");

    try {
      const res = await fetch("/api/partner/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          lead_id: lead.lead_id,
          lead_type: isEquipment ? "equipment" : "nursing",
          status: status,
          notes: notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Lead status & notes updated!", { id: toastId });
        if (onUpdated) {
          onUpdated({
            ...lead,
            lead_status: status,
            partner_notes: notes,
          });
        }
        onClose();
      } else {
        toast.error(data.message || "Failed to update lead", { id: toastId });
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Server error while updating lead", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isEquipment ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-[#0067A1]"
            }`}>
              {isEquipment ? <Package className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {lead.name || "Patient Lead"}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold">
                  {lead.lead_id}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isEquipment ? "Medical Equipment Request" : "Home Nursing Care Request"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Quick Contact & Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Patient Primary Phone</p>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call +91 {cleanPhone}</span>
                </a>

                {cleanPhone && (
                  <a
                    href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || "Sir/Madam"}, we have received your request on MediConnect for ${isEquipment ? "Medical Equipment" : "Home Nursing Care"}. How can we assist you?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {lead.email ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Email Address</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="text-xs sm:text-sm text-[#0067A1] hover:underline font-medium flex items-center gap-1.5 truncate"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              </div>
            ) : null}
          </div>

          {/* Section 1: Kaha Se Hai (Location & Address) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0067A1]" />
              Patient Location &amp; Delivery Address (Lead Kaha Se Hai)
            </h4>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">City</span>
                  <span className="text-slate-800 font-semibold text-sm">{lead.city || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Locality / Landmark</span>
                  <span className="text-slate-800 font-semibold text-sm">{lead.locality || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">PIN Code</span>
                  <span className="text-slate-800 font-mono font-semibold text-sm">{lead.pincode || "—"}</span>
                </div>
              </div>

              {lead.address && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400 block font-medium">Full Street / Home Address</span>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium mt-0.5">{lead.address}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:underline font-medium"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Open Delivery Location in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Section 2: Requirement Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0067A1]" />
              Requirement Details &amp; Clinical Needs
            </h4>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block font-medium">
                    {isEquipment ? "Requested Equipment Item" : "Required Care Service"}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {isEquipment
                      ? (Array.isArray(lead.equipment_types) ? lead.equipment_types.join(", ") : lead.equipment_types || "Medical Equipment")
                      : (Array.isArray(lead.care_types) ? lead.care_types.join(", ") : lead.care_types || "Home Nursing Care")}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Service Duration / Plan</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {lead.duration || "Standard Duration"}
                  </p>
                </div>
              </div>

              {lead.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block font-medium mb-1">Patient Requirement Notes</span>
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-700 italic border border-slate-100">
                    "{lead.notes}"
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div>
                  <span>Lead Created: </span>
                  <strong className="text-slate-700">
                    {lead.created_at ? new Date(lead.created_at).toLocaleString("en-IN") : "—"}
                  </strong>
                </div>
                <div>
                  <span>Assigned to You: </span>
                  <strong className="text-slate-700">
                    {lead.assigned_at ? new Date(lead.assigned_at).toLocaleString("en-IN") : "Recently"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Status & Partner Follow-up Notes */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Update Lead Status &amp; Partner Follow-up
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Execution Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Keep status updated so MediConnect patient desk tracks delivery
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Internal Partner Notes / Follow-up Remarks
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Spoke with patient attendant. Oxygen concentrator scheduled for delivery at 4 PM."
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] resize-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveStatus}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Status &amp; Notes</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
