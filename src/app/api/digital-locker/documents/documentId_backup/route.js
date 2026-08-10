import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// GET - Get a single document by ID
export async function GET(req, { params }) {
  try {
    const { documentId } = params;

    if (!documentId) {
      return failure("Document ID is required.", null, 400);
    }

    const { data: document, error } = await supabase
      .from("digital_locker_documents")
      .select("*")
      .eq("id", documentId)
      .eq("is_active", true)
      .single();

    if (error || !document) {
      return failure("Document not found.", null, 404);
    }

    return success("Document retrieved successfully.", {
      document,
    });
  } catch (error) {
    console.error("Get Document Error:", error);
    return failure("Failed to retrieve document.", error.message, 500);
  }
}

// POST - Log document view/download action
export async function POST(req, { params }) {
  try {
    const { documentId } = params;
    const { user_id, action, ip_address, user_agent } = await req.json();

    if (!documentId || !user_id || !action) {
      return failure("Document ID, user ID, and action are required.", null, 400);
    }

    const validActions = ["viewed", "downloaded", "shared"];
    if (!validActions.includes(action)) {
      return failure("Invalid action type.", null, 400);
    }

    // Verify document exists
    const { data: document, error: docError } = await supabase
      .from("digital_locker_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return failure("Document not found.", null, 404);
    }

    // Log the action
    const { data: log, error: logError } = await supabase
      .from("digital_locker_audit_logs")
      .insert({
        document_id: documentId,
        user_id,
        action,
        ip_address,
        user_agent,
      })
      .select()
      .single();

    if (logError) throw logError;

    return success(`Document ${action} logged successfully.`, {
      log,
    });
  } catch (error) {
    console.error("Log Document Action Error:", error);
    return failure("Failed to log document action.", error.message, 500);
  }
}
