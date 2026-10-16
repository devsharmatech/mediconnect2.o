import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch doctor fees and bank account details from AWS RDS PostgreSQL
    let doctor = null;
    try {
      const doctorRows = await sql`
        SELECT 
          id,
          video_consultation_fee,
          clinic_consultation_fee,
          home_visit_fee,
          consultation_fee,
          bank_account_details
        FROM doctor_details
        WHERE id = ${doctor_id}
        LIMIT 1
      `;
      if (doctorRows.length > 0) {
        doctor = doctorRows[0];
      }
    } catch (e) {
      console.warn("[Doctor Earnings] Could not fetch doctor details:", e.message);
    }

    const parseVal = (v) => (v !== null && v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : null);
    const videoFee = parseVal(doctor?.video_consultation_fee) ?? parseVal(doctor?.consultation_fee) ?? 0;
    const clinicFee = parseVal(doctor?.clinic_consultation_fee) ?? parseVal(doctor?.consultation_fee) ?? 0;
    const homeFee = parseVal(doctor?.home_visit_fee) ?? parseVal(doctor?.consultation_fee) ?? 0;
    const defaultFee = parseVal(doctor?.consultation_fee) ?? videoFee ?? 0;

    // Parse bank details
    let rawBank = doctor?.bank_account_details;
    if (typeof rawBank === "string") {
      try {
        rawBank = JSON.parse(rawBank);
      } catch {
        rawBank = {};
      }
    }
    const bank = (rawBank && typeof rawBank === "object") ? rawBank : {};
    const bankDetails = {
      account_name: bank.account_name || "",
      account_number: bank.account_number || bank.account_no || "",
      bank_name: bank.bank_name || "",
      ifsc: bank.ifsc || bank.ifsc_code || "",
      branch: bank.branch || ""
    };

    // 2. Fetch appointments from AWS RDS PostgreSQL with patient info and financial details
    let appointments = [];
    try {
      appointments = await sql`
        SELECT 
          a.id,
          a.appointment_type,
          a.created_at,
          a.appointment_date,
          a.status,
          a.payment_status,
          a.final_fee,
          a.original_fee,
          a.commission_rate,
          a.commission_amount,
          a.commission_gst_amount,
          a.doctor_tds_amount,
          a.doctor_net_payable,
          a.financial_snapshot,
          p.full_name as patient_name
        FROM appointments a
        LEFT JOIN patient_details p ON p.id = a.patient_id
        WHERE a.doctor_id = ${doctor_id}
          AND a.status IN ('completed', 'done', 'scheduled', 'approved', 'booked')
        ORDER BY a.created_at DESC
      `;
    } catch (e) {
      console.warn("[Doctor Earnings] Could not fetch appointments with join:", e.message);
      // Fallback query if patient_details table join fails
      try {
        appointments = await sql`
          SELECT 
            id,
            appointment_type,
            created_at,
            appointment_date,
            status,
            payment_status,
            final_fee,
            original_fee,
            commission_rate,
            commission_amount,
            commission_gst_amount,
            doctor_tds_amount,
            doctor_net_payable,
            financial_snapshot
          FROM appointments
          WHERE doctor_id = ${doctor_id}
            AND status IN ('completed', 'done', 'scheduled', 'approved', 'booked')
          ORDER BY created_at DESC
        `;
      } catch (innerErr) {
        console.warn("[Doctor Earnings] Could not fetch appointments fallback:", innerErr.message);
      }
    }

    let totalGrossEarnings = 0;
    let totalNetEarnings = 0;
    let thisMonthEarnings = 0;
    let pendingPayout = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const recentTransactions = [];

    // Helper to resolve consultation mode accurately
    const normalizeMode = (typeStr) => {
      const type = String(typeStr || "").toLowerCase();
      if (type.includes("clinic") || type.includes("person") || type.includes("offline") || type.includes("in_clinic")) {
        return { key: "clinic", label: "Clinic Visit" };
      }
      if (type.includes("home")) {
        return { key: "home_visit", label: "Home Visit" };
      }
      return { key: "video", label: "Video Consultation" };
    };

    // 3-Mode Earning Audit Module
    const modeBreakdown = {
      clinic: {
        key: "clinic",
        label: "Clinic Visit",
        count: 0,
        gross_earnings: 0,
        commission_deducted: 0,
        tds_withheld: 0,
        net_earnings: 0,
      },
      video: {
        key: "video",
        label: "Video Consultation",
        count: 0,
        gross_earnings: 0,
        commission_deducted: 0,
        tds_withheld: 0,
        net_earnings: 0,
      },
      home_visit: {
        key: "home_visit",
        label: "Home Visit",
        count: 0,
        gross_earnings: 0,
        commission_deducted: 0,
        tds_withheld: 0,
        net_earnings: 0,
      },
    };

    appointments.forEach((appt) => {
      const mode = normalizeMode(appt.appointment_type);

      // Determine gross fee
      let grossFee = 0;
      if (appt.final_fee !== null && appt.final_fee !== undefined && !isNaN(Number(appt.final_fee))) {
        grossFee = Number(appt.final_fee);
      } else if (appt.original_fee !== null && appt.original_fee !== undefined && !isNaN(Number(appt.original_fee))) {
        grossFee = Number(appt.original_fee);
      } else {
        if (mode.key === "video") grossFee = videoFee;
        else if (mode.key === "clinic") grossFee = clinicFee;
        else if (mode.key === "home_visit") grossFee = homeFee;
        else grossFee = defaultFee;
      }

      // Parse financial snapshot or database columns
      let snap = appt.financial_snapshot;
      if (typeof snap === "string") {
        try { snap = JSON.parse(snap); } catch { snap = null; }
      }

      const commissionAmount = snap?.commission_amount ? Number(snap.commission_amount)
        : (appt.commission_amount ? Number(appt.commission_amount) : (grossFee * 0.18));

      const tdsAmount = snap?.doctor_tds_amount ? Number(snap.doctor_tds_amount)
        : (appt.doctor_tds_amount ? Number(appt.doctor_tds_amount) : Math.max(0, (grossFee - commissionAmount) * 0.10));

      const netAmount = snap?.doctor_net_payable ? Number(snap.doctor_net_payable)
        : (appt.doctor_net_payable ? Number(appt.doctor_net_payable) : Math.max(0, grossFee - commissionAmount - tdsAmount));

      const roundedGross = Math.round(grossFee * 100) / 100;
      const roundedComm = Math.round(commissionAmount * 100) / 100;
      const roundedTds = Math.round(tdsAmount * 100) / 100;
      const roundedNet = Math.round(netAmount * 100) / 100;

      const status = (appt.status || "").toLowerCase();

      // STRICT USER RULE: 0 / free transactions must NOT be shown in doctor earnings & transactions
      if (status === "completed" || status === "done") {
        if (roundedGross > 0 && roundedNet > 0) {
          totalGrossEarnings = Math.round((totalGrossEarnings + roundedGross) * 100) / 100;
          totalNetEarnings = Math.round((totalNetEarnings + roundedNet) * 100) / 100;

          const apptDate = appt.created_at ? new Date(appt.created_at) : (appt.appointment_date ? new Date(appt.appointment_date) : null);
          if (apptDate && apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
            thisMonthEarnings = Math.round((thisMonthEarnings + roundedNet) * 100) / 100;
          }

          // Accumulate mode breakdown
          if (modeBreakdown[mode.key]) {
            modeBreakdown[mode.key].count += 1;
            modeBreakdown[mode.key].gross_earnings = Math.round((modeBreakdown[mode.key].gross_earnings + roundedGross) * 100) / 100;
            modeBreakdown[mode.key].commission_deducted = Math.round((modeBreakdown[mode.key].commission_deducted + roundedComm) * 100) / 100;
            modeBreakdown[mode.key].tds_withheld = Math.round((modeBreakdown[mode.key].tds_withheld + roundedTds) * 100) / 100;
            modeBreakdown[mode.key].net_earnings = Math.round((modeBreakdown[mode.key].net_earnings + roundedNet) * 100) / 100;
          }

          recentTransactions.push({
            id: appt.id,
            type: mode.label,
            mode: mode.label,
            mode_key: mode.key,
            status: appt.status,
            gross_amount: roundedGross,
            amount: roundedNet, // Net Take-Home Rupees earned by doctor from this mode
            net_earnings: roundedNet,
            commission: roundedComm,
            tds: roundedTds,
            patient_name: appt.patient_name || "Patient",
            date: appt.created_at ? new Date(appt.created_at).toISOString().split("T")[0] : String(appt.appointment_date || ""),
          });
        }
      } else if (["scheduled", "approved", "booked"].includes(status)) {
        if (roundedGross > 0 && roundedNet > 0) {
          pendingPayout = Math.round((pendingPayout + roundedNet) * 100) / 100;
        }
      }
    });

    const earningsData = {
      totalEarnings: totalNetEarnings, // Net take-home earnings
      grossEarnings: totalGrossEarnings,
      thisMonth: thisMonthEarnings,
      pendingPayout,
      modeBreakdown, // 3 modes: clinic, video, home_visit with exact earnings
      bankDetails,
      account_name: bankDetails.account_name,
      account_number: bankDetails.account_number,
      bank_name: bankDetails.bank_name,
      ifsc: bankDetails.ifsc,
      branch: bankDetails.branch,
      recentTransactions: recentTransactions.slice(0, 50),
    };

    return success("Earnings fetched successfully", earningsData, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Doctor Earnings API Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
