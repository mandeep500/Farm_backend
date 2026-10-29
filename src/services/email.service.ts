import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || "mandeepsekhon0052@gmail.com";
const SMTP_PASS = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || SMTP_USER;

export interface ContactEmailPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
  ticketId: string;
  clientIp?: string;
  timestamp?: string;
}

/**
 * Creates and verifies the Nodemailer SMTP transporter using Gmail SMTP (port 587, STARTTLS).
 */
export function getMailTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // port 587 uses STARTTLS (secure = false)
    requireTLS: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });
}

/**
 * Sends customer inquiry email directly to the farm owner's Gmail inbox.
 */
export async function sendContactNotificationEmail(
  payload: ContactEmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { name, email, phone, message, ticketId, clientIp, timestamp } = payload;
  const submissionTime = timestamp || new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  if (!SMTP_PASS) {
    const errorMsg = "Gmail SMTP App Password is not configured in .env (SMTP_PASS or GMAIL_APP_PASSWORD).";
    console.warn(`[EmailService] ⚠️ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const transporter = getMailTransporter();

    const mailOptions = {
      from: `"Sekhon Farm Inquiries" <${SMTP_USER}>`,
      to: RECIPIENT_EMAIL,
      replyTo: email,
      subject: `🌾 New Customer Inquiry: ${name} [${ticketId}]`,
      text: `Sekhon Farm - New Website Inquiry\n\nTicket ID: ${ticketId}\nDate: ${submissionTime}\n\nCustomer Details:\n• Name: ${name}\n• Email: ${email}\n• Phone: ${phone}\n\nMessage:\n${message}\n\n---\nIP: ${clientIp || "N/A"}\nSent via Sekhon Farm Node.js & Express SMTP Service`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7faf8; margin: 0; padding: 24px; color: #1f2937; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #1a3d29 0%, #275e3e 100%); padding: 32px; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; }
            .content { padding: 32px; }
            .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 20px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #4b5563; width: 140px; }
            .value { font-weight: 700; color: #111827; }
            .value a { color: #047857; text-decoration: none; }
            .message-box { background: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid #059669; padding: 18px; border-radius: 10px; margin-top: 16px; font-size: 14px; line-height: 1.6; color: #111827; white-space: pre-wrap; }
            .btn { display: inline-block; background: #059669; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin-top: 24px; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3); }
            .footer { background: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 New Sekhon Farm Inquiry</h1>
              <p>Reference Ticket ID: <strong>${ticketId}</strong> • Received: ${submissionTime}</p>
            </div>
            <div class="content">
              <p style="margin-top: 0; font-size: 15px; color: #374151;">You have received a new contact inquiry submitted directly through the <strong>Sekhon Farm</strong> website.</p>
              
              <div class="card">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0; font-weight: 600; color: #4b5563; width: 140px;">Full Name:</td>
                    <td style="padding: 10px 0; font-weight: 700; color: #111827;">${name}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0; font-weight: 600; color: #4b5563;">Email Address:</td>
                    <td style="padding: 10px 0; font-weight: 600;"><a href="mailto:${email}" style="color: #047857; text-decoration: none;">${email}</a></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0; font-weight: 600; color: #4b5563;">Phone Number:</td>
                    <td style="padding: 10px 0; font-weight: 600;"><a href="tel:${phone}" style="color: #047857; text-decoration: none;">${phone}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #4b5563;">Timestamp:</td>
                    <td style="padding: 10px 0; color: #6b7280;">${submissionTime}</td>
                  </tr>
                </table>

                <h4 style="margin: 16px 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #047857;">Customer Message:</h4>
                <div class="message-box">${message}</div>
              </div>

              <div style="text-align: center;">
                <a href="mailto:${email}?subject=Re:%20Sekhon%20Farm%20Inquiry%20[${ticketId}]" class="btn">
                  ↩ Reply to ${name}
                </a>
              </div>
            </div>
            <div class="footer">
              Sekhon Farm Estate • Village Borawal, Budhlada, Mansa, Punjab • <a href="https://sekhon.co.in" style="color: #059669; text-decoration: none;">sekhon.co.in</a>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email delivered to ${RECIPIENT_EMAIL} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[EmailService] ❌ Gmail SMTP error:", err.message);
    return { success: false, error: err.message };
  }
}
