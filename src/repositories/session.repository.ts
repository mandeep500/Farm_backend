import { Prisma, Session, User } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export class SessionRepository {
  async create(
    data: { id: string; userId: string; expiresAt: Date },
    tx?: Prisma.TransactionClient
  ): Promise<Session> {
    const client = tx || prisma;
    return client.session.create({
      data,
    });
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<(Session & { user: User }) | null> {
    const client = tx || prisma;
    return client.session.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<Session | null> {
    const client = tx || prisma;
    try {
      return await client.session.delete({
        where: { id },
      });
    } catch {
      // If already deleted or not found, return null gracefully
      return null;
    }
  }

  async deleteByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || prisma;
    const result = await client.session.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  async deleteExpired(tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || prisma;
    const result = await client.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();

