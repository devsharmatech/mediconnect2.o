import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'family_members.json');

const getDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const saveDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
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
    const data = db.filter(m => m.primary_patient_id === user_id);

    return success("Family members fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const { user_id, name, relation, dob, bloodGroup } = await req.json();
    const dateOfBirth = dob || null;

    if (!user_id || !name || !relation) {
      return failure("Missing required fields", null, 400, { headers: corsHeaders });
    }

    const db = getDb();
    const newMember = {
      id: Date.now().toString(),
      primary_patient_id: user_id,
      name,
      relation,
      dob: dateOfBirth,
      blood_group: bloodGroup,
      created_at: new Date().toISOString()
    };
    
    db.push(newMember);
    saveDb(db);

    return success("Family member added successfully.", newMember, 201, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}

export async function PUT(req) {
  try {
    const { id, user_id, name, relation, dob, bloodGroup } = await req.json();

    if (!id || !user_id || !name || !relation) {
      return failure("Missing required fields", null, 400, { headers: corsHeaders });
    }

    const db = getDb();
    const idx = db.findIndex(m => m.id === id && m.primary_patient_id === user_id);

    if (idx === -1) {
      return failure("Family member not found", null, 404, { headers: corsHeaders });
    }

    db[idx] = {
      ...db[idx],
      name,
      relation,
      dob: dob || null,
      blood_group: bloodGroup || null,
      updated_at: new Date().toISOString()
    };

    saveDb(db);

    return success("Family member updated successfully.", db[idx], 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const member_id = searchParams.get('member_id');

    if (!user_id || !member_id) {
      return failure("Missing required fields", null, 400, { headers: corsHeaders });
    }

    let db = getDb();
    const beforeCount = db.length;
    db = db.filter(m => !(m.id === member_id && m.primary_patient_id === user_id));

    if (db.length === beforeCount) {
      return failure("Family member not found", null, 404, { headers: corsHeaders });
    }

    saveDb(db);

    return success("Family member deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
