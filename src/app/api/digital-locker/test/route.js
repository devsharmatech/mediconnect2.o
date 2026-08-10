import { success } from '@/lib/response';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  const appt = await supabase.from('appointments').select('*').limit(1);
  return Response.json({ appt: appt.data?.[0], apptErr: appt.error });
}
