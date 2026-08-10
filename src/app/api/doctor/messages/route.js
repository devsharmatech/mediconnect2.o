import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    // Since chat_messages table doesn't exist yet, we fetch unique patients 
    // from appointments to represent the doctor's real contact list.
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("patient_id, patient_details(first_name, last_name, avatar_url), appointment_date")
      .eq("doctor_id", doctor_id)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    const messages = [];
    const seenPatients = new Set();

    appointments.forEach((apt) => {
      if (!seenPatients.has(apt.patient_id)) {
        seenPatients.add(apt.patient_id);
        const name = apt.patient_details ? `${apt.patient_details.first_name} ${apt.patient_details.last_name}` : 'Unknown Patient';
        messages.push({
          id: `chat-${apt.patient_id}`,
          patient_name: name,
          patient_id: apt.patient_id,
          avatar: apt.patient_details?.avatar_url || null,
          last_message: "Chat session opened", // Real messages table doesn't exist yet
          timestamp: apt.appointment_date,
          unread: false
        });
      }
    });

    return success("Messages fetched", { messages }, 200);
  } catch (error) {
    console.error("Messages API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
