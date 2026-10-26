import { SafeUser } from "./auth.types.js";
import { Session } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user?: SafeUser;
    session?: Session;
  }
}

