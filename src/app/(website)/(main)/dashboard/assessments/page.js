"use client";

import React, { useState, useEffect } from "react";
import { FaHeartbeat, FaHistory, FaArrowLeft, FaDownload, FaEye, FaLightbulb } from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const formatRecommendationsText = (recommendations) => {
  if (!recommendations) return "";
  if (typeof recommendations === "string") {
    const trimmed = recommendations.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatRecommendationsText(parsed);
      } catch {
        // Not valid JSON, treat as raw string
      }
    }
    return recommendations.length > 180
      ? `${recommendations.substring(0, 180)}...`
      : recommendations;
  }
  if (Array.isArray(recommendations)) {
    const list = recommendations
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          return item.title || item.description || item.action_steps?.join(", ") || JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean);
    const combined = list.join("; ");
    return combined.length > 180 ? `${combined.substring(0, 180)}...` : combined;
  }
  if (typeof recommendations === "object") {
    const text =
      recommendations.description ||
      recommendations.title ||
      recommendations.summary ||
      JSON.stringify(recommendations);
    return text.length > 180 ? `${text.substring(0, 180)}...` : text;
  }
  return String(recommendations);
};

const AssessmentsPage = () => {
  const [user, setUser] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchAssessments();
    }
  }, [user, filter]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const typeParam = filter !== 'all' ? `&type=${filter}` : '';
      const response = await fetch(`/api/health/assessments?user_id=${user.id}&limit=50${typeParam}`);
      const data = await response.json();
      if (data.success) {
        setAssessments(data.data.assessments || []);
      }
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (assessmentId) => {
    try {
      toast.loading("Generating PDF report...", { id: "pdf-toast" });
      const response = await fetch(`/api/health/assessments/pdf?id=${assessmentId}`);
      const data = await response.json();
      if (data.success && data.data?.url) {
        toast.success("Opening PDF report...", { id: "pdf-toast" });
        window.location.href = data.data.url;
      } else {
        toast.error(data.message || "Failed to generate PDF", { id: "pdf-toast" });
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error("Failed to download PDF report", { id: "pdf-toast" });
    }
  };

  const getRiskBadge = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    if (filter === 'all') return true;
    return assessment.assessment_type === filter;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 py-4 sm:py-8 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/website/dashboard"
              className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors text-slate-600"
            >
              <FaArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Health Assessments
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Track and review your clinical health assessments
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 space-y-3">
          {/* Scrollable Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#0067A1] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              All Assessments ({assessments.length})
            </button>
            <button
              onClick={() => setFilter('heart')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                filter === 'heart'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70'
              }`}
            >
              <FaHeartbeat className="w-3.5 h-3.5" />
              Heart Health ({assessments.filter(a => a.assessment_type === 'heart').length})
            </button>
            <button
              onClick={() => setFilter('lung')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                filter === 'lung'
                  ? 'bg-[#0067A1] text-white shadow-xs'
                  : 'bg-teal-50 text-[#004F7C] hover:bg-teal-100/70'
              }`}
            >
              <TbLungsFilled className="w-3.5 h-3.5" />
              Lung Health ({assessments.filter(a => a.assessment_type === 'lung').length})
            </button>
          </div>

          {/* Quick Stat Links */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
            <Link
              href="/website/heart-health-statistics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100 font-medium transition-colors"
            >
              <FaHeartbeat className="w-3 h-3 text-rose-600" />
              View Heart Statistics
            </Link>
            <Link
              href="/website/lung-health-statistics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#004F7C] border border-teal-200/60 hover:bg-teal-100 font-medium transition-colors"
            >
              <TbLungsFilled className="w-3 h-3 text-[#0067A1]" />
              View Lung Statistics
            </Link>
          </div>
        </div>

        {/* Assessments List */}
        {loading ? (
          <LoadingScreen message="Loading assessments..." submessage="Fetching your health records" />
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-10 text-center">
            <FaHistory className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              No assessments found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-md mx-auto">
              {filter === 'all'
                ? "You haven't completed any health assessments yet."
                : `You haven't completed any ${filter} health assessments yet.`}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/website/heart-health"
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Take Heart Assessment
              </Link>
              <Link
                href="/website/lung-assessment"
                className="bg-teal-50 hover:bg-teal-100 text-[#0067A1] border border-teal-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Take Lung Assessment
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment, index) => (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 transition-all duration-200"
              >
                {/* Main Card Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Icon & Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`p-3 rounded-lg shrink-0 ${
                        assessment.assessment_type === 'heart'
                          ? 'bg-rose-50 border border-rose-200/60'
                          : 'bg-teal-50 border border-teal-200/60'
                      }`}
                    >
                      {assessment.assessment_type === 'heart' ? (
                        <FaHeartbeat className="w-5 h-5 text-rose-600" />
                      ) : (
                        <TbLungsFilled className="w-5 h-5 text-[#0067A1]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 capitalize">
                          {assessment.assessment_type} Health Assessment
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {new Date(assessment.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right: Risk Badge, Score & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getRiskBadge(
                          assessment.risk_level
                        )}`}
                      >
                        {assessment.risk_level
                          ? assessment.risk_level.charAt(0).toUpperCase() + assessment.risk_level.slice(1)
                          : 'N/A'}{' '}
                        Risk
                      </span>
                      {(assessment.health_score || assessment.overall_score) && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Score: {assessment.health_score || assessment.overall_score}/100
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => downloadPDF(assessment.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
                        title="Download PDF Report"
                      >
                        <FaDownload className="w-3 h-3 text-slate-600" />
                        <span className="hidden xs:inline">PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recommendations Box */}
                {assessment.recommendations && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs leading-relaxed text-slate-700 flex items-start gap-2.5">
                      <FaLightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold text-slate-900 block mb-0.5">
                          Key Clinical Recommendations:
                        </strong>
                        <span className="text-slate-600 font-normal">
                          {formatRecommendationsText(assessment.recommendations)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentsPage;