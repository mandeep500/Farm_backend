import { FastifyReply, FastifyRequest } from "fastify";
import { userService } from "../services/user.service.js";
import { UpdateProfileInput } from "../schemas/user.schema.js";
import { sendSuccess } from "../utils/response.js";
import { UnauthorizedError } from "../utils/errors.js";

export class UserController {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    const profile = await userService.getProfile(request.user.id);
    return sendSuccess(reply, { user: profile });
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    const body = request.body as UpdateProfileInput;
    const updated = await userService.updateProfile(request.user.id, body);
    request.user = updated;
    return sendSuccess(reply, { user: updated }, "Profile updated successfully.");
  }
}

export const userController = new UserController();

