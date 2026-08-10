import { RtcTokenBuilder, RtcRole } from "agora-token";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, uid, role } = await req.json();

    if (!appointment_id) {
      return NextResponse.json(
        { status: false, message: "appointment_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      throw new Error("Agora credentials missing in environment");
    }

    const channelName = `appointment_${appointment_id}`;
    const agoraRole =
      role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // agora-token v2 expects DURATIONS in seconds, not Unix timestamps.
    const TOKEN_EXPIRE = 3600; // 1 hour
    const PRIVILEGE_EXPIRE = 3600;

    // Use uid=0 → wildcard token: any uid can join this channel.
    // This avoids uid-type mismatches between token and client.join().
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      0, // wildcard
      agoraRole,
      TOKEN_EXPIRE,
      PRIVILEGE_EXPIRE
    );

    console.log(
      `[Agora] Token generated for channel=${channelName}, role=${role}, uid=wildcard`
    );

    return NextResponse.json(
      {
        status: true,
        message: "Agora token generated successfully",
        channelName,
        token,
        appId,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Agora token error:", error);
    return NextResponse.json(
      {
        status: false,
        message: error.message || "Failed to generate Agora token",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
