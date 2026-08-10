import { NextResponse } from "next/server";

export async function GET() {
    const superSpecialties = [
        "Cardiac Electrophysiology", "Heart Failure & Transplant", "Pediatric Cardiology", "Interventional Cardiology",
        "Stroke & Neurointervention", "Spine Surgery", "Joint Replacement", "Pediatric Neurology", "Movement Disorders",
        "Epileptology", "Pediatric Gastroenterology", "Liver Transplant", "Kidney Transplant", "Bone Marrow Transplant",
        "Neonatal Intensive Care", "Pediatric Intensive Care", "Fetal Medicine", "High-risk Obstetrics",
        "Reproductive Medicine / IVF", "Interventional Pulmonology", "Sleep Medicine", "Allergy & Immunology",
        "Pediatric Endocrinology", "Metabolic Medicine", "Interventional Neuroradiology", "Head & Neck Oncology",
        "Breast Oncology", "Gynecologic Oncology", "Pediatric Oncology", "Hand Surgery", "Craniofacial Surgery",
        "Bariatric Surgery", "Colorectal Surgery", "Pediatric Surgery", "Other Super-speciality"
    ];
    return NextResponse.json({ success: true, data: superSpecialties }, { status: 200 });
}
