import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

declare global {
  // allow global `var` declarations in TypeScript
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Log slow queries or connection issues in dev
if (env.NODE_ENV === "development") {
  (prisma as any).$on("query", (e: any) => {
    if (e.duration > 200) {
      console.warn(`[Prisma Query Slow] ${e.query} - ${e.duration}ms`);
    }
  });
}

