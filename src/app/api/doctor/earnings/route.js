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

    // 2. Fetch appointments from AWS RDS PostgreSQL
    let appointments = [];
    try {
      appointments = await sql`
        SELECT 
          id,
          appointment_type,
          created_at,
          appointment_date,
          status
        FROM appointments
        WHERE doctor_id = ${doctor_id}
          AND status IN ('completed', 'done', 'scheduled', 'approved', 'booked')
        ORDER BY created_at DESC
      `;
    } catch (e) {
      console.warn("[Doctor Earnings] Could not fetch appointments:", e.message);
    }

    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    let pendingPayout = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const recentTransactions = [];

    appointments.forEach((appt) => {
      const type = (appt.appointment_type || "").toLowerCase();
      let apptFee = defaultFee;
      if (type.includes("video") || type.includes("instant") || type === "consultation") {
        apptFee = videoFee;
      } else if (type.includes("clinic") || type.includes("person")) {
        apptFee = clinicFee;
      } else if (type.includes("home")) {
        apptFee = homeFee;
      }

      const status = (appt.status || "").toLowerCase();

      // Only count completed appointments towards totalEarnings
      if (status === "completed" || status === "done") {
        totalEarnings += apptFee;

        const apptDate = appt.created_at ? new Date(appt.created_at) : (appt.appointment_date ? new Date(appt.appointment_date) : null);
        if (apptDate && apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
          thisMonthEarnings += apptFee;
        }

        recentTransactions.push({
          id: appt.id,
          type: appt.appointment_type || "Consultation",
          status: appt.status,
          amount: apptFee,
          date: appt.created_at ? new Date(appt.created_at).toISOString().split("T")[0] : String(appt.appointment_date || "")
        });
      } else if (["scheduled", "approved", "booked"].includes(status)) {
        // Pending payout calculation
        pendingPayout += apptFee;
      }
    });

    const earningsData = {
      totalEarnings,
      thisMonth: thisMonthEarnings,
      pendingPayout,
      bankDetails,
      account_name: bankDetails.account_name,
      account_number: bankDetails.account_number,
      bank_name: bankDetails.bank_name,
      ifsc: bankDetails.ifsc,
      branch: bankDetails.branch,
      recentTransactions: recentTransactions.slice(0, 15)
    };

    return success("Earnings fetched successfully", earningsData, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Doctor Earnings API Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
