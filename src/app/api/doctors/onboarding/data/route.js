import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const token = searchParams.get("token");
    let doctorId = null;

    if (token) {
      // Verify token and get doctor_id
      const { data: statusData, error: statusError } = await supabase
        .from("doctor_onboarding_status")
        .select("doctor_id, token_expires_at")
        .eq("invitation_token", token)
        .single();

      if (statusError || !statusData) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This invitation link is no longer valid. A newer link may have been sent to your email — please use the latest one, or contact admin to resend.",
          },
          { status: 401 }
        );
      }

      // Check expiry
      if (new Date() > new Date(statusData.token_expires_at)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invitation link has expired. Please contact admin for a new link.",
          },
          { status: 401 }
        );
      }

      doctorId = statusData.doctor_id;
    } else if (phone) {
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone)
        .eq("role", "doctor");

      if (userError || !users || users.length === 0) {
        return NextResponse.json(
          { success: false, error: "Doctor not found" },
          { status: 404 }
        );
      }

      doctorId = users[0].id;
    }

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: "Identification required" },
        { status: 400 }
      );
    }

    // Get doctor details
    const { data: details, error: detailsError } = await supabase
      .from("doctor_details")
      .select("*")
      .eq("id", doctorId)
      .single();

    if (detailsError) {
      return NextResponse.json(
        { success: false, error: "Details not found" },
        { status: 404 }
      );
    }

    // Also fetch onboarding status
    const { data: onboardingStatus } = await supabase
      .from("doctor_onboarding_status")
      .select("*")
      .eq("doctor_id", doctorId)
      .maybeSingle();

    // Get phone from users table
    const { data: userData } = await supabase
      .from("users")
      .select("phone_number")
      .eq("id", doctorId)
      .single();

    return NextResponse.json({
      success: true,
      data: details,
      onboarding_status: onboardingStatus || null,
      phone: userData?.phone_number || null,
      doctor_id: doctorId,
    });
  } catch (error) {
    console.error("Error getting pre-filled data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
