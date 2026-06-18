import { Prisma } from '@prisma/generated';

export async function lockUserForLimits(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
  `;
}
