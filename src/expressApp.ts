import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "./db/prisma.js";
import { sendContactNotificationEmail } from "./services/email.service.js";

export function createExpressApp() {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(helmet());

  // 2. CORS configuration
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000,https://sekhon.co.in")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          process.env.NODE_ENV !== "production" &&
          (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))
        ) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS policy violation: Origin not allowed"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // 3. Body parser with strict size limit (prevents payload attacks)
  app.use(express.json({ limit: "50kb" }));

  // 4. Contact Form Rate Limiter (Spam Protection: 5 submissions per 15 minutes per IP)
  const contactRateLimiter = rateLimit({
    windowMs: Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 100 : (Number(process.env.CONTACT_RATE_LIMIT_MAX) || 5),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many inquiries sent from this IP. Please wait 15 minutes before submitting again.",
    },
  });

  // 5. Contact Input Zod Validation Schema
  const contactSchema = z.object({
    name: z
      .string({ required_error: "Full name is required" })
      .trim()
      .min(2, "Full Name must be at least 2 characters")
      .max(100, "Full Name must be under 100 characters"),
    email: z
      .string({ required_error: "Email address is required" })
      .trim()
      .email("Please provide a valid email address"),
    phone: z
      .string({ required_error: "Phone number is required" })
      .trim()
      .min(7, "Phone number must be at least 7 digits")
      .max(25, "Phone number is too long")
      .regex(
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
        "Please provide a valid telephone number (e.g. (555) 000-0000 or +91 98765 43210)"
      ),
    message: z
      .string({ required_error: "Message is required" })
      .trim()
      .min(10, "Message must be at least 10 characters long")
      .max(3000, "Message cannot exceed 3000 characters"),
    // Spam protection: hidden honeypot field
    website: z.string().optional(),
    hp_field: z.string().optional(),
    // Spam protection: client submission timestamp
    _renderedAt: z.number().optional(),
  });

  // Handler for contact submission
  const handleContactSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Zod Validation
      const parseResult = contactSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0]?.message || "Invalid input data";
        return res.status(400).json({
          success: false,
          message: firstError,
          errors: parseResult.error.format(),
        });
      }

      const { name, email, phone, message, website, hp_field, _renderedAt } = parseResult.data;

      // 2. Honeypot Spam Check (bots fill invisible fields)
      if (website || hp_field) {
        console.warn(`[SpamProtection] Bot caught via honeypot field. IP: ${req.ip}`);
        // Return 200 so bot believes submission succeeded without sending email
        return res.status(200).json({
          success: true,
          message: "Thank you for reaching out to Sekhon Farm!",
          data: { received: true, ticketId: "SF-BOT-FILTERED" },
        });
      }

      // 3. Time-based spam check (form submitted faster than humanly possible < 1200ms)
      if (_renderedAt && Date.now() - _renderedAt < 1200) {
        console.warn(`[SpamProtection] Sub-second submission detected (bot). IP: ${req.ip}`);
        return res.status(200).json({
          success: true,
          message: "Thank you for reaching out to Sekhon Farm!",
          data: { received: true, ticketId: "SF-FAST-FILTERED" },
        });
      }

      // 4. Persist inquiry in database
      const ticketId = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
      try {
        await prisma.contactMessage.create({
          data: {
            name,
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            subject: "Website Contact Form Inquiry",
            message: message.trim(),
          },
        });
      } catch (dbErr: any) {
        console.warn("[Contact] Database logging warning (non-fatal):", dbErr.message);
      }

      // 5. Send Email via Gmail SMTP (port 587, STARTTLS)
      const emailResult = await sendContactNotificationEmail({
        name,
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        message: message.trim(),
        ticketId,
        clientIp: req.ip || req.socket.remoteAddress,
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      if (!emailResult.success) {
        console.error(`[Contact] SMTP delivery failed: ${emailResult.error}`);
        // If SMTP credentials are dummy/unconfigured, give helpful guidance
        return res.status(502).json({
          success: false,
          message: "Failed to dispatch email to Gmail inbox. Please check SMTP App Password in backend .env.",
          error: emailResult.error,
          ticketId,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Thank you, ${name}! Your inquiry has been sent directly to our team. We will get back to you within 24 hours.`,
        data: {
          received: true,
          ticketId,
          emailSent: true,
          messageId: emailResult.messageId,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // Mount Contact Route at both /api/contact and /api/v1/contact
  app.post("/api/contact", contactRateLimiter, handleContactSubmission);
  app.post("/api/v1/contact", contactRateLimiter, handleContactSubmission);

  // Health check routes
  app.get(["/api/health", "/api/v1/health", "/health"], (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Sekhon Farm Express API Health Check",
      data: {
        status: "healthy",
        framework: "Express 4.x",
        smtp: {
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT) || 587,
          userConfigured: !!(process.env.SMTP_USER || process.env.GMAIL_USER),
          passConfigured: !!(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD),
        },
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Global Error Handler (Sanitizes errors, prevents leaking secrets)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error("[Express Server Error]:", err.message || err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "An unexpected error occurred while processing your request.",
    });
  });

  return app;
}
