import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST() {
  try {
    console.log("Testing database connection...");

    // Test basic connection by querying settings table
    const { data, error, count } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      throw error;
    }

    console.log("Database connection test successful");

    return success("Database connection test successful!", {
      connection: "healthy",
      timestamp: new Date().toISOString(),
      settingsCount: count || 0,
    }, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("Database test error:", err);

    let errorMessage = "Database connection test failed.";
    let errorCode = "database_connection_failed";

    if (err.code === "42P01") {
      errorMessage = "Settings table not found. Please run database migrations.";
      errorCode = "table_not_found";
    } else if (err.code === "28000") {
      errorMessage = "Database authentication failed. Check your connection settings.";
      errorCode = "database_auth_failed";
    } else if (err.code === "ENOTFOUND") {
      errorMessage = "Database host not found. Check your connection URL.";
      errorCode = "database_host_not_found";
    } else if (err.code === "ECONNREFUSED") {
      errorMessage = "Database connection refused. Check if the database server is running.";
      errorCode = "database_connection_refused";
    }

    return failure(errorMessage, errorCode, 500, {
      headers: corsHeaders,
    });
  }
}