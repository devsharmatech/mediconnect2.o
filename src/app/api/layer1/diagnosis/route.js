/**
 * LAYER-1 API: Diagnosis
 * GET  /api/layer1/diagnosis — Get diagnoses by specialty
 * POST /api/layer1/diagnosis — Submit custom diagnosis for review
 */

import { NextResponse } from "next/server";
import { getDiagnosesBySpecialty, addCustomDiagnosis } from "@/lib/layer1/diagnosisService";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const specialty_id = searchParams.get("specialty_id");
        const search = searchParams.get("search");

        if (!specialty_id) {
            return NextResponse.json({ success: false, error: "specialty_id is required" }, { status: 400 });
        }

        const result = await getDiagnosesBySpecialty(specialty_id, search);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { name, specialty_id, doctor_id } = await req.json();
        const result = await addCustomDiagnosis(name, specialty_id, doctor_id);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
