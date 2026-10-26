import { PasswordResetToken, Prisma, User } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export class PasswordResetRepository {
  async create(
    data: { tokenHash: string; userId: string; expiresAt: Date },
    tx?: Prisma.TransactionClient
  ): Promise<PasswordResetToken> {
    const client = tx || prisma;
    return client.passwordResetToken.create({
      data,
    });
  }

  async findValidByTokenHash(
    tokenHash: string,
    tx?: Prisma.TransactionClient
  ): Promise<(PasswordResetToken & { user: User }) | null> {
    const client = tx || prisma;
    return client.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  async markUsed(id: string, tx?: Prisma.TransactionClient): Promise<PasswordResetToken> {
    const client = tx || prisma;
    return client.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async invalidateUserTokens(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || prisma;
    const result = await client.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
    return result.count;
  }
}

export const passwordResetRepository = new PasswordResetRepository();

