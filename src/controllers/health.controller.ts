import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";

export class HealthController {
  async check(_request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    let dbStatus = "connected";
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch (err: any) {
      dbStatus = `disconnected (${err.message || "error"})`;
    }

    const healthData = {
      status: dbStatus === "connected" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = dbStatus === "connected" ? 200 : 503;
    return sendSuccess(reply, healthData, "Sekhon Farm API Health Check", statusCode);
  }
}

export const healthController = new HealthController();

