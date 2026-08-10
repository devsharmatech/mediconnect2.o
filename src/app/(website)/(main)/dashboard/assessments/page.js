"use client";

import React, { useState, useEffect } from "react";
import { FaHeartbeat, FaHistory, FaArrowLeft, FaDownload, FaEye } from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";
import Link from "next/link";
import { motion } from "framer-motion";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

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
      const response = await fetch(`/api/health/assessments/pdf?id=${assessmentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-assessment-${assessmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'moderate': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    if (filter === 'all') return true;
    return assessment.assessment_type === filter;
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto ">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/website/dashboard" className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Health Assessments</h1>
              <p className="text-gray-600">View your health assessment history</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex gap-4 mb-4 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-[#0067A1]/10 text-[#0067A1]' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All Assessments ({assessments.length})
            </button>
            <button
              onClick={() => setFilter('heart')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filter === 'heart' ? 'bg-rose-100 text-rose-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <FaHeartbeat className="w-4 h-4" />
              Heart Health ({assessments.filter(a => a.assessment_type === 'heart').length})
            </button>
            <button
              onClick={() => setFilter('lung')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filter === 'lung' ? 'bg-[#0067A1]/10 text-[#0067A1]' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <TbLungsFilled className="w-4 h-4" />
              Lung Health ({assessments.filter(a => a.assessment_type === 'lung').length})
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <Link
              href="/website/heart-health-statistics"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium"
            >
              <FaHeartbeat className="w-3 h-3" />
              View heart statistics
            </Link>
            <Link
              href="/website/lung-health-statistics"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 text-[#004F7C] hover:bg-teal-100 font-medium"
            >
              <TbLungsFilled className="w-3 h-3" />
              View lung statistics
            </Link>
          </div>
        </div>

        {/* Assessments List */}
        {loading ? (
          <LoadingScreen message="Loading assessments..." submessage="Fetching your health records" />
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FaHistory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No assessments found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' ? 'You haven\'t taken any health assessments yet.' : `You haven't taken any ${filter} health assessments yet.`}
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/website/heart-health"
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Take Heart Assessment
              </Link>
              <Link
                href="/website/lung-assessment"
                className="bg-teal-50 hover:bg-teal-100 text-[#0067A1] px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Take Lung Assessment
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAssessments.map((assessment, index) => (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${assessment.assessment_type === 'heart' ? 'bg-rose-100' : 'bg-teal-100'
                      }`}>
                      {assessment.assessment_type === 'heart' ? (
                        <FaHeartbeat className={`w-6 h-6 ${assessment.assessment_type === 'heart' ? 'text-rose-600' : 'text-[#0067A1]'
                          }`} />
                      ) : (
                        <TbLungsFilled className={`w-6 h-6 ${assessment.assessment_type === 'heart' ? 'text-rose-600' : 'text-[#0067A1]'
                          }`} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 capitalize">
                        {assessment.assessment_type} Health Assessment
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(assessment.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(assessment.risk_level)}`}>
                        {assessment.risk_level?.charAt(0).toUpperCase() + assessment.risk_level?.slice(1) || 'N/A'} Risk
                      </div>
                      {(assessment.health_score || assessment.overall_score) && (
                        <div className="text-sm text-gray-600 mt-1">
                          Score: {assessment.health_score || assessment.overall_score}/100
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadPDF(assessment.id)}
                        className="p-2 text-gray-600 hover:text-[#0067A1] hover:bg-[#0067A1]/5 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <FaDownload className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:text-[#0067A1] hover:bg-[#0067A1]/5 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {assessment.recommendations && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700">
                      <strong>Key Recommendations:</strong> {assessment.recommendations.length > 150
                        ? `${assessment.recommendations.substring(0, 150)}...`
                        : assessment.recommendations}
                    </p>
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