import { FastifyReply, FastifyRequest } from "fastify";
import { sessionRepository } from "../repositories/session.repository.js";
import { UnauthorizedError } from "../utils/errors.js";
import { toSafeUser } from "../utils/sanitize.js";

export const SESSION_COOKIE_NAME = "sekhon_session";

/**
 * Extracts session ID from either signed/unsigned cookie or Authorization: Bearer header
 */
export function extractSessionId(request: FastifyRequest): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken) return bearerToken;
  }

  // 2. Check Cookie
  const rawCookie = request.cookies[SESSION_COOKIE_NAME];
  if (!rawCookie) return null;

  // Check if signed cookie
  if (typeof request.unsignCookie === "function") {
    const unsigned = request.unsignCookie(rawCookie);
    if (unsigned.valid && unsigned.value) {
      return unsigned.value;
    }
  }

  // Fallback to raw cookie value
  return rawCookie;
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const sessionId = extractSessionId(request);

  if (!sessionId) {
    throw new UnauthorizedError("Authentication required. Please log in.");
  }

  const session = await sessionRepository.findById(sessionId);

  if (!session) {
    throw new UnauthorizedError("Invalid or expired session. Please log in.");
  }

  // Check expiration
  if (session.expiresAt.getTime() <= Date.now()) {
    // Delete expired session asynchronously
    await sessionRepository.delete(session.id);
    throw new UnauthorizedError("Session has expired. Please log in again.");
  }

  // Check if user is active
  if (!session.user.isActive) {
    throw new UnauthorizedError("User account is inactive. Please contact administrator.");
  }

  request.user = toSafeUser(session.user);
  request.session = session;
}

