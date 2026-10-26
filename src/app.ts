import Fastify, { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { Prisma } from "@prisma/client";
import { env } from "./config/env.js";
import { AppError } from "./utils/errors.js";
import { registerAppRoutes } from "./routes/index.js";

export function buildApp(): FastifyInstance {
  const isProduction = env.NODE_ENV === "production";

  const fastify = Fastify({
    logger: {
      level: isProduction ? "info" : "debug",
      // Redact sensitive credentials and tokens from all logs
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.confirmPassword",
        "req.body.token",
        "req.body.oldPassword",
        "req.body.newPassword",
      ],
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            hostname: req.hostname,
            remoteAddress: req.ip,
          };
        },
      },
    },
    // Enforce 1MB payload limit
    bodyLimit: 1048576,
  });

  // 1. Security Headers via Helmet
  fastify.register(helmet, {
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });

  // 2. CORS configuration
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (!isProduction) {
        // In dev, allow localhost and configured origins
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          allowedOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy violation: Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  });

  // 3. Fastify Cookie plugin
  fastify.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });

  // 4. Rate Limiting plugin
  fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      statusCode: 429,
      error: "TooManyRequests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  });

  // 5. Register All Application Routes
  fastify.register(registerAppRoutes);

  // 6. Centralized Custom Error Handler
  fastify.setErrorHandler((error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) => {
    // A. Custom AppError instances (BadRequestError, ConflictError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error(error);
      } else {
        request.log.warn({ err: error.message, statusCode: error.statusCode }, "Application operational warning");
      }

      return reply.status(error.statusCode).send({
        success: false,
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      });
    }

    // B. Fastify Validation Errors
    if ("validation" in error && error.validation) {
      request.log.warn({ validation: error.validation }, "Fastify validation error");
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "ValidationError",
        message: error.message || "Invalid request payload",
      });
    }

    // C. Prisma Database Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      request.log.error({ prismaCode: error.code, meta: error.meta }, "Prisma database error");

      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(", ")
          : (error.meta?.target as string) || "field";
        return reply.status(409).send({
          success: false,
          statusCode: 409,
          error: "ConflictError",
          message: `A record with this ${target} already exists.`,
        });
      }

      if (error.code === "P2025") {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          error: "NotFoundError",
          message: "The requested record was not found.",
        });
      }

      return reply.status(500).send({
        success: false,
        statusCode: 500,
        error: "DatabaseError",
        message: isProduction ? "A database error occurred." : error.message,
      });
    }

    // D. Rate limit errors
    if ((error as any).statusCode === 429) {
      return reply.status(429).send({
        success: false,
        statusCode: 429,
        error: "TooManyRequests",
        message: error.message,
      });
    }

    // E. Unhandled / Unexpected Errors
    request.log.error(error, "Unhandled server exception");
    return reply.status(500).send({
      success: false,
      statusCode: 500,
      error: "InternalServerError",
      message: isProduction ? "An unexpected internal server error occurred." : error.message,
    });
  });

  // 7. Custom 404 Not Found Handler
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      success: false,
      statusCode: 404,
      error: "NotFoundError",
      message: `Cannot ${request.method} ${request.url}`,
    });
  });

  return fastify;
}

