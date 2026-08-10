import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    // Dynamic import for nodemailer to avoid Turbopack issues
    const nodemailer = await import('nodemailer');
    
    const { host, port, secure, auth } = await req.json();

    // Validate required fields
    if (!host || !port || !auth?.user || !auth?.pass) {
      return failure("Missing required SMTP configuration fields.", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    console.log(`Testing SMTP connection to ${host}:${port}`);

    // Create transporter configuration
    const transporterConfig = {
      host: host.trim(),
      port: parseInt(port),
      secure: Boolean(secure),
      auth: {
        user: auth.user.trim(),
        pass: auth.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    };

    // Create transporter - use the correct method
    const transporter = nodemailer.createTransport(transporterConfig);

    // Test connection
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error("SMTP verification failed:", error);
          reject(error);
        } else {
          console.log("SMTP verification successful");
          resolve(success);
        }
      });
    });

    // Try to send a test email
    try {
      const testEmail = {
        from: `"Mediconnect Support" <${auth.user}>`,
        replyTo: auth.user,
        to: "devsharma06.developer@gmail.com",
        subject: "SMTP Test - Mediconnect Management System",
        text: `This is a test email to verify your SMTP configuration.

Server: ${host}:${port}
Secure: ${secure ? 'Yes' : 'No'}
Time: ${new Date().toLocaleString()}

If you received this email, your SMTP settings are working correctly.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0067A1; text-align: center;">SMTP Connection Test</h2>
            <p>This email confirms that your SMTP configuration is working correctly.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0067A1;">
              <p style="margin: 5px 0;"><strong>Server:</strong> ${host}:${port}</p>
              <p style="margin: 5px 0;"><strong>Secure Connection:</strong> ${secure ? 'Yes (SSL/TLS)' : 'No'}</p>
              <p style="margin: 5px 0;"><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              Automated test message from Mediconnect Management System.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(testEmail);
      console.log("Test email sent successfully");

      return success("SMTP connection test successful! Test email sent and received.", {
        host,
        port: parseInt(port),
        secure: Boolean(secure),
        user: auth.user,
        emailSent: true,
        timestamp: new Date().toISOString(),
      }, 200, {
        headers: corsHeaders,
      });

    } catch (emailError) {
      // Connection worked but email sending failed
      console.log("Connection verified but email sending failed:", emailError);
      
      return success("SMTP connection verified but test email failed to send. Connection is working.", {
        host,
        port: parseInt(port),
        secure: Boolean(secure),
        user: auth.user,
        emailSent: false,
        warning: "Connection verified but email sending failed. Check your email permissions.",
        timestamp: new Date().toISOString(),
      }, 200, {
        headers: corsHeaders,
      });
    }

  } catch (err) {
    console.error("SMTP test error:", err);

    // User-friendly error messages
    let errorMessage = "SMTP connection test failed.";
    let errorCode = "smtp_connection_failed";

    if (err.code === "ECONNREFUSED") {
      errorMessage = "Connection refused. Please check your SMTP host and port.";
      errorCode = "connection_refused";
    } else if (err.code === "ETIMEDOUT") {
      errorMessage = "Connection timed out. Please check your network and SMTP server.";
      errorCode = "connection_timeout";
    } else if (err.code === "EAUTH") {
      errorMessage = "Authentication failed. Please check your username and password.";
      errorCode = "authentication_failed";
    } else if (err.code === "ENOTFOUND") {
      errorMessage = "SMTP host not found. Please check your hostname.";
      errorCode = "host_not_found";
    } else if (err.responseCode === 535) {
      errorMessage = "Authentication failed. For Gmail, use an App Password instead of your regular password.";
      errorCode = "app_password_required";
    } else if (err.command === "CONN") {
      errorMessage = "Cannot connect to SMTP server. Check host and port.";
      errorCode = "connection_error";
    } else {
      errorMessage = `SMTP test failed: ${err.message || "Unknown error"}`;
    }

    return failure(errorMessage, errorCode, 400, {
      headers: corsHeaders,
    });
  }
}