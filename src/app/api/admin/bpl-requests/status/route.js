import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function PATCH(request) {
  try {
    const { request_id, status } = await request.json();

    // Basic validation
    if (!request_id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "request_id and valid status required" },
        { status: 400 }
      );
    }

    // Get request details
    const { data: req, error: reqErr } = await supabase
      .from("bpl_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqErr) throw reqErr;

    // Update request status
    const { error: updateErr } = await supabase
      .from("bpl_requests")
      .update({ status })
      .eq("id", request_id);

    if (updateErr) throw updateErr;

    // Update is_bpl in patient_details
    const is_bpl = status === "approved";

    const { error: pdErr } = await supabase
      .from("patient_details")
      .update({ is_bpl })
      .eq("id", req.user_id);

    if (pdErr) throw pdErr;

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
