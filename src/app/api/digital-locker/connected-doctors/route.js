import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * API: Get Connected Doctors for a Patient
 * 
 * Logic:
 * 1. Query 'consultations' table for all entries with patient_id
 * 2. Join with 'doctor_details' to get names
 * 3. Return unique doctor-appointment pairs
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get("patient_id");

        if (!patientId) {
            return NextResponse.json({ success: false, error: "Patient ID is required" }, { status: 400 });
        }
 
        // 1. Fetch consultations for the patient
        const { data: consultations, error: consultError } = await supabase
            .from("consultations")
            .select("id, appointment_id, doctor_id, created_at")
            .eq("patient_id", patientId);
 
        // 2. Fetch appointments for the patient (to cover cases where consultation hasn't started)
        const { data: appointments, error: appointError } = await supabase
            .from("appointments")
            .select("id, doctor_id, created_at, status")
            .eq("patient_id", patientId);
 
        if (consultError || appointError) throw (consultError || appointError);
 
        // 3. Combine unique doctor-appointment pairs
        const connectionMap = new Map();
 
        // Process consultations first (higher priority for ID)
        (consultations || []).forEach(c => {
            const key = `${c.doctor_id}:${c.appointment_id || c.id}`;
            connectionMap.set(key, {
                doctor_id: c.doctor_id,
                appointment_id: c.appointment_id || c.id,
                created_at: c.created_at
            });
        });
 
        // Process appointments (fill gaps)
        (appointments || []).forEach(a => {
            const key = `${a.doctor_id}:${a.id}`;
            if (!connectionMap.has(key)) {
                connectionMap.set(key, {
                    doctor_id: a.doctor_id,
                    appointment_id: a.id,
                    created_at: a.created_at
                });
            }
        });
 
        const connections = Array.from(connectionMap.values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
 
        if (connections.length === 0) {
            return NextResponse.json({ success: true, doctors: [] });
        }
 
        // 4. Fetch unique doctor details
        const doctorIds = [...new Set(connections.map(c => c.doctor_id))];
        const { data: doctorDetails, error: doctorError } = await supabase
            .from("doctor_details")
            .select("id, full_name, specialization")
            .in("id", doctorIds);
 
        if (doctorError) throw doctorError;
 
        // 3. Map doctor details back to consultations
        const doctorMap = (doctorDetails || []).reduce((acc, doc) => {
            acc[doc.id] = doc;
            return acc;
        }, {});
 
        const formattedDoctors = connections.map(c => {
            const doc = doctorMap[c.doctor_id];
            return {
                consultation_id: c.appointment_id, // using appointment_id as unique identifier for this relationship
                appointment_id: c.appointment_id,
                doctor_id: c.doctor_id,
                doctor_name: doc?.full_name || "Unknown Doctor",
                specialization: doc?.specialization || "General Medicine"
            };
        });
 
        return NextResponse.json({
            success: true,
            doctors: formattedDoctors
        });

    } catch (error) {
        console.error("Connected doctors fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
