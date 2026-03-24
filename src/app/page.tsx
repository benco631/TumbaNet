"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import { useEffect, useState, useCallback } from "react";
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
  WearIndexIcon,
} from "@/lib/icons";
import { CoinAmountMd, CoinAmountSm } from "@/components/TumbaCoin";

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
  const maxWear = stats?.wearIndex?.[0]?.wearIndex || 1;
  const totalCoins = users.reduce((sum, u) => sum + u.tumbaCoins, 0);

  /* ── Logged-out view ── */
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-mesh px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <Logo size="xl" />
          </div>
          <h1 className="text-4xl font-extrabold mb-3">
            <span className="gradient-text">TumbaNet</span>
          </h1>
          <p className="text-[var(--text-secondary)] mb-1.5">
            The official network of the Tumbas
          </p>
          <p className="text-sm text-[var(--text-secondary)]/50 mb-8">
            Hakuna Matata, baby.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-tumba-500 to-neon-blue text-white font-semibold hover:from-tumba-400 hover:to-tumba-500 transition-all shadow-lg shadow-tumba-500/25"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 rounded-xl border border-tumba-500/30 text-tumba-400 font-semibold hover:bg-tumba-500/10 transition-all"
            >
              Join
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Logged-in view ── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 bg-mesh min-h-[calc(100vh-4rem)]">

      {/* User Profile Card */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] glow-accent">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {session.user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{session.user?.name}</h2>
              {currentUser?.status && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-tumba-500/15 text-tumba-400 border border-tumba-500/20 shrink-0">
                  {currentUser.status}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Member since {currentUser ? new Date(currentUser.createdAt).getFullYear() : "—"}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex-1 text-center py-2.5 rounded-xl bg-[var(--bg-primary)]">
            <div className="flex justify-center">
              <CoinAmountMd amount={currentUser?.tumbaCoins ?? 0} />
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Balance</p>
          </div>
          <div className="flex-1 text-center py-2.5 rounded-xl bg-[var(--bg-primary)]">
            <p className="text-lg font-bold">{myWear?.hostCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <HostIcon size={10} strokeWidth={1.75} /> Hosted
            </p>
          </div>
          <div className="flex-1 text-center py-2.5 rounded-xl bg-[var(--bg-primary)]">
            <p className="text-lg font-bold">{myWear?.carCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <CarIcon size={10} strokeWidth={1.75} /> Drove
            </p>
          </div>
        </div>
      </div>

      {/* Group Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-center">
          <p className="text-lg font-bold text-tumba-400">{users.length || "—"}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Members</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-center">
          <div className="flex justify-center">
            <CoinAmountSm amount={totalCoins} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Total TC</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 flex items-center gap-1">
            <HostIcon size={10} strokeWidth={1.75} /> Last Host
          </p>
          <p className="text-sm font-semibold truncate">
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
        </div>
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 flex items-center gap-1">
            <CarIcon size={10} strokeWidth={1.75} /> Last Driver
          </p>
          <p className="text-sm font-semibold truncate">
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
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Quick Access
        </p>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-tumba-500/30 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-tumba-500/10 flex items-center justify-center group-hover:bg-tumba-500/20 transition-colors">
                  <Icon size={20} strokeWidth={1.75} className="text-tumba-400" />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-tight text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Wear Index */}
      {stats && stats.wearIndex.length > 0 && stats.wearIndex.some((w) => w.wearIndex > 0) && (
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-start gap-2 mb-4">
            <WearIndexIcon size={18} strokeWidth={1.75} className="text-tumba-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-bold leading-tight">Wear Index</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Hosting &times;3 + rides &times;2
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {stats.wearIndex
              .filter((w) => w.wearIndex > 0)
              .map((entry, i) => {
                const pct = Math.max((entry.wearIndex / maxWear) * 100, 4);
                return (
                  <div key={entry.userId} className="flex items-center gap-3">
                    <div className="w-5 shrink-0 text-center">
                      <span
                        className={`text-xs font-bold ${
                          i === 0 ? "text-tumba-400" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        i === 0
                          ? "bg-gradient-to-br from-tumba-400 to-neon-pink"
                          : "bg-gradient-to-br from-[var(--border)] to-[var(--bg-card-hover)]"
                      }`}
                    >
                      {entry.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{entry.name}</span>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] shrink-0 ml-2">
                          <span className="flex items-center gap-0.5">
                            <HostIcon size={10} strokeWidth={1.75} />
                            {entry.hostCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <CarIcon size={10} strokeWidth={1.75} />
                            {entry.carCount}
                          </span>
                          <span className="font-bold text-tumba-400">{entry.wearIndex}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full animate-grow-bar ${
                            i === 0
                              ? "bg-gradient-to-r from-tumba-500 to-neon-pink"
                              : i === 1
                                ? "bg-gradient-to-r from-tumba-600 to-tumba-500"
                                : "bg-tumba-700"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {stats.wearIndex.filter((w) => w.wearIndex === 0).length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)]">
                No contributions yet:{" "}
                {stats.wearIndex
                  .filter((w) => w.wearIndex === 0)
                  .map((w) => w.name)
                  .join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
