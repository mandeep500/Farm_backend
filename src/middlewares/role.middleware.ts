import { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required.");
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]`
      );
    }
  };
}

