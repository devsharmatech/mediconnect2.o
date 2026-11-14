import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const limit = parseInt(searchParams.get("limit"), 10) || 10;
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const specialization = searchParams.get("specialization") || searchParams.get("specialty") || "";
    const feeFilter = searchParams.get("feeFilter") || searchParams.get("fee_filter");
    const publicOnly = searchParams.get("public_only") === "true";

    const offset = Math.max(0, (page - 1) * limit);

    // Build conditions
    const conditions = [
      sql`u.role = 'doctor'`,
      sql`COALESCE(d.onboarding_status, '') != 'deleted'`,
    ];

    if (publicOnly) {
      conditions.push(sql`u.status = 1`);
      conditions.push(sql`d.onboarding_status = 'approved'`);
      conditions.push(sql`(dos.allowed_to_consult = true OR dos.allowed_to_consult IS NULL)`);
    }

    if (status && status !== "all") {
      if (status === "pending_approval") {
        conditions.push(sql`(d.onboarding_status = 'pending' OR d.onboarding_status IS NULL)`);
      } else if (status === "verified") {
        conditions.push(sql`(u.is_verified = true OR dos.registration_verified = true)`);
      } else if (!Number.isNaN(Number(status))) {
        conditions.push(sql`u.status = ${Number(status)}`);
      }
    }

    if (specialization && specialization !== "All Specialties" && specialization !== "all") {
      const specPattern = `%${specialization.toLowerCase().trim()}%`;
      conditions.push(sql`LOWER(COALESCE(d.specialization, '')) LIKE ${specPattern}`);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      const searchPattern = `%${lowerSearch}%`;
      const strippedDr = lowerSearch.replace(/^dr\.?\s+/i, "").trim();
      const namePattern = strippedDr ? `%${strippedDr}%` : searchPattern;
      conditions.push(sql`(
        LOWER(COALESCE(d.full_name, '')) LIKE ${searchPattern} OR
        LOWER(COALESCE(d.full_name, '')) LIKE ${namePattern} OR
        LOWER(COALESCE(d.email, '')) LIKE ${searchPattern} OR
        LOWER(COALESCE(u.phone_number, '')) LIKE ${searchPattern} OR
        LOWER(COALESCE(d.clinic_name, '')) LIKE ${searchPattern} OR
        LOWER(COALESCE(d.specialization, '')) LIKE ${searchPattern} OR
        LOWER(COALESCE(d.license_number, '')) LIKE ${searchPattern} OR
        COALESCE(u.un_id::text, '') LIKE ${searchPattern}
      )`);
    }

    if (feeFilter && feeFilter !== "all") {
      if (feeFilter === "under_500") {
        conditions.push(sql`(
          (d.clinic_consultation_fee IS NOT NULL AND d.clinic_consultation_fee > 0 AND d.clinic_consultation_fee < 500) OR
          (d.video_consultation_fee IS NOT NULL AND d.video_consultation_fee > 0 AND d.video_consultation_fee < 500)
        )`);
      } else if (feeFilter === "500_1000") {
        conditions.push(sql`(
          (d.clinic_consultation_fee >= 500 AND d.clinic_consultation_fee <= 1000) OR
          (d.video_consultation_fee >= 500 AND d.video_consultation_fee <= 1000)
        )`);
      } else if (feeFilter === "above_1000") {
        conditions.push(sql`(
          d.clinic_consultation_fee > 1000 OR
          d.video_consultation_fee > 1000
        )`);
      }
    }

    // Combine conditions with AND
    const whereClause = conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`);

    // Summary counts query
    const [summaryRows, countRows, doctorRows] = await Promise.all([
      sql`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE u.status = 1)::int as active,
          COUNT(*) FILTER (WHERE d.onboarding_status = 'pending' OR d.onboarding_status IS NULL)::int as pending,
          COUNT(*) FILTER (WHERE u.is_verified = true OR dos.registration_verified = true)::int as verified
        FROM users u
        LEFT JOIN doctor_details d ON d.id = u.id
        LEFT JOIN doctor_onboarding_status dos ON dos.doctor_id = u.id
        WHERE u.role = 'doctor' AND COALESCE(d.onboarding_status, '') != 'deleted'
      `,
      sql`
        SELECT COUNT(*)::int as total_filtered
        FROM users u
        LEFT JOIN doctor_details d ON d.id = u.id
        LEFT JOIN doctor_onboarding_status dos ON dos.doctor_id = u.id
        WHERE ${whereClause}
      `,
      sql`
        SELECT 
          u.*,
          row_to_json(d.*) as doctor_details,
          row_to_json(dos.*) as onboarding_status_row
        FROM users u
        LEFT JOIN doctor_details d ON d.id = u.id
        LEFT JOIN doctor_onboarding_status dos ON dos.doctor_id = u.id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const totalCount = summaryRows[0]?.total || 0;
    const activeCount = summaryRows[0]?.active || 0;
    const pendingCount = summaryRows[0]?.pending || 0;
    const verifiedCount = summaryRows[0]?.verified || 0;
    const totalFiltered = countRows[0]?.total_filtered || 0;

    const cleanUrl = (url) => {
      if (!url || typeof url !== "string") return url;
      return url.replace(/::text$/, "").replace(/^['"]|['"]$/g, "");
    };

    const doctors = doctorRows.map((row) => {
      const details = row.doctor_details || {};
      const dos = row.onboarding_status_row || null;

      // Check real uploaded passport photo from doctor_details
      let passportUrl = null;
      const passportPhoto = details.passport_photo;
      if (passportPhoto) {
        if (Array.isArray(passportPhoto) && passportPhoto.length > 0) {
          passportUrl = cleanUrl(passportPhoto[0]);
        } else if (typeof passportPhoto === "string") {
          try {
            const parsed = JSON.parse(passportPhoto);
            if (Array.isArray(parsed) && parsed.length > 0) passportUrl = cleanUrl(parsed[0]);
            else if (typeof parsed === "string") passportUrl = cleanUrl(parsed);
          } catch {
            if (passportPhoto && passportPhoto !== "[]") passportUrl = cleanUrl(passportPhoto);
          }
        }
      }

      const userPic = cleanUrl(row.profile_picture);
      const isRealUserPic = userPic && !userPic.includes("ui-avatars.com") && userPic.startsWith("http");
      const isRealPassport = passportUrl && !passportUrl.includes("ui-avatars.com") && passportUrl.startsWith("http");

      const docName = details.full_name || "Doctor";
      if (!details.consultation_fee || Number(details.consultation_fee) === 0) {
        details.consultation_fee = details.clinic_consultation_fee || details.video_consultation_fee || details.home_visit_fee || "0.00";
      }

      // Prioritize real uploaded photo: passport_photo or custom user profile picture
      let derivedProfilePicture = null;
      if (isRealPassport) {
        derivedProfilePicture = passportUrl;
      } else if (isRealUserPic) {
        derivedProfilePicture = userPic;
      } else if (userPic && userPic.startsWith("http")) {
        derivedProfilePicture = userPic;
      } else {
        const docName = details.full_name || "Doctor";
        derivedProfilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(docName.trim())}&background=0067A1&color=fff&bold=true`;
      }

      return {
        id: row.id,
        un_id: row.un_id,
        email: details.email || null,
        phone_number: row.phone_number,
        role: row.role,
        status: row.status,
        is_verified: row.is_verified,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profile_picture: derivedProfilePicture,
        doctor_details: details,
        onboarding_logs: dos ? [dos] : [],
        consent_logs: [],
      };
    });

    const totalPages = Math.ceil(totalFiltered / limit);

    return NextResponse.json({
      success: true,
      data: doctors,
      summary: {
        total: totalCount,
        active: activeCount,
        pending: pendingCount,
        verified: verifiedCount
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalFiltered,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in /api/doctors/get:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
