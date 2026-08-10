import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const technicians = [
      { id: "tech-1", name: "Rahul Sharma", phone: "+919812345670", vehicle: "Hero Splendor (DL-3S-AB-1234)" },
      { id: "tech-2", name: "Amit Kumar", phone: "+919812345671", vehicle: "Honda Activa (DL-4S-CD-5678)" },
      { id: "tech-3", name: "Sanjeev Singh", phone: "+919812345672", vehicle: "Bajaj Pulsar (DL-5S-EF-9012)" }
    ];
    return success("Technicians fetched successfully", technicians, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed to fetch technicians", err.message, 500, { headers: corsHeaders });
  }
}
