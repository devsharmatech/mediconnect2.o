import { supabase } from "@/lib/supabaseAdmin";
import { failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildPrescriptionHtml } from "@/lib/buildPrescriptionHtml";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || searchParams.get('type') || 'full';
    const isChemistView = mode === 'chemist' || mode === 'fulfillment';

    const { data: rec, error } = await supabase
      .from("prescriptions")
      .select(
        `
        *,
        doctor_details:doctor_id (
          id,
          full_name,
          email,
          specialization,
          qualification,
          clinic_name,
          clinic_address,
          consultation_fee,
          rating,
          license_number,
          signature_url
        ),
        patient_details:patient_id (
          id,
          full_name,
          email,
          gender,
          date_of_birth,
          blood_group,
          address
        ),
        appointments:appointment_id (
          id,
          appointment_date,
          appointment_time,
          status,
          disease_info
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !rec) throw new Error("Prescription not found.");

    const html = buildPrescriptionHtml(rec, { isChemistView, mode });

    const pdfResponse = await fetch(
      "https://argosmob.uk/dhillon/public/api/v1/pdf/generate-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html }),
      }
    );

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      throw new Error(`PDF service error: ${pdfResponse.status} — ${errText}`);
    }
    const pdfJson = await pdfResponse.json();

    console.log("PDF API result:", pdfJson);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Prescription PDF generated successfully.",
        url: pdfJson.url || "",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("PDF generation error:", error);
    return failure("Failed to generate PDF.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

