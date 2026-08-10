"use client";

import React, { useState } from "react";
import { FaRobot, FaSearch, FaStethoscope, FaSpinner, FaArrowRight, FaExclamationCircle } from "react-icons/fa";

export default function AIAssistant({ onSpecialtySelected }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyzeSymptoms = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // 1. Complaint Mapping API
      const mappingRes = await fetch(`/api/clinical/complaint-mapping?query=${encodeURIComponent(query)}`);
      const mappingData = await mappingRes.json();

      if (!mappingData.success || !mappingData.data || mappingData.data.length === 0) {
        setError("I couldn't find a specific clinical match for those symptoms. Please try rephrasing or search for a specialty directly.");
        setLoading(false);
        return;
      }

      // Get the highest priority diagnosis from the first canonical complaint
      const topComplaint = mappingData.data[0];
      const topDiagnosis = topComplaint.diagnoses.sort((a, b) => a.priority_rank - b.priority_rank)[0];

      if (!topDiagnosis) {
        setError("Could not determine a diagnosis for those symptoms.");
        setLoading(false);
        return;
      }

      // 2. Diagnosis Details API (Routing)
      const detailsRes = await fetch(`/api/clinical/diagnosis-details?diagnosis_id=${topDiagnosis.diagnosis_id}`);
      const detailsData = await detailsRes.json();

      if (!detailsData.success || !detailsData.data || !detailsData.data.routing) {
        setError("Could not determine the appropriate specialty for this diagnosis.");
        setLoading(false);
        return;
      }

      setResult({
        complaint: topComplaint.canonical_complaint,
        diagnosis: topDiagnosis.diagnosis_name,
        specialty: detailsData.data.routing.primary_specialty
      });

    } catch (err) {
      console.error("AI Assistant Error:", err);
      setError("Something went wrong while analyzing your symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-lg border border-[#0067A1]/10 overflow-hidden mb-12">
      <div className="bg-[#0067A1] p-6 text-white flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-2xl">
          <FaRobot className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">AI Symptom Assistant</h2>
          <p className="text-emerald-100 text-sm mt-1">
            Describe how you're feeling, and our AI will recommend the right specialist.
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <form onSubmit={analyzeSymptoms} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="E.g., I have a severe headache and fever since yesterday..."
            className="w-full pl-6 pr-32 py-5 text-lg border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-[#0067A1] focus:ring-4 focus:ring-[#0067A1]/10 transition-all text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#0067A1] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#004F7C] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? <FaSpinner className="animate-spin w-5 h-5" /> : <FaSearch className="w-5 h-5" />}
            <span>Analyze</span>
          </button>
        </form>

        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
            <FaExclamationCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[#0067A1] font-bold text-sm mb-2 uppercase tracking-wider">
                  <FaStethoscope className="w-4 h-4" />
                  <span>AI Analysis Complete</span>
                </div>
                <h3 className="text-xl text-gray-900 font-semibold mb-1">
                  We recommend seeing a <span className="text-[#0067A1] font-bold">{result.specialty}</span>
                </h3>
                <p className="text-gray-600 text-sm">
                  Based on your symptoms, this aligns closely with <strong>{result.diagnosis}</strong>.
                </p>
              </div>
              <button
                onClick={() => onSpecialtySelected(result.specialty)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#0067A1] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#004F7C] transition-all shadow-lg shadow-[#0067A1]/20 active:scale-95 flex-shrink-0"
              >
                <span>Find Doctors</span>
                <FaArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
