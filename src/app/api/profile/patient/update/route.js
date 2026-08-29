import { PUT as patientProfilePut, POST as patientProfilePost, OPTIONS as patientProfileOptions } from "@/app/api/patient/profile/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS() {
  return patientProfileOptions();
}

export async function PUT(req) {
  return patientProfilePut(req);
}

export async function POST(req) {
  return patientProfilePost(req);
}
