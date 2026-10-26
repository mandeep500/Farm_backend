import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { Role } from "@prisma/client";

describe("User Profile & Role API", () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Register test user
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        name: "Amanjot Sekhon",
        email: `profile-test-${Date.now()}@sekhonfarm.com`,
        phone: "+1 (555) 678-1234",
        password: "ProfilePassword1!#",
        confirmPassword: "ProfilePassword1!#",
      },
    });

    const regData = JSON.parse(regRes.body).data;
    userToken = regData.token;
    userId = regData.user.id;

    // 2. Login as seeded admin
    const adminLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sekhonfarm.com",
        password: process.env.INITIAL_ADMIN_PASSWORD || "Admin@Sekhon2026!#",
      },
    });
    adminToken = JSON.parse(adminLoginRes.body).data.token;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
    await prisma.$disconnect();
  });

  it("GET /api/v1/users/me rejects unauthenticated request", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
    });

    expect(response.statusCode).toBe(401);
  });

  it("GET /api/v1/users/me returns authenticated profile", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.name).toBe("Amanjot Sekhon");
    expect(body.data.user.role).toBe(Role.USER);
    expect(body.data.user.passwordHash).toBeUndefined();
  });

  it("PATCH /api/v1/users/me successfully updates allowed profile fields", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        name: "Amanjot Singh Sekhon",
        phone: "+1 (555) 999-8888",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.name).toBe("Amanjot Singh Sekhon");
    expect(body.data.user.phone).toBe("+1 (555) 999-8888");
  });

  it("GET and PUT /api/v1/user/profile frontend aliases work identically", async () => {
    // GET alias
    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/user/profile",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    expect(getRes.statusCode).toBe(200);

    // PUT alias
    const putRes = await app.inject({
      method: "PUT",
      url: "/api/v1/user/profile",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        name: "Amanjot S. Sekhon",
      },
    });
    expect(putRes.statusCode).toBe(200);
    expect(JSON.parse(putRes.body).data.user.name).toBe("Amanjot S. Sekhon");
  });

  it("Verifies ADMIN user role permissions", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.user.role).toBe(Role.ADMIN);
  });
});

