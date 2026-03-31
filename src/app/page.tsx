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
} from "@/lib/icons";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";
import { CoinAmountSm } from "@/components/TumbaCoin";

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
              <Link
                href="/login"
                className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-tumba-500 to-neon-blue text-white font-semibold hover:from-tumba-400 hover:to-tumba-500 transition-all shadow-lg shadow-tumba-500/25"
              >
                Login
              </Link>
            </motion.div>
            <motion.div {...buttonMotion}>
              <Link
                href="/register"
                className="inline-block px-8 py-3 rounded-xl border border-tumba-500/30 text-tumba-400 font-semibold hover:bg-tumba-500/10 transition-all"
              >
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
    <MotionPage className="max-w-2xl mx-auto px-4 py-5 space-y-5 bg-mesh min-h-[calc(100vh-4rem)]">

      {/* 1) PREMIUM USER HEADER / PROFILE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden p-5 rounded-2xl border border-tumba-500/20 bg-gradient-to-br from-tumba-900/40 via-[var(--bg-card)] to-[var(--bg-card)] shadow-[0_0_40px_rgba(192,38,211,0.08)]"
      >
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-tumba-500/[0.07] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-neon-pink/[0.04] blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="h-[72px] w-[72px] rounded-2xl bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-2xl font-extrabold text-white shrink-0 shadow-lg shadow-tumba-500/20">
            {session.user?.name?.[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight">{session.user?.name}</h2>
              {currentUser?.status && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-tumba-500/15 text-tumba-400 border border-tumba-500/20 shrink-0 font-medium">
                  {currentUser.status}
                </span>
              )}
            </div>
            {myRank !== undefined && myRank >= 0 && (
              <p className="text-xs text-tumba-400/70 mt-0.5 font-medium">
                Rank #{myRank + 1} on leaderboard
              </p>
            )}
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Member since {currentUser ? new Date(currentUser.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* Balance + Stats Row */}
        <div className="relative flex gap-3 mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex-[1.3] py-3 px-3 rounded-xl bg-gradient-to-br from-tumba-500/[0.12] to-transparent border border-tumba-500/15">
            <div className="flex items-center gap-2">
              <TumbaCoinIcon size={42} />
              <span className="text-2xl font-extrabold text-tumba-300 tabular-nums">
                {currentUser?.tumbaCoins?.toLocaleString("en-US") ?? 0}
              </span>
            </div>
            <p className="text-[10px] text-tumba-400/60 font-semibold mt-1 uppercase tracking-wider">TumbaCoins</p>
          </div>
          <div className="flex-1 text-center py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-xl font-extrabold">{myWear?.hostCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-0.5 font-medium">
              <HostIcon size={10} strokeWidth={2} /> Hosted
            </p>
          </div>
          <div className="flex-1 text-center py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-xl font-extrabold">{myWear?.carCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-0.5 font-medium">
              <CarIcon size={10} strokeWidth={2} /> Drove
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2) GROUP OVERVIEW */}
      <MotionStagger className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MotionCard className="card-premium p-3.5 text-center">
          <p className="text-lg font-extrabold text-tumba-400">{users.length || "—"}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium uppercase tracking-wider">Members</p>
        </MotionCard>
        <MotionCard className="card-premium p-3.5 text-center">
          <div className="flex justify-center">
            <CoinAmountSm amount={totalCoins} />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium uppercase tracking-wider">Total TC</p>
        </MotionCard>
        <MotionCard className="card-premium p-3.5">
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 flex items-center gap-1 font-medium uppercase tracking-wider">
            <HostIcon size={10} strokeWidth={2} /> Last Host
          </p>
          <p className="text-sm font-bold truncate">
            {stats?.lastHost?.name ?? "—"}
          </p>
          {stats?.lastHost && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {new Date(stats.lastHost.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          )}
        </MotionCard>
        <MotionCard className="card-premium p-3.5">
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 flex items-center gap-1 font-medium uppercase tracking-wider">
            <CarIcon size={10} strokeWidth={2} /> Last Driver
          </p>
          <p className="text-sm font-bold truncate">
            {stats?.lastCar?.name ?? "—"}
          </p>
          {stats?.lastCar && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {new Date(stats.lastCar.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          )}
        </MotionCard>
      </MotionStagger>

      {/* 3) MINI LEADERBOARD */}
      {topLeaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="card-premium p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-400/15 flex items-center justify-center">
                <TrophyIcon size={18} strokeWidth={1.75} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Leaderboard</h3>
                <p className="text-[10px] text-[var(--text-secondary)]">Top contributors</p>
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

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {topLeaderboard.map((entry, i) => {
              const pct = Math.max((entry.wearIndex / maxWear) * 100, 4);
              const isMe = entry.userId === userId;
              return (
                <motion.div
                  key={entry.userId}
                  variants={fadeInUp}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                    isMe ? "bg-tumba-500/[0.06] border border-tumba-500/15" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="w-6 shrink-0 text-center">
                    {i < 3 ? (
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${RANK_COLORS[i]} flex items-center justify-center`}>
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
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold truncate ${isMe ? "text-tumba-300" : ""}`}>
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
                        <span className={`font-extrabold ${i < 3 ? RANK_TEXT[i] : "text-tumba-400"}`}>
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

          {stats && stats.wearIndex.filter((w) => w.wearIndex === 0).length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
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
      )}

      {/* 4) QUICK ACCESS */}
      <div>
        <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
          Quick Access
        </p>
        <MotionStagger className="grid grid-cols-4 gap-3">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <MotionItem key={item.href}>
                <Link
                  href={item.href}
                  className="card-premium flex flex-col items-center gap-2.5 py-4 group hover:border-tumba-500/25 hover:shadow-[0_0_15px_rgba(192,38,211,0.06)] active:scale-[0.97] transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-tumba-500/10 flex items-center justify-center group-hover:bg-tumba-500/20 group-hover:shadow-[0_0_12px_rgba(192,38,211,0.1)] transition-all">
                    <Icon size={20} strokeWidth={1.75} className="text-tumba-400" />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-tight text-center">
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
