import nodemailer from "nodemailer";

const TARGET_EMAIL = process.env.GMAIL_USER || "mandeepsekhon0052@gmail.com";
const APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "";

export interface ContactEmailPayload {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  ticketId: string;
}

export async function sendContactNotificationEmail(payload: ContactEmailPayload): Promise<boolean> {
  const { name, email, phone, subject, message, ticketId } = payload;

  // 1. Try Nodemailer with Gmail SMTP if App Password is provided
  if (APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: TARGET_EMAIL,
          pass: APP_PASSWORD.replace(/\s+/g, ""), // strip any spaces in app password
        },
      });

      const mailOptions = {
        from: `"Sekhon Farm Web Inquiries" <${TARGET_EMAIL}>`,
        to: TARGET_EMAIL,
        replyTo: email,
        subject: `🌾 New Farm Inquiry: ${name} [${ticketId}]`,
        text: `New Inquiry Received on Sekhon Farm Website:\n\nTicket ID: ${ticketId}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\nSubject: ${subject || "General Inquiry"}\n\nMessage:\n${message}\n\n---\nSekhon Farm Automated Notification`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden;">
            <div style="background: #1a3d29; padding: 24px 32px; color: #ffffff;">
              <h2 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff;">🌾 Sekhon Farm Website Inquiry</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Ticket ID: <strong>${ticketId}</strong></p>
            </div>
            
            <div style="padding: 32px; color: #1f2937;">
              <p style="font-size: 14px; margin-top: 0; color: #4b5563;">You have received a new customer message through the contact form on <strong>sekhon.co.in</strong>.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px 0; color: #6b7280; font-weight: 600; width: 130px;">Customer Name:</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: bold;">${name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Email Address:</td>
                  <td style="padding: 10px 0; color: #111827;"><a href="mailto:${email}" style="color: #059669; font-weight: 600; text-decoration: none;">${email}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Phone Number:</td>
                  <td style="padding: 10px 0; color: #111827;"><a href="tel:${phone}" style="color: #059669; font-weight: 600; text-decoration: none;">${phone || "Not provided"}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Subject:</td>
                  <td style="padding: 10px 0; color: #111827;">${subject || "General Inquiry"}</td>
                </tr>
              </table>

              <div style="background: #f9fafb; border-left: 4px solid #059669; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px;">Customer Message:</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">${message}</p>
              </div>

              <div style="margin-top: 28px; text-align: center;">
                <a href="mailto:${email}?subject=Re:%20Sekhon%20Farm%20Inquiry%20[${ticketId}]" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  ↩ Click to Reply to ${name}
                </a>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
              Sekhon Farm Estate • Village Borawal, Budhlada, Mansa, Punjab • <a href="https://sekhon.co.in" style="color: #059669; text-decoration: none;">sekhon.co.in</a>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Inquiry notification email sent successfully via Gmail SMTP to ${TARGET_EMAIL}`);
      return true;
    } catch (err: any) {
      console.error("[EmailService] Gmail SMTP error:", err.message);
    }
  } else {
    console.warn(`[EmailService] GMAIL_APP_PASSWORD is not set in .env. To enable direct Gmail sending, generate a 16-character Google App Password and add GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx" to Farm_backend/.env`);
  }

  // 2. Fallback: Also try Formspree if configured or FormSubmit
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${TARGET_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        phone: phone || "Not provided",
        subject: subject || "Website Inquiry",
        message,
        ticketId,
        _subject: `🌾 New Sekhon Farm Inquiry from ${name} [${ticketId}]`,
        _replyto: email,
        _template: "table",
        _captcha: "false",
      }),
    });

    if (res.ok) {
      console.log(`[EmailService] Fallback dispatch delivered to ${TARGET_EMAIL}`);
      return true;
    }
  } catch (fallbackErr) {
    // Non-blocking
  }

  return false;
}
