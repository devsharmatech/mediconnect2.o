"use client";

import { useState, useEffect } from "react";
import {
  FaUser,
  FaCalendarAlt,
  FaSearch,
  FaPhone,
  FaEnvelope,
  FaVenusMars,
  FaHistory
} from "react-icons/fa";

export default function DoctorMyPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        
        if (!userId) {
          setError("Please log in as a doctor.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/doctor/my-patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: userId })
        });
        
        const json = await res.json();
        if (json.success) {
          setPatients(json.data);
        } else {
          setError(json.message || "Failed to fetch patients");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("An error occurred while fetching patients.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => {
    const searchStr = searchTerm.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(searchStr) ||
      (p.email || "").toLowerCase().includes(searchStr) ||
      (p.phone || "").toLowerCase().includes(searchStr)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Patients Directory</h1>
          <p className="text-slate-500 mt-2">Track the patients you have treated and view consultation history.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search name, phone, email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1] shadow-sm bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading your patients...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100 p-8">
          <p className="font-semibold">{error}</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 p-8">
          <FaUser className="mx-auto text-4xl mb-4 text-slate-300" />
          <p className="font-semibold text-lg">No patients found</p>
          <p className="text-sm mt-1">When patients complete appointments with you, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPatients.map((patient, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center text-xl font-bold">
                    {patient.full_name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{patient.full_name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5"><FaVenusMars className="text-slate-400" /> {patient.gender || 'N/A'}</span>
                      {patient.blood_group && (
                        <>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-red-500 font-bold">{patient.blood_group}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                    <span className="text-2xl font-black text-indigo-600">{patient.visit_count}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Total Visits</span>
                  </div>
                </div>
              </div>

              <hr className="my-5 border-slate-100" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <FaPhone />
                  </div>
                  <span className="truncate">{patient.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <FaEnvelope />
                  </div>
                  <span className="truncate">{patient.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 sm:col-span-2">
                  <div className="w-8 h-8 rounded-full bg-[#0067A1]/5 flex items-center justify-center text-[#0067A1] shrink-0">
                    <FaHistory />
                  </div>
                  <div className="flex-1 flex justify-between items-center bg-[#0067A1]/5 px-3 py-2 rounded-lg border border-[#0067A1]/10">
                    <span className="font-medium text-[#0067A1]">Latest Appointment</span>
                    <span className="font-semibold text-slate-700">{formatDate(patient.last_visit_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
