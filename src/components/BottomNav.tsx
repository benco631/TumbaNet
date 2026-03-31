"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { MoreHorizontal, X, LogOut } from "lucide-react";
import { motion, AnimatePresence, MotionSheet } from "./motion";
import ProfileMenu from "./ProfileMenu";
import {
  HostIcon,
  TumbasIcon,
  EventsIcon,
  MarketIcon,
  TrophyIcon,
  HighlightsIcon,
  DictionaryIcon,
  ShopIcon,
  AlbumIcon,
  AdminIcon,
} from "@/lib/icons";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const PRIMARY_TABS = [
  { href: "/",            label: "Home",        icon: HostIcon    },
  { href: "/tumbas",      label: "Tumbas",      icon: TumbasIcon  },
  { href: "/events",      label: "Events",      icon: EventsIcon  },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon  },
];

const MORE_ITEMS = [
  { href: "/sikum",      label: "Highlights", icon: HighlightsIcon },
  { href: "/dictionary", label: "Dictionary",  icon: DictionaryIcon },
  { href: "/market",     label: "Market",      icon: MarketIcon     },
  { href: "/shop",       label: "Shop",        icon: ShopIcon       },
  { href: "/album",      label: "Album",       icon: AlbumIcon      },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!session) return null;

  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;
  const isMoreActive =
    MORE_ITEMS.some((item) => pathname.startsWith(item.href)) ||
    Boolean(isAdmin && pathname.startsWith("/admin"));

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-t border-[var(--border)] pb-safe">
        <div className="flex items-stretch h-16">
          {PRIMARY_TABS.map((tab) => {
            const isActive =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? "text-tumba-400" : "text-[var(--text-secondary)]"
                }`}
              >
                <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }}>
                  <Icon size={22} strokeWidth={isActive ? 2 : 1.75} />
                </motion.div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setSheetOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isMoreActive ? "text-tumba-400" : "text-[var(--text-secondary)]"
            }`}
          >
            <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }}>
              <MoreHorizontal size={22} strokeWidth={1.75} />
            </motion.div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {sheetOpen && (
          <MotionSheet isOpen={sheetOpen} className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-[var(--bg-secondary)] rounded-t-3xl border-t border-[var(--border)] pb-safe">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
            </div>

            <div className="px-4 pt-1 pb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">More</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSheetOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
                >
                  <X size={16} />
                </motion.button>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-4 gap-3"
              >
                {MORE_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <motion.div key={item.href} variants={fadeInUp}>
                      <Link
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-colors ${
                          isActive
                            ? "bg-tumba-500/15 text-tumba-400"
                            : "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <Icon size={22} strokeWidth={1.75} />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
                {isAdmin && (
                  <motion.div variants={fadeInUp}>
                    <Link
                      href="/admin/highlights"
                      onClick={() => setSheetOpen(false)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-colors ${
                        pathname.startsWith("/admin")
                          ? "bg-tumba-500/15 text-tumba-400"
                          : "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <AdminIcon size={22} strokeWidth={1.75} />
                      <span className="text-xs font-medium">Admin</span>
                    </Link>
                  </motion.div>
                )}
              </motion.div>

              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-3">
                <ProfileMenu size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user?.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{session.user?.email}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => signOut()}
                  className="p-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                </motion.button>
              </div>
            </div>
          </MotionSheet>
        )}
      </AnimatePresence>
    </>
  );
}
