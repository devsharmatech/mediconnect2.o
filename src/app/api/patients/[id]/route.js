import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(_, { params }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      phone_number,
      created_at,
      profile_picture,
      patient_details (
        full_name,
        email,
        gender,
        date_of_birth,
        blood_group,
        address,
        emergency_contact
      )
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_, { params }) {
  const { id } = await params;
  try {
    const result = await deletePatientAccount(id);
    return NextResponse.json({ success: true, message: "Patient deleted successfully", result });
  } catch (dbErr) {
    console.error("Database deletion error:", dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
}
