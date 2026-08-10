"use client";

import React from "react";
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTimes, FaUserMd, FaIdCard, FaUser, FaMoneyBillWave, FaFileInvoiceDollar, FaBuilding } from "react-icons/fa";

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const s = String(status).toLowerCase();
  if (["booked", "approved", "freezed"].includes(s)) return "confirmed";
  return s;
};

const getStatusColor = (status) => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "expired":
      return "bg-gray-200 text-gray-700 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const capitalize = (value, fallback = "") => {
  const str = (value || fallback || "").toString().trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatSpecialty = (raw) => {
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.join(", ");

  const str = String(raw).trim();
  if (!str) return "";

  if (str.startsWith("[") && str.endsWith("]")) {
    const inner = str.slice(1, -1);
    const parts = inner
      .split(",")
      .map((p) => p.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    if (parts.length) return parts.join(", ");
  }

  return str;
};

const formatDate = (appointment) => {
  const raw = appointment?.date || appointment?.appointment_date;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (appointment) => {
  const time = appointment?.time || appointment?.appointment_time;
  if (!time) return "";
  const base = time.toString().slice(0, 5); // HH:mm
  const [hStr, mStr] = base.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return base;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${mStr} ${suffix}`;
};

const getAppointmentTypeLabel = (appointment) => {
  const raw =
    appointment?.appointment_type ||
    appointment?.type ||
    "consultation";
  const value = raw.toString().toLowerCase();

  if (["video", "video_consultation", "video_call"].includes(value)) {
    return "Video consultation";
  }
  if (["home", "home_visit"].includes(value)) {
    return "Home visit";
  }
  if (["clinic", "clinic_visit", "in_person"].includes(value)) {
    return "Clinic visit";
  }

  return capitalize(raw.toString().replace("_", " "), "Consultation");
};

const calculateAge = (dobString) => {
  if (!dobString) return "N/A";
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return "N/A";
  const ageDifMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + " yrs";
};

const AppointmentDetailsModal = ({ isOpen, onClose, appointment }) => {
  if (!isOpen || !appointment) return null;

  const status = normalizeStatus(appointment.status);

  // Doctor Info
  const doctorName = appointment.doctor?.name || appointment.doctor?.full_name || "Doctor";
  const specialty = formatSpecialty(appointment.doctor?.specialty || appointment.doctor?.specialization);
  const qualification = appointment.doctor?.qualification || "Not specified";
  const licenseNumber = appointment.doctor?.license_number || "Not specified";
  
  // Location & Clinic
  const type = String(appointment.appointment_type || appointment.type || "").toLowerCase();
  const isVideo = type.includes("video") || type.includes("call") || type.includes("instant");
  const clinicName = appointment.doctor?.clinic_name || "Online consultation";
  const clinicAddress = appointment.doctor?.clinic_address || "N/A";
  
  // Patient Info
  const patientName = appointment.patient?.full_name || "N/A";
  const patientAge = calculateAge(appointment.patient?.date_of_birth);
  const patientGender = appointment.patient?.gender ? capitalize(appointment.patient.gender) : "N/A";

  const dateLabel = formatDate(appointment);
  const timeLabel = formatTime(appointment);
  
  // Fee Calculation
  const getFee = () => {
    if (appointment.amount !== undefined && appointment.amount !== null) return Number(appointment.amount);
    if (!appointment.doctor) return 0;
    const doc = appointment.doctor;
    const type = String(appointment.appointment_type || appointment.type || "").toLowerCase();
    
    // Parse meta since video_consultation_fee and others might not exist as columns
    const meta = typeof doc.meta === 'string' ? JSON.parse(doc.meta || '{}') : (doc.meta || {});
    
    const videoFee = meta?.video_consultation_fee ?? doc.video_consultation_fee ?? doc.consultation_fee ?? 0;
    const clinicFee = meta?.clinic_consultation_fee ?? doc.clinic_consultation_fee ?? doc.consultation_fee ?? 0;
    const homeFee = meta?.home_visit_fee ?? doc.home_visit_fee ?? doc.consultation_fee ?? 0;
    const instantFee = meta?.instant_consultation_fee ?? doc.instant_consultation_fee ?? 0;

    if (type.includes("instant")) return Number(instantFee);
    if (type.includes("video")) return Number(videoFee);
    if (type.includes("clinic")) return Number(clinicFee);
    if (type.includes("home")) return Number(homeFee);
    return Number(doc.consultation_fee ?? 0);
  };
  const feePaid = getFee();
  const paymentStatus = (feePaid === 0 || appointment.payment_status === "paid" || appointment.payment_status === "completed") ? "Paid" : capitalize(appointment.payment_status || "pending");

  let diseaseInfo = null;
  if (appointment.disease_info) {
    if (typeof appointment.disease_info === "string") {
      try {
        const parsed = JSON.parse(appointment.disease_info);
        if (parsed && typeof parsed === "object") {
          diseaseInfo = parsed;
        }
      } catch (e) {
        diseaseInfo = { summary: appointment.disease_info };
      }
    } else if (typeof appointment.disease_info === "object") {
      diseaseInfo = appointment.disease_info;
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#F6F8FA]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Consultation Receipt</h2>
            <p className="text-sm text-gray-500 mt-1">Ref ID: {appointment.id?.split("-")[0].toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            <FaTimes className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* Status + Type + Amount Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
             <div className="flex items-center gap-3">
               <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(status)}`}>
                 {capitalize(status)}
               </span>
               <span className="text-sm font-semibold text-emerald-900 bg-emerald-100 px-3 py-1.5 rounded-full">
                 {getAppointmentTypeLabel(appointment)}
               </span>
             </div>
             
             <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Amount Paid</p>
                  <p className="text-xl font-black text-gray-900">₹{feePaid}</p>
                </div>
                <div className="h-10 w-px bg-gray-300"></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Payment Status</p>
                  <p className={`text-sm font-bold ${paymentStatus.toLowerCase() === 'paid' || paymentStatus.toLowerCase() === 'completed' ? 'text-green-600' : 'text-orange-500'}`}>
                    {paymentStatus}
                  </p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Doctor & Clinic */}
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <FaUserMd className="text-[#0067A1]" />
                  <h3 className="font-bold text-gray-900">Practitioner Details</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Doctor Name</p>
                    <p className="font-bold text-gray-900 text-base">{doctorName}</p>
                    <p className="text-sm text-gray-600 font-medium">{specialty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Qualifications</p>
                    <p className="font-medium text-gray-800 text-sm">{qualification}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Reg. Number (DMC/MCI)</p>
                    <p className="font-medium text-gray-800 text-sm">{licenseNumber}</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <FaBuilding className="text-[#0067A1]" />
                  <h3 className="font-bold text-gray-900">Clinic / Location Details</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Clinic Name</p>
                    <p className="font-bold text-gray-900 text-base">{clinicName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                    {isVideo ? (
                      <div className="relative group mt-1 select-none" title="Hidden for Video Consultation">
                        <p className="font-medium text-gray-800 text-sm blur-[6px] pointer-events-none select-none">
                          {clinicAddress || "Dummy Address, New Delhi-110045"}
                        </p>
                      </div>
                    ) : (
                      <p className="font-medium text-gray-800 text-sm">{clinicAddress}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Patient & Consultation */}
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <FaUser className="text-[#0067A1]" />
                  <h3 className="font-bold text-gray-900">Patient Details</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Patient Name</p>
                    <p className="font-bold text-gray-900 text-base">{patientName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Age</p>
                      <p className="font-medium text-gray-800 text-sm">{patientAge}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Gender</p>
                      <p className="font-medium text-gray-800 text-sm">{patientGender}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <FaCalendarAlt className="text-[#0067A1]" />
                  <h3 className="font-bold text-gray-900">Consultation Schedule</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                    <p className="font-bold text-gray-900 text-base">{dateLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                    <p className="font-bold text-gray-900 text-base">{timeLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Screening Information */}
          {diseaseInfo && (diseaseInfo.summary || diseaseInfo.urgency || diseaseInfo.probable_diagnoses) && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Clinical Summary (Screening)</h3>
              </div>
              <div className="p-4">
                {diseaseInfo.urgency && (
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-100">
                      Urgency: {diseaseInfo.urgency.toString().toUpperCase()}
                    </span>
                  </div>
                )}

                {diseaseInfo.summary && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                      {diseaseInfo.summary}
                    </p>
                  </div>
                )}

                {Array.isArray(diseaseInfo.probable_diagnoses) && diseaseInfo.probable_diagnoses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Probable diagnoses
                    </p>
                    <ul className="space-y-2">
                      {diseaseInfo.probable_diagnoses.map((d, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                        >
                          <span className="font-medium text-gray-800">
                            {d.name || d.label || "Diagnosis"}
                          </span>
                          {typeof d.confidence === "number" && (
                            <span className="text-xs font-semibold text-[#0067A1]">
                              {(d.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between space-x-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-400 max-w-md">This receipt is generated automatically and serves as a record of consultation in compliance with Telemedicine Practice Guidelines.</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors duration-200 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;
