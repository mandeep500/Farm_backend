import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { validate } from "../middlewares/validate.middleware.js";
import { sendSuccess } from "../utils/response.js";
import { normalizeEmail } from "../utils/sanitize.js";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  message: z.string().trim().min(5, "Message must be at least 5 characters"),
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
      const { name, email, phone, subject, message } = body;

      const record = await prisma.contactMessage.create({
        data: {
          name,
          email: normalizeEmail(email),
          phone: phone || null,
          subject: subject || null,
          message,
        },
      });

      const ticketId = `SF-${record.id.substring(record.id.length - 6).toUpperCase()}`;

      // Forward inquiry directly to Mandeep's Gmail
      try {
        await fetch("https://formsubmit.co/ajax/mandeepsekhon0052@gmail.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name,
            email: normalizeEmail(email),
            phone: phone || "Not provided",
            subject: subject || "Inquiry from Sekhon Farm Website",
            message,
            ticketId,
            _subject: `🌾 New Sekhon Farm Inquiry from ${name} [${ticketId}]`,
            _replyto: normalizeEmail(email),
            _template: "table",
            _captcha: "false",
          }),
        }).catch((err) => {
          request.log.warn({ err }, "FormSubmit notification warning");
        });
      } catch {
        // Non-blocking notification dispatch
      }

      return sendSuccess(
        reply,
        {
          received: true,
          ticketId,
          message: "We have received your message and will reach out to you shortly.",
        },
        "Thank you for contacting Sekhon Farm! Our agricultural team will be in touch within 24 hours.",
        201
      );
    }
  );
}

