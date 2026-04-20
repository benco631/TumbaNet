"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MotionPage, MotionStagger, MotionItem, MotionCard } from "@/components/motion";
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
  CrownIcon,
  AlertCircleIcon,
} from "@/lib/icons";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";
import { CoinAmountSm } from "@/components/TumbaCoin";
import EmptyState from "@/components/EmptyState";
import StoryTray from "@/components/StoryTray";
import HomeFeed from "@/components/HomeFeed";

// --- Types ---
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
  avatar: string | null; // ← וידאנו שקיים בטייפ
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


// --- Helper Components ---

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

// קומפוננטת Avatar חכמה שיודעת להתמודד עם תמונות או ליפול לאות ראשונה
function UserAvatar({ name, avatarUrl, className = "", isSquare = false }: { name: string, avatarUrl?: string | null, className?: string, isSquare?: boolean }) {
  const baseClasses = `shrink-0 bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center font-extrabold text-white shadow-sm overflow-hidden ${isSquare ? 'rounded-2xl' : 'rounded-full'} ${className}`;
  
  if (avatarUrl) {
    return (
      <div className={baseClasses}>
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={baseClasses}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// קומפוננטת טעינה מהבהבת
function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-tumba-500/20 rounded-md ${className}`} />;
}

// --- Main Page ---

export default function Home() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // States חדשים לחוויית המשתמש
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = (session?.user as { id?: string })?.id;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch("/api/activity/stats"),
        fetch("/api/users"),
      ]);
      
      if (!statsRes.ok || !usersRes.ok) {
        throw new Error("Failed to fetch data");
      }
      
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
    } catch {
      setError("Oops! Couldn't load the latest data. Tumbas might be asleep.");
    } finally {
      setIsLoading(false);
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
    // ... [הקוד נשאר זהה לחלוטין לחלק הלא מחובר]
    return (
      <MotionPage className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-mesh px-4">
        {/* ... */}
        <div className="text-center max-w-md">
          <motion.h1 className="text-4xl font-extrabold mb-3">
            <span className="gradient-text">TumbaNet</span>
          </motion.h1>
          <motion.div className="flex gap-3 justify-center mt-8">
             <Link href="/login" className="btn-primary">Login</Link>
             <Link href="/register" className="btn-secondary">Join</Link>
          </motion.div>
        </div>
      </MotionPage>
    );
  }

  const myRank = stats?.wearIndex.findIndex((w) => w.userId === userId);

  /* ── Loading Skeleton View ── */
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 bg-mesh min-h-[calc(100vh-4rem)]">
        {/* Hero Skeleton */}
        <div className="card-premium p-5">
          <div className="flex gap-4">
            <Skeleton className="h-[84px] w-[84px] rounded-2xl" />
            <div className="flex-1 space-y-2 py-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-4 border-t border-tumba-500/[0.12]">
            <Skeleton className="h-20 flex-[1.4] rounded-xl" />
            <Skeleton className="h-20 flex-1 rounded-xl" />
            <Skeleton className="h-20 flex-1 rounded-xl" />
          </div>
        </div>
        {/* Quick blocks skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
           {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 card-premium" />)}
        </div>
      </div>
    );
  }

  /* ── Error View ── */
if (error) {
  return (
    <MotionPage className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-mesh px-4">
      <EmptyState
        icon={<AlertCircleIcon size={32} strokeWidth={1.5} className="text-red-500/80" />}
        title="Data Error"
        description={error}
        variant="default"
      />
      <button onClick={fetchData} className="btn-secondary mt-4">
        Try Again
      </button>
    </MotionPage>
  );
}

  /* ── Logged-in view (Loaded) ── */
  return (
    <MotionPage className="max-w-2xl mx-auto px-4 py-5 space-y-6 bg-mesh min-h-[calc(100vh-4rem)]">

      {/* ── 0) STORIES TRAY ── */}
    <StoryTray />

      {/* ── 1) HERO PROFILE CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden p-5 rounded-2xl border border-tumba-500/22
          bg-gradient-to-br from-tumba-900/45 via-[var(--bg-card)] to-[var(--bg-card)]
          shadow-[0_0_48px_rgba(192,38,211,0.10),0_4px_20px_rgba(0,0,0,0.3)]"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-tumba-500/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-neon-pink/[0.05] blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-tumba-400/30 to-transparent" />

        <div className="relative flex items-start gap-4">
          <div className="relative shrink-0">
            {/* ← הנה ה-Avatar החכם שלנו במקום ה-DIV הקודם */}
            <UserAvatar 
              name={session.user?.name || "User"} 
              avatarUrl={currentUser?.avatar} 
              isSquare={true} 
              className="h-[84px] w-[84px] text-3xl shadow-lg shadow-tumba-500/25" 
            />
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

        <div className="relative flex gap-3 mt-5 pt-4 border-t border-tumba-500/[0.12]">
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

          <div className="flex-1 text-center py-3.5 rounded-xl bg-tumba-500/[0.04] border border-tumba-500/20">
            <p className="text-[22px] font-extrabold leading-none">{myWear?.hostCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-1.5 font-medium">
              <HostIcon size={11} strokeWidth={2} /> Hosted
            </p>
          </div>

          <div className="flex-1 text-center py-3.5 rounded-xl bg-tumba-500/[0.04] border border-tumba-500/20">
            <p className="text-[22px] font-extrabold leading-none">{myWear?.carCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1 mt-1.5 font-medium">
              <CarIcon size={11} strokeWidth={2} /> Drove
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 2) GROUP OVERVIEW ── */}
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
          </MotionCard>
          <MotionCard className="card-premium p-3.5">
            <p className="section-label mb-1.5 flex items-center gap-1">
              <CarIcon size={10} strokeWidth={2} /> Last Driver
            </p>
            <p className="text-sm font-bold truncate">
              {stats?.lastCar?.name ?? "—"}
            </p>
          </MotionCard>
        </MotionStagger>
      </div>

      <HomeFeed />

      {/* ── 4) QUICK ACCESS ── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <p className="section-label">Quick Access</p>
        </div>
        <MotionStagger className="grid grid-cols-4 gap-3">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <MotionItem key={item.href}>
                <Link href={item.href} className="card-premium flex flex-col items-center gap-2.5 py-4 group hover:border-tumba-500/22 active:scale-[0.96] transition-all">
                  <div className="h-10 w-10 rounded-xl bg-tumba-500/10 flex items-center justify-center group-hover:bg-tumba-500/20 transition-all">
                    <Icon size={20} strokeWidth={1.75} className="text-tumba-400" />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors text-center">
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
