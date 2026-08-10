import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST() {
  try {
    console.log("Running system health check...");

    // Collect system information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    // Check if we're in a serverless environment
    const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;

    // Test basic file system access (if not serverless)
    let fileSystemAccess = "limited";
    if (!isServerless) {
      try {
        const fs = require('fs');
        const path = require('path');
        // Try to access current directory
        fs.readdirSync('.');
        fileSystemAccess = "full";
      } catch (fsError) {
        fileSystemAccess = "restricted";
      }
    }

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      system: systemInfo,
      environment: {
        serverless: isServerless,
        fileSystemAccess,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      services: {
        api: "operational",
        database: "checking...", // Will be checked separately
        smtp: "checking...", // Will be checked separately
        openai: "checking...", // Will be checked separately
      }
    };

    console.log("System health check completed");

    return success("System health check completed successfully!", healthStatus, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("System health check error:", err);

    return failure("System health check failed: " + err.message, "system_check_failed", 500, {
      headers: corsHeaders,
    });
  }
}