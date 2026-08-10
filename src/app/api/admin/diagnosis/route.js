import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/layer1/auditLogger";

/**
 * GET /api/admin/diagnosis
 * List all diagnoses with pagination and search
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;
    const categoryFilter = searchParams.get("category") || "";

    let query = supabase.from("diagnosis_master").select("*", { count: "exact" });

    if (q) {
      query = query.or(`name.ilike.%${q}%,icd_code.ilike.%${q}%,category.ilike.%${q}%`);
    }
    if (categoryFilter) {
      query = query.eq("category", categoryFilter);
    }

    // Set sorting: order alphabetically by name
    query = query.order("name", { ascending: true });

    // Apply range pagination unless a high limit (e.g. bulk autocomplete/export) is specified
    if (limit < 10000) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(10000);
    }

    const { data, count, error } = await query;

    if (error) {
      if (error.code === "PGRST103") {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1
          }
        });
      }
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error("GET /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/diagnosis
 * Create a new diagnosis or Bulk Import
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Dynamic specialty_id fallback lookup to bypass the NOT-NULL constraint
    let fallbackSpecialtyId = "549f3a82-8cb0-458c-aa2b-3f3f76c1ac69";
    try {
      const { data: existing } = await supabase
        .from("diagnosis_master")
        .select("specialty_id")
        .not("specialty_id", "is", null)
        .limit(1);
      if (existing && existing.length > 0) {
        fallbackSpecialtyId = existing[0].specialty_id;
      }
    } catch (e) {
      console.warn("Failed to dynamically look up fallback specialty ID:", e.message);
    }

    // Handle Bulk Import
    if (Array.isArray(body)) {
      const formattedRows = body.map(row => ({
        name: (row.name || "").trim(),
        icd_code: row.icd_code ? row.icd_code.trim() : null,
        description: row.description ? row.description.trim() : null,
        category: row.category ? row.category.trim() : null,
        is_active: row.is_active !== false,
        specialty_id: row.specialty_id || fallbackSpecialtyId
      })).filter(r => r.name);

      const { data, error } = await supabase
        .from("diagnosis_master")
        .insert(formattedRows)
        .select();

      if (error) throw error;

      const admin_id = req.headers.get("x-admin-id") || null;

      // Write bulk import audit log
      await logAudit({
        entity_type: "diagnosis_master",
        entity_id: "00000000-0000-0000-0000-000000000000",
        previous_state: null,
        new_state: { count: formattedRows.length },
        changed_by: admin_id,
        change_description: `Bulk imported ${formattedRows.length} diagnoses`
      });

      return NextResponse.json({
        success: true,
        data,
        message: `${formattedRows.length} diagnoses imported successfully.`
      });
    }

    // Handle Single Insert
    const { name, icd_code, description, is_active, specialty_id, category, admin_id } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Diagnosis Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("diagnosis_master")
      .insert({
        name: name.trim(),
        icd_code: icd_code ? icd_code.trim() : null,
        description: description ? description.trim() : null,
        category: category ? category.trim() : null,
        is_active: is_active !== false,
        specialty_id: specialty_id || fallbackSpecialtyId
      })
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      entity_type: "diagnosis_master",
      entity_id: data.id,
      previous_state: null,
      new_state: data,
      changed_by: admin_id || null,
      change_description: `Added diagnosis: ${name}`
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/diagnosis
 * Update an existing diagnosis
 */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, name, icd_code, description, is_active, specialty_id, category, admin_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    // Fetch previous state for audit logging
    const { data: oldData } = await supabase
      .from("diagnosis_master")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("diagnosis_master")
      .update({
        name: name ? name.trim() : undefined,
        icd_code: icd_code !== undefined ? (icd_code ? icd_code.trim() : null) : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        category: category !== undefined ? (category ? category.trim() : null) : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
        specialty_id: specialty_id !== undefined ? specialty_id : undefined,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      entity_type: "diagnosis_master",
      entity_id: id,
      previous_state: oldData,
      new_state: data,
      changed_by: admin_id || null,
      change_description: `Updated diagnosis: ${name || oldData?.name}`
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PATCH /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/diagnosis
 * Remove an existing diagnosis
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const admin_id = searchParams.get("admin_id") || null;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const { data: oldData } = await supabase
      .from("diagnosis_master")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("diagnosis_master")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await logAudit({
      entity_type: "diagnosis_master",
      entity_id: id,
      previous_state: oldData,
      new_state: null,
      changed_by: admin_id,
      change_description: `Deleted diagnosis: ${oldData?.name}`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
