# Sekhon Farm Contact Form & Gmail SMTP Setup Guide 🌾📧

This document details the complete configuration and verification process for the **Sekhon Farm** contact form and **Gmail SMTP service** using Node.js, Express, and Nodemailer.

---

## 📸 Form Design & Screenshot Match

The contact form in [`Farm_frontend/src/components/home/ContactSection.tsx`](../Farm_frontend/src/components/home/ContactSection.tsx) accurately reproduces the provided design:

1. **Title & Subtitle**:
   - `Send Us a Message` (Classic Serif typography)
   - `Fill in the details below and our team will get back to you within 24 hours.` (Forest green subtitle)
2. **Required Fields**:
   - **Full Name \***: User icon, `e.g. Gurpreet Singh` placeholder, smooth `rounded-2xl` borders.
   - **Email Address \***: Mail icon, `name@example.com` placeholder.
   - **Phone Number \***: Phone icon, `(555) 000-0000` placeholder.
   - **Message \***: Textarea with `Tell us about your produce needs, order volume, or questions...` placeholder.
3. **Live Validation & Feedback**:
   - Instant inline error messages beneath each input field for missing or invalid values.
   - Distinct green success message banner with reference ticket ID upon submission.
   - Distinct red alert banner with retry guidance if sending fails.

---

## 🔑 How to Generate a Gmail App Password

Google requires a **16-character App Password** for third-party SMTP authentication (your normal Gmail login password is not accepted for security reasons).

1. Log in to your Google Account at [myaccount.google.com](https://myaccount.google.com/).
2. Navigate to **Security** → **2-Step Verification** (ensure 2FA is turned ON).
3. Scroll down to the bottom of the page and select **App passwords** (or search for "App passwords" in the search bar).
4. Enter an app name, e.g., `Sekhon Farm Website`, and click **Create**.
5. Google will display a 16-character code (e.g. `abcd efgh ijkl mnop`).
6. Copy this 16-character code.

---

## ⚙️ Environment Variables Configuration (`.env`)

In **`Farm_backend/.env`**:

```env
# Gmail SMTP Configuration (smtp.gmail.com, port 587, STARTTLS)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mandeepsekhon0052@gmail.com
SMTP_PASS="your-16-char-app-password-here"
RECIPIENT_EMAIL=mandeepsekhon0052@gmail.com

# Contact Form Spam Rate Limiting
CONTACT_RATE_LIMIT_MAX=5
CONTACT_RATE_LIMIT_WINDOW_MS=900000
```

> [!NOTE]
> Spaces in the 16-character App Password are automatically stripped by the backend code, so both `"abcd efgh ijkl mnop"` and `"abcdefghijklmnop"` will work.

---

## 🛡️ Security & Spam Protection

1. **Honeypot Trap**: Invisible `website` and `hp_field` input fields that automated bots fill in. If populated, the submission is silently dropped without sending spam to your inbox.
2. **Rapid Submission Blocker**: Protects against automated script POSTs submitted in under 1.2 seconds.
3. **IP Rate Limiting**: Enforced via `express-rate-limit` (default: 5 submissions per 15 minutes per IP address) to prevent mailbox flooding.
4. **Input Sanitization & Zod Validation**: Strict limits on payload sizes (50KB body limit) and length limits on inputs to prevent buffer overflow attacks.
5. **No Frontend Leaks**: SMTP credentials and App Passwords are stored exclusively on the server and are never bundled to the client.

---

## 🚀 Running the Services

### 1. Express Backend Server
```bash
cd Farm_backend
npm run dev:express
```
Runs the Express server on `http://127.0.0.1:5000` with the contact route mounted at:
- `POST http://127.0.0.1:5000/api/v1/contact`
- `POST http://127.0.0.1:5000/api/contact`

### 2. Frontend Next.js Web App
```bash
cd Farm_frontend
npm run dev
```
Available at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing Contact Form & Email Delivery

Run the automated test suite:
```bash
cd Farm_backend
npm test -- tests/contact.test.ts
```
All 7 validation, alias, honeypot, and rate-limiting tests pass!

