import React, { useState } from "react";
import { FaTimes, FaHeartbeat, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function OutcomeTrackerModal({ isOpen, onClose, appointment, onSuccess }) {
  const [improvementStatus, setImprovementStatus] = useState("");
  const [adherence, setAdherence] = useState("full");
  const [symptomChange, setSymptomChange] = useState("same");
  const [severityChange, setSeverityChange] = useState("same");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!improvementStatus) {
      toast.error("Please indicate if you feel better, same, or worse.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("authToken") || localStorage.getItem("userId");

      const res = await fetch("/api/patient/outcome", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
          // patient_id is resolved server-side from this token — do NOT send in body
        },
        body: JSON.stringify({
          consultation_id: appointment.id,
          // patient_id intentionally omitted — resolved from auth token by backend
          improvement_status: improvementStatus,
          adherence,
          symptom_change: symptomChange,
          severity_change: severityChange,
          followup_completed: true,
          notes,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || "Failed to submit outcome.");
      }

      toast.success("Health outcome reported successfully. Thank you!");
      if (onSuccess) onSuccess(appointment.id, improvementStatus);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 focus:outline-none">
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <FaHeartbeat className="text-blue-500 w-5 h-5" />
            Follow-Up Health Check
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
            Your doctor requested a follow-up on your recent consultation. Please let us know how you are feeling to help guide your treatment.
          </p>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">How are you feeling overall? <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setImprovementStatus("better")}
                className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${improvementStatus === "better" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-2 ring-emerald-200" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50 text-gray-600"}`}
              >
                <FaCheckCircle className={improvementStatus === "better" ? "text-emerald-500" : "text-gray-400"} />
                Better
              </button>
              <button
                type="button"
                onClick={() => setImprovementStatus("same")}
                className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${improvementStatus === "same" ? "border-blue-500 bg-blue-50 text-[#004F7C] font-bold ring-2 ring-blue-200" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-600"}`}
              >
                <div className="w-4 h-1 bg-current rounded-full my-1.5" />
                Same
              </button>
              <button
                type="button"
                onClick={() => setImprovementStatus("worse")}
                className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${improvementStatus === "worse" ? "border-red-500 bg-red-50 text-red-700 font-bold ring-2 ring-red-200" : "border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600"}`}
              >
                <FaExclamationTriangle className={improvementStatus === "worse" ? "text-red-500" : "text-gray-400"} />
                Worse
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Are you taking your prescribed medicines?</label>
            <select 
              value={adherence} 
              onChange={(e) => setAdherence(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
            >
              <option value="full">Yes, exactly as prescribed (Full)</option>
              <option value="partial">Sometimes, I missed a few doses (Partial)</option>
              <option value="none">No, I haven&apos;t taken them (None)</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Any additional notes for the doctor? (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="E.g., Still have a slight cough..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !improvementStatus}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0067A1] to-indigo-600 text-white font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            {isSubmitting ? "Submitting..." : "Submit Health Update"}
          </button>
        </form>
      </div>
    </div>
  );
}
