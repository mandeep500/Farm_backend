import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

async function startServer() {
  const app = buildApp();

  // Test database connection before listening
  try {
    await prisma.$connect();
    app.log.info("Database connection established successfully.");
  } catch (error) {
    app.log.error(error, "Failed to connect to the database on startup");
    process.exit(1);
  }

  // Graceful shutdown handling
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info({ signal }, "Received shutdown signal. Gracefully closing application...");
      try {
        await app.close();
        app.log.info("Fastify server closed.");
        await prisma.$disconnect();
        app.log.info("Prisma database connection closed.");
        process.exit(0);
      } catch (err) {
        app.log.error(err, "Error during graceful shutdown");
        process.exit(1);
      }
    });
  }

  // Handle unhandled rejections / uncaught exceptions
  process.on("unhandledRejection", (reason) => {
    app.log.error({ reason }, "Unhandled Promise Rejection");
  });

  process.on("uncaughtException", (error) => {
    app.log.fatal({ error }, "Uncaught Exception. Exiting process.");
    process.exit(1);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 Sekhon Farm Backend running at http://${env.HOST}:${env.PORT}/api/v1`);
    app.log.info(`🩺 Health check available at http://${env.HOST}:${env.PORT}/api/v1/health`);
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
  }
}

startServer();

