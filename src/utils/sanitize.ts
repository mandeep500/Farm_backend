import { User } from "@prisma/client";
import { SafeUser } from "../types/auth.types.js";

/**
 * Normalizes email address by trimming surrounding whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Strips passwordHash and any sensitive fields from User record,
 * returning a clean, safe profile object ready for frontend consumption.
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    status: user.isActive ? "ACTIVE" : "SUSPENDED",
    memberSince: user.createdAt.toISOString(),
    lastLogin: user.lastLoginAt ? user.lastLoginAt.toISOString() : user.createdAt.toISOString(),
  };
}

