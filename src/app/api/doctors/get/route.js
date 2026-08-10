import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const specialization = searchParams.get('specialization');

    const offset = (page - 1) * limit;

    // First get doctor users
    let userQuery = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'doctor');

    // Apply status filter to users
    if (status && status !== 'all') {
      if (status === 'pending_approval') {
        const { data: pendingDetails } = await supabase
          .from('doctor_details')
          .select('id')
          .eq('onboarding_status', 'pending');
        const pendingIds = pendingDetails?.map(d => d.id) || [];
        userQuery = userQuery.in('id', pendingIds.length > 0 ? pendingIds : ['00000000-0000-0000-0000-000000000000']);
      } else if (status === 'verified') {
        userQuery = userQuery.eq('is_verified', true);
      } else {
        userQuery = userQuery.eq('status', parseInt(status));
      }
    }

    // Apply Specialization filter at database level
    if (specialization && specialization !== 'all') {
      let specQuery = supabase
        .from('doctor_details')
        .select('id');
      
      if (specialization.toLowerCase() === 'urology') {
        specQuery = specQuery.ilike('specialization', '%urology%').not('specialization', 'ilike', '%neurology%');
      } else {
        specQuery = specQuery.ilike('specialization', `%${specialization}%`);
      }

      const { data: matchedDetails, error: specError } = await specQuery;
      
      if (specError) throw specError;

      const specIds = matchedDetails?.map(d => d.id) || [];
      userQuery = userQuery.in('id', specIds.length > 0 ? specIds : ['00000000-0000-0000-0000-000000000000']);
    }

    // Apply Search filter at database level
    if (search) {
      const { data: searchedDetails, error: detailsError } = await supabase
        .from('doctor_details')
        .select('id')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,specialization.ilike.%${search}%,license_number.ilike.%${search}%,clinic_name.ilike.%${search}%`);
      
      if (detailsError) throw detailsError;

      const searchedIds = searchedDetails?.map(d => d.id) || [];

      const { data: searchedUsers, error: usersSearchError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'doctor')
        .ilike('phone_number', `%${search}%`);
      
      if (usersSearchError) throw usersSearchError;

      const searchedUserIds = searchedUsers?.map(u => u.id) || [];

      const combinedIds = Array.from(new Set([...searchedIds, ...searchedUserIds]));
      userQuery = userQuery.in('id', combinedIds.length > 0 ? combinedIds : ['00000000-0000-0000-0000-000000000000']);
    }

    // Get users with pagination
    const { data: users, error: usersError, count } = await userQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Calculate global stats for summary
    const [
      { count: activeCount },
      { count: pendingCount },
      { count: verifiedCount },
      { count: totalCount }
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "doctor").eq("status", 1),
      supabase.from("doctor_details").select("id", { count: "exact", head: true }).eq("onboarding_status", "pending"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "doctor").eq("is_verified", true),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "doctor")
    ]);

    // If no users found, return empty
    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total: totalCount || 0,
          active: activeCount || 0,
          pending: pendingCount || 0,
          verified: verifiedCount || 0
        },
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Get doctor details, onboarding status, and consents for these users
    const userIds = users.map((user) => user.id);
    
    const [detailsRes, onboardingRes, consentsRes] = await Promise.all([
      supabase.from("doctor_details").select("*").in("id", userIds),
      supabase.from("doctor_onboarding_status").select("*").in("doctor_id", userIds),
      supabase.from("doctor_consents").select("*").in("doctor_id", userIds),
    ]);

    if (detailsRes.error) throw detailsRes.error;
    if (onboardingRes.error) throw onboardingRes.error;
    if (consentsRes.error) throw consentsRes.error;

    const doctorDetails = detailsRes.data;
    const onboardingLogs = onboardingRes.data;
    const consentLogs = consentsRes.data;

    // Combine user data with doctor details and logs
    const doctors = users.map((user) => {
      const details = doctorDetails?.find((detail) => detail.id === user.id) || {};
      const onboardingLog = onboardingLogs?.find((log) => log.doctor_id === user.id);
      const consentLog = consentLogs?.filter((log) => log.doctor_id === user.id) || [];

      const cleanUrl = (url) => {
        if (!url || typeof url !== "string") return url;
        return url.replace(/::text$/, "").replace(/^['"]|['"]$/g, "");
      };

      let derivedProfilePicture = cleanUrl(user.profile_picture) || null;
      const passportPhoto = details.passport_photo;

      if (!derivedProfilePicture && passportPhoto) {
        if (Array.isArray(passportPhoto) && passportPhoto.length > 0) {
          derivedProfilePicture = cleanUrl(passportPhoto[0]);
        } else if (typeof passportPhoto === "string") {
          derivedProfilePicture = cleanUrl(passportPhoto);
        }
      }

      return {
        ...user,
        profile_picture: derivedProfilePicture,
        doctor_details: details,
        onboarding_logs: onboardingLog ? [onboardingLog] : [],
        consent_logs: consentLog,
      };
    });

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: doctors,
      summary: {
        total: totalCount || 0,
        active: activeCount || 0,
        pending: pendingCount || 0,
        verified: verifiedCount || 0
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}