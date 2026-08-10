import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const excludeId = searchParams.get("excludeId");

    if (email) {
      const { data, error } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      
      if (data && data.id !== excludeId) {
        return NextResponse.json({ exists: true, message: "Email already exists" });
      }
    }

    if (phone) {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone)
        .maybeSingle();
      
      if (data && data.id !== excludeId) {
        return NextResponse.json({ exists: true, message: "Phone number already exists" });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
