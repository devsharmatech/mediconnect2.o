import { success } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  // Return static categories for now until database is fully populated
  const categories = [
    { name: 'Vitamins', icon: 'nutrition-outline', color: '#eef2ff' },
    { name: 'Ayurveda', icon: 'leaf-outline', color: '#f0fdf4' },
    { name: 'Baby Care', icon: 'happy-outline', color: '#fff0f5' },
    { name: 'Devices', icon: 'watch-outline', color: '#fefce8' },
  ];

  return success("Categories fetched successfully", categories, 200, { headers: corsHeaders });
}
