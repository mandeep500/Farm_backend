import dotenv from "dotenv";
dotenv.config();

import { createExpressApp } from "./expressApp.js";
import { prisma } from "./db/prisma.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

async function runExpressServer() {
  const app = createExpressApp();

  try {
    await prisma.$connect();
    console.log("✅ [Express] Connected to MySQL database successfully.");
  } catch (err: any) {
    console.warn("⚠️ [Express] MySQL connection warning:", err.message);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Sekhon Farm Express Server running at http://${HOST}:${PORT}`);
    console.log(`📧 Contact Endpoint: POST http://${HOST}:${PORT}/api/v1/contact`);
    console.log(`🩺 Health check: GET http://${HOST}:${PORT}/api/v1/health`);
    console.log(`📨 SMTP configured: ${process.env.SMTP_HOST || "smtp.gmail.com"}:${process.env.SMTP_PORT || 587}`);
  });

  const shutdown = async () => {
    console.log("Gracefully closing Express server...");
    server.close(async () => {
      await prisma.$disconnect();
      console.log("Express server and DB connection closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

runExpressServer().catch((err) => {
  console.error("Failed to start Express server:", err);
  process.exit(1);
});

