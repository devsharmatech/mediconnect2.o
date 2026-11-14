import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return failure("Missing user_id", null, 400, { headers: corsHeaders });
    }

    const members = await sql`
      SELECT 
        id,
        patient_id,
        name,
        relation,
        TO_CHAR(dob, 'YYYY-MM-DD') AS dob,
        gender,
        blood_group,
        profile_picture,
        created_at,
        updated_at
      FROM patient_family_members
      WHERE patient_id = ${user_id}
      ORDER BY created_at ASC
    `;

    // Compute age for each member
    const enriched = members.map((m) => {
      let age = null;
      if (m.dob) {
        const birthDate = new Date(m.dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let a = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            a--;
          }
          if (a >= 0) age = a;
        }
      }
      return {
        ...m,
        age,
      };
    });

    return success("Family members fetched successfully.", enriched, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching family members:", error);
    return failure("Failed to fetch family members", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      user_id,
      name,
      relation,
      dob,
      gender,
      blood_group,
      bloodGroup,
      profile_picture,
    } = body || {};

    if (!user_id || !name || !relation) {
      return failure("user_id, name, and relation are required.", null, 400, {
        headers: corsHeaders,
      });
    }

    const blood = blood_group || bloodGroup || null;
    const cleanDob = dob ? String(dob).split("T")[0] : null;

    const [newMember] = await sql`
      INSERT INTO patient_family_members (
        patient_id,
        name,
        relation,
        dob,
        gender,
        blood_group,
        profile_picture,
        created_at,
        updated_at
      ) VALUES (
        ${user_id},
        ${name.trim()},
        ${relation.trim()},
        ${cleanDob ? sql`${cleanDob}::date` : null},
        ${gender || null},
        ${blood},
        ${profile_picture || null},
        NOW(),
        NOW()
      )
      RETURNING 
        id,
        patient_id,
        name,
        relation,
        TO_CHAR(dob, 'YYYY-MM-DD') AS dob,
        gender,
        blood_group,
        profile_picture,
        created_at,
        updated_at;
    `;

    let age = null;
    if (newMember.dob) {
      const birthDate = new Date(newMember.dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let a = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          a--;
        }
        if (a >= 0) age = a;
      }
    }

    return success(
      "Family member added successfully.",
      { ...newMember, age },
      201,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error creating family member:", error);
    return failure("Failed to add family member", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const {
      id,
      user_id,
      name,
      relation,
      dob,
      gender,
      blood_group,
      bloodGroup,
      profile_picture,
    } = body || {};

    if (!id || !user_id || !name || !relation) {
      return failure("id, user_id, name, and relation are required.", null, 400, {
        headers: corsHeaders,
      });
    }

    const blood = blood_group || bloodGroup || null;
    const cleanDob = dob ? String(dob).split("T")[0] : null;

    const [updated] = await sql`
      UPDATE patient_family_members
      SET 
        name = ${name.trim()},
        relation = ${relation.trim()},
        dob = ${cleanDob ? sql`${cleanDob}::date` : null},
        gender = ${gender || null},
        blood_group = ${blood},
        profile_picture = COALESCE(${profile_picture || null}, profile_picture),
        updated_at = NOW()
      WHERE id = ${id} AND patient_id = ${user_id}
      RETURNING 
        id,
        patient_id,
        name,
        relation,
        TO_CHAR(dob, 'YYYY-MM-DD') AS dob,
        gender,
        blood_group,
        profile_picture,
        created_at,
        updated_at;
    `;

    if (!updated) {
      return failure("Family member not found.", null, 404, { headers: corsHeaders });
    }

    return success("Family member updated successfully.", updated, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error updating family member:", error);
    return failure("Failed to update family member", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const member_id = searchParams.get("member_id");

    if (!user_id || !member_id) {
      return failure("user_id and member_id are required.", null, 400, {
        headers: corsHeaders,
      });
    }

    const deletedRows = await sql`
      DELETE FROM patient_family_members
      WHERE id = ${member_id} AND patient_id = ${user_id}
      RETURNING id;
    `;

    if (!deletedRows || deletedRows.length === 0) {
      return failure("Family member not found.", null, 404, { headers: corsHeaders });
    }

    return success("Family member deleted successfully.", null, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error deleting family member:", error);
    return failure("Failed to delete family member", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
