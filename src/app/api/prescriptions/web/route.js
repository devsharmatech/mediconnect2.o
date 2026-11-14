import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
    const offset = (page - 1) * limit;
    const doctorId = url.searchParams.get("doctor_id") || null;
    const startDate = url.searchParams.get("start_date") || null;
    const endDate = url.searchParams.get("end_date") || null;
    const search = url.searchParams.get("search") || null;
    const status = url.searchParams.get("status") || null;
    const id = url.searchParams.get("id") || null;

    // Single Prescription by ID
    if (id) {
      const rows = await sql`
        SELECT 
          p.*,
          dd.full_name AS doctor_full_name,
          dd.email AS doctor_email,
          dd.specialization AS doctor_specialization,
          pd.full_name AS patient_full_name,
          pd.email AS patient_email,
          pd.gender AS patient_gender,
          pd.date_of_birth AS patient_dob,
          pd.blood_group AS patient_blood_group,
          pd.address AS patient_address,
          pd.emergency_contact AS patient_emergency_contact,
          pu.phone_number AS patient_phone,
          a.appointment_date,
          a.appointment_time,
          a.status AS appointment_status,
          a.booked_for,
          a.family_member_id,
          a.family_member_details,
          a.disease_info
        FROM prescriptions p
        LEFT JOIN doctor_details dd ON dd.id = p.doctor_id
        LEFT JOIN patient_details pd ON pd.id = p.patient_id
        LEFT JOIN users pu ON pu.id = p.patient_id
        LEFT JOIN appointments a ON a.id = p.appointment_id
        WHERE p.id::text = ${id}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return failure("Prescription not found", null, 404, { headers: corsHeaders });
      }

      const r = rows[0];

      let parsedDisease = null;
      if (r.disease_info) {
        if (typeof r.disease_info === "object") parsedDisease = r.disease_info;
        else if (typeof r.disease_info === "string" && r.disease_info.trim().startsWith("{")) {
          try { parsedDisease = JSON.parse(r.disease_info); } catch (_) {}
        }
      }
      const fam = r.family_member_details || parsedDisease?.family_member || r.template_data?.family_member || null;
      const isFamily = (r.booked_for === "family_member") || Boolean(fam);

      let age = null;
      const effectiveDob = isFamily && fam?.dob ? fam.dob : r.patient_dob;
      if (effectiveDob) {
        const dob = new Date(effectiveDob);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      }
      if (isFamily && fam?.age) age = fam.age;

      const result = {
        ...r,
        booked_for: isFamily ? "family_member" : "self",
        family_member: fam,
        doctor: r.doctor_id ? {
          id: r.doctor_id,
          full_name: r.doctor_full_name,
          email: r.doctor_email,
          specialization: r.doctor_specialization,
        } : null,
        patient: r.patient_id ? {
          id: r.patient_id,
          full_name: isFamily && fam?.name ? fam.name : r.patient_full_name,
          gender: isFamily && fam?.gender ? fam.gender : r.patient_gender,
          date_of_birth: effectiveDob,
          blood_group: isFamily && fam?.blood_group ? fam.blood_group : r.patient_blood_group,
          email: r.patient_email,
          address: r.patient_address,
          emergency_contact: r.patient_emergency_contact,
          phone: r.patient_phone,
          age,
          relation: isFamily && fam?.relation ? fam.relation : null,
          profile_picture: isFamily && fam?.profile_picture ? fam.profile_picture : null,
          primary_patient_name: r.patient_full_name,
        } : null,
        appointment: r.appointment_id ? {
          id: r.appointment_id,
          appointment_date: r.appointment_date,
          appointment_time: r.appointment_time,
          status: r.appointment_status,
        } : null,
      };

      return success("Prescription details fetched successfully", result, 200, {
        headers: corsHeaders,
      });
    }

    // List Prescriptions with filters
    const conditions = [];

    if (doctorId) {
      conditions.push(sql`p.doctor_id::text = ${doctorId}`);
    }

    if (status && status !== "all") {
      if (status === "draft") {
        conditions.push(sql`p.is_draft = true`);
      } else if (status === "active") {
        conditions.push(sql`(p.status = 'active' OR p.status IS NULL) AND (p.is_draft = false OR p.is_draft IS NULL)`);
      } else {
        conditions.push(sql`p.status = ${status}`);
      }
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(sql`(
        p.notes::text ILIKE ${s} OR 
        p.diagnosis::text ILIKE ${s} OR 
        p.id::text ILIKE ${s} OR 
        p.unid::text ILIKE ${s} OR
        pd.full_name ILIKE ${s} OR 
        dd.full_name ILIKE ${s} OR
        pu.phone_number ILIKE ${s}
      )`);
    }

    if (startDate && endDate) {
      conditions.push(sql`p.created_at >= ${startDate}::timestamptz AND p.created_at <= (${endDate}::date + INTERVAL '1 day')`);
    } else if (startDate) {
      conditions.push(sql`p.created_at >= ${startDate}::timestamptz`);
    } else if (endDate) {
      conditions.push(sql`p.created_at <= (${endDate}::date + INTERVAL '1 day')`);
    }

    const whereClause = conditions.length > 0 
      ? conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`) 
      : sql`1=1`;

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM prescriptions p
      LEFT JOIN patient_details pd ON pd.id = p.patient_id
      LEFT JOIN doctor_details dd ON dd.id = p.doctor_id
      LEFT JOIN users pu ON pu.id = p.patient_id
      WHERE ${whereClause}
    `;

    const rows = await sql`
      SELECT 
        p.*,
        dd.full_name AS doctor_full_name,
        dd.specialization AS doctor_specialization,
        pd.full_name AS patient_full_name,
        pd.gender AS patient_gender,
        pd.date_of_birth AS patient_dob,
        pu.phone_number AS patient_phone,
        a.booked_for,
        a.family_member_details,
        a.disease_info
      FROM prescriptions p
      LEFT JOIN patient_details pd ON pd.id = p.patient_id
      LEFT JOIN doctor_details dd ON dd.id = p.doctor_id
      LEFT JOIN users pu ON pu.id = p.patient_id
      LEFT JOIN appointments a ON a.id = p.appointment_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const enriched = rows.map((r) => {
      let parsedDisease = null;
      if (r.disease_info) {
        if (typeof r.disease_info === "object") parsedDisease = r.disease_info;
        else if (typeof r.disease_info === "string" && r.disease_info.trim().startsWith("{")) {
          try { parsedDisease = JSON.parse(r.disease_info); } catch (_) {}
        }
      }
      const fam = r.family_member_details || parsedDisease?.family_member || r.template_data?.family_member || null;
      const isFamily = (r.booked_for === "family_member") || Boolean(fam);

      let age = null;
      const effectiveDob = isFamily && fam?.dob ? fam.dob : r.patient_dob;
      if (effectiveDob) {
        const dob = new Date(effectiveDob);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      }
      if (isFamily && fam?.age) age = fam.age;

      return {
        ...r,
        booked_for: isFamily ? "family_member" : "self",
        family_member: fam,
        patient: r.patient_id ? {
          full_name: isFamily && fam?.name ? fam.name : r.patient_full_name,
          gender: isFamily && fam?.gender ? fam.gender : r.patient_gender,
          date_of_birth: effectiveDob,
          phone: r.patient_phone,
          age,
          relation: isFamily && fam?.relation ? fam.relation : null,
          profile_picture: isFamily && fam?.profile_picture ? fam.profile_picture : null,
          primary_patient_name: r.patient_full_name,
        } : null,
        doctor: r.doctor_id ? {
          full_name: r.doctor_full_name,
          specialization: r.doctor_specialization,
        } : null,
      };
    });

    return success("Prescriptions fetched successfully", {
      items: enriched,
      page,
      limit,
      total: count || 0,
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /prescriptions error:", error);
    return failure("Failed to fetch prescriptions.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
