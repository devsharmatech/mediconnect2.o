"use client";

import React, { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaTimes,
  FaUserMd,
  FaIdCard,
  FaUser,
  FaBuilding,
  FaFileMedical,
  FaEye,
  FaDownload,
  FaShareAlt,
  FaLock,
  FaCheck,
  FaPills,
  FaFlask,
  FaExclamationTriangle,
  FaPrint,
  FaSpinner,
} from "react-icons/fa";
import { MEDICONNECT_LOGO_BASE64 } from "@/lib/prescriptionAssets";

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const s = String(status).toLowerCase();
  if (s === "expired") return "expired";
  if (["approved", "freezed", "confirmed"].includes(s)) return "confirmed";
  if (["booked", "pending"].includes(s)) return "pending";
  return s;
};

const isAppointmentExpired = (apt) => {
  if (!apt) return false;
  const s = String(apt.status || "").toLowerCase();
  if (s === "expired") return true;
  if (!["booked", "approved", "freezed", "confirmed", "pending"].includes(s)) return false;

  if (apt.extended_until) {
    const ext = new Date(apt.extended_until);
    if (!isNaN(ext.getTime()) && Date.now() <= ext.getTime()) return false;
  }

  const isClinic =
    apt.appointment_type === "clinic_visit" ||
    apt.type === "clinic_visit" ||
    apt.appointment_type === "home_visit";
  const rawDate = apt.date || apt.appointment_date;
  const rawTime = apt.time || apt.appointment_time;
  if (!rawDate) return false;

  const dateStr =
    typeof rawDate === "string"
      ? rawDate.split("T")[0]
      : rawDate instanceof Date
      ? rawDate.toISOString().split("T")[0]
      : "";
  const timeStr = typeof rawTime === "string" ? rawTime.slice(0, 5) : "";
  if (!dateStr || !timeStr) return false;

  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return false;

  if (isClinic) {
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
    return Date.now() > endOfDay.getTime();
  }

  const aptTime = new Date(y, m - 1, d, hh, mm, 0);
  return Date.now() > aptTime.getTime() + 30 * 60 * 1000;
};

const getStatusColor = (status) => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "completed":
      return "bg-blue-50 text-[#0067A1] border-blue-200";
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "expired":
      return "bg-slate-100 text-slate-700 border-slate-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
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
    weekday: "short",
    year: "numeric",
    month: "short",
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
    return "Video Consultation";
  }
  if (["home", "home_visit"].includes(value)) {
    return "Home Visit";
  }
  if (["clinic", "clinic_visit", "in_person"].includes(value)) {
    return "In-Clinic Visit";
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

const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  onViewPrescription,
  onDownloadPrescription,
  onSharePrescription,
  onSaveToDigiLocker,
  onSendToChemist,
  onSendToLab,
}) => {
  const [verification, setVerification] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!isOpen || !appointment?.id) {
      setVerification(null);
      return;
    }
    let isMounted = true;
    fetch(`/api/doctor/patient-verification?appointment_id=${appointment.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d.success && d.verification) {
          setVerification(d.verification);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [appointment?.id]);

  if (!isOpen || !appointment) return null;

  const status = isAppointmentExpired(appointment)
    ? "expired"
    : normalizeStatus(appointment.status);

  // Doctor Info
  const doctorName =
    appointment.doctor?.name || appointment.doctor?.full_name || "Doctor";
  const specialty = formatSpecialty(
    appointment.doctor?.specialty || appointment.doctor?.specialization
  );
  const qualification = appointment.doctor?.qualification || "Not specified";
  const licenseNumber = appointment.doctor?.license_number || "Not specified";

  // Location & Clinic
  const type = String(
    appointment.appointment_type || appointment.type || ""
  ).toLowerCase();
  const isVideo =
    type.includes("video") || type.includes("call") || type.includes("instant");
  const clinicName = appointment.doctor?.clinic_name || "MediConnect Partner Clinic";
  const clinicAddress = appointment.doctor?.clinic_address || "N/A";

  // Patient Info
  const patientName = appointment.patient?.full_name || "Patient";
  const patientAge = calculateAge(appointment.patient?.date_of_birth);
  const patientGender = appointment.patient?.gender
    ? capitalize(appointment.patient.gender)
    : "N/A";

  const dateLabel = formatDate(appointment);
  const timeLabel = formatTime(appointment);

  // Fee Calculation
  const getFee = () => {
    if (appointment.final_fee !== undefined && appointment.final_fee !== null)
      return Number(appointment.final_fee);
    if (appointment.amount !== undefined && appointment.amount !== null)
      return Number(appointment.amount);
    if (appointment.is_free) return 0;
    if (!appointment.doctor) return 0;
    const doc = appointment.doctor;

    const meta =
      typeof doc.meta === "string" ? JSON.parse(doc.meta || "{}") : doc.meta || {};

    const videoFee =
      meta?.video_consultation_fee ??
      doc.video_consultation_fee ??
      doc.consultation_fee ??
      0;
    const videoFollowUpFee =
      meta?.video_follow_up_fee ??
      doc.video_follow_up_fee ??
      meta?.follow_up_fee ??
      doc.follow_up_fee ??
      0;
    const clinicFee =
      meta?.clinic_consultation_fee ??
      doc.clinic_consultation_fee ??
      doc.consultation_fee ??
      0;
    const clinicFollowUpFee =
      meta?.clinic_follow_up_fee ??
      doc.clinic_follow_up_fee ??
      meta?.follow_up_fee ??
      doc.follow_up_fee ??
      0;
    const homeFee = meta?.home_visit_fee ?? doc.home_visit_fee ?? 0;
    const homeFollowUpFee =
      meta?.home_follow_up_fee ??
      doc.home_follow_up_fee ??
      meta?.follow_up_fee ??
      doc.follow_up_fee ??
      0;
    const instantFee =
      meta?.instant_consultation_fee ?? doc.instant_consultation_fee ?? 0;
    const followUpFee = meta?.follow_up_fee ?? doc.follow_up_fee ?? 0;

    if (type.includes("instant")) return Number(instantFee);
    if (type.includes("video"))
      return Number(type.includes("follow") ? videoFollowUpFee || videoFee : videoFee);
    if (type.includes("clinic"))
      return Number(
        type.includes("follow") ? clinicFollowUpFee || clinicFee : clinicFee
      );
    if (type.includes("home"))
      return Number(type.includes("follow") ? homeFollowUpFee || homeFee : homeFee);
    if (type.includes("follow"))
      return Number(
        followUpFee || videoFollowUpFee || clinicFollowUpFee || videoFee
      );
    return Number(doc.consultation_fee ?? 0);
  };

  const feePaid = getFee();
  const paymentStatus =
    feePaid === 0 ||
    ["paid", "completed", "not_applicable", "free"].includes(
      String(appointment.payment_status).toLowerCase()
    )
      ? "Paid"
      : capitalize(appointment.payment_status || "pending");

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

  const hasPrescription = Boolean(
    appointment.has_prescription || appointment.prescription || status === "completed"
  );

  const handleGenerateInvoicePdf = async () => {
    const el = document.getElementById("consultation-invoice-document");
    if (!el) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);

      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default || jsPDFModule;

      let html2canvas;
      try {
        const mod = await import("html2canvas-pro");
        html2canvas = mod.default || mod;
      } catch {
        const fallback = await import("html2canvas");
        html2canvas = fallback.default || fallback;
      }

      const canvas = await html2canvas(el, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const contentWidth = pdfWidth;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfHeight * 1.15) {
        const scaleFactor = Math.min(1, (pdfHeight - 12) / contentHeight);
        const fittedW = contentWidth * scaleFactor;
        const fittedH = contentHeight * scaleFactor;
        const xOffset = (pdfWidth - fittedW) / 2;
        pdf.addImage(imgData, "PNG", xOffset, 6, fittedW, fittedH, undefined, "FAST");
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, contentWidth, contentHeight, undefined, "FAST");
      }

      const shortId = appointment.id?.split("-")[0]?.toUpperCase() || "RECEIPT";
      const filename = `MediConnect_Invoice_${shortId}.pdf`;

      pdf.save(filename);

      try {
        const blobUrl = pdf.output("bloburl");
        window.open(blobUrl, "_blank");
      } catch (err) {
        console.warn("Could not open PDF in new tab:", err);
      }
    } catch (err) {
      console.error("PDF Invoice generation failed, falling back to window.print():", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card - Clean, Compact, Not Bulky */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center font-bold text-sm border border-[#0067A1]/20">
              <FaFileMedical className="w-4 h-4 text-[#0067A1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Consultation Receipt
                </h2>
                <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  #{appointment.id?.split("-")[0].toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close receipt"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Identity Notice (If Discrepancy) */}
          {verification && verification.status === "discrepancy_reported" && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold">
                <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Clinical Verification Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                {verification.discrepancy_reason || "Identity verification pending by consulting doctor."}
                {verification.discrepancy_notes ? ` ("${verification.discrepancy_notes}")` : ""}
              </p>
            </div>
          )}

          {/* Status & Fee Clinical Bar (Sleek Single Strip) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(
                  status
                )}`}
              >
                {status === "pending" ? "Pending Approval" : capitalize(status)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                {getAppointmentTypeLabel(appointment)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Fee:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {feePaid === 0 ? "Free (₹0)" : `₹${feePaid.toLocaleString("en-IN")}`}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider ${
                  paymentStatus.toLowerCase() === "paid" ||
                  paymentStatus.toLowerCase() === "completed"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {paymentStatus}
              </span>
            </div>
          </div>

          {/* Structured 2-Column Clinical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Column 1: Doctor & Clinic */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-2.5 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] tracking-wider text-[#0067A1]">
                <FaUserMd className="w-3.5 h-3.5" />
                <span>Doctor & Practice</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {doctorName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    {specialty || "General Medicine"}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="block text-slate-400 font-medium">Qualification</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                      {qualification}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">
                      {specialty?.toLowerCase()?.includes("dent")
                        ? "Reg. No (DDC)"
                        : "Reg. No (MCI/DMC)"}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono truncate block">
                      {licenseNumber}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <span className="text-slate-400 font-medium">Clinic Location: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {isVideo
                      ? "Online Telemedicine Consultation"
                      : `${clinicName}${clinicAddress && clinicAddress !== "N/A" ? ` • ${clinicAddress}` : ""}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Patient & Consultation */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-2.5 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] tracking-wider text-[#0067A1]">
                <FaUser className="w-3.5 h-3.5" />
                <span>Patient & Schedule</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {patientName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    {patientAge} • {patientGender}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="block text-slate-400 font-medium">Schedule Date</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                      {dateLabel}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">Consultation Time</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono truncate block">
                      {timeLabel}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <span className="text-slate-400 font-medium">Consultation Ref: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono truncate">
                    {appointment.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical e-Prescription (Solid & Compact) */}
          {hasPrescription && (
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <FaFileMedical className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Medical e-Prescription</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ Doctor Signed & Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Prescription issued by Dr. {doctorName}. You can view clinical details, download the A4 document, or share with pharmacy/lab.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    if (onViewPrescription) onViewPrescription(appointment);
                  }}
                  className="px-3 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="View prescription"
                >
                  <FaEye className="w-3 h-3" /> View
                </button>
                <button
                  onClick={() => {
                    if (onDownloadPrescription) onDownloadPrescription(appointment);
                    else if (onViewPrescription) {
                      onClose();
                      onViewPrescription(appointment);
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Download prescription"
                >
                  <FaDownload className="w-3 h-3" /> Download
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onSendToChemist) onSendToChemist(appointment);
                    else if (onViewPrescription) onViewPrescription(appointment);
                  }}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Order medicines from pharmacy"
                >
                  <FaPills className="w-3 h-3" /> Chemist
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onSendToLab) onSendToLab(appointment);
                    else if (onViewPrescription) onViewPrescription(appointment);
                  }}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Book lab tests"
                >
                  <FaFlask className="w-3 h-3" /> Lab
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onSaveToDigiLocker) onSaveToDigiLocker(appointment);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                    appointment.prescription_saved_in_digilocker ||
                    appointment.prescription?.is_saved_in_digilocker
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                      : "bg-indigo-700 hover:bg-indigo-800 text-white"
                  }`}
                  title="Save to DigiLocker"
                >
                  {appointment.prescription_saved_in_digilocker ||
                  appointment.prescription?.is_saved_in_digilocker ? (
                    <FaCheck className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <FaLock className="w-3 h-3 text-white" />
                  )}
                  <span>
                    {appointment.prescription_saved_in_digilocker ||
                    appointment.prescription?.is_saved_in_digilocker
                      ? "In Locker"
                      : "DigiLocker"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (onSharePrescription) onSharePrescription(appointment);
                    else if (onViewPrescription) {
                      onClose();
                      onViewPrescription(appointment);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Share prescription"
                >
                  <FaShareAlt className="w-3 h-3" /> Share
                </button>
              </div>
            </div>
          )}

          {/* Clinical Screening Summary (Compact) */}
          {diseaseInfo &&
            (diseaseInfo.summary ||
              diseaseInfo.urgency ||
              diseaseInfo.probable_diagnoses) && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Clinical Intake Notes
                  </h4>
                  {diseaseInfo.urgency && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      Urgency: {diseaseInfo.urgency}
                    </span>
                  )}
                </div>

                {diseaseInfo.summary && (
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    {diseaseInfo.summary}
                  </p>
                )}

                {Array.isArray(diseaseInfo.probable_diagnoses) &&
                  diseaseInfo.probable_diagnoses.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Probable Diagnoses
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {diseaseInfo.probable_diagnoses.map((d, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200"
                          >
                            <span>{d.name || d.label || "Diagnosis"}</span>
                            {typeof d.confidence === "number" && (
                              <span className="text-[10.5px] font-bold text-[#0067A1]">
                                ({(d.confidence * 100).toFixed(0)}%)
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <p className="text-[11px] text-slate-400 text-center sm:text-left max-w-sm">
            Official consultation record issued in compliance with Telemedicine Practice Guidelines.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleGenerateInvoicePdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Generate and print PDF invoice"
            >
              {isGeneratingPdf ? (
                <>
                  <FaSpinner className="w-3 h-3 animate-spin" />
                  <span>Invoice</span>
                </>
              ) : (
                <>
                  <FaPrint className="w-3 h-3" />
                  <span>Invoice</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Off-screen Printable Invoice Container for html2canvas & jsPDF */}
      <div
        style={{
          position: "absolute",
          left: "-99999px",
          top: 0,
          width: "794px",
          overflow: "hidden",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div
          id="consultation-invoice-document"
          style={{
            width: "794px",
            minWidth: "794px",
            maxWidth: "794px",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            padding: "36px 40px",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            boxSizing: "border-box",
            lineHeight: "1.45",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "16px", borderBottom: "2px solid #0067A1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img
                src={MEDICONNECT_LOGO_BASE64}
                alt="MediConnect Logo"
                style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "50%" }}
              />
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#0067A1", letterSpacing: "-0.3px" }}>
                  MediConnect Healthcare
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: "500" }}>
                  Digital Clinical Platform & Telehealth Network
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                  CIN: U85110DL2024PTC123456 • New Delhi, India • support@mediconnect.com
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Consultation Receipt
              </div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1", textTransform: "uppercase", letterSpacing: "1px", marginTop: "1px" }}>
                Tax Invoice
              </div>
              <div style={{ fontSize: "11px", color: "#334155", marginTop: "6px" }}>
                <span style={{ color: "#64748b" }}>Receipt No:</span> <b>INV-{appointment.id?.split("-")[0]?.toUpperCase() || "MC-001"}</b>
              </div>
              <div style={{ fontSize: "11px", color: "#334155" }}>
                <span style={{ color: "#64748b" }}>Date of Issue:</span> <b>{dateLabel}</b>
              </div>
            </div>
          </div>

          {/* 2-Column Clinical Credentials Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
            {/* Doctor Column */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Practitioner & Clinic Details
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                {doctorName}
              </div>
              <div style={{ fontSize: "12px", color: "#334155", fontWeight: "600", marginTop: "2px" }}>
                {specialty || "General Medicine"}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>
                <b>Qualification:</b> {qualification}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                <b>Reg. No ({specialty?.toLowerCase()?.includes("dent") ? "DDC" : "MCI/DMC"}):</b> {licenseNumber}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                <b>Clinic / Practice:</b> {clinicName}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                <b>Address:</b> {clinicAddress}
              </div>
            </div>

            {/* Patient Column */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Patient & Consultation Details
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                {patientName}
              </div>
              <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                <b>Age / Gender:</b> {patientAge} • {patientGender}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>
                <b>Patient UHID:</b> PAT-{appointment.patient?.id?.split("-")[0]?.toUpperCase() || appointment.patient_id?.split("-")[0]?.toUpperCase() || "GEN-01"}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                <b>Consultation Mode:</b> {getAppointmentTypeLabel(appointment)}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                <b>Appointment Date:</b> {dateLabel}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                <b>Consultation Slot:</b> {timeLabel}
              </div>
            </div>
          </div>

          {/* Clinical Notes / Screening (If Present) */}
          {(diseaseInfo?.summary || diseaseInfo?.symptoms || diseaseInfo?.notes) && (
            <div style={{ marginTop: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Clinical Summary / Intake Reason
              </div>
              <div style={{ fontSize: "11.5px", color: "#334155", lineHeight: "1.4" }}>
                {diseaseInfo.summary || diseaseInfo.notes || (Array.isArray(diseaseInfo.symptoms) ? diseaseInfo.symptoms.join(", ") : String(diseaseInfo))}
              </div>
            </div>
          )}

          {/* Itemized Billing Table */}
          <div style={{ marginTop: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "45px" }}>#</th>
                  <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b" }}>Description</th>
                  <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "140px" }}>Consultation Mode</th>
                  <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "85px" }}>SAC Code</th>
                  <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "100px", textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>1</td>
                  <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: "600" }}>
                    Doctor Outpatient Consultation & Clinical Assessment
                  </td>
                  <td style={{ padding: "10px 12px", color: "#334155" }}>
                    {getAppointmentTypeLabel(appointment)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace" }}>999312</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                    {feePaid === 0 ? "0.00" : feePaid.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>2</td>
                  <td style={{ padding: "10px 12px", color: "#0f172a" }}>
                    Platform Access & Digital Health Record Maintenance
                  </td>
                  <td style={{ padding: "10px 12px", color: "#334155" }}>Electronic System</td>
                  <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace" }}>998314</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a" }}>0.00</td>
                </tr>
              </tbody>
            </table>

            {/* Totals Summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "16px", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
                    Payment Status:
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    backgroundColor: paymentStatus.toLowerCase() === "paid" || paymentStatus.toLowerCase() === "completed" ? "#d1fae5" : "#fef3c7",
                    color: paymentStatus.toLowerCase() === "paid" || paymentStatus.toLowerCase() === "completed" ? "#065f46" : "#92400e",
                    border: `1px solid ${paymentStatus.toLowerCase() === "paid" || paymentStatus.toLowerCase() === "completed" ? "#a7f3d0" : "#fde68a"}`
                  }}>
                    {paymentStatus}
                  </span>
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "6px" }}>
                  GST Exemption: Notification No. 12/2017-Central Tax (Rate)
                </div>
              </div>

              <div style={{ textAlign: "right", minWidth: "220px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                  <span>Gross Amount:</span>
                  <span>₹{feePaid.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginBottom: "6px" }}>
                  <span>Taxes (Healthcare Exempt):</span>
                  <span>₹0.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "800", color: "#0067A1", borderTop: "1.5px solid #cbd5e1", paddingTop: "6px" }}>
                  <span>Total Paid:</span>
                  <span>{feePaid === 0 ? "Free (₹0.00)" : `₹${feePaid.toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Compliance & Digital Signature */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "32px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1" }}>
            <div style={{ maxWidth: "460px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>
                Telemedicine Practice Guidelines Compliance
              </div>
              <div style={{ fontSize: "9.5px", color: "#64748b", lineHeight: "1.4" }}>
                This document is an electronically generated consultation receipt & tax invoice issued under the Telemedicine Practice Guidelines, 2020 issued by the Ministry of Health and Family Welfare (MoHFW) and National Medical Commission (NMC). Retain this receipt for insurance reimbursement, wellness claims, or health tax deductions under Section 80D.
              </div>
            </div>

            <div style={{ textAlign: "center", minWidth: "180px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1" }}>
                MediConnect Healthcare
              </div>
              <div style={{ fontSize: "10px", color: "#059669", fontWeight: "600", marginTop: "2px" }}>
                ✓ Digitally Authenticated
              </div>
              <div style={{ fontSize: "9.5px", color: "#94a3b8", marginTop: "4px" }}>
                Authorized Electronic Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Native Print fallback */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #consultation-invoice-document,
          #consultation-invoice-document * {
            visibility: visible !important;
          }
          #consultation-invoice-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            z-index: 999999 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AppointmentDetailsModal;
