import { NextResponse } from "next/server";

export async function GET() {
    const qualifications = [
        "MBBS", "MBChB", "MD (Physician)", "MD (General Medicine)", "MD (Pediatrics)",
        "MD (Obstetrics & Gynecology)", "MD (Dermatology)", "MD (Psychiatry)", "MD (Anesthesiology)",
        "MD (Radiology)", "MD (Pathology)", "MD (Community Medicine)", "MD (Emergency Medicine)",
        "MS (General Surgery)", "MS (Orthopedics)", "MS (ENT)", "MS (Ophthalmology)",
        "MS (Obstetrics & Gynecology)", "DNB (Medicine)", "DNB (Pediatrics)", "DNB (Orthopedics)",
        "DNB (Radiology)", "DNB (Anesthesiology)", "DNB (General Surgery)", "DM (Cardiology)",
        "DM (Neurology)", "DM (Gastroenterology)", "DM (Nephrology)", "DM (Endocrinology)",
        "DM (Pulmonology)", "MCh (Cardiothoracic Surgery)", "MCh (Neurosurgery)", "MCh (Plastic Surgery)",
        "MCh (Urology)", "MCh (Surgical Oncology)", "BDS", "MDS (Orthodontics)", "MDS (Endodontics)",
        "MDS (Prosthodontics)", "MDS (Periodontology)", "BHMS", "BAMS", "BUMS", "MD (Homoeopathy)",
        "MD (Ayurveda)", "FRCS", "MRCP", "MRCS", "Fellowship (India)", "Fellowship (International)",
        "PhD (Medical)", "Diploma (Medical)", "Other"
    ];
    return NextResponse.json({ success: true, data: qualifications }, { status: 200 });
}
