import { FastifyInstance } from "fastify";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateProfileSchema } from "../schemas/user.schema.js";

export async function userRoutes(fastify: FastifyInstance) {
  // GET /users/me
  fastify.get(
    "/me",
    {
      preHandler: [authenticate],
    },
    userController.getProfile
  );

  // PATCH /users/me
  fastify.patch(
    "/me",
    {
      preHandler: [authenticate, validate(updateProfileSchema)],
    },
    userController.updateProfile
  );

  // Frontend compatibility routes (/user/profile or /users/profile)
  fastify.get(
    "/profile",
    {
      preHandler: [authenticate],
    },
    userController.getProfile
  );

  fastify.put(
    "/profile",
    {
      preHandler: [authenticate, validate(updateProfileSchema)],
    },
    userController.updateProfile
  );
}

