"use client";

import React, { useState, useEffect } from "react";
import { Users, ClipboardList, CheckCircle, Clock } from "lucide-react";

export default function DoctorAnalyticsWidget() {
  const [metrics, setMetrics] = useState({
    consultations_today: 0,
    completion_rate_7d: "0%",
    followups_pending: 0,
    total_patients: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const doctorId = localStorage.getItem("userId");
        if (!doctorId) return;
        
        const res = await fetch(`/api/doctors/analytics?doctor_id=${doctorId}`);
        const data = await res.json();
        
        if (data.success) {
          setMetrics(data.data);
        }
      } catch (err) {
        console.error("Failed to load doctor analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
            <div className="w-10 h-10 bg-slate-100 rounded-md mb-3"></div>
            <div className="h-5 bg-slate-100 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Consultations Today",
      value: metrics.consultations_today,
      icon: ClipboardList,
      color: "text-[#0067A1]",
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    {
      label: "Completion Rate (7d)",
      value: metrics.completion_rate_7d,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    },
    {
      label: "Pending Follow-ups",
      value: metrics.followups_pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100"
    },
    {
      label: "Total Patients",
      value: metrics.total_patients,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, idx) => (
        <div key={idx} className={`bg-white rounded-lg p-4 border ${stat.border} flex items-center gap-4 transition-colors hover:border-slate-300`}>
          <div className={`${stat.bg} ${stat.color} p-2.5 rounded-md flex-shrink-0`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl md:text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5 truncate">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
