import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * Mobile Patient Recovery Options Endpoint (J23 / J24 / J27)
 * Returns non-dead-end patient recovery options when doctor fails to show or service encounters issue.
 */
export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return Response.json(
        { success: false, message: "Unauthorized token." },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get("appointment_id");
    const incidentType = searchParams.get("incident_type") || "DOCTOR_NO_SHOW";

    // Query appointment status from AWS RDS PostgreSQL
    let appointmentDetails = null;
    if (appointmentId) {
      const apts = await sql`
        SELECT id, doctor_id, patient_id, appointment_date, appointment_time, status, care_episode_id
        FROM appointments
        WHERE id = ${appointmentId} LIMIT 1
      `;
      if (apts.length > 0) appointmentDetails = apts[0];
    }

    // Build structured PDF-compliant recovery options
    const recoveryOptions = [
      {
        option_code: "REASSIGN_DOCTOR",
        title: "Reassign to Available Doctor",
        description: "Connect immediately with another verified specialist.",
        action_type: "MUTATION",
        endpoint: "/api/mobileapi/recovery/reassign"
      },
      {
        option_code: "RESCHEDULE_APPOINTMENT",
        title: "Reschedule Appointment",
        description: "Choose a new convenient date and time slot.",
        action_type: "NAVIGATION",
        target_screen: "RescheduleAppointmentScreen"
      },
      {
        option_code: "INITIATE_REFUND",
        title: "Request Full Refund",
        description: "Receive 100% refund processed automatically to your payment source.",
        action_type: "MUTATION",
        endpoint: "/api/mobileapi/recovery/refund"
      },
      {
        option_code: "CONTACT_SUPPORT",
        title: "Contact Care Support",
        description: "Talk to MediConnect care support team.",
        action_type: "NAVIGATION",
        target_screen: "HelpSupportScreen"
      }
    ];

    return Response.json(
      {
        success: true,
        message: "Recovery options fetched successfully.",
        data: {
          incident_type: incidentType,
          appointment: appointmentDetails,
          recovery_options: recoveryOptions,
          safety_notice: "Your payment and care history are fully preserved. Please select your preferred recovery action."
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[MOBILE API RECOVERY OPTIONS] Error:", error);
    return Response.json(
      { success: false, message: "Failed to fetch recovery options.", error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
