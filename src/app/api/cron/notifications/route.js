/**
 * Cron Worker: Process Notification Queue
 *
 * POST /api/cron/notifications
 *
 * Polls the notification_queue table for pending jobs and processes them.
 * Sends emails via SMTP (Hostinger) and Firebase push notifications.
 * Uses retry logic: max 3 attempts with failure tracking.
 *
 * Trigger: Vercel Cron / external scheduler
 * Recommended schedule: every 1 minute ("* * * * *" in vercel.json)
 *
 * Protect with CRON_SECRET env variable (matches existing /api/cron/retry pattern)
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";
import { buildOnboardingSuccessEmail } from "@/lib/email/onboardingSuccessEmail";

function formatDoctorName(name) {
  if (!name) return "";
  let trimmed = name.trim();
  const drRegex = /^dr\.?\s*/i;
  while (drRegex.test(trimmed)) {
    trimmed = trimmed.replace(drRegex, "");
  }
  return "Dr. " + trimmed;
}

const CRON_SECRET = process.env.CRON_SECRET;
const MAX_RETRIES = 3;
const BATCH_SIZE = 20; // jobs to process per cron run

// ─── SMTP Transporter (Hostinger) ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ─── Email sender ────────────────────────────────────────────────────────────
async function sendEmail(job) {
  const { email, name, payload } = job;
  if (!email) throw new Error("No email address for job");

  let subject, html;

  switch (job.type) {
    case "onboarding_success":
      ({ subject, html } = buildOnboardingSuccessEmail({
        name: name || payload?.full_name || "Doctor",
        email,
        clinic_name: payload?.clinic_name || "",
      }));
      break;

    case "doctor_invite": {
      const inviteLink = payload?.invite_link || "#";
      const doctorName = formatDoctorName(name || "Doctor");
      subject = "Complete Your MediConnect Professional Onboarding";
      html = `
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
          <div style="background-color:#0067A1;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">Welcome to MediConnect</h1>
          </div>
          <div style="padding:30px;background-color:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;">
            <h2 style="color:#0067A1;">Hello ${doctorName},</h2>
            <p>Our administration team has pre-filled your professional profile on MediConnect. To complete your onboarding and start consulting with patients, please review and verify your information.</p>
            <div style="background-color:#f9f9f9;padding:20px;border-radius:8px;margin:25px 0;border-left:4px solid #0067A1;">
              <p style="margin:0;font-weight:bold;color:#0067A1;">What you need to do:</p>
              <ul style="margin:10px 0 0 0;padding-left:20px;">
                <li>Complete DigiLocker KYC verification</li>
                <li>Verify your registered email address via OTP</li>
                <li>Review and accept the Professional Service Agreement</li>
              </ul>
            </div>
            <div style="text-align:center;margin:35px 0;">
              <a href="${inviteLink}" style="background-color:#0067A1;color:white;padding:15px 30px;text-decoration:none;border-radius:30px;font-weight:bold;display:inline-block;box-shadow:0 4px 6px rgba(0,0,0,0.1);">Verify &amp; Complete Onboarding</a>
            </div>
            <p style="font-size:14px;color:#666;">This secure link will expire in 30 days. If you have any questions, please reply to this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
            <p style="margin:0;font-size:12px;color:#999;">MediConnect Professional Onboarding System</p>
          </div>
        </div>`;
      break;
    }

    default:
      throw new Error(`Unknown notification type: ${job.type}`);
  }

  await transporter.sendMail({
    from: `"MediConnect" <${process.env.SMTP_FROM}>`,
    to: email,
    subject,
    html,
  });
}

// ─── Firebase Push sender ────────────────────────────────────────────────────
async function sendPushNotification(job) {
  if (!job.recipient_id) return { skipped: true, reason: "no recipient_id" };

  // Look up FCM token for the user
  const { data: tokenRow } = await supabase
    .from("fcm_tokens")
    .select("token")
    .eq("user_id", job.recipient_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRow?.token) return { skipped: true, reason: "no FCM token" };

  // Dynamic import to avoid issues if firebase isn't configured
  const { default: admin } = await import("firebase-admin");
  const app =
    admin.apps.length > 0
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FCM_PROJECT_ID,
            clientEmail: process.env.FCM_CLIENT_EMAIL,
            privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        });

  const messaging = admin.messaging(app);

  let title = "MediConnect";
  let body = "You have a new notification.";

  if (job.type === "onboarding_success") {
    title = "🎉 Onboarding Submitted!";
    body = "We've received your profile. Our team will review it within 24–48 hours.";
  } else if (job.type === "doctor_invite") {
    title = "🏥 Complete Your MediConnect Onboarding";
    body = "Your profile has been set up. Tap to complete verification and go live!";
  }

  await messaging.send({
    token: tokenRow.token,
    notification: { title, body },
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  });

  return { sent: true };
}

// ─── Process a single job ────────────────────────────────────────────────────
async function processJob(job) {
  const results = { email: null, push: null };

  try {
    // Send email
    await sendEmail(job);
    results.email = "sent";
  } catch (emailErr) {
    console.error(`[NotifQueue] Email failed for job ${job.id}:`, emailErr.message);
    results.email = `failed: ${emailErr.message}`;
    throw emailErr; // propagate to trigger retry logic
  }

  // Push notification — best effort, don't fail the whole job if push fails
  try {
    results.push = await sendPushNotification(job);
  } catch (pushErr) {
    console.warn(`[NotifQueue] Push failed for job ${job.id}:`, pushErr.message);
    results.push = `failed: ${pushErr.message}`;
  }

  return results;
}

// ─── Main cron handler ───────────────────────────────────────────────────────
export async function POST(req) {
  // Verify cron secret if configured
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const summary = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  try {
    // Fetch pending jobs (under max retry limit)
    const { data: jobs, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending notifications",
        ...summary,
        execution_time_ms: Date.now() - startTime,
      });
    }

    for (const job of jobs) {
      summary.processed++;
      try {
        await processJob(job);

        // Mark as sent
        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        summary.sent++;
        console.log(`[NotifQueue] ✅ Job ${job.id} (${job.type}) sent to ${job.email}`);
      } catch (err) {
        const newRetryCount = (job.retry_count || 0) + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "pending";

        await supabase
          .from("notification_queue")
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            last_error: err.message,
            processed_at: newStatus === "failed" ? new Date().toISOString() : null,
          })
          .eq("id", job.id);

        summary.failed++;
        console.error(`[NotifQueue] ❌ Job ${job.id} failed (attempt ${newRetryCount}):`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notification queue processed`,
      ...summary,
      execution_time_ms: Date.now() - startTime,
      executed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[NotifQueue] Cron fatal error:", err);
    return NextResponse.json(
      { success: false, error: err.message, ...summary },
      { status: 500 }
    );
  }
}

// Also support GET for manual health-check pings and diagnostics
export async function GET() {
  const { data: pendingJobs, count: pendingCount } = await supabase
    .from("notification_queue")
    .select("id, type, email, status, retry_count, last_error", { count: "exact" })
    .eq("status", "pending");

  const { data: failedJobs, count: failedCount } = await supabase
    .from("notification_queue")
    .select("id, type, email, last_error")
    .eq("status", "failed")
    .limit(5);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    pending: {
      count: pendingCount ?? 0,
      jobs: pendingJobs?.slice(0, 5) || [],
    },
    failed: {
      count: failedCount ?? 0,
      recent_errors: failedJobs || [],
    },
    config: {
      has_smtp_host: !!process.env.SMTP_HOST,
      has_smtp_user: !!process.env.SMTP_USER,
      has_cron_secret: !!process.env.CRON_SECRET,
    },
    endpoint: "POST /api/cron/notifications",
  });
}
