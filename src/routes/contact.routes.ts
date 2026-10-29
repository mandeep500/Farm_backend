import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { validate } from "../middlewares/validate.middleware.js";
import { sendSuccess } from "../utils/response.js";
import { normalizeEmail } from "../utils/sanitize.js";
import { sendContactNotificationEmail } from "../services/email.service.js";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().min(7, "Phone number must be at least 7 digits").max(25),
  subject: z.string().trim().optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(3000),
  website: z.string().optional(),
  hp_field: z.string().optional(),
  _renderedAt: z.number().optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/contact",
    {
      preValidation: [validate(contactSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as ContactInput;
      const { name, email, phone, message, website, hp_field, _renderedAt } = body;

      // Spam check 1: Honeypot field
      if (website || hp_field) {
        request.log.warn("Bot submission blocked via honeypot field");
        return sendSuccess(reply, { received: true, ticketId: "SF-BOT-FILTERED" }, "Thank you for reaching out!", 200);
      }

      // Spam check 2: Sub-second form submission
      if (_renderedAt && Date.now() - _renderedAt < 1200) {
        request.log.warn("Bot submission blocked via sub-second timer");
        return sendSuccess(reply, { received: true, ticketId: "SF-FAST-FILTERED" }, "Thank you for reaching out!", 200);
      }

      const record = await prisma.contactMessage.create({
        data: {
          name,
          email: normalizeEmail(email),
          phone: phone.trim(),
          subject: "Website Contact Form Inquiry",
          message: message.trim(),
        },
      });

      const ticketId = `SF-${record.id.substring(record.id.length - 6).toUpperCase()}`;

      // Dispatch notification email via Gmail SMTP
      const emailResult = await sendContactNotificationEmail({
        name,
        email: normalizeEmail(email),
        phone: phone.trim(),
        message: message.trim(),
        ticketId,
        clientIp: request.ip,
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      if (!emailResult.success) {
        request.log.error({ error: emailResult.error }, "Gmail SMTP dispatch error");
      }

      return sendSuccess(
        reply,
        {
          received: true,
          ticketId,
          emailSent: emailResult.success,
          message: "We have received your message and will reach out to you shortly.",
        },
        "Thank you for contacting Sekhon Farm! Our agricultural team will be in touch within 24 hours.",
        201
      );
    }
  );
}
