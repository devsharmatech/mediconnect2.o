import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || "support@mediconnect.fit",
    pass: process.env.SMTP_PASSWORD,
  },
});

export function generateNumericOTP(length = 6) {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendEmailOTP({ toEmail, otpCode, recipientName = "User", purpose = "Account Verification" }) {
  if (!toEmail) {
    throw new Error("Recipient email address is required");
  }

  const senderName = "MediConnect Security";
  const fromEmail = process.env.SMTP_USER || "support@mediconnect.fit";

  const subject = `${otpCode} is your MediConnect verification code`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f6fa; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e9f0;">
          <!-- Top Brand Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0067A1 0%, #008779 100%); padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">MediConnect</h1>
              <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">Secure Healthcare Platform</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1e293b; font-weight: 600;">Hello ${recipientName},</p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                You recently requested a verification code for <strong>${purpose}</strong>. Please use the 6-digit OTP code below to proceed:
              </p>

              <!-- OTP Box -->
              <div style="background: #f8fafc; border: 2px dashed #0067A1; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0067A1; font-family: monospace; display: inline-block;">
                  ${otpCode}
                </span>
                <p style="margin: 10px 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
                  ⏰ Valid for <strong>10 minutes</strong>
                </p>
              </div>

              <!-- Security Advisory -->
              <div style="background-color: #eff6ff; border-left: 4px solid #0067A1; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                  <strong>Security Notice:</strong> Never share this OTP with anyone, including MediConnect staff or doctors. If you did not request this code, please ignore this email or reach out to our security team.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #64748b;">
                Thank you,<br>
                <strong style="color: #334155;">MediConnect Support Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #edf2f7;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} MediConnect. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Need help? Contact <a href="mailto:support@mediconnect.fit" style="color: #0067A1; text-decoration: none;">support@mediconnect.fit</a>
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

  const text = `Hello ${recipientName},\n\nYour MediConnect verification code is: ${otpCode}\n\nThis code is valid for 10 minutes. Never share this code with anyone.\n\nThank you,\nMediConnect Support Team`;

  const info = await transporter.sendMail({
    from: `"${senderName}" <${fromEmail}>`,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { success: true, messageId: info.messageId };
}
