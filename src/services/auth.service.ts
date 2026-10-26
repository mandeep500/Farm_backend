import { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { userRepository } from "../repositories/user.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { passwordResetRepository } from "../repositories/password-reset.repository.js";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../schemas/auth.schema.js";
import { AuthSuccessResult, SafeUser } from "../types/auth.types.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { generateSecureToken, generateSessionId, hashToken } from "../utils/crypto.js";
import { normalizeEmail, toSafeUser } from "../utils/sanitize.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors.js";

// Dummy bcrypt hash used for timing attack resistance when user email is not found
const DUMMY_HASH = "$2a$12$e80yq7Kev1u24/a3mE9L4.JkODKj0p5c16tW4Hh9Wq2tZ4j5o0h3i";

export class AuthService {
  /**
   * Registers a new user.
   * Validates duplicate email, hashes password, creates user and active session.
   */
  async register(input: RegisterInput): Promise<AuthSuccessResult> {
    const normalizedEmail = normalizeEmail(input.email);

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError("Account already exists. Please login.", {
        email: "An account with this email is already registered.",
      });
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      name: input.name.trim(),
      email: normalizedEmail,
      phone: input.phone.trim(),
      passwordHash,
      role: Role.USER,
      isActive: true,
      isVerified: false,
    });

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);

    await sessionRepository.create({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    return {
      user: toSafeUser(user),
      token: sessionId,
    };
  }

  /**
   * Authenticates user with email and password.
   * Returns safe user profile and session token.
   * Uses generic error messages and dummy hash comparison to eliminate account enumeration / timing attacks.
   */
  async login(input: LoginInput): Promise<AuthSuccessResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Run dummy compare to match timing of password verification
      await comparePassword(input.password, DUMMY_HASH);
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is inactive or suspended. Please contact support.");
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Update last login timestamp asynchronously
    await userRepository.updateLastLogin(user.id);

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);

    await sessionRepository.create({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    return {
      user: toSafeUser(user),
      token: sessionId,
    };
  }

  /**
   * Logs out user by destroying the current session in database.
   */
  async logout(sessionId: string): Promise<void> {
    if (sessionId) {
      await sessionRepository.delete(sessionId);
    }
  }

  /**
   * Returns the current authenticated user's safe profile.
   */
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return toSafeUser(user);
  }

  /**
   * Handles forgot password request.
   * Returns a generic message to prevent account enumeration.
   * If email exists, creates a cryptographically secure token and stores only its hash.
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string; rawToken?: string }> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await userRepository.findByEmail(normalizedEmail);

    let rawToken: string | undefined;

    if (user && user.isActive) {
      rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      // Invalidate existing active tokens and save new token hash
      await passwordResetRepository.invalidateUserTokens(user.id);
      await passwordResetRepository.create({
        tokenHash,
        userId: user.id,
        expiresAt,
      });

      // In production, send email containing rawToken here
    }

    return {
      message: "If the email is registered, password reset instructions have been sent.",
      // rawToken returned only during non-production testing if required
      ...(env.NODE_ENV === "test" || env.NODE_ENV === "development" ? { rawToken } : {}),
    };
  }

  /**
   * Resets password using valid token.
   * Atomically invalidates reset token, updates password, and revokes all active sessions.
   */
  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = hashToken(input.token);

    const validToken = await passwordResetRepository.findValidByTokenHash(tokenHash);
    if (!validToken) {
      throw new BadRequestError("Invalid or expired password reset token");
    }

    const newPasswordHash = await hashPassword(input.password);

    // Atomic transaction: update password, mark token used, invalidate sessions
    await prisma.$transaction(async (tx) => {
      await userRepository.update(validToken.userId, { passwordHash: newPasswordHash }, tx);
      await passwordResetRepository.markUsed(validToken.id, tx);
      await sessionRepository.deleteByUserId(validToken.userId, tx);
    });

    return {
      message: "Your password has been successfully reset. Please log in with your new credentials.",
    };
  }
}

export const authService = new AuthService();

