import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { createExpressApp } from "../src/expressApp.js";

// Mock Nodemailer to prevent sending real emails in automated test runs
vi.mock("nodemailer", () => {
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: "mock-message-id-12345" }),
      }),
    },
  };
});

describe("Express Contact Form API & Spam Protection", () => {
  const app = createExpressApp();

  it("POST /api/contact successfully receives valid submission and triggers email notification", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "Gurpreet Singh",
        email: "gurpreet@example.com",
        phone: "(555) 234-5678",
        message: "Hello Sekhon Farm, I would like to order fresh organic red onions and carrots.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketId).toBeDefined();
    expect(res.body.message).toContain("Gurpreet Singh");
  });

  it("POST /api/v1/contact also works as an alias", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({
        name: "Harman Sekhon",
        email: "harman@example.com",
        phone: "+91 98765 43210",
        message: "Inquiring about weekend farm tours and wholesale potatoes.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("Rejects submission if Full Name is missing or too short", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "G",
        email: "gurpreet@example.com",
        phone: "(555) 234-5678",
        message: "Hello Sekhon Farm, I would like to order fresh organic produce.",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Full Name must be at least 2 characters");
  });

  it("Rejects submission if Email is invalid", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "Gurpreet Singh",
        email: "not-an-email",
        phone: "(555) 234-5678",
        message: "Hello Sekhon Farm, please reply to my message.",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("valid email address");
  });

  it("Rejects submission if Phone Number is missing or invalid", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "Gurpreet Singh",
        email: "gurpreet@example.com",
        phone: "123", // too short
        message: "Hello Sekhon Farm, please call me back.",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Phone number");
  });

  it("Rejects submission if Message is too short (< 10 chars)", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "Gurpreet Singh",
        email: "gurpreet@example.com",
        phone: "(555) 234-5678",
        message: "Hi there",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("at least 10 characters");
  });

  it("Spam protection: Traps honeypot bot submissions silently", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "Spam Bot",
        email: "spambot@example.com",
        phone: "(555) 000-0000",
        message: "Buy cheap backlinks at our scam site now!",
        website: "http://spamwebsite.com", // honeypot triggered
      });

    expect(res.status).toBe(200);
    expect(res.body.data.ticketId).toBe("SF-BOT-FILTERED");
  });
});

