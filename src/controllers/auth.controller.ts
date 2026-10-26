import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../schemas/auth.schema.js";
import { sendSuccess } from "../utils/response.js";
import { extractSessionId, SESSION_COOKIE_NAME } from "../middlewares/auth.middleware.js";

const isProduction = env.NODE_ENV === "production";

export function setSessionCookie(reply: FastifyReply, sessionId: string) {
  reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    signed: true,
    maxAge: env.SESSION_TTL_HOURS * 3600,
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    signed: true,
  });
}

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as RegisterInput;
    const result = await authService.register(body);
    setSessionCookie(reply, result.token);

    return sendSuccess(
      reply,
      {
        user: result.user,
        token: result.token,
      },
      "Account registered successfully. Welcome to Sekhon Farm!",
      201
    );
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as LoginInput;
    const result = await authService.login(body);
    setSessionCookie(reply, result.token);

    return sendSuccess(
      reply,
      {
        user: result.user,
        token: result.token,
      },
      "Logged in successfully."
    );
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const sessionId = extractSessionId(request);
    if (sessionId) {
      await authService.logout(sessionId);
    }
    clearSessionCookie(reply);

    return sendSuccess(reply, null, "Logged out successfully.");
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(reply, { user: request.user });
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(body);
    return sendSuccess(
      reply,
      {
        sent: true,
        ...(result.rawToken ? { testToken: result.rawToken } : {}),
      },
      result.message
    );
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as ResetPasswordInput;
    const result = await authService.resetPassword(body);
    clearSessionCookie(reply);

    return sendSuccess(
      reply,
      { reset: true },
      result.message
    );
  }
}

export const authController = new AuthController();

