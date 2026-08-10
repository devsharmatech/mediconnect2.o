"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
  Activity,
  Pill,
  ShieldAlert,
  Star,
  Sparkles,
  FolderLock,
  ExternalLink,
  Clock,
  X
} from "lucide-react";
import { toast } from "react-hot-toast";
import SessionStateTracker from "./SessionStateTracker";

export default function ConsultationWorkspace({ appointment, onConsultationUpdate }) {
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  
  // Safety Override State
  const [overrideRequired, setOverrideRequired] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [safetyFlags, setSafetyFlags] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Clinical Payload State
  const [clinicalData, setClinicalData] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
    investigations: "",
    follow_up: "3 days",
    vitals: {
      blood_pressure: "",
      heart_rate: "",
      temperature: "",
      spo2: "",
    },
    prescriptions: [],
  });

  // Helpers & Autocomplete Masters State
  const [favoriteMeds, setFavoriteMeds] = useState([]);
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState([]);
  const [lastSavedPayload, setLastSavedPayload] = useState("");
  const [quickMode, setQuickMode] = useState(false);
  const [symptomMaster, setSymptomMaster] = useState([]);
  const [diagnosisMaster, setDiagnosisMaster] = useState([]);
  const [labMaster, setLabMaster] = useState([]);
  const [medicineMaster, setMedicineMaster] = useState([]);

  // Shared Documents State
  const [showSharedDocs, setShowSharedDocs] = useState(false);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const isCompleted = appointment.status === "COMPLETED" || appointment.status === "CLOSED_RESOLVED";

  // Load existing data if any (from DRAFT)
  useEffect(() => {
    const fetchDraft = async () => {
      if (!appointment?.id) return;
      try {
        const res = await fetch(`/api/consultation/${appointment.id}`);
        const json = await res.json();
        if (json.success && json.data?.consultation?.draft) {
          const draft = json.data.consultation.draft;
          setClinicalData({
            symptoms: Array.isArray(draft.symptoms) ? draft.symptoms.join(", ") : (draft.symptoms || ""),
            diagnosis: draft.diagnosis || "",
            notes: draft.notes || "",
            investigations: Array.isArray(draft.investigations) ? draft.investigations.join(", ") : (draft.investigations || ""),
            follow_up: draft.follow_up || "3 days",
            vitals: {
              blood_pressure: draft.vitals?.blood_pressure || "",
              heart_rate: draft.vitals?.heart_rate || "",
              temperature: draft.vitals?.temperature || "",
              spo2: draft.vitals?.spo2 || "",
            },
            prescriptions: Array.isArray(draft.prescriptions) ? draft.prescriptions : [],
          });
          
          const formatted = {
            symptoms: Array.isArray(draft.symptoms) ? draft.symptoms : [],
            diagnosis: draft.diagnosis || "",
            notes: draft.notes || "",
            vitals: draft.vitals || {},
            prescriptions: Array.isArray(draft.prescriptions) ? draft.prescriptions : [],
            investigations: Array.isArray(draft.investigations) ? draft.investigations : [],
            follow_up: draft.follow_up || "3 days",
          };
          setLastSavedPayload(JSON.stringify(formatted));
        }
      } catch (err) {
        console.error("Failed to load consultation draft:", err);
      }
    };
    fetchDraft();
  }, [appointment?.id]);

  // Load Contextual Doctor Helpers & Masters
  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        const doctorId = localStorage.getItem("userId");
        if (!doctorId) return;

        // Fetch favorites
        fetch(`/api/doctors/favorites?doctor_id=${doctorId}`)
          .then(r => r.json())
          .then(json => { if (json.success) setFavoriteMeds(json.data.favorites || []); })
          .catch(console.error);

        // Fetch diagnosis suggestions
        fetch(`/api/doctors/diagnosis-suggestions?doctor_id=${doctorId}&complaint_id=general-illness`)
          .then(r => r.json())
          .then(json => { if (json.success) setDiagnosisSuggestions(json.data.suggestions || []); })
          .catch(console.error);

        // Fetch autocomplete master lists
        fetch("/api/admin/medicines")
          .then(r => r.json())
          .then(json => { if (json.success) setMedicineMaster(json.data.filter(d => d.is_active)); })
          .catch(console.error);

        fetch("/api/admin/diagnosis?limit=200")
          .then(r => r.json())
          .then(json => { if (json.success) setDiagnosisMaster(json.data.filter(d => d.is_active)); })
          .catch(console.error);

        fetch("/api/admin/clinical-repository?table=cr_complaint_master&limit=200")
          .then(r => r.json())
          .then(json => { if (json.success && json.data) setSymptomMaster([...new Set(json.data.map(d => d.canonical_complaint).filter(Boolean))].sort()); })
          .catch(console.error);

        fetch("/api/admin/lab-tests?limit=200")
          .then(r => r.json())
          .then(json => { if (json.success) setLabMaster(json.data.filter(l => l.is_active)); })
          .catch(console.error);

      } catch (err) {
        console.error("Failed to load helpers", err);
      }
    };
    
    if (!isCompleted) {
      fetchHelpers();
    }
  }, [isCompleted]);

  // F8: AUTO-SAVE ENGINE (Every 5 seconds as per PDF)
  useEffect(() => {
    if (isCompleted || loading || completing) return;

    const timer = setInterval(() => {
        // Trigger save if there's any content
        if (clinicalData.diagnosis || clinicalData.symptoms || clinicalData.prescriptions.length > 0) {
            handleAction("save", true);
        }
    }, 5000); 

    return () => clearInterval(timer);
  }, [clinicalData, isCompleted, loading, completing, lastSavedPayload, isOffline]);

  // NETWORK DETECTION & AUTO-SYNC
  useEffect(() => {
    const handleOnline = () => {
        setIsOffline(false);
        syncLocalOutbox();
    };
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
        setIsOffline(!navigator.onLine);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
    }

    return () => {
        if (typeof window !== "undefined") {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        }
    };
  }, []);

  const syncLocalOutbox = async () => {
    if (syncing || !navigator.onLine) return;
    
    const outbox = JSON.parse(localStorage.getItem("clinical_outbox") || "[]");
    if (outbox.length === 0) return;

    setSyncing(true);
    const item = outbox[0]; // Process one by one

    // Safety guard: complete actions should NEVER be in offline queue (blocked at source).
    // If somehow one got in, discard it — it cannot be safely retried without a fresh idempotency key.
    if (item.action === "complete") {
        console.warn("[OfflineSync] Discarding unsafe complete action from outbox. Requires network.");
        const newOutbox = outbox.slice(1);
        localStorage.setItem("clinical_outbox", JSON.stringify(newOutbox));
        setSyncing(false);
        return;
    }
    
    try {
        const doctorId = localStorage.getItem("userId");
        const res = await fetch("/api/consultation/manage", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${doctorId}` },
            body: JSON.stringify(item),
        });

        if (res.ok) {
            // Success - remove from outbox
            const newOutbox = outbox.slice(1);
            localStorage.setItem("clinical_outbox", JSON.stringify(newOutbox));
            toast.success("Offline data synced successfully!", { id: "sync-success" });
            
            // If more items, continue syncing
            if (newOutbox.length > 0) {
                setTimeout(syncLocalOutbox, 1000);
            }
        } else {
            // Non-ok response — increment retry count, discard after 3 failures
            const updatedItem = { ...item, _retries: (item._retries || 0) + 1 };
            if (updatedItem._retries >= 3) {
                console.error("[OfflineSync] Permanently discarding item after 3 failures:", item.consultation_id);
                const newOutbox = outbox.slice(1);
                localStorage.setItem("clinical_outbox", JSON.stringify(newOutbox));
                toast.error("Failed to sync offline draft. It has been discarded.", { id: "sync-failure" });
            } else {
                const newOutbox = [updatedItem, ...outbox.slice(1)];
                localStorage.setItem("clinical_outbox", JSON.stringify(newOutbox));
            }
        }
    } catch (err) {
        console.warn("Sync failed, will retry on next connection", err);
    } finally {
        setSyncing(false);
    }
  };


  const handleVitalChange = (e) => {
    setClinicalData((prev) => ({
      ...prev,
      vitals: { ...prev.vitals, [e.target.name]: e.target.value },
    }));
  };

  const addMedicine = () => {
    setClinicalData((prev) => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        { medicine_name: "", dosage: "", frequency: "", duration_days: "", instructions: "" },
      ],
    }));
  };

  const updateMedicine = (index, field, value) => {
    const newPrescriptions = [...clinicalData.prescriptions];
    newPrescriptions[index][field] = value;
    setClinicalData((prev) => ({ ...prev, prescriptions: newPrescriptions }));
  };

  const removeMedicine = (index) => {
    const newPrescriptions = [...clinicalData.prescriptions];
    newPrescriptions.splice(index, 1);
    setClinicalData((prev) => ({ ...prev, prescriptions: newPrescriptions }));
  };


  const handleAction = async (actionType, silent = false) => {
    try {
      if (actionType === "save" && !silent) setLoading(true);
      if (actionType === "complete") setCompleting(true);
      setError(null);

      // Map prescriptions to drug names array for safety checks if needed or pass the full object
      const formattedPayload = {
        symptoms: clinicalData.symptoms ? clinicalData.symptoms.split(",").map((s) => s.trim()) : [],
        diagnosis: clinicalData.diagnosis,
        notes: clinicalData.notes,
        vitals: clinicalData.vitals,
        prescriptions: clinicalData.prescriptions,
        investigations: clinicalData.investigations ? clinicalData.investigations.split(",").map((s) => s.trim()) : [],
        follow_up: clinicalData.follow_up,
      };

      const currentPayloadString = JSON.stringify(formattedPayload);
      if (actionType === "save" && currentPayloadString === lastSavedPayload) return;

      // ── OFFLINE HANDLING ──
      if (actionType === "save" && (isOffline || !navigator.onLine)) {
          const outboxItem = {
              consultation_id: appointment.id,
              care_episode_id: appointment.care_episode_id || null,
              action: "save",
              clinical_payload: formattedPayload,
              timestamp: new Date().toISOString(),
          };
          const outbox = JSON.parse(localStorage.getItem("clinical_outbox") || "[]");
          // Update existing or add new
          const existingIdx = outbox.findIndex(i => i.consultation_id === appointment.id);
          if (existingIdx > -1) outbox[existingIdx] = outboxItem;
          else outbox.push(outboxItem);
          
          localStorage.setItem("clinical_outbox", JSON.stringify(outbox));
          if (!silent) toast.success("Saved locally (Offline mode)");
          setLastSavedPayload(currentPayloadString);
          return;
      }

      if (actionType === "complete" && (isOffline || !navigator.onLine)) {
          toast.error("Network connection required to complete and lock consultation.");
          return;
      }

      const doctorId = localStorage.getItem("userId");
      
      const payload = {
        consultation_id: appointment.id,
        care_episode_id: appointment.care_episode_id || null,  // needed for outbox event
        action: actionType,
        clinical_payload: formattedPayload,
        override_reason: overrideRequired && overrideReason ? overrideReason : undefined,
        mode_used: quickMode ? "QUICK_MODE" : "STANDARD_MODE",
      };

      if (actionType === "complete") {
        payload.idempotency_key = crypto.randomUUID();
      }

      const res = await fetch("/api/consultation/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doctorId}`,  // required by requireDoctorOwnership guard
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 422 && data.data?.requires_override) {
            setOverrideRequired(true);
            setSafetyFlags(data.data.safety_flags || []);
            setError(data.error);
            toast.error("High severity clinical risk detected. Override required.");
            return;
        }
        if (res.status === 422 && data.data?.critical_violations) {
            // Legal checks blocking completion
            let msg = data.error + "\n\n";
            data.data.critical_violations.forEach(v => msg += "• " + v + "\n");
            setError(msg);
            setOverrideRequired(false);
            toast.error("Critical legal warnings block completion. See above.");
            return;
        }
        throw new Error(data.error || data.message || "Failed to update consultation.");
      }

      if (actionType === "save") {
        if (!silent) toast.success("Draft saved successfully.");
        setLastSavedPayload(currentPayloadString);
      } else if (actionType === "complete") {
        if (data.data?.validation_warnings?.length > 0) {
           toast.success("Consultation Completed (With Warnings)");
        } else {
           toast.success("Consultation Completed!");
        }
        if (onConsultationUpdate) onConsultationUpdate();
      }

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save consultation.");
      setError(err.message);
    } finally {
      if (actionType === "save") setLoading(false);
      if (actionType === "complete") setCompleting(false);
    }
  };

  const fetchSharedDocs = async () => {
    setLoadingDocs(true);
    try {
      const doctorId = localStorage.getItem("userId");
      const res = await fetch(`/api/digital-locker/shared-with-me?doctor_id=${doctorId}&patient_id=${appointment.patient_id}`);
      const data = await res.json();
      if (data.success) {
        setSharedDocs(data.documents || []);
      }
    } catch (err) {
      console.error("Fetch shared docs error:", err);
      toast.error("Failed to fetch shared documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  return (
    <div className="space-y-6">
      <SessionStateTracker 
        userId={typeof window !== "undefined" ? localStorage.getItem("userId") : null}
        careEpisodeId={appointment.care_episode_id || null}
        consultationId={appointment.id}
        currentScreen="DOCTOR_CONSULTATION_WORKSPACE"
      />
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-[#0067A1] flex items-center gap-2">
          <Activity className="w-5 h-5" /> Consultation Session
          {isOffline && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full animate-pulse border border-red-200">
              OFFLINE
            </span>
          )}
          {syncing && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-[#0067A1] text-[10px] font-bold rounded-full border border-blue-200 flex items-center gap-1">
              <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />
              SYNCING...
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${quickMode ? 'text-slate-400' : 'text-indigo-600'}`}>Standard</span>
            <button 
              onClick={() => {
                if (isCompleted) return;
                const newMode = !quickMode;
                setQuickMode(newMode);
                if (newMode) {
                  // Auto-populate defaults for Quick Mode
                  setClinicalData(prev => ({
                    ...prev,
                    diagnosis: prev.diagnosis || "Routine medical consultation",
                    notes: prev.notes || "Standard evaluation completed via Quick Mode.",
                    vitals: {
                      ...prev.vitals,
                      severity: prev.vitals.severity || "NORMAL"
                    }
                  }));
                }
              }}
              disabled={isCompleted}
              className={`w-10 h-5 rounded-full relative transition-all duration-200 ${quickMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ${quickMode ? 'left-6' : 'left-1'}`} />
            </button>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${quickMode ? 'text-indigo-600' : 'text-slate-400'}`}>Quick Mode</span>
          </div>
        </div>
      </div>

      {quickMode && !isCompleted && (
        <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <p className="text-xs font-medium text-indigo-900">
            <span className="font-bold">Quick Mode Active:</span> Validation rules are relaxed and quality is marked LOW to maximize efficiency.
          </p>
        </div>
      )}
      
      {error && !overrideRequired && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <div className="flex">
            <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-red-800">Critical Validation Error</h3>
              <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
              <button 
                onClick={() => handleAction(loading ? "save" : "complete")}
                className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Retry Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Override Block */}
      {overrideRequired && !isCompleted && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
            <div className="w-full">
              <h3 className="text-base font-bold text-amber-900">High Clinical Risk Detected</h3>
              <p className="text-sm text-amber-800 mt-1 mb-3">
                The safety engine has flagged these prescriptions as high risk. To proceed, you must acknowledge the risk and provide medical justification.
              </p>
              
              <ul className="space-y-2 mb-4">
                {safetyFlags.map((flag, idx) => (
                  <li key={idx} className={`p-3 rounded-lg border flex items-start gap-3 ${
                    flag.severity === 'HIGH' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-yellow-50 border-yellow-200 text-yellow-900'
                  }`}>
                    {flag.severity === 'HIGH' ? <ShieldAlert className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">{flag.severity} RISK: {flag.type || flag.flag_type}</p>
                      <p className="text-sm mt-0.5">{flag.description || flag.message}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-amber-900">
                  Override Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the clinical reasoning for proceeding with this prescription..."
                  className="w-full text-sm border-amber-200 bg-white rounded-xl focus:border-amber-500 focus:ring-amber-500 px-3 py-2 border shadow-inner min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-medium">This consultation is completed and locked. No further modifications allowed.</p>
        </div>
      )}

      {/* Clinical Notes */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <h4 className="text-sm font-semibold text-[#0067A1] flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4" /> Clinical Assessment
        </h4>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Symptoms (comma separated)</label>
            <input
              type="text"
              disabled={isCompleted}
              list="symptoms-list"
              value={clinicalData.symptoms}
              onChange={(e) => setClinicalData({ ...clinicalData, symptoms: e.target.value })}
              placeholder="e.g. Fever, Cough, Headache"
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Primary Diagnosis</label>
            <input
              type="text"
              disabled={isCompleted}
              list="diagnosis-list"
              value={clinicalData.diagnosis}
              onChange={(e) => setClinicalData({ ...clinicalData, diagnosis: e.target.value })}
              placeholder="Enter diagnosis..."
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
            />
            {diagnosisSuggestions.length > 0 && !isCompleted && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Suggestions:
                </span>
                {diagnosisSuggestions.map((ds, idx) => (
                  <button
                    key={idx}
                    onClick={() => setClinicalData((prev) => ({ ...prev, diagnosis: ds.diagnosis_id }))}
                    className="px-2.5 py-1 text-xs font-medium bg-[#0067A1]/5 text-[#0067A1] border border-[#0067A1]/20 rounded-lg hover:bg-[#0067A1] hover:text-white transition-colors"
                  >
                    {ds.diagnosis_id.charAt(0).toUpperCase() + ds.diagnosis_id.slice(1).replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Investigations / Lab Tests (comma separated)</label>
              <input
                type="text"
                disabled={isCompleted}
                list="labs-list"
                value={clinicalData.investigations || ""}
                onChange={(e) => setClinicalData({ ...clinicalData, investigations: e.target.value })}
                placeholder="e.g. CBC, HbA1c, Vitamin D"
                className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Follow-up</label>
              <input
                type="text"
                disabled={isCompleted}
                list="followup-list"
                value={clinicalData.follow_up || ""}
                onChange={(e) => setClinicalData({ ...clinicalData, follow_up: e.target.value })}
                placeholder="e.g. 3 days, 1 week"
                className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clinical Notes (Treatment / Advice)</label>
            <textarea
              rows={3}
              disabled={isCompleted}
              list="notes-list"
              value={clinicalData.notes}
              onChange={(e) => setClinicalData({ ...clinicalData, notes: e.target.value })}
              placeholder="Enter detailed observation notes..."
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border resize-none"
            />
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <h4 className="text-sm font-semibold text-[#0067A1] flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4" /> Vitals
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">BP (mmHg)</label>
            <input
              type="text"
              name="blood_pressure"
              disabled={isCompleted}
              value={clinicalData.vitals.blood_pressure}
              onChange={handleVitalChange}
              placeholder="120/80"
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Heart Rate (bpm)</label>
            <input
              type="text"
              name="heart_rate"
              disabled={isCompleted}
              value={clinicalData.vitals.heart_rate}
              onChange={handleVitalChange}
              placeholder="72"
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Temp (°F)</label>
            <input
              type="text"
              name="temperature"
              disabled={isCompleted}
              value={clinicalData.vitals.temperature}
              onChange={handleVitalChange}
              placeholder="98.6"
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">SpO2 (%)</label>
            <input
              type="text"
              name="spo2"
              disabled={isCompleted}
              value={clinicalData.vitals.spo2}
              onChange={handleVitalChange}
              placeholder="98"
              className="w-full text-sm border-slate-200 rounded-xl focus:border-[#0067A1] focus:ring-[#0067A1] disabled:bg-slate-100 px-3 py-2 border"
            />
          </div>
        </div>
      </div>

      {/* Prescription Builder */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-[#0067A1] flex items-center gap-2">
            <Pill className="w-4 h-4" /> E-Prescription
          </h4>
          {!isCompleted &&(
            <button
              onClick={addMedicine}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0067A1] border border-[#0067A1]/20 bg-white px-3 py-1.5 rounded-lg hover:bg-[#0067A1]/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medicine
            </button>
          )}
        </div>

        {favoriteMeds.length > 0 && !isCompleted && (
          <div className="mb-4 pb-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Quick Add:
            </span>
            {favoriteMeds.map((fav, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setClinicalData(prev => ({
                    ...prev,
                    prescriptions: [...prev.prescriptions, { medicine_name: fav.medicine_name, dosage: "", frequency: "", duration_days: "", instructions: "" }]
                  }));
                }}
                className="whitespace-nowrap px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-[#0067A1] hover:text-white border border-transparent rounded-full text-xs font-medium transition-all shadow-sm"
              >
                + {fav.medicine_name}
              </button>
            ))}
          </div>
        )}

        {clinicalData.prescriptions.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <p className="text-sm text-slate-500">No medicines prescribed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clinicalData.prescriptions.map((med, idx) => (
              <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl relative group">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Medicine Name</label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      list="medicines-list"
                      value={med.medicine_name}
                      onChange={(e) => updateMedicine(idx, "medicine_name", e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      className="w-full text-sm border-slate-200 rounded-lg focus:border-[#0067A1] focus:ring-[#0067A1] py-1.5 px-3 border disabled:bg-slate-50"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Dosage/Freq</label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      value={med.frequency}
                      onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                      placeholder="e.g. 1-0-1 (After Food)"
                      className="w-full text-sm border-slate-200 rounded-lg focus:border-[#0067A1] focus:ring-[#0067A1] py-1.5 px-3 border disabled:bg-slate-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Duration</label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      value={med.duration_days}
                      onChange={(e) => updateMedicine(idx, "duration_days", e.target.value)}
                      placeholder="e.g. 5 Days"
                      className="w-full text-sm border-slate-200 rounded-lg focus:border-[#0067A1] focus:ring-[#0067A1] py-1.5 px-3 border disabled:bg-slate-50"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      value={med.instructions}
                      onChange={(e) => updateMedicine(idx, "instructions", e.target.value)}
                      placeholder="Instructions..."
                      className="w-full text-sm border-slate-200 rounded-lg focus:border-[#0067A1] focus:ring-[#0067A1] py-1.5 px-3 border disabled:bg-slate-50"
                    />
                  </div>
                </div>
                {!isCompleted && (
                  <button
                    onClick={() => removeMedicine(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center border border-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
          <p className="flex-1 text-xs text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Completing the consultation will run final legal safety checks & lock the record permanently.
          </p>
          <button
            onClick={() => handleAction("save")}
            disabled={loading || completing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#0067A1] text-[#0067A1] font-semibold text-sm hover:bg-[#0067A1]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          
          <button
            onClick={() => handleAction("complete")}
            disabled={loading || completing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white font-semibold text-sm shadow-lg shadow-[#0067A1]/20 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
             {completing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Complete Consultation
          </button>
        </div>
      )}

      {/* FIXED FLOATING BUTTON FOR SHARED DOCUMENTS */}
      <button
        onClick={() => {
          setShowSharedDocs(true);
          fetchSharedDocs();
        }}
        className="fixed right-6 bottom-28 z-40 bg-[#0067A1] text-white p-4 rounded-2xl shadow-2xl shadow-[#0067A1]/40 hover:scale-110 active:scale-95 transition-all group flex items-center gap-3"
      >
        <div className="relative">
          <FolderLock className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0067A1] animate-pulse"></span>
        </div>
        <span className="font-bold text-sm hidden group-hover:block transition-all whitespace-nowrap">Patient Shared Docs</span>
      </button>

      {/* SHARED DOCUMENTS MODAL */}
      {showSharedDocs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSharedDocs(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0067A1]/10 rounded-xl flex items-center justify-center">
                  <FolderLock className="w-6 h-6 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Shared Documents</h3>
                  <p className="text-xs text-slate-500 font-medium">Temporarily authorized clinical records</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSharedDocs(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loadingDocs ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold text-slate-400">Verifying secure access...</p>
                </div>
              ) : sharedDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert className="w-10 h-10 text-slate-200" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-700 mb-1">No Shared Documents</h4>
                  <p className="text-sm text-slate-400 max-w-xs">The patient hasn't shared any documents for this appointment yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sharedDocs.map((doc) => (
                    <div key={doc.id} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#0067A1]/30 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-[#0067A1]/5 transition-colors">
                            <FileText className="w-6 h-6 text-slate-400 group-hover:text-[#0067A1]" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-800 group-hover:text-[#0067A1] transition-colors">
                              {doc.document_name || "Document Unavailable"}
                            </h5>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{doc.description || "No description provided"}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                <Clock className="w-3 h-3" />
                                Expires: {new Date(doc.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Type: {doc.document_type || doc.file_type || 'N/A'}
                              </span>
                              {doc.file_size && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Size: {(doc.file_size / 1024).toFixed(1)} KB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {doc.file_url ? (
                          <a 
                            href={doc.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-[#0067A1] hover:text-white transition-all shadow-sm text-xs font-bold flex items-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Record
                          </a>
                        ) : (
                          <button 
                            disabled
                            className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl transition-all text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            Unavailable
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-50">
              <div className="p-4 bg-[#0067A1]/5 rounded-2xl border border-[#0067A1]/10 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#0067A1] mt-0.5" />
                <p className="text-[10px] font-bold text-[#0067A1]/70 uppercase tracking-wider leading-relaxed">
                  Layer-111 Security Protocol: Access to these records is temporary and logged. 
                  Sharing or downloading without authorization is prohibited.
                </p>
            </div>
          </div>
        </div>
      </div>
      )}
      {/* Autocomplete Datalists */}
      <datalist id="symptoms-list">
        {symptomMaster.map((sym, i) => <option key={i} value={sym} />)}
      </datalist>
      <datalist id="diagnosis-list">
        {diagnosisMaster.map((diag, i) => (
          <option key={i} value={diag.name || diag.id} />
        ))}
      </datalist>
      <datalist id="labs-list">
        {labMaster.map((lab, i) => (
          <option key={i} value={lab.test_name || lab.name} />
        ))}
      </datalist>
      <datalist id="medicines-list">
        {medicineMaster.map((med, i) => (
          <option key={i} value={med.name || med.medicine_name} />
        ))}
      </datalist>
      <datalist id="notes-list">
        <option value="Take rest, drink plenty of fluids." />
        <option value="Avoid oily, spicy food and cold drinks." />
        <option value="Take medications strictly after meals." />
        <option value="Monitor temperature every 4 hours." />
      </datalist>
      <datalist id="followup-list">
        <option value="3 days" />
        <option value="5 days" />
        <option value="1 week" />
        <option value="2 weeks" />
        <option value="Next month" />
      </datalist>

    </div>
  );
}
