"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { CoinAmountLg } from "@/components/TumbaCoin";
import {
  TumbasIcon,
  HighlightsIcon,
  DictionaryIcon,
  EventsIcon,
  MarketIcon,
  CoinsIcon,
  AlbumIcon,
  ShopIcon,
  TagIcon,
} from "@/lib/icons";

interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  nickname: string | null;
  tag: string | null;
  tumbaCoins: number;
  status: string;
  createdAt: string;
  _count: {
    entries: number;
    dictionaryEntries: number;
    events: number;
    betsCreated: number;
    wagers: number;
    media: number;
    purchases: number;
  };
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: "lg" | "xl" }) {
  const cls =
    size === "xl"
      ? "h-24 w-24 text-4xl shadow-lg shadow-tumba-500/20"
      : "h-16 w-16 text-2xl";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${cls} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center font-bold text-white shrink-0`}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserId = (session?.user as { id?: string })?.id;
  const isOwnProfile = currentUserId === profileId;

  const fetchProfile = useCallback(async () => {
    const res = await fetch(`/api/users/${profileId}`);
    if (!res.ok) { setLoading(false); return; }
    setUser(await res.json());
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchProfile();
  }, [status, router, fetchProfile]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <TumbasIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
        <p className="text-lg text-[var(--text-secondary)]">User not found</p>
        <button onClick={() => router.push("/tumbas")} className="mt-4 text-tumba-400 hover:text-tumba-300 text-sm">
          &larr; Back to Tumbas
        </button>
      </div>
    );
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Highlights",   value: user._count.entries,           icon: HighlightsIcon },
    { label: "Dictionary",   value: user._count.dictionaryEntries, icon: DictionaryIcon },
    { label: "Events",       value: user._count.events,            icon: EventsIcon     },
    { label: "Bets Created", value: user._count.betsCreated,       icon: MarketIcon     },
    { label: "Wagers",       value: user._count.wagers,            icon: CoinsIcon      },
    { label: "Media",        value: user._count.media,             icon: AlbumIcon      },
    { label: "Purchases",    value: user._count.purchases,         icon: ShopIcon       },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push("/tumbas")}
        className="text-sm text-tumba-400 hover:text-tumba-300 mb-6 inline-block"
      >
        &larr; Back to Tumbas
      </button>

      {/* Profile Header */}
      <div className="p-6 sm:p-8 rounded-2xl border border-tumba-500/30 bg-tumba-500/5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar src={user.avatar} name={user.name} size="xl" />

          <div className="flex-1 text-center sm:text-left">
            {/* Name row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{user.name}</h1>
              {user.nickname && (
                <span className="text-tumba-400 text-lg">&quot;{user.nickname}&quot;</span>
              )}
              {isOwnProfile && (
                <span className="text-[10px] bg-tumba-500/20 text-tumba-400 px-2 py-0.5 rounded-full w-fit mx-auto sm:mx-0">
                  You
                </span>
              )}
            </div>

            {/* Tag */}
            {user.tag && (
              <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
                <TagIcon size={13} strokeWidth={1.75} className="text-tumba-400/70 shrink-0" />
                {user.tag}
              </p>
            )}

            {/* Status */}
            {user.status && (
              <p className="text-[var(--text-secondary)] mt-1 italic text-sm">&quot;{user.status}&quot;</p>
            )}

            {/* Bio */}
            {user.bio && (
              <p className="text-[var(--text-secondary)] mt-3 text-sm leading-relaxed">{user.bio}</p>
            )}

            {/* Edit hint for own profile */}
            {isOwnProfile && (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                Tap your avatar in the top bar to edit your profile.
              </p>
            )}

            {/* Coins + join date */}
            <div className="flex items-center gap-4 mt-4 justify-center sm:justify-start">
              <CoinAmountLg amount={user.tumbaCoins} />
              <span className="text-xs text-[var(--text-secondary)]">Joined {joinDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-center"
          >
            <div className="flex justify-center mb-1">
              <stat.icon size={20} strokeWidth={1.75} className="text-tumba-400/70" />
            </div>
            <div className="text-2xl font-bold text-tumba-400">{stat.value}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
