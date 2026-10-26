import { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { healthRoutes } from "./health.routes.js";
import { contactRoutes } from "./contact.routes.js";

async function v1Routes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: "/auth" });
  fastify.register(userRoutes, { prefix: "/users" });
  fastify.register(userRoutes, { prefix: "/user" }); // Frontend alias
  fastify.register(healthRoutes);
  fastify.register(contactRoutes);
}

export async function registerAppRoutes(fastify: FastifyInstance) {
  // Primary production base URL: /api/v1
  await fastify.register(v1Routes, { prefix: "/api/v1" });

  // Direct alias: /api for frontend default client compatibility
  await fastify.register(v1Routes, { prefix: "/api" });

  // Root health check / info
  fastify.get("/", async (_req, reply) => {
    return reply.send({
      name: "Sekhon Farm API",
      status: "online",
      version: "1.0.0",
      documentation: "/api/v1/health",
    });
  });
}

