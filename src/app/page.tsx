"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MotionPage, MotionStagger, MotionItem, MotionCard } from "@/components/motion";
import { buttonMotion, staggerContainer, fadeInUp } from "@/lib/animations";
import {
  HighlightsIcon,
  TumbasIcon,
  DictionaryIcon,
  EventsIcon,
  MarketIcon,
  ShopIcon,
  AlbumIcon,
  HostIcon,
  CarIcon,
  TrophyIcon,
  ChevronRightIcon,
  CrownIcon,
} from "@/lib/icons";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";
import { CoinAmountSm } from "@/components/TumbaCoin";
import EmptyState from "@/components/EmptyState";

interface WearEntry {
  userId: string;
  name: string;
  avatar: string | null;
  hostCount: number;
  carCount: number;
  wearIndex: number;
}

interface ActivityStats {
  lastHost: { name: string; avatar: string | null; date: string; note: string | null } | null;
  lastCar: { name: string; avatar: string | null; date: string; note: string | null } | null;
  wearIndex: WearEntry[];
}

interface UserData {
  id: string;
  name: string;
  tumbaCoins: number;
  status: string | null;
  createdAt: string;
}

const QUICK_ACCESS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: HighlightsIcon, label: "Highlights", href: "/sikum"      },
  { icon: TumbasIcon,     label: "Tumbas",     href: "/tumbas"     },
  { icon: EventsIcon,     label: "Events",     href: "/events"     },
  { icon: MarketIcon,     label: "Market",     href: "/market"     },
  { icon: DictionaryIcon, label: "Dictionary", href: "/dictionary" },
  { icon: ShopIcon,       label: "Shop",       href: "/shop"       },
  { icon: AlbumIcon,      label: "Album",      href: "/album"      },
];

const RANK_COLORS = [
  "from-yellow-400 to-amber-500",
  "from-gray-300 to-gray-400",
  "from-amber-600 to-amber-700",
];
const RANK_TEXT = ["text-yellow-400", "text-gray-300", "text-amber-500"];

// Rank badge for the hero card (top 3 gets a coloured pill)
function RankBadge({ rank }: { rank: number }) {
  if (rank === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/25">
        <CrownIcon size={10} strokeWidth={2} /> #1
      </span>
    );
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-300/15 text-gray-300 border border-gray-300/20">
        #2
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600/15 text-amber-500 border border-amber-600/20">
        #3
      </span>
    );
  return (
    <span className="text-xs text-tumba-400/70 font-medium">
      Rank #{rank + 1}
    </span>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);

  const userId = (session?.user as { id?: string })?.id;

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch("/api/activity/stats"),
        fetch("/api/users"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  const currentUser = users.find((u) => u.id === userId);
  const myWear = stats?.wearIndex.find((w) => w.userId === userId);
  const totalCoins = users.reduce((sum, u) => sum + u.tumbaCoins, 0);

  /* ── Logged-out view ── */
  if (!session) {
    return (
      <MotionPage className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-mesh px-4">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex justify-center mb-6"
          >
            <Logo size="xl" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-4xl font-extrabold mb-3"
          >
            <span className="gradient-text">TumbaNet</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-[var(--text-secondary)] mb-1.5"
          >
            The official network of the Tumbas
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-sm text-[var(--text-secondary)]/50 mb-8"
          >
            Hakuna Matata, baby.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex gap-3 justify-center"
          >
            <motion.div {...buttonMotion}>
              <Link href="/login" className="btn-primary">
                Login
              </Link>
            </motion.div>
            <motion.div {...buttonMotion}>
              <Link href="/register" className="btn-secondary">
                Join
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </MotionPage>
    );
  }

  const myRank = stats?.wearIndex.findIndex((w) => w.userId === userId);
  const topLeaderboard = stats?.wearIndex.filter((w) => w.wearIndex > 0).slice(0, 5) ?? [];
  const maxWear = topLeaderboard[0]?.wearIndex || 1;

  /* ── Logged-in view ── */
  return (
    <MotionPage className="max-w-2xl mx-auto px-4 py-5 space-y-6 bg-mesh min-h-[calc(100vh-4rem)]">

      {/* ── 1) HERO PROFILE CARD ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden p-5 rounded-2xl border border-tumba-500/22
          bg-gradient-to-br from-tumba-900/45 via-[var(--bg-card)] to-[var(--bg-card)]
          shadow-[0_0_48px_rgba(192,38,211,0.10),0_4px_20px_rgba(0,0,0,0.3)]"
      >
        {/* Background glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-tumba-500/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-neon-pink/[0.05] blur-2xl pointer-events-none" />
        {/* Top-edge highlight */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-tumba-400/30 to-transparent" />

        {/* Avatar + identity */}
        <div className="relative flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="h-[84px] w-[84px] rounded-2xl bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-3xl font-extrabold text-white shadow-lg shadow-tumba-500/25">
              {session.user?.name?.[0]?.toUpperCase()}
            </div>
            {/* Crown overlay for rank 1 */}
            {myRank === 0 && (
              <div className="absolute -top-3 -right-2 bg-yellow-400/90 rounded-full p-1 shadow-sm">
                <CrownIcon size={12} strokeWidth={2} className="text-black" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight leading-tight">
                {session.user?.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {myRank !== undefined && myRank >= 0 && (
                <RankBadge rank={myRank} />
              )}
              {currentUser?.status && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-tumba-500/15 text-tumba-400 border border-tumba-500/20 font-medium">
                  {currentUser.status}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
              Member since{" "}
              {currentUser
                ? new Date(currentUser.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        {/* Balance + Stats row */}
        <div className="relative flex gap-3 mt-5 pt-4 border-t border-tumba-500/[0.12]">
          {/* TumbaCoins — main hero element */}
          <div className="flex-[1.4] py-3.5 px-3.5 rounded-xl bg-gradient-to-br from-tumba-500/[0.14] to-tumba-900/20 border border-tumba-500/25 shadow-[inset_0_1px_0_rgba(192,38,211,0.08)]">
            <div className="flex items-center gap-2">
              <span className="animate-coin-glow shrink-0">
                <TumbaCoinIcon size={44} />
              </span>
              <span className="text-2xl font-extrabold text-tumba-300 tabular-nums leading-none">
                {currentUser?.tumbaCoins?.toLocaleString("en-US") ?? 0}
              </span>
            </div>
            <p className="section-label mt-2">TumbaCoins</p>
          </div>

          {/* Host count */}
          <div className="flex-1 text-center py-3.5 rounded-xl bg-tumba-500/[0.04] border border-tumba-500/20">
            <p className="text-[22px] font-extrabold leading-none">{myWear?.hostCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-1.5 font-medium">
              <HostIcon size={11} strokeWidth={2} /> Hosted
            </p>
          </div>

          {/* Car count */}
          <div className="flex-1 text-center py-3.5 rounded-xl bg-tumba-500/[0.04] border border-tumba-500/20">
            <p className="text-[22px] font-extrabold leading-none">{myWear?.carCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-1.5 font-medium">
              <CarIcon size={11} strokeWidth={2} /> Drove
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 2) GROUP OVERVIEW ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <p className="section-label">Group Overview</p>
          <p className="text-[10px] text-[var(--text-secondary)]/50">the Tumbas at a glance</p>
        </div>
        <MotionStagger className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MotionCard className="card-premium p-3.5 text-center">
            <p className="text-xl font-extrabold text-tumba-400">{users.length || "—"}</p>
            <p className="section-label mt-1">Members</p>
          </MotionCard>
          <MotionCard className="card-premium p-3.5 text-center">
            <div className="flex justify-center">
              <CoinAmountSm amount={totalCoins} />
            </div>
            <p className="section-label mt-1">Total TC</p>
          </MotionCard>
          <MotionCard className="card-premium p-3.5">
            <p className="section-label mb-1.5 flex items-center gap-1">
              <HostIcon size={10} strokeWidth={2} /> Last Host
            </p>
            <p className="text-sm font-bold truncate">
              {stats?.lastHost?.name ?? "—"}
            </p>
            {stats?.lastHost && (
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {new Date(stats.lastHost.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            )}
          </MotionCard>
          <MotionCard className="card-premium p-3.5">
            <p className="section-label mb-1.5 flex items-center gap-1">
              <CarIcon size={10} strokeWidth={2} /> Last Driver
            </p>
            <p className="text-sm font-bold truncate">
              {stats?.lastCar?.name ?? "—"}
            </p>
            {stats?.lastCar && (
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {new Date(stats.lastCar.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            )}
          </MotionCard>
        </MotionStagger>
      </div>

      {/* ── 3) MINI LEADERBOARD ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="card-premium p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400/22 to-amber-500/12 border border-yellow-400/18 flex items-center justify-center">
              <TrophyIcon size={18} strokeWidth={1.75} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Leaderboard</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">Ranked by Wear Index</p>
            </div>
          </div>
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 text-xs font-semibold text-tumba-400 hover:text-tumba-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-tumba-500/10"
          >
            View all
            <ChevronRightIcon size={14} strokeWidth={2} />
          </Link>
        </div>

        {topLeaderboard.length === 0 ? (
          <EmptyState
            icon={<TrophyIcon size={26} strokeWidth={1.5} className="text-yellow-500/50" />}
            title="No scores yet"
            description="Start hosting or driving to earn your rank."
            variant="gold"
            className="py-8"
          />
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {topLeaderboard.map((entry, i) => {
              const pct = Math.max((entry.wearIndex / maxWear) * 100, 4);
              const isMe = entry.userId === userId;
              return (
                <motion.div
                  key={entry.userId}
                  variants={fadeInUp}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                    isMe
                      ? "bg-tumba-500/[0.07] border border-tumba-500/15"
                      : "hover:bg-white/[0.025]"
                  }`}
                >
                  <div className="w-6 shrink-0 text-center">
                    {i < 3 ? (
                      <div
                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${RANK_COLORS[i]} flex items-center justify-center shadow-sm`}
                      >
                        <span className="text-[10px] font-extrabold text-black">{i + 1}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[var(--text-secondary)]">{i + 1}</span>
                    )}
                  </div>

                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                      i === 0
                        ? "bg-gradient-to-br from-tumba-400 to-neon-pink ring-1 ring-yellow-400/30"
                        : "bg-gradient-to-br from-[var(--bg-card-hover)] to-[var(--border)]"
                    }`}
                  >
                    {entry.name[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isMe ? "text-tumba-300" : ""
                        }`}
                      >
                        {entry.name}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] shrink-0 ml-2">
                        <span className="flex items-center gap-0.5">
                          <HostIcon size={10} strokeWidth={2} />
                          {entry.hostCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <CarIcon size={10} strokeWidth={2} />
                          {entry.carCount}
                        </span>
                        <span
                          className={`font-extrabold ${
                            i < 3 ? RANK_TEXT[i] : "text-tumba-400"
                          }`}
                        >
                          {entry.wearIndex}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full animate-grow-bar ${
                          i === 0
                            ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                            : i === 1
                            ? "bg-gradient-to-r from-gray-400 to-gray-300"
                            : i === 2
                            ? "bg-gradient-to-r from-amber-700 to-amber-500"
                            : "bg-gradient-to-r from-tumba-700 to-tumba-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {stats && stats.wearIndex.filter((w) => w.wearIndex === 0).length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.05]">
            <p className="text-[11px] text-[var(--text-secondary)]">
              No contributions yet:{" "}
              {stats.wearIndex
                .filter((w) => w.wearIndex === 0)
                .map((w) => w.name)
                .join(", ")}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── 4) QUICK ACCESS ───────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <p className="section-label">Quick Access</p>
          <p className="text-[10px] text-[var(--text-secondary)]/50">jump to any section</p>
        </div>
        <MotionStagger className="grid grid-cols-4 gap-3">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <MotionItem key={item.href}>
                <Link
                  href={item.href}
                  className="card-premium flex flex-col items-center gap-2.5 py-4 group
                    hover:border-tumba-500/22 hover:shadow-[0_0_18px_rgba(192,38,211,0.07)]
                    active:scale-[0.96] transition-all"
                >
                  <div
                    className="h-10 w-10 rounded-xl bg-tumba-500/10 flex items-center justify-center
                      group-hover:bg-tumba-500/20 group-hover:shadow-[0_0_14px_rgba(192,38,211,0.12)]
                      transition-all"
                  >
                    <Icon size={20} strokeWidth={1.75} className="text-tumba-400" />
                  </div>
                  <span
                    className="text-[11px] font-medium text-[var(--text-secondary)]
                      group-hover:text-[var(--text-primary)] transition-colors leading-tight text-center"
                  >
                    {item.label}
                  </span>
                </Link>
              </MotionItem>
            );
          })}
        </MotionStagger>
      </div>
    </MotionPage>
  );
}
