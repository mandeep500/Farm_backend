import { Role, Session, User } from "@prisma/client";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  // Frontend convenience aliases
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  memberSince: string;
  lastLogin: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthSuccessResult {
  user: SafeUser;
  token: string;
}

