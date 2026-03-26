"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import Logo from "./Logo";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";
import {
  HighlightsIcon,
  TumbasIcon,
  DictionaryIcon,
  EventsIcon,
  MarketIcon,
  ShopIcon,
  AlbumIcon,
  AdminIcon,
  TrophyIcon,
} from "@/lib/icons";

const tabs: { name: string; href: string; icon: LucideIcon; shortName: string }[] = [
  { name: "Highlights",   href: "/sikum",        icon: HighlightsIcon, shortName: "Highlights"  },
  { name: "The Tumbas",   href: "/tumbas",       icon: TumbasIcon,     shortName: "Tumbas"      },
  { name: "Dictionary",   href: "/dictionary",   icon: DictionaryIcon, shortName: "Dictionary"  },
  { name: "Events",       href: "/events",       icon: EventsIcon,     shortName: "Events"      },
  { name: "Leaderboard",  href: "/leaderboard",  icon: TrophyIcon,     shortName: "Leaderboard" },
  { name: "Market",       href: "/market",       icon: MarketIcon,     shortName: "Market"      },
  { name: "Shop",         href: "/shop",         icon: ShopIcon,       shortName: "Shop"        },
  { name: "Album",        href: "/album",        icon: AlbumIcon,      shortName: "Album"       },
];

const adminTabs = [
  { name: "Admin", href: "/admin/highlights", icon: AdminIcon, shortName: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <Logo size="sm" />
            <span className="text-lg sm:text-xl font-bold gradient-text">TumbaNet</span>
          </Link>

          {/* Desktop Tabs */}
          {session && (
            <div className="hidden lg:flex items-center gap-0.5">
              {tabs.map((tab) => {
                const isActive = pathname.startsWith(tab.href);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative px-2.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "text-tumba-400 bg-tumba-500/10"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                    <span>{tab.shortName}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-tumba-500 to-neon-pink rounded-full" />
                    )}
                  </Link>
                );
              })}
              {isAdmin && adminTabs.map((tab) => {
                const isActive = pathname.startsWith(tab.href);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative px-2.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "text-tumba-400 bg-tumba-500/10"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                    <span>{tab.shortName}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-tumba-500 to-neon-pink rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                {/* Desktop: bell + profile menu + name + logout */}
                <div className="hidden lg:flex items-center gap-2.5">
                  <NotificationBell />
                  <ProfileMenu />
                  <span className="text-sm text-[var(--text-secondary)] max-w-[100px] truncate">
                    {session.user?.name}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-[var(--text-secondary)] hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>

                {/* Mobile: bell + profile menu */}
                <div className="lg:hidden flex items-center gap-1">
                  <NotificationBell />
                  <ProfileMenu />
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-tumba-400 hover:text-tumba-300 transition-colors px-4 py-2 rounded-lg hover:bg-tumba-500/10"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
