import { userRepository } from "../repositories/user.repository.js";
import { UpdateProfileInput } from "../schemas/user.schema.js";
import { SafeUser } from "../types/auth.types.js";
import { NotFoundError } from "../utils/errors.js";
import { toSafeUser } from "../utils/sanitize.js";

export class UserService {
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return toSafeUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const updatedUser = await userRepository.update(userId, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    });

    return toSafeUser(updatedUser);
  }
}

export const userService = new UserService();

