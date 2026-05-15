/**
 * TumbaNet — Weekly Allowance Service
 *
 * Every Sunday, every active group member receives 50 TumbaCoins.
 * Idempotent: a RewardLog record with the Sunday date as periodStartDate
 * prevents double-awarding if the cron fires more than once.
 */

import { prisma } from "@/lib/prisma";
import { awardCoins } from "@/lib/coins";

export const WEEKLY_AMOUNT = 50;
export const WEEKLY_REWARD_TYPE = "WEEKLY_ALLOWANCE";
export const JOIN_BONUS_AMOUNT = 100;
export const JOIN_BONUS_REWARD_TYPE = "GROUP_JOIN_BONUS";

/** Returns midnight UTC of the most recent Sunday (today if today is Sunday). */
export function getMostRecentSunday(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

export interface AllowanceResult {
  awarded: number;
  skipped: number;
  totalCoins: number;
  groups: number;
  periodDate: string;
  summary: string;
}

export async function runWeeklyAllowance(): Promise<AllowanceResult> {
  const sunday = getMostRecentSunday();
  const periodDate = sunday.toISOString().split("T")[0];

  const groups = await prisma.group.findMany({
    include: { memberships: { select: { userId: true } } },
  });

  let awarded = 0;
  let skipped = 0;
  let totalCoins = 0;

  for (const group of groups) {
    for (const { userId } of group.memberships) {
      // Check idempotency
      const existing = await prisma.rewardLog.findUnique({
        where: {
          userId_groupId_rewardType_periodStartDate: {
            userId,
            groupId: group.id,
            rewardType: WEEKLY_REWARD_TYPE,
            periodStartDate: sunday,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.rewardLog.create({
          data: {
            userId,
            groupId: group.id,
            rewardType: WEEKLY_REWARD_TYPE,
            periodStartDate: sunday,
          },
        });
        await awardCoins(tx, userId, WEEKLY_AMOUNT, "Weekly Sunday allowance", group.id);
      });

      awarded++;
      totalCoins += WEEKLY_AMOUNT;
    }
  }

  const summary =
    `Weekly allowance for Sunday ${periodDate}: ` +
    `${awarded} awarded, ${skipped} skipped across ${groups.length} group${groups.length !== 1 ? "s" : ""}. ` +
    `Total: ${totalCoins} TC.`;

  console.log(`[weekly-allowance] ${summary}`);
  return { awarded, skipped, totalCoins, groups: groups.length, periodDate, summary };
}

/**
 * Award the one-time group join bonus (100 TC) to a new member.
 * Safe to call inside or outside a transaction — pass `tx` when inside one.
 * Returns true if bonus was awarded, false if already given.
 */
export async function awardJoinBonus(
  userId: string,
  groupId: string,
): Promise<boolean> {
  const joinDate = new Date();
  // Use start of today as periodStartDate for the idempotency key
  joinDate.setUTCHours(0, 0, 0, 0);

  // Check if bonus already exists (e.g. re-join attempt)
  const existing = await prisma.rewardLog.findFirst({
    where: { userId, groupId, rewardType: JOIN_BONUS_REWARD_TYPE },
  });

  if (existing) return false;

  await prisma.$transaction(async (tx) => {
    // 1. אנחנו משאירים את הלוג, כדי שהמערכת תסמן "וי" על תהליך ההצטרפות
    await tx.rewardLog.create({
      data: {
        userId,
        groupId,
        rewardType: JOIN_BONUS_REWARD_TYPE,
        periodStartDate: joinDate,
      },
    });
    
    // 2. מבטלים את הכסף הכפול! פריסמה כבר נתנה לו 100 בהרשמה.
    /* await awardCoins(
      tx,
      userId,
      JOIN_BONUS_AMOUNT,
      `Welcome bonus — joined ${groupName}`,
      groupId,
    );
    */
  });

  return true;
}