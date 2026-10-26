import { Prisma, User } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export class UserRepository {
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx || prisma;
    return client.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx || prisma;
    return client.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx || prisma;
    return client.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data,
    });
  }

  async updateLastLogin(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  async count(tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || prisma;
    return client.user.count();
  }
}

export const userRepository = new UserRepository();

