import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, ZodSchema } from "zod";
import { BadRequestError } from "../utils/errors.js";

type Target = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: Target = "body") {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const parsed = await schema.parseAsync(request[target]);
      request[target] = parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".") || "error";
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message;
          }
        }
        throw new BadRequestError("Validation failed", fieldErrors);
      }
      throw error;
    }
  };
}

