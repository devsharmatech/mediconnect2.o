/**
 * Admin: Single Partner API
 * GET    - Fetch partner by id (with assigned leads)
 * PATCH  - Update partner details or toggle active status
 * DELETE - Remove partner
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const partners = await sql`
      SELECT * FROM nursing_partners WHERE id = ${id}::uuid LIMIT 1
    `;
    if (partners.length === 0) return failure("Partner not found.", null, 404);

    const partner = partners[0];

    // Get assigned leads
    const assignments = await sql`
      SELECT lead_id, lead_type, assigned_at, notes
      FROM partner_lead_assignments
      WHERE partner_id = ${id}::uuid
      ORDER BY assigned_at DESC
    `;

    return success("Partner fetched.", { partner: { ...partner, assignments } });
  } catch (err) {
    console.error("[Admin Partners] GET single error:", err);
    return failure("Failed to fetch partner.", err.message, 500);
  }
}

export async function PATCH(req, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const {
      name,
      phone,
      email,
      city,
      address,
      services,
      notes,
      is_active,
      contact_person,
      state,
      pincode,
      registration_number,
      documents,
    } = body;

    // Validate services if provided
    if (services !== undefined) {
      const validServices = ["nursing", "equipment"];
      const invalid = (services || []).filter(s => !validServices.includes(s));
      if (invalid.length > 0) {
        return failure("Invalid service type.", null, 400);
      }
      if (services.length === 0) {
        return failure("At least one service must be selected.", null, 400);
      }
    }

    let cleanedPhone = undefined;
    if (phone !== undefined) {
      const digitsOnly = String(phone).replace(/\D/g, "");
      let cleaned = digitsOnly;
      if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        cleaned = digitsOnly.slice(2);
      }
      if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
        return failure("Invalid phone number. Must be a valid 10-digit Indian mobile number.", null, 400);
      }
      cleanedPhone = cleaned;
    }

    const updateDocs = documents !== undefined;

    const [updated] = updateDocs
      ? await sql`
          UPDATE nursing_partners
          SET
            name = COALESCE(${name !== undefined ? name.trim() : null}, name),
            phone = COALESCE(${cleanedPhone ?? null}, phone),
            email = COALESCE(${email !== undefined ? (email ? email.trim() : null) : null}, email),
            city = COALESCE(${city !== undefined ? (city ? city.trim() : null) : null}, city),
            address = COALESCE(${address !== undefined ? (address ? address.trim() : null) : null}, address),
            services = COALESCE(${services ?? null}, services),
            notes = COALESCE(${notes !== undefined ? (notes ? notes.trim() : null) : null}, notes),
            is_active = COALESCE(${is_active ?? null}, is_active),
            contact_person = COALESCE(${contact_person !== undefined ? (contact_person ? contact_person.trim() : null) : null}, contact_person),
            state = COALESCE(${state !== undefined ? (state ? state.trim() : null) : null}, state),
            pincode = COALESCE(${pincode !== undefined ? (pincode ? pincode.trim() : null) : null}, pincode),
            registration_number = COALESCE(${registration_number !== undefined ? (registration_number ? registration_number.trim() : null) : null}, registration_number),
            documents = ${JSON.stringify(documents || [])}::jsonb,
            updated_at = NOW()
          WHERE id = ${id}::uuid
          RETURNING *
        `
      : await sql`
          UPDATE nursing_partners
          SET
            name = COALESCE(${name !== undefined ? name.trim() : null}, name),
            phone = COALESCE(${cleanedPhone ?? null}, phone),
            email = COALESCE(${email !== undefined ? (email ? email.trim() : null) : null}, email),
            city = COALESCE(${city !== undefined ? (city ? city.trim() : null) : null}, city),
            address = COALESCE(${address !== undefined ? (address ? address.trim() : null) : null}, address),
            services = COALESCE(${services ?? null}, services),
            notes = COALESCE(${notes !== undefined ? (notes ? notes.trim() : null) : null}, notes),
            is_active = COALESCE(${is_active ?? null}, is_active),
            contact_person = COALESCE(${contact_person !== undefined ? (contact_person ? contact_person.trim() : null) : null}, contact_person),
            state = COALESCE(${state !== undefined ? (state ? state.trim() : null) : null}, state),
            pincode = COALESCE(${pincode !== undefined ? (pincode ? pincode.trim() : null) : null}, pincode),
            registration_number = COALESCE(${registration_number !== undefined ? (registration_number ? registration_number.trim() : null) : null}, registration_number),
            updated_at = NOW()
          WHERE id = ${id}::uuid
          RETURNING *
        `;

    if (!updated) return failure("Partner not found.", null, 404);

    return success("Partner updated successfully.", { partner: updated });
  } catch (err) {
    console.error("[Admin Partners] PATCH error:", err);
    return failure("Failed to update partner.", err.message, 500);
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await sql`DELETE FROM partner_lead_assignments WHERE partner_id = ${id}::uuid`;
    await sql`DELETE FROM nursing_partners WHERE id = ${id}::uuid`;

    return success("Partner removed.", null);
  } catch (err) {
    console.error("[Admin Partners] DELETE error:", err);
    return failure("Failed to remove partner.", err.message, 500);
  }
}
