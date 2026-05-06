import type { PrismaClient } from "@prisma/client";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Award TumbaCoins inside a Prisma transaction.
 * Always pairs a user balance increment with a CoinTransaction audit record.
 */
export async function awardCoins(
  tx: TxClient,
  userId: string,
  amount: number,
  reason: string,
  groupId?: string,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { tumbaCoins: { increment: amount } },
  });
  await tx.coinTransaction.create({
    data: { userId, amount, reason, groupId: groupId ?? null },
  });
}
