import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  INITIAL_ADMIN_NAME: z.string().default("Sekhon Admin"),
  INITIAL_ADMIN_EMAIL: z.string().email().default("admin@sekhonfarm.com"),
  INITIAL_ADMIN_PHONE: z.string().default("+1 (555) 019-2834"),
  INITIAL_ADMIN_PASSWORD: z.string().default("Admin@Sekhon2026!#"),
  INITIAL_TEST_USER_NAME: z.string().default("Test Patron"),
  INITIAL_TEST_USER_EMAIL: z.string().email().default("test@sekhonfarm.com"),
  INITIAL_TEST_USER_PHONE: z.string().default("+1 (555) 789-0123"),
  INITIAL_TEST_USER_PASSWORD: z.string().default("Test@Sekhon2026!#"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;

