/**
 * TumbaNet — Monthly Achievements Engine
 *
 * Each month, run `runMonthlyAchievements(month, year)` to:
 *  1. Compute the winner(s) for every achievement from real DB data
 *  2. Create MonthlyAchievement records (duplicate-safe via unique constraint)
 *  3. Credit TumbaCoins to winners
 *  4. Log each award in CoinTransaction
 *
 * Tie handling: all tied users receive the full reward (generous, avoids
 * arbitrary tiebreaking).
 *
 * Minimum threshold: a user must have at least 1 qualifying activity to win
 * any positive achievement. Ghost is the exception (zero activity = win).
 */

import { prisma } from "@/lib/prisma";

// ── Achievement definitions ───────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  rewardCoins: number;
  /** Emoji used in the UI */
  icon: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    key: "driver_king",
    name: "Driver King",
    icon: "🚗",
    rewardCoins: 120,
    description: "Awarded to the member who logged the most car rides this month.",
  },
  {
    key: "road_warrior",
    name: "Road Warrior",
    icon: "🛣️",
    rewardCoins: 140,
    description: "Awarded to the member who drove the highest total distance this month.",
  },
  {
    key: "uber_tumba",
    name: "Uber Tumba",
    icon: "🚙",
    rewardCoins: 130,
    description: "Awarded to the member who carried the most total passengers this month.",
  },
  {
    key: "full_car_legend",
    name: "Full Car Legend",
    icon: "🪑",
    rewardCoins: 100,
    description: "Awarded to the member with the most rides that included 5 or more passengers.",
  },
  {
    key: "host_master",
    name: "Host Master",
    icon: "🏠",
    rewardCoins: 120,
    description: "Awarded to the member who hosted the most times this month.",
  },
  {
    key: "open_house",
    name: "Open House",
    icon: "🚪",
    rewardCoins: 130,
    description: "Awarded to the member who hosted the highest total number of attendees this month.",
  },
  {
    key: "last_minute_hero",
    name: "Last Minute Hero",
    icon: "⚡",
    rewardCoins: 90,
    description: "Awarded to the member who hosted on short notice the most times this month.",
  },
  {
    key: "content_creator",
    name: "Content Creator",
    icon: "📸",
    rewardCoins: 80,
    description: "Awarded to the member who uploaded the most photos or videos this month.",
  },
  {
    key: "memory_keeper",
    name: "Memory Keeper",
    icon: "📖",
    rewardCoins: 100,
    description: "Awarded to the member who added the most monthly highlights this month.",
  },
  {
    key: "story_teller",
    name: "Story Teller",
    icon: "✍️",
    rewardCoins: 70,
    description: "Awarded to the member who wrote the longest total highlight content this month.",
  },
  {
    key: "high_roller",
    name: "High Roller",
    icon: "💰",
    rewardCoins: 60,
    description: "Awarded to the member who wagered the most TumbaCoins this month.",
  },
  {
    key: "oracle",
    name: "Oracle",
    icon: "🔮",
    rewardCoins: 120,
    description: "Awarded to the member who won the most bets this month.",
  },
  {
    key: "risk_taker",
    name: "Risk Taker",
    icon: "🎲",
    rewardCoins: 70,
    description: "Awarded to the member who participated in the most bets this month.",
  },
  {
    key: "big_spender",
    name: "Big Spender",
    icon: "🛍️",
    rewardCoins: 50,
    description: "Awarded to the member who spent the most TumbaCoins in the shop this month.",
  },
  {
    key: "collector",
    name: "Collector",
    icon: "💎",
    rewardCoins: 110,
    description: "Awarded to the member who earned the most TumbaCoins from bet payouts this month.",
  },
  {
    key: "social_beast",
    name: "Social Beast",
    icon: "🎉",
    rewardCoins: 100,
    description: "Awarded to the member who attended the most events this month.",
  },
  {
    key: "organizer",
    name: "Organizer",
    icon: "📅",
    rewardCoins: 110,
    description: "Awarded to the member who created the most events this month.",
  },
  {
    key: "comment_king",
    name: "Comment King",
    icon: "💬",
    rewardCoins: 60,
    description: "Awarded to the member with the most comments and interactions this month.",
  },
  {
    key: "drama_creator",
    name: "Drama Creator",
    icon: "🎭",
    rewardCoins: 40,
    description: "Awarded to the member who lost the most bets this month. Classic chaos.",
  },
  {
    key: "ghost",
    name: "Ghost",
    icon: "👻",
    rewardCoins: 0,
    description: "Awarded to the least active member this month. Where were you?",
  },
  {
    key: "most_improved",
    name: "Most Improved",
    icon: "📈",
    rewardCoins: 90,
    description: "Awarded to the member who improved their activity score the most vs. last month.",
  },
];

export function getAchievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find((d) => d.key === key);
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? `Month ${month}`;
}

// ── Internal helpers ──────────────────────────────────────────────────────

interface Winner {
  userId: string;
  metricValue: number;
  metricLabel: string;
}

/** Returns all users tied for the top value. minVal prevents awarding on zero. */
function topUsers(
  rows: { userId: string; val: number }[],
  makeLabel: (v: number) => string,
  minVal = 1,
): Winner[] {
  const positive = rows.filter((r) => r.val >= minVal);
  if (!positive.length) return [];
  const max = Math.max(...positive.map((r) => r.val));
  return positive
    .filter((r) => r.val === max)
    .map((r) => ({ userId: r.userId, metricValue: r.val, metricLabel: makeLabel(r.val) }));
}

// ── Individual achievement calculators ───────────────────────────────────

async function calcDriverKing(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} car ride${v !== 1 ? "s" : ""}`);
}

async function calcRoadWarrior(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", distanceKm: { not: null }, createdAt: { gte: s, lt: e } },
    _sum: { distanceKm: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.distanceKm ?? 0 })), (v) => `${v.toFixed(1)} km driven`);
}

async function calcUberTumba(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", passengerCount: { not: null }, createdAt: { gte: s, lt: e } },
    _sum: { passengerCount: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.passengerCount ?? 0 })), (v) => `${v} passenger${v !== 1 ? "s" : ""} carried`);
}

async function calcFullCarLegend(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", passengerCount: { gte: 5 }, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} full-car ride${v !== 1 ? "s" : ""}`);
}

async function calcHostMaster(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "HOST", createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} time${v !== 1 ? "s" : ""} hosted`);
}

async function calcOpenHouse(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "HOST", attendeeCount: { not: null }, createdAt: { gte: s, lt: e } },
    _sum: { attendeeCount: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.attendeeCount ?? 0 })), (v) => `${v} total attendee${v !== 1 ? "s" : ""} hosted`);
}

async function calcLastMinuteHero(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "HOST", shortNotice: true, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} short-notice hosting${v !== 1 ? "s" : ""}`);
}

async function calcContentCreator(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.media.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} upload${v !== 1 ? "s" : ""}`);
}

async function calcMemoryKeeper(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.entry.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} highlight${v !== 1 ? "s" : ""}`);
}

async function calcStoryTeller(s: Date, e: Date): Promise<Winner[]> {
  const entries = await prisma.entry.findMany({
    where: { createdAt: { gte: s, lt: e } },
    select: { userId: true, content: true },
  });
  const byUser: Record<string, number> = {};
  for (const en of entries) byUser[en.userId] = (byUser[en.userId] ?? 0) + en.content.length;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} chars written`);
}

async function calcHighRoller(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.wager.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _sum: { amount: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.amount ?? 0 })), (v) => `${v} TC wagered`);
}

async function calcOracle(s: Date, e: Date): Promise<Winner[]> {
  // Wagers placed this month where the chosen option was the winning one
  const wagers = await prisma.wager.findMany({
    where: { createdAt: { gte: s, lt: e }, payout: { not: null } },
    include: {
      betOption: { include: { bet: { select: { resolvedOptionId: true, status: true } } } },
    },
  });
  const wins = wagers.filter(
    (w) =>
      w.betOption.bet.status === "RESOLVED" &&
      w.betOption.bet.resolvedOptionId === w.betOptionId,
  );
  const byUser: Record<string, number> = {};
  for (const w of wins) byUser[w.userId] = (byUser[w.userId] ?? 0) + 1;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} bet${v !== 1 ? "s" : ""} won`);
}

async function calcRiskTaker(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.wager.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} bet${v !== 1 ? "s" : ""} placed`);
}

async function calcBigSpender(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _sum: { price: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.price ?? 0 })), (v) => `${v} TC spent in shop`);
}

async function calcCollector(s: Date, e: Date): Promise<Winner[]> {
  // Proxy: sum of bet payouts received for wagers placed this month
  const wagers = await prisma.wager.findMany({
    where: { createdAt: { gte: s, lt: e }, payout: { gt: 0 } },
    select: { userId: true, payout: true },
  });
  const byUser: Record<string, number> = {};
  for (const w of wagers) byUser[w.userId] = (byUser[w.userId] ?? 0) + (w.payout ?? 0);
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} TC in payouts received`);
}

async function calcSocialBeast(s: Date, e: Date): Promise<Winner[]> {
  const rsvps = await prisma.eventRsvp.findMany({
    where: { status: "GOING", event: { date: { gte: s, lt: e } } },
    select: { userId: true },
  });
  const byUser: Record<string, number> = {};
  for (const r of rsvps) byUser[r.userId] = (byUser[r.userId] ?? 0) + 1;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} event${v !== 1 ? "s" : ""} attended`);
}

async function calcOrganizer(s: Date, e: Date): Promise<Winner[]> {
  const rows = await prisma.event.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} event${v !== 1 ? "s" : ""} created`);
}

async function calcCommentKing(s: Date, e: Date): Promise<Winner[]> {
  const comments = await prisma.dictionaryComment.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  // EventPollVotes have no createdAt; count all-time as a secondary signal
  const votes = await prisma.eventPollVote.groupBy({
    by: ["userId"],
    _count: { id: true },
  });
  const byUser: Record<string, number> = {};
  for (const c of comments) byUser[c.userId] = (byUser[c.userId] ?? 0) + c._count.id * 2; // weight comments more
  for (const v of votes) byUser[v.userId] = (byUser[v.userId] ?? 0) + v._count.id;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} interactions`);
}

async function calcDramaCreator(s: Date, e: Date): Promise<Winner[]> {
  // Most bets lost (placed a wager that was resolved against their chosen option)
  const wagers = await prisma.wager.findMany({
    where: { createdAt: { gte: s, lt: e } },
    include: {
      betOption: { include: { bet: { select: { resolvedOptionId: true, status: true } } } },
    },
  });
  const losses = wagers.filter(
    (w) =>
      w.betOption.bet.status === "RESOLVED" &&
      w.betOption.bet.resolvedOptionId !== null &&
      w.betOption.bet.resolvedOptionId !== w.betOptionId,
  );
  const byUser: Record<string, number> = {};
  for (const w of losses) byUser[w.userId] = (byUser[w.userId] ?? 0) + 1;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} bet${v !== 1 ? "s" : ""} lost`);
}

async function calcGhost(s: Date, e: Date): Promise<Winner[]> {
  // Least composite activity score across all tracked metrics
  const allUsers = await prisma.user.findMany({
    where: { createdAt: { lt: e } },
    select: { id: true },
  });
  const score: Record<string, number> = {};
  for (const u of allUsers) score[u.id] = 0;

  const [cars, hosts, entries, media, wagers, purchases, rsvps] = await Promise.all([
    prisma.activityLog.groupBy({ by: ["userId"], where: { type: "CAR", createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.activityLog.groupBy({ by: ["userId"], where: { type: "HOST", createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.entry.groupBy({ by: ["userId"], where: { createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.media.groupBy({ by: ["userId"], where: { createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.wager.groupBy({ by: ["userId"], where: { createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.purchase.groupBy({ by: ["userId"], where: { createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.eventRsvp.findMany({ where: { status: "GOING", event: { date: { gte: s, lt: e } } }, select: { userId: true } }),
  ]);

  for (const r of [...cars, ...hosts, ...entries, ...media, ...wagers, ...purchases]) {
    score[r.userId] = (score[r.userId] ?? 0) + r._count.id;
  }
  for (const r of rsvps) score[r.userId] = (score[r.userId] ?? 0) + 1;

  if (!Object.keys(score).length) return [];
  const min = Math.min(...Object.values(score));
  return Object.entries(score)
    .filter(([, v]) => v === min)
    .map(([userId, v]) => ({ userId, metricValue: v, metricLabel: `${v} total activities` }));
}

async function calcMostImproved(month: number, year: number, s: Date, e: Date): Promise<Winner[]> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const ps = new Date(prevYear, prevMonth - 1, 1);
  const pe = new Date(prevYear, prevMonth, 1);

  async function wearScore(from: Date, to: Date): Promise<Record<string, number>> {
    const [hosts, cars] = await Promise.all([
      prisma.activityLog.groupBy({ by: ["userId"], where: { type: "HOST", createdAt: { gte: from, lt: to } }, _count: { id: true } }),
      prisma.activityLog.groupBy({ by: ["userId"], where: { type: "CAR", createdAt: { gte: from, lt: to } }, _count: { id: true } }),
    ]);
    const sc: Record<string, number> = {};
    for (const h of hosts) sc[h.userId] = (sc[h.userId] ?? 0) + h._count.id * 3;
    for (const c of cars) sc[c.userId] = (sc[c.userId] ?? 0) + c._count.id * 2;
    return sc;
  }

  const [curr, prev] = await Promise.all([wearScore(s, e), wearScore(ps, pe)]);
  const allIds = Array.from(new Set([...Object.keys(curr), ...Object.keys(prev)]));
  const improvements: { userId: string; val: number }[] = [];
  for (const uid of allIds) {
    const improvement = (curr[uid] ?? 0) - (prev[uid] ?? 0);
    if (improvement > 0) improvements.push({ userId: uid, val: improvement });
  }
  return topUsers(improvements, (v) => `+${v} wear index vs last month`);
}

// ── Main runner ───────────────────────────────────────────────────────────

export interface AwardResult {
  achievementKey: string;
  achievementName: string;
  achievementIcon: string;
  userId: string;
  rewardCoins: number;
  metricValue?: number;
  metricLabel?: string;
  alreadyAwarded: boolean;
}

export async function runMonthlyAchievements(
  month: number,
  year: number,
): Promise<{ results: AwardResult[]; newCount: number; totalCoins: number; summary: string }> {
  const s = new Date(year, month - 1, 1);
  const e = new Date(year, month, 1);

  type Calc = () => Promise<Winner[]>;
  const calculators: Record<string, Calc> = {
    driver_king:      () => calcDriverKing(s, e),
    road_warrior:     () => calcRoadWarrior(s, e),
    uber_tumba:       () => calcUberTumba(s, e),
    full_car_legend:  () => calcFullCarLegend(s, e),
    host_master:      () => calcHostMaster(s, e),
    open_house:       () => calcOpenHouse(s, e),
    last_minute_hero: () => calcLastMinuteHero(s, e),
    content_creator:  () => calcContentCreator(s, e),
    memory_keeper:    () => calcMemoryKeeper(s, e),
    story_teller:     () => calcStoryTeller(s, e),
    high_roller:      () => calcHighRoller(s, e),
    oracle:           () => calcOracle(s, e),
    risk_taker:       () => calcRiskTaker(s, e),
    big_spender:      () => calcBigSpender(s, e),
    collector:        () => calcCollector(s, e),
    social_beast:     () => calcSocialBeast(s, e),
    organizer:        () => calcOrganizer(s, e),
    comment_king:     () => calcCommentKing(s, e),
    drama_creator:    () => calcDramaCreator(s, e),
    ghost:            () => calcGhost(s, e),
    most_improved:    () => calcMostImproved(month, year, s, e),
  };

  const results: AwardResult[] = [];
  let totalCoins = 0;
  let newCount = 0;

  for (const def of ACHIEVEMENT_DEFS) {
    const calc = calculators[def.key];
    if (!calc) continue;

    let winners: Winner[] = [];
    try {
      winners = await calc();
    } catch (err) {
      console.error(`[achievements] Calc error for ${def.key}:`, err);
      continue;
    }

    for (const w of winners) {
      // Idempotency check
      const existing = await prisma.monthlyAchievement.findUnique({
        where: {
          achievementKey_month_year_userId: {
            achievementKey: def.key,
            month,
            year,
            userId: w.userId,
          },
        },
      });

      if (existing) {
        results.push({
          achievementKey: def.key,
          achievementName: def.name,
          achievementIcon: def.icon,
          userId: w.userId,
          rewardCoins: def.rewardCoins,
          metricValue: w.metricValue,
          metricLabel: w.metricLabel,
          alreadyAwarded: true,
        });
        continue;
      }

      // Create record + award coins atomically
      await prisma.$transaction(async (tx) => {
        await tx.monthlyAchievement.create({
          data: {
            achievementKey: def.key,
            month,
            year,
            userId: w.userId,
            rewardCoins: def.rewardCoins,
            metricValue: w.metricValue,
            metricLabel: w.metricLabel,
          },
        });

        if (def.rewardCoins > 0) {
          await tx.user.update({
            where: { id: w.userId },
            data: { tumbaCoins: { increment: def.rewardCoins } },
          });
          await tx.coinTransaction.create({
            data: {
              userId: w.userId,
              amount: def.rewardCoins,
              reason: `Monthly Achievement: ${def.name} — ${getMonthName(month)} ${year}`,
            },
          });
        }
      });

      totalCoins += def.rewardCoins;
      newCount++;
      results.push({
        achievementKey: def.key,
        achievementName: def.name,
        achievementIcon: def.icon,
        userId: w.userId,
        rewardCoins: def.rewardCoins,
        metricValue: w.metricValue,
        metricLabel: w.metricLabel,
        alreadyAwarded: false,
      });
    }
  }

  const label = `${getMonthName(month)} ${year}`;
  const summary =
    `Processed ${ACHIEVEMENT_DEFS.length} achievements for ${label}. ` +
    `Awarded ${newCount} new prize${newCount !== 1 ? "s" : ""} totalling ${totalCoins} TC.`;

  return { results, newCount, totalCoins, summary };
}
