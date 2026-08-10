/**
 * Onboarding Success Email Template
 * Generates a professional HTML email for doctor onboarding confirmation
 */

export function buildOnboardingSuccessEmail({ name = "Doctor", email = "", clinic_name = "" }) {
  const displayName = name.startsWith("Dr.") ? name : `Dr. ${name}`;
  const date = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = "Welcome to MediConnect — Your Onboarding Submission is Received!";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0067A1 0%,#0f6b64 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">MediConnect</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Healthcare Professional Network</p>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td style="padding:36px 40px 0;text-align:center;">
              <div style="width:72px;height:72px;background:#e8f5e9;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:40px;line-height:72px;">✅</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 12px;">
              <h2 style="margin:0 0 8px;color:#1a202c;font-size:22px;font-weight:700;">Onboarding Submitted Successfully!</h2>
              <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.6;">
                Dear <strong>${displayName}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.6;">
                Thank you for completing your onboarding registration on <strong>${date}</strong>. 
                We have received your profile and supporting documents${clinic_name ? ` for <strong>${clinic_name}</strong>` : ""}.
              </p>
              <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.6;">
                Our verification team will review your credentials and get back to you within <strong>24–48 hours</strong>.
              </p>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf9;border-radius:8px;border-left:4px solid #0067A1;padding:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <h3 style="margin:0 0 12px;color:#0067A1;font-size:15px;font-weight:700;">What happens next?</h3>
                    <ul style="margin:0;padding:0 0 0 18px;color:#4a5568;font-size:14px;line-height:2;">
                      <li>Your documents will be verified by our team</li>
                      <li>You will receive an approval or feedback email within 48 hours</li>
                      <li>Once approved, your profile will be live on MediConnect</li>
                      <li>You can start accepting consultations immediately after approval</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Registration info -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="16" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;">
                <tr>
                  <td style="color:#718096;font-size:13px;">Registered Email</td>
                  <td style="color:#1a202c;font-size:13px;font-weight:600;text-align:right;">${email}</td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0;">
                  <td style="color:#718096;font-size:13px;">Submission Date</td>
                  <td style="color:#1a202c;font-size:13px;font-weight:600;text-align:right;">${date}</td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0;">
                  <td style="color:#718096;font-size:13px;">Status</td>
                  <td style="text-align:right;">
                    <span style="background:#fff3cd;color:#856404;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Under Review</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0 0 20px;color:#718096;font-size:13px;line-height:1.6;">
                If you have any questions, please contact our support team.
              </p>
              <a href="mailto:support@mediconnect.in" 
                 style="display:inline-block;background:#0067A1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                Contact Support
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                © ${new Date().getFullYear()} MediConnect. All rights reserved.<br/>
                This is an automated message — please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
