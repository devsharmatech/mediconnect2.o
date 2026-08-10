"use client";

import { useState, useEffect } from "react";
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaVideo,
  FaClinicMedical
} from "react-icons/fa";

export default function BookingAttemptsPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        const doctorId = localStorage.getItem("userId");
        if (!doctorId) {
          setError("User not logged in");
          return;
        }

        const res = await fetch("/api/doctor/booking-attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: doctorId })
        });

        const json = await res.json();
        if (json.success) {
          setAttempts(json.data);
        } else {
          setError(json.message || "Failed to fetch attempts");
        }
      } catch (err) {
        console.error("Error fetching attempts:", err);
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, []);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit"><FaCheckCircle/> Completed</span>;
      case 'initiated':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit"><FaClock/> Initiated (Abandoned)</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">{status}</span>;
    }
  };

  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter(a => a.status === 'completed').length;
  const conversionRate = totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Attempts</h1>
          <p className="text-sm text-gray-500 mt-1">Track patient drop-offs and successful bookings.</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <FaUser className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Attempts</p>
            <p className="text-2xl font-bold text-gray-900">{totalAttempts}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-500">
            <FaCheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Completed Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{completedAttempts}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
            <FaMoneyBillWave className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#0067A1] border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading attempts...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : attempts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No booking attempts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Date/Time</th>
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Appointment Info</th>
                  <th className="px-6 py-4">Fee</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(attempt.created_at).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {attempt.patient ? (
                        <>
                          <p className="font-medium text-gray-900">{attempt.patient.full_name || 'Guest'}</p>
                          <p className="text-xs text-gray-500">{attempt.patient.phone || attempt.patient.email}</p>
                        </>
                      ) : (
                        <p className="text-gray-500 italic">Guest / Unauthenticated</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 flex items-center gap-1.5">
                        <FaCalendarAlt className="text-gray-400" />
                        {attempt.appointment_date} @ {attempt.appointment_time}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        {attempt.appointment_type === 'video_consultation' ? <FaVideo className="text-blue-500" /> : <FaClinicMedical className="text-green-500" />}
                        <span className="capitalize">{attempt.appointment_type?.replace('_', ' ')}</span>
                      </p>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ₹{attempt.fee}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(attempt.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
