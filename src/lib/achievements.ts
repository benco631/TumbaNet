/**
 * TumbaNet — Monthly Achievements Engine
 *
 * Each month, run `runMonthlyAchievementsForGroup(groupId, month, year)` to:
 *  1. Compute the winner(s) for every achievement scoped to that group
 *  2. Create MonthlyAchievement records (duplicate-safe via unique constraint)
 *  3. Credit TumbaCoins to winners
 *  4. Log each award in CoinTransaction
 *
 * Tie handling: all tied users receive the full reward.
 * Minimum threshold: user must have ≥1 qualifying activity to win any positive achievement.
 * Ghost is the exception (zero activity = win).
 */

import { prisma } from "@/lib/prisma";
import { awardCoins } from "@/lib/coins";

// ── Achievement definitions ───────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  rewardCoins: number;
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
    rewardCoins: 1,
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

// ── Individual achievement calculators (all group-scoped) ─────────────────

async function calcDriverKing(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} car ride${v !== 1 ? "s" : ""}`);
}

async function calcRoadWarrior(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", groupId: gid, userId: { in: uids }, distanceKm: { not: null }, createdAt: { gte: s, lt: e } },
    _sum: { distanceKm: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.distanceKm ?? 0 })), (v) => `${v.toFixed(1)} km driven`);
}

async function calcUberTumba(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", groupId: gid, userId: { in: uids }, passengerCount: { not: null }, createdAt: { gte: s, lt: e } },
    _sum: { passengerCount: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.passengerCount ?? 0 })), (v) => `${v} passenger${v !== 1 ? "s" : ""} carried`);
}

async function calcFullCarLegend(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "CAR", groupId: gid, userId: { in: uids }, passengerCount: { gte: 5 }, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} full-car ride${v !== 1 ? "s" : ""}`);
}

async function calcHostMaster(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "HOST", groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} time${v !== 1 ? "s" : ""} hosted`);
}

async function calcOpenHouse(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "HOST", groupId: gid, userId: { in: uids }, attendeeCount: { not: null }, createdAt: { gte: s, lt: e } },
    _sum: { attendeeCount: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.attendeeCount ?? 0 })), (v) => `${v} total attendee${v !== 1 ? "s" : ""} hosted`);
}

async function calcLastMinuteHero(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { type: "HOST", groupId: gid, userId: { in: uids }, shortNotice: true, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} short-notice hosting${v !== 1 ? "s" : ""}`);
}

async function calcContentCreator(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.media.groupBy({
    by: ["userId"],
    where: { groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} upload${v !== 1 ? "s" : ""}`);
}

async function calcMemoryKeeper(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.entry.groupBy({
    by: ["userId"],
    where: { groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} highlight${v !== 1 ? "s" : ""}`);
}

async function calcStoryTeller(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const entries = await prisma.entry.findMany({
    where: { groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } },
    select: { userId: true, content: true },
  });
  const byUser: Record<string, number> = {};
  for (const en of entries) byUser[en.userId] = (byUser[en.userId] ?? 0) + en.content.length;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} chars written`);
}

async function calcHighRoller(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.wager.groupBy({
    by: ["userId"],
    where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, betOption: { bet: { groupId: gid } } },
    _sum: { amount: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.amount ?? 0 })), (v) => `${v} TC wagered`);
}

async function calcOracle(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const wagers = await prisma.wager.findMany({
    where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, payout: { not: null }, betOption: { bet: { groupId: gid } } },
    include: {
      betOption: { include: { bet: { select: { resolvedOptionId: true, status: true } } } },
    },
  });
  const wins = wagers.filter(
    (w) => w.betOption.bet.status === "RESOLVED" && w.betOption.bet.resolvedOptionId === w.betOptionId,
  );
  const byUser: Record<string, number> = {};
  for (const w of wins) byUser[w.userId] = (byUser[w.userId] ?? 0) + 1;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} bet${v !== 1 ? "s" : ""} won`);
}

async function calcRiskTaker(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.wager.groupBy({
    by: ["userId"],
    where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, betOption: { bet: { groupId: gid } } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} bet${v !== 1 ? "s" : ""} placed`);
}

async function calcBigSpender(s: Date, e: Date, _gid: string, uids: string[]): Promise<Winner[]> {
  // Purchase has no groupId — scope by member IDs only
  const rows = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { userId: { in: uids }, createdAt: { gte: s, lt: e } },
    _sum: { price: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._sum.price ?? 0 })), (v) => `${v} TC spent in shop`);
}

async function calcCollector(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const wagers = await prisma.wager.findMany({
    where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, payout: { gt: 0 }, betOption: { bet: { groupId: gid } } },
    select: { userId: true, payout: true },
  });
  const byUser: Record<string, number> = {};
  for (const w of wagers) byUser[w.userId] = (byUser[w.userId] ?? 0) + (w.payout ?? 0);
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} TC in payouts received`);
}

async function calcSocialBeast(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rsvps = await prisma.eventRsvp.findMany({
    where: { userId: { in: uids }, status: "GOING", event: { date: { gte: s, lt: e }, groupId: gid } },
    select: { userId: true },
  });
  const byUser: Record<string, number> = {};
  for (const r of rsvps) byUser[r.userId] = (byUser[r.userId] ?? 0) + 1;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} event${v !== 1 ? "s" : ""} attended`);
}

async function calcOrganizer(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const rows = await prisma.event.groupBy({
    by: ["userId"],
    where: { userId: { in: uids }, groupId: gid, createdAt: { gte: s, lt: e } },
    _count: { id: true },
  });
  return topUsers(rows.map((r) => ({ userId: r.userId, val: r._count.id })), (v) => `${v} event${v !== 1 ? "s" : ""} created`);
}

async function calcCommentKing(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const [comments, votes] = await Promise.all([
    prisma.dictionaryComment.groupBy({
      by: ["userId"],
      where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, dictionaryEntry: { groupId: gid } },
      _count: { id: true },
    }),
    // EventPollVote has no createdAt — scope by userId only as secondary signal
    prisma.eventPollVote.groupBy({
      by: ["userId"],
      where: { userId: { in: uids } },
      _count: { id: true },
    }),
  ]);
  const byUser: Record<string, number> = {};
  for (const c of comments) byUser[c.userId] = (byUser[c.userId] ?? 0) + c._count.id * 2;
  for (const v of votes) byUser[v.userId] = (byUser[v.userId] ?? 0) + v._count.id;
  return topUsers(Object.entries(byUser).map(([userId, val]) => ({ userId, val })), (v) => `${v} interactions`);
}

async function calcDramaCreator(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const wagers = await prisma.wager.findMany({
    where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, betOption: { bet: { groupId: gid } } },
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

async function calcGhost(s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  if (!uids.length) return [];
  const score: Record<string, number> = {};
  for (const id of uids) score[id] = 0;

  const [cars, hosts, entries, media, wagers, purchases, rsvps] = await Promise.all([
    prisma.activityLog.groupBy({ by: ["userId"], where: { type: "CAR", groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.activityLog.groupBy({ by: ["userId"], where: { type: "HOST", groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.entry.groupBy({ by: ["userId"], where: { groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.media.groupBy({ by: ["userId"], where: { groupId: gid, userId: { in: uids }, createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.wager.groupBy({ by: ["userId"], where: { userId: { in: uids }, createdAt: { gte: s, lt: e }, betOption: { bet: { groupId: gid } } }, _count: { id: true } }),
    prisma.purchase.groupBy({ by: ["userId"], where: { userId: { in: uids }, createdAt: { gte: s, lt: e } }, _count: { id: true } }),
    prisma.eventRsvp.findMany({ where: { userId: { in: uids }, status: "GOING", event: { date: { gte: s, lt: e }, groupId: gid } }, select: { userId: true } }),
  ]);

  for (const r of [...cars, ...hosts, ...entries, ...media, ...wagers, ...purchases]) {
    score[r.userId] = (score[r.userId] ?? 0) + r._count.id;
  }
  for (const r of rsvps) score[r.userId] = (score[r.userId] ?? 0) + 1;

  const min = Math.min(...Object.values(score));
  return Object.entries(score)
    .filter(([, v]) => v === min)
    .map(([userId, v]) => ({ userId, metricValue: v, metricLabel: `${v} total activities` }));
}

async function calcMostImproved(month: number, year: number, s: Date, e: Date, gid: string, uids: string[]): Promise<Winner[]> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const ps = new Date(prevYear, prevMonth - 1, 1);
  const pe = new Date(prevYear, prevMonth, 1);

  async function wearScore(from: Date, to: Date): Promise<Record<string, number>> {
    const [hosts, cars] = await Promise.all([
      prisma.activityLog.groupBy({ by: ["userId"], where: { type: "HOST", groupId: gid, userId: { in: uids }, createdAt: { gte: from, lt: to } }, _count: { id: true } }),
      prisma.activityLog.groupBy({ by: ["userId"], where: { type: "CAR", groupId: gid, userId: { in: uids }, createdAt: { gte: from, lt: to } }, _count: { id: true } }),
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

// ── Main runner (per group) ───────────────────────────────────────────────

export interface AwardResult {
  achievementKey: string;
  achievementName: string;
  achievementIcon: string;
  userId: string;
  groupId: string;
  rewardCoins: number;
  metricValue?: number;
  metricLabel?: string;
  alreadyAwarded: boolean;
}

export async function runMonthlyAchievementsForGroup(
  groupId: string,
  month: number,
  year: number,
): Promise<{ results: AwardResult[]; newCount: number; totalCoins: number; summary: string }> {
  const s = new Date(year, month - 1, 1);
  const e = new Date(year, month, 1);

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const memberIds = memberships.map((m) => m.userId);

  if (!memberIds.length) {
    return { results: [], newCount: 0, totalCoins: 0, summary: "No members in group." };
  }

  type Calc = () => Promise<Winner[]>;
  const calculators: Record<string, Calc> = {
    driver_king:      () => calcDriverKing(s, e, groupId, memberIds),
    road_warrior:     () => calcRoadWarrior(s, e, groupId, memberIds),
    uber_tumba:       () => calcUberTumba(s, e, groupId, memberIds),
    full_car_legend:  () => calcFullCarLegend(s, e, groupId, memberIds),
    host_master:      () => calcHostMaster(s, e, groupId, memberIds),
    open_house:       () => calcOpenHouse(s, e, groupId, memberIds),
    last_minute_hero: () => calcLastMinuteHero(s, e, groupId, memberIds),
    content_creator:  () => calcContentCreator(s, e, groupId, memberIds),
    memory_keeper:    () => calcMemoryKeeper(s, e, groupId, memberIds),
    story_teller:     () => calcStoryTeller(s, e, groupId, memberIds),
    high_roller:      () => calcHighRoller(s, e, groupId, memberIds),
    oracle:           () => calcOracle(s, e, groupId, memberIds),
    risk_taker:       () => calcRiskTaker(s, e, groupId, memberIds),
    big_spender:      () => calcBigSpender(s, e, groupId, memberIds),
    collector:        () => calcCollector(s, e, groupId, memberIds),
    social_beast:     () => calcSocialBeast(s, e, groupId, memberIds),
    organizer:        () => calcOrganizer(s, e, groupId, memberIds),
    comment_king:     () => calcCommentKing(s, e, groupId, memberIds),
    drama_creator:    () => calcDramaCreator(s, e, groupId, memberIds),
    ghost:            () => calcGhost(s, e, groupId, memberIds),
    most_improved:    () => calcMostImproved(month, year, s, e, groupId, memberIds),
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
      console.error(`[achievements] Calc error for ${def.key} in group ${groupId}:`, err);
      continue;
    }

    for (const w of winners) {
      const existing = await prisma.monthlyAchievement.findUnique({
        where: {
          achievementKey_month_year_userId_groupId: {
            achievementKey: def.key,
            month,
            year,
            userId: w.userId,
            groupId,
          },
        },
      });

      if (existing) {
        results.push({
          achievementKey: def.key,
          achievementName: def.name,
          achievementIcon: def.icon,
          userId: w.userId,
          groupId,
          rewardCoins: def.rewardCoins,
          metricValue: w.metricValue,
          metricLabel: w.metricLabel,
          alreadyAwarded: true,
        });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.monthlyAchievement.create({
          data: {
            achievementKey: def.key,
            month,
            year,
            userId: w.userId,
            groupId,
            rewardCoins: def.rewardCoins,
            metricValue: w.metricValue,
            metricLabel: w.metricLabel,
          },
        });

        if (def.rewardCoins > 0) {
          await awardCoins(
            tx,
            w.userId,
            def.rewardCoins,
            `Monthly Achievement: ${def.name} — ${getMonthName(month)} ${year}`,
            groupId,
          );
        }
      });

      totalCoins += def.rewardCoins;
      newCount++;
      results.push({
        achievementKey: def.key,
        achievementName: def.name,
        achievementIcon: def.icon,
        userId: w.userId,
        groupId,
        rewardCoins: def.rewardCoins,
        metricValue: w.metricValue,
        metricLabel: w.metricLabel,
        alreadyAwarded: false,
      });
    }
  }

  const label = `${getMonthName(month)} ${year}`;
  const summary =
    `[group:${groupId}] Processed ${ACHIEVEMENT_DEFS.length} achievements for ${label}. ` +
    `Awarded ${newCount} new prize${newCount !== 1 ? "s" : ""} totalling ${totalCoins} TC.`;

  return { results, newCount, totalCoins, summary };
}

/** Run achievements for ALL groups. Used by the monthly cron job. */
export async function runMonthlyAchievements(
  month: number,
  year: number,
): Promise<{ groupResults: { groupId: string; newCount: number; totalCoins: number }[]; grandTotalCoins: number; summary: string }> {
  const groups = await prisma.group.findMany({ select: { id: true } });
  const groupResults: { groupId: string; newCount: number; totalCoins: number }[] = [];
  let grandTotalCoins = 0;

  for (const g of groups) {
    try {
      const res = await runMonthlyAchievementsForGroup(g.id, month, year);
      groupResults.push({ groupId: g.id, newCount: res.newCount, totalCoins: res.totalCoins });
      grandTotalCoins += res.totalCoins;
      console.log(`[achievements] ${res.summary}`);
    } catch (err) {
      console.error(`[achievements] Error processing group ${g.id}:`, err);
    }
  }

  const label = `${getMonthName(month)} ${year}`;
  const summary =
    `Monthly achievements for ${label}: processed ${groups.length} group${groups.length !== 1 ? "s" : ""}, ` +
    `awarded ${grandTotalCoins} TC total.`;

  return { groupResults, grandTotalCoins, summary };
}
