import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { 
      prescription_id, 
      patient_id, 
      medicines = [],
      prescription_url,
      delivery_address, 
      delivery_area,
      delivery_pincode,
      contact_phone,
      patient_notes,
      latitude, 
      longitude,
      window_minutes = 30,
      consent_version = "v3.0",
      channel = "web"
    } = await req.json();

    if (!patient_id) {
      return failure("patient_id is required", null, 400, { headers: corsHeaders });
    }

    if (!delivery_address || !delivery_address.trim()) {
      return failure("Delivery address is required", null, 400, { headers: corsHeaders });
    }

    let targetPrescriptionId = prescription_id || null;

    // If custom medicines or uploaded prescription provided without a prescription_id,
    // create a self-ordered prescription record in prescriptions table
    if (!targetPrescriptionId && ((Array.isArray(medicines) && medicines.length > 0) || prescription_url)) {
      const formattedMeds = (medicines || []).map((m) => ({
        name: typeof m === "string" ? m : (m.name || m.medicine_name || "Medicine"),
        quantity: parseInt(m.quantity || 1, 10),
        dosage: m.dosage || m.strength || "",
        instructions: m.instructions || m.frequency || "",
      }));

      const newRxRows = await sql`
        INSERT INTO prescriptions (
          patient_id,
          medicines,
          notes,
          file_url,
          created_at,
          updated_at
        ) VALUES (
          ${patient_id},
          ${JSON.stringify(formattedMeds)},
          ${patient_notes || "Self-submitted patient medicine order"},
          ${prescription_url || null},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      targetPrescriptionId = newRxRows[0]?.id || null;
    }

    // Set expiration window (default 30 mins)
    const expiryWindow = Math.max(5, Math.min(120, parseInt(window_minutes, 10) || 30));
    const expiresAt = new Date(Date.now() + expiryWindow * 60 * 1000);

    // Auto-resolve pincode and area if not explicitly passed
    const pinMatch = (delivery_address || "").match(/\b\d{6}\b/);
    const resolvedPincode = delivery_pincode || (pinMatch ? pinMatch[0] : null);
    const parts = (delivery_address || "").split(",").map((s) => s.trim()).filter(Boolean);
    const resolvedArea = delivery_area || (parts.length > 1 ? parts.slice(-2).join(", ") : (parts[0] || "Local Delivery Area"));

    // Insert broadcast into AWS RDS
    const broadcastRows = await sql`
      INSERT INTO medicine_order_broadcasts (
        prescription_id,
        patient_id,
        delivery_address,
        latitude,
        longitude,
        status,
        expires_at,
        created_at
      ) VALUES (
        ${targetPrescriptionId},
        ${patient_id},
        ${delivery_address},
        ${latitude ? parseFloat(latitude) : null},
        ${longitude ? parseFloat(longitude) : null},
        'broadcasting',
        ${expiresAt},
        NOW()
      )
      RETURNING *
    `;
    const broadcast = broadcastRows[0];

    // Log notification for patient
    try {
      await sql`
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          metadata,
          created_at
        ) VALUES (
          ${patient_id},
          'Medicine Request Broadcasted 💊',
          'Your medicine order request is live in the pharmacy pool. Pharmacies are now reviewing and submitting quotes.',
          'e_pharmacy_consent',
          ${JSON.stringify({
            broadcast_id: broadcast.id,
            prescription_id: targetPrescriptionId,
            delivery_area: resolvedArea,
            delivery_pincode: resolvedPincode,
            contact_phone: contact_phone || null,
            patient_notes: patient_notes || null,
          })},
          NOW()
        )
      `;
    } catch (notifErr) {
      console.warn("Could not insert patient notification:", notifErr.message);
    }

    return success(
      "Medicine order broadcasted successfully",
      {
        broadcast: {
          ...broadcast,
          delivery_area: resolvedArea,
          delivery_pincode: resolvedPincode,
          prescription_id: targetPrescriptionId,
        },
      },
      201,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error creating medicine order broadcast:", err);
    return failure("Failed to broadcast medicine order", err.message, 500, { headers: corsHeaders });
  }
}
