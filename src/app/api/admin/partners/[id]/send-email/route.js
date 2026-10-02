import nodemailer from "nodemailer";
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const runtime = "nodejs";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || parseInt(process.env.SMTP_PORT, 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return failure("Partner ID is required.", null, 400);
    }

    // Fetch partner details from AWS RDS PostgreSQL
    const rows = await sql`
      SELECT * FROM nursing_partners WHERE id = ${id} LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return failure("Partner not found.", null, 404);
    }

    const partner = rows[0];

    if (!partner.email || !partner.email.trim()) {
      return failure("Partner does not have an email address configured. Please edit the partner and add an email first.", null, 400);
    }

    const recipientEmail = partner.email.trim();
    const partnerName = partner.name || "Service Partner";
    const services = Array.isArray(partner.services) ? partner.services : [];

    const hasNursing = services.includes("nursing");
    const hasEquipment = services.includes("equipment");

    let servicesHtml = "";
    if (hasNursing) {
      servicesHtml += `
        <div style="background-color:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
          <strong style="color:#0284C7;font-size:14px;">🩺 Home Nursing Care & Clinical Assistance</strong>
          <p style="margin:4px 0 0 0;font-size:12px;color:#475569;">Authorized to receive patient requests for home nursing, post-op recovery, injections, and palliative care.</p>
        </div>
      `;
    }
    if (hasEquipment) {
      servicesHtml += `
        <div style="background-color:#FAF5FF;border:1px solid #E9D5FF;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
          <strong style="color:#7E22CE;font-size:14px;">📦 Medical Equipment Rental & Distribution</strong>
          <p style="margin:4px 0 0 0;font-size:12px;color:#475569;">Authorized to fulfill oxygen concentrators, hospital beds, BiPAP/CPAP, wheelchairs, and ICU setup orders.</p>
        </div>
      `;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mediconnect.fit";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to MediConnect Partner Network</title>
      </head>
      <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                <!-- Header Banner -->
                <tr>
                  <td style="background:linear-gradient(135deg, #003358 0%, #0067A1 100%);padding:36px 30px;text-align:center;">
                    <div style="display:inline-block;padding:8px 16px;background:rgba(255,255,255,0.12);border-radius:20px;border:1px solid rgba(255,255,255,0.25);margin-bottom:12px;">
                      <span style="color:#FFFFFF;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Authorized Partner Network</span>
                    </div>
                    <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">MediConnect.fit</h1>
                    <p style="color:#E0F2FE;margin:8px 0 0 0;font-size:14px;">Clinical Healthcare & Equipment Delivery Ecosystem</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding:32px 30px;">
                    <h2 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 12px 0;">Welcome, ${partnerName}!</h2>
                    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                      We are pleased to inform you that your organization has been officially onboarded as an authorized <strong>Service Partner</strong> on the MediConnect Healthcare Platform.
                    </p>

                    <!-- Authorized Services Card -->
                    <div style="margin:24px 0;">
                      <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Authorized Service Categories</div>
                      ${servicesHtml || '<p style="color:#64748B;font-size:13px;">General Healthcare Services</p>'}
                    </div>

                    <!-- Partner Operational Details Box -->
                    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px;margin:24px 0;">
                      <div style="font-size:12px;font-weight:700;color:#0067A1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Your Registered Account Details</div>
                      <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;color:#334155;">
                        <tr>
                          <td width="40%" style="color:#64748B;font-weight:500;">Partner Name:</td>
                          <td style="font-weight:700;color:#0F172A;">${partnerName}</td>
                        </tr>
                        ${partner.contact_person ? `
                        <tr>
                          <td style="color:#64748B;font-weight:500;">Contact Person:</td>
                          <td style="font-weight:600;color:#0F172A;">${partner.contact_person}</td>
                        </tr>` : ''}
                        <tr>
                          <td style="color:#64748B;font-weight:500;">Registered Phone:</td>
                          <td style="font-weight:600;color:#0F172A;">+91 ${partner.phone}</td>
                        </tr>
                        <tr>
                          <td style="color:#64748B;font-weight:500;">Registered Email:</td>
                          <td style="font-weight:600;color:#0F172A;">${recipientEmail}</td>
                        </tr>
                        <tr>
                          <td style="color:#64748B;font-weight:500;">Service Area / City:</td>
                          <td style="font-weight:600;color:#0F172A;">${partner.city || 'Pan-India'} ${partner.state ? ', ' + partner.state : ''}</td>
                        </tr>
                        ${partner.registration_number ? `
                        <tr>
                          <td style="color:#64748B;font-weight:500;">Registration / GST:</td>
                          <td style="font-weight:600;color:#0F172A;">${partner.registration_number}</td>
                        </tr>` : ''}
                        <tr>
                          <td style="color:#64748B;font-weight:500;">Status:</td>
                          <td><span style="background-color:#DCFCE7;color:#166534;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">ACTIVE &amp; VERIFIED</span></td>
                        </tr>
                      </table>
                    </div>

                    <!-- What happens next -->
                    <div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px 20px;margin:24px 0;">
                      <h4 style="margin:0 0 6px 0;color:#B45309;font-size:13px;font-weight:700;">What Happens Next?</h4>
                      <ul style="margin:0;padding-left:18px;color:#78350F;font-size:12px;line-height:1.7;">
                        <li>Our centralized patient operations desk will route verified leads in your service area.</li>
                        <li>Lead dispatch notifications and patient requirement details will be sent directly to your phone <strong>+91 ${partner.phone}</strong>.</li>
                        <li>Please ensure timely contact with allocated patients to adhere to MediConnect quality care standards.</li>
                      </ul>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align:center;margin:32px 0 20px 0;">
                      <a href="${appUrl}" target="_blank" style="background-color:#0067A1;color:#FFFFFF;padding:14px 32px;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(0,103,161,0.25);">Visit MediConnect Platform &rarr;</a>
                    </div>

                    <p style="color:#64748B;font-size:12px;line-height:1.6;margin:24px 0 0 0;border-top:1px solid #E2E8F0;padding-top:16px;">
                      If you have questions regarding your partnership or lead assignment procedures, please reply directly to this email or contact the MediConnect Partner Operations Desk at <a href="mailto:info@mediconnect.fit" style="color:#0067A1;text-decoration:none;font-weight:600;">info@mediconnect.fit</a>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#F8FAFC;padding:20px 30px;border-top:1px solid #E2E8F0;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.5;">
                      &copy; 2026 MediConnect.fit Private Limited. All rights reserved.<br>
                      Healthcare Partner Operations • Licensed Telemedicine &amp; Home Care Network
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `"MediConnect Partner Desk" <${process.env.SMTP_FROM || process.env.SMTP_USER || "info@mediconnect.fit"}>`,
      to: recipientEmail,
      subject: `Welcome to MediConnect Partner Network - Onboarding Confirmation (${partnerName})`,
      html: emailHtml,
    });

    // Update email_sent_at in AWS RDS PostgreSQL
    await sql`
      UPDATE nursing_partners 
      SET email_sent_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;

    return success(`Onboarding email sent successfully to ${recipientEmail}!`, {
      email: recipientEmail,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Partner Email] Error sending email:", err);
    return failure("Failed to send onboarding email: " + err.message, "email_send_failed", 500);
  }
}
