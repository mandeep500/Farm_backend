import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

describe("Authentication & Session API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Clean up test data created during test runs
    await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            contains: "test-auth-",
          },
        },
      },
    });
    await prisma.passwordResetToken.deleteMany({
      where: {
        user: {
          email: {
            contains: "test-auth-",
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "test-auth-",
        },
      },
    });

    await app.close();
    await prisma.$disconnect();
  });

  const uniqueId = Date.now();
  const testEmail = `test-auth-${uniqueId}@sekhonfarm.com`;
  const validPassword = "SecurePass123!#";

  describe("POST /api/v1/auth/register", () => {
    it("fails validation when fields are missing or invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "A", // too short (<2)
          email: "not-an-email",
          phone: "123", // too short (<7)
          password: "weak", // fails password rules
          confirmPassword: "different",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors).toBeDefined();
      expect(body.errors.name).toBeDefined();
      expect(body.errors.email).toBeDefined();
      expect(body.errors.phone).toBeDefined();
      expect(body.errors.password).toBeDefined();
      expect(body.errors.confirmPassword).toBeDefined();
    });

    it("enforces strict password rules (8-18 chars, uppercase, lowercase, number, special char)", async () => {
      // Missing special character
      const resNoSpecial = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "John Doe",
          email: `test-pass-${uniqueId}@sekhonfarm.com`,
          phone: "+1 555-123-4567",
          password: "NoSpecialChar123",
          confirmPassword: "NoSpecialChar123",
        },
      });
      expect(resNoSpecial.statusCode).toBe(400);

      // Missing number
      const resNoNumber = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "John Doe",
          email: `test-pass-${uniqueId}@sekhonfarm.com`,
          phone: "+1 555-123-4567",
          password: "NoNumberPass!#",
          confirmPassword: "NoNumberPass!#",
        },
      });
      expect(resNoNumber.statusCode).toBe(400);

      // Too long (>18 chars)
      const resTooLong = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "John Doe",
          email: `test-pass-${uniqueId}@sekhonfarm.com`,
          phone: "+1 555-123-4567",
          password: "ThisPasswordIsWayTooLong123!#",
          confirmPassword: "ThisPasswordIsWayTooLong123!#",
        },
      });
      expect(resTooLong.statusCode).toBe(400);
    });

    it("registers user successfully and normalizes email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Gurpreet Sekhon",
          email: `  ${testEmail.toUpperCase()}  `,
          phone: "+1 (555) 345-6789",
          password: validPassword,
          confirmPassword: validPassword,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(testEmail.toLowerCase());
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.token).toBeDefined();

      // Check cookie was set
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(String(cookies)).toContain("sekhon_session=");
      expect(String(cookies)).toContain("HttpOnly");
    });

    it("returns HTTP 409 'Account already exists. Please login.' on duplicate email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Gurpreet Duplicate",
          email: testEmail,
          phone: "+1 (555) 345-6789",
          password: validPassword,
          confirmPassword: validPassword,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Account already exists. Please login.");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns generic 401 when email does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "unknown-account@sekhonfarm.com",
          password: validPassword,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Invalid email or password");
    });

    it("returns generic 401 when password is wrong", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "WrongPassword123!#",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Invalid email or password");
    });

    it("authenticates successfully with valid credentials", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail.toUpperCase(), // Case insensitive test
          password: validPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testEmail.toLowerCase());
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.token).toBeDefined();

      const sessionToken = body.data.token;

      // Verify Session record exists in MySQL database (Requirement 20)
      const sessionInDb = await prisma.session.findUnique({
        where: { id: sessionToken },
      });
      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.userId).toBe(body.data.user.id);
      expect(sessionInDb?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Protected /auth/me and Session Verification", () => {
    it("rejects unauthorized access without credentials", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it("allows access with Bearer token header", async () => {
      // 1. Login to get token
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: validPassword,
        },
      });
      const token = JSON.parse(loginRes.body).data.token;

      // 2. Access /auth/me
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.body);
      expect(meBody.data.user.email).toBe(testEmail.toLowerCase());
      expect(meBody.data.user.passwordHash).toBeUndefined();
    });

    it("allows access with HTTP cookie", async () => {
      // 1. Login to get cookie
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: validPassword,
        },
      });
      const cookieHeader = loginRes.headers["set-cookie"];

      // 2. Access /auth/me with cookie
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          cookie: Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string),
        },
      });

      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.body);
      expect(meBody.data.user.email).toBe(testEmail.toLowerCase());
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("invalidates the session in MySQL and clears cookie", async () => {
      // 1. Login
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: validPassword,
        },
      });
      const token = JSON.parse(loginRes.body).data.token;

      // Verify session exists
      const sessionBefore = await prisma.session.findUnique({ where: { id: token } });
      expect(sessionBefore).not.toBeNull();

      // 2. Logout
      const logoutRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(logoutRes.statusCode).toBe(200);

      // Verify session was removed from MySQL
      const sessionAfter = await prisma.session.findUnique({ where: { id: token } });
      expect(sessionAfter).toBeNull();

      // 3. Attempting to use the invalidated token returns 401
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(meRes.statusCode).toBe(401);
    });
  });

  describe("Password Reset Flow (Forgot & Reset)", () => {
    it("POST /forgot-password does not reveal whether email exists", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: {
          email: "non-existent-user@sekhonfarm.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain("password reset instructions have been sent");
    });

    it("POST /forgot-password stores only secure hash of reset token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: {
          email: testEmail,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const rawToken = body.data.testToken;
      expect(rawToken).toBeDefined();

      // Find token record in MySQL
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user?.id, usedAt: null },
      });

      expect(resetTokenRecord).toBeDefined();
      // Ensure the raw token is NEVER stored in database
      expect(resetTokenRecord?.tokenHash).not.toBe(rawToken);
      expect(resetTokenRecord?.tokenHash.length).toBe(64); // SHA-256 hex
    });

    it("POST /reset-password successfully updates password, invalidates token and clears sessions", async () => {
      // 1. Login first to create an active session
      const loginBefore = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: validPassword,
        },
      });
      const activeSessionToken = JSON.parse(loginBefore.body).data.token;

      // 2. Request forgot password
      const forgotRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: { email: testEmail },
      });
      const rawToken = JSON.parse(forgotRes.body).data.testToken;

      const newPassword = "NewPassword2026!#";

      // 3. Reset password
      const resetRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: {
          token: rawToken,
          password: newPassword,
          confirmPassword: newPassword,
        },
      });

      expect(resetRes.statusCode).toBe(200);

      // 4. Old active session should have been invalidated (Requirement 29)
      const sessionAfterReset = await prisma.session.findUnique({
        where: { id: activeSessionToken },
      });
      expect(sessionAfterReset).toBeNull();

      // 5. Trying to login with old password should fail
      const loginOld = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: validPassword,
        },
      });
      expect(loginOld.statusCode).toBe(401);

      // 6. Logging in with new password should succeed
      const loginNew = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: newPassword,
        },
      });
      expect(loginNew.statusCode).toBe(200);

      // 7. Re-using the same reset token must be rejected (Requirement 28)
      const reUseTokenRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: {
          token: rawToken,
          password: "AnotherPassword123!#",
          confirmPassword: "AnotherPassword123!#",
        },
      });
      expect(reUseTokenRes.statusCode).toBe(400);
    });
  });
});

