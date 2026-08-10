import { success } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const popular = searchParams.get('popular');
  const search = searchParams.get('search');

  let medicines = [
    { id: '1', name: 'Paracetamol 500mg', price: 45, desc: 'Fever & Pain relief', category: 'General' },
    { id: '2', name: 'Vitamin C + Zinc', price: 120, desc: 'Immunity Booster', category: 'Vitamins' },
    { id: '3', name: 'Cough Syrup 100ml', price: 85, desc: 'Dry Cough Relief', category: 'General' },
    { id: '4', name: 'Ashwagandha Tablets', price: 250, desc: 'Stress Relief', category: 'Ayurveda' },
    { id: '5', name: 'Baby Wipes 72pcs', price: 99, desc: 'Soft and gentle', category: 'Baby Care' },
    { id: '6', name: 'Digital Thermometer', price: 150, desc: 'Accurate reading', category: 'Devices' },
  ];

  if (popular === 'true') {
    medicines = medicines.slice(0, 3);
  }

  if (search) {
    medicines = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()));
  }

  return success("Medicines fetched successfully", medicines, 200, { headers: corsHeaders });
}
