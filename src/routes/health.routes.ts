import { FastifyInstance } from "fastify";
import { healthController } from "../controllers/health.controller.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", healthController.check);
}

