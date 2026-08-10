import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'pharmacy_db.json');

const getDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      cart: [
        {
          id: 'm1',
          name: 'Paracetamol 500mg',
          brand: 'Crocin',
          price: 45,
          quantity: 2,
          type: 'tablet',
          requiresPrescription: false
        },
        {
          id: 'm2',
          name: 'Azithromycin 500mg',
          brand: 'Azithral',
          price: 120,
          quantity: 1,
          type: 'tablet',
          requiresPrescription: true
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify({ default: defaultData }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return failure("Missing user_id", null, 400, { headers: corsHeaders });
    }

    const db = getDb();
    const data = db[user_id] || db['default'];

    return success("Cart fetched successfully.", data.cart || [], 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
