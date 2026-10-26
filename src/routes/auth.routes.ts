import { FastifyInstance } from "fastify";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema.js";
import { env } from "../config/env.js";

export async function authRoutes(fastify: FastifyInstance) {
  // Stricter rate limit for authentication endpoints to prevent brute force
  const authRateLimit = {
    max: env.RATE_LIMIT_AUTH_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  };

  // POST /auth/register
  fastify.post(
    "/register",
    {
      config: { rateLimit: authRateLimit },
      preValidation: [validate(registerSchema)],
    },
    authController.register
  );

  // POST /auth/login
  fastify.post(
    "/login",
    {
      config: { rateLimit: authRateLimit },
      preValidation: [validate(loginSchema)],
    },
    authController.login
  );

  // POST /auth/logout
  fastify.post(
    "/logout",
    authController.logout
  );

  // GET /auth/me
  fastify.get(
    "/me",
    {
      preHandler: [authenticate],
    },
    authController.me
  );

  // POST /auth/forgot-password
  fastify.post(
    "/forgot-password",
    {
      config: { rateLimit: authRateLimit },
      preValidation: [validate(forgotPasswordSchema)],
    },
    authController.forgotPassword
  );

  // POST /auth/reset-password
  fastify.post(
    "/reset-password",
    {
      config: { rateLimit: authRateLimit },
      preValidation: [validate(resetPasswordSchema)],
    },
    authController.resetPassword
  );
}

