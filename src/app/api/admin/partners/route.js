/**
 * Admin: Nursing Partners API
 * GET  - List all nursing partners (optionally filtered by service)
 * POST - Create/onboard a new partner
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const service = searchParams.get("service") || "all"; // nursing | equipment | all

    let partners;

    if (search && service !== "all") {
      partners = await sql`
        SELECT p.*, COUNT(pla.id) AS total_assigned
        FROM nursing_partners p
        LEFT JOIN partner_lead_assignments pla ON pla.partner_id = p.id
        WHERE
          (p.name ILIKE ${'%' + search + '%'} OR p.phone ILIKE ${'%' + search + '%'} OR p.city ILIKE ${'%' + search + '%'})
          AND ${service} = ANY(p.services)
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
    } else if (search) {
      partners = await sql`
        SELECT p.*, COUNT(pla.id) AS total_assigned
        FROM nursing_partners p
        LEFT JOIN partner_lead_assignments pla ON pla.partner_id = p.id
        WHERE p.name ILIKE ${'%' + search + '%'} OR p.phone ILIKE ${'%' + search + '%'} OR p.city ILIKE ${'%' + search + '%'}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
    } else if (service !== "all") {
      partners = await sql`
        SELECT p.*, COUNT(pla.id) AS total_assigned
        FROM nursing_partners p
        LEFT JOIN partner_lead_assignments pla ON pla.partner_id = p.id
        WHERE ${service} = ANY(p.services)
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
    } else {
      partners = await sql`
        SELECT p.*, COUNT(pla.id) AS total_assigned
        FROM nursing_partners p
        LEFT JOIN partner_lead_assignments pla ON pla.partner_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
    }

    return success("Partners fetched.", { partners, total: partners.length });
  } catch (err) {
    console.error("[Admin Partners] GET error:", err);
    return failure("Failed to fetch partners.", err.message, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      city,
      address,
      services,
      notes,
      contact_person,
      state,
      pincode,
      registration_number,
      documents,
      send_email,
    } = body;

    if (!name || !phone) {
      return failure("Name and phone are required.", null, 400);
    }

    if (!services || services.length === 0) {
      return failure("At least one service (nursing or equipment) must be selected.", null, 400);
    }

    // Validate services
    const validServices = ["nursing", "equipment"];
    const cleanedServices = services.filter(s => validServices.includes(s));
    if (cleanedServices.length === 0) {
      return failure("Invalid service type.", null, 400);
    }

    const digitsOnly = String(phone).replace(/\D/g, "");
    let cleaned = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      cleaned = digitsOnly.slice(2);
    }
    if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
      return failure("Invalid phone number.", null, 400);
    }

    // Check duplicate
    const existing = await sql`
      SELECT id FROM nursing_partners WHERE phone LIKE ${'%' + cleaned + '%'} LIMIT 1
    `;
    if (existing.length > 0) {
      return failure("A partner with this phone number already exists.", null, 409);
    }

    const docsJson = JSON.stringify(Array.isArray(documents) ? documents : []);

    const [partner] = await sql`
      INSERT INTO nursing_partners (
        name,
        phone,
        email,
        city,
        address,
        services,
        notes,
        contact_person,
        state,
        pincode,
        registration_number,
        documents
      )
      VALUES (
        ${name.trim()},
        ${cleaned},
        ${email ? email.trim() : null},
        ${city ? city.trim() : null},
        ${address ? address.trim() : null},
        ${cleanedServices},
        ${notes ? notes.trim() : null},
        ${contact_person ? contact_person.trim() : null},
        ${state ? state.trim() : null},
        ${pincode ? pincode.trim() : null},
        ${registration_number ? registration_number.trim() : null},
        ${docsJson}::jsonb
      )
      RETURNING *
    `;

    return success("Partner onboarded successfully.", { partner }, 201);
  } catch (err) {
    console.error("[Admin Partners] POST error:", err);
    return failure("Failed to onboard partner.", err.message, 500);
  }
}
