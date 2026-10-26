import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Sekhon Farm database seed...");

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "admin@sekhonfarm.com").trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "Admin@Sekhon2026!#";
  const adminName = process.env.INITIAL_ADMIN_NAME || "Sekhon Admin";
  const adminPhone = process.env.INITIAL_ADMIN_PHONE || "+1 (555) 019-2834";

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  // 1. Seed or Upsert Initial ADMIN User (Requirement 42)
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
      isVerified: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  console.log(`✅ Admin user seeded: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Seed or Upsert Test User for Testing Deployment (User prompt instruction)
  const testEmail = (process.env.INITIAL_TEST_USER_EMAIL || "test@sekhonfarm.com").trim().toLowerCase();
  const testPassword = process.env.INITIAL_TEST_USER_PASSWORD || "Test@Sekhon2026!#";
  const testName = process.env.INITIAL_TEST_USER_NAME || "Test Patron";
  const testPhone = process.env.INITIAL_TEST_USER_PHONE || "+1 (555) 789-0123";

  const testPasswordHash = await bcrypt.hash(testPassword, 12);

  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      name: testName,
      phone: testPhone,
      passwordHash: testPasswordHash,
      role: Role.USER,
      isActive: true,
      isVerified: true,
    },
    create: {
      name: testName,
      email: testEmail,
      phone: testPhone,
      passwordHash: testPasswordHash,
      role: Role.USER,
      isActive: true,
      isVerified: true,
    },
  });

  console.log(`✅ Deployment test user seeded: ${testUser.email} (Role: ${testUser.role})`);

  // 3. Seed frontend demo patron user (harman@sekhonfarm.com)
  const demoEmail = "harman@sekhonfarm.com";
  const demoPassword = testPassword;
  const demoPasswordHash = await bcrypt.hash(demoPassword, 12);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: "Harman Sekhon",
      phone: "+1 (555) 735-4661",
      passwordHash: demoPasswordHash,
      role: Role.USER,
      isActive: true,
      isVerified: true,
    },
    create: {
      name: "Harman Sekhon",
      email: demoEmail,
      phone: "+1 (555) 735-4661",
      passwordHash: demoPasswordHash,
      role: Role.USER,
      isActive: true,
      isVerified: true,
    },
  });

  console.log(`✅ Demo patron user seeded: ${demoUser.email} (Role: ${demoUser.role})`);

  console.log("🌾 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

