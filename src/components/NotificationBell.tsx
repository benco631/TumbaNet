"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  CheckAllIcon,
  MarketIcon,
  EventsIcon,
  HighlightsIcon,
} from "@/lib/icons";

interface Notification {
  id: string;
  type: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; name: string };
}

const TYPE_ICON: Record<string, typeof MarketIcon> = {
  BET: MarketIcon,
  EVENT: EventsIcon,
  HIGHLIGHT: HighlightsIcon,
};

const TYPE_COLOR: Record<string, string> = {
  BET: "text-neon-cyan",
  EVENT: "text-neon-blue",
  HIGHLIGHT: "text-neon-pink",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  }, []);

  // Fetch on mount and poll every 30s
  useEffect(() => {
    if (!session) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session, fetchNotifications]);

  // Re-fetch when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!session) return null;

  async function markAsRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function handleClick(n: Notification) {
    if (!n.isRead) markAsRead(n.id);
    if (n.targetUrl) {
      router.push(n.targetUrl);
      setOpen(false);
    }
  }

  const todayNotifs = notifications.filter((n) => isToday(n.createdAt));
  const earlierNotifs = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all group"
        aria-label="Notifications"
      >
        <BellIcon size={24} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] flex items-center justify-center px-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-tumba-500 to-neon-pink rounded-full leading-none shadow-[0_0_10px_rgba(192,38,211,0.4)] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] max-h-[480px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-[100] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-tumba-400 hover:text-tumba-300 transition-colors"
              >
                <CheckAllIcon size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <BellIcon
                  size={36}
                  strokeWidth={1.25}
                  className="text-[var(--text-secondary)] opacity-40 mb-3"
                />
                <p className="text-sm text-[var(--text-secondary)]">
                  No notifications yet
                </p>
              </div>
            ) : (
              <>
                {todayNotifs.length > 0 && (
                  <NotificationGroup
                    label="Today"
                    items={todayNotifs}
                    onClick={handleClick}
                  />
                )}
                {earlierNotifs.length > 0 && (
                  <NotificationGroup
                    label="Earlier"
                    items={earlierNotifs}
                    onClick={handleClick}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationGroup({
  label,
  items,
  onClick,
}: {
  label: string;
  items: Notification[];
  onClick: (n: Notification) => void;
}) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      {items.map((n) => {
        const Icon = TYPE_ICON[n.type] || BellIcon;
        const color = TYPE_COLOR[n.type] || "text-tumba-400";
        return (
          <button
            key={n.id}
            onClick={() => onClick(n)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-card)] ${
              !n.isRead ? "bg-tumba-500/[0.04]" : ""
            }`}
          >
            {/* Icon */}
            <div
              className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${color} bg-[var(--bg-card)]`}
            >
              <Icon size={16} strokeWidth={1.75} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm leading-snug ${
                  !n.isRead
                    ? "text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {n.message}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {timeAgo(n.createdAt)}
              </p>
            </div>

            {/* Unread dot */}
            {!n.isRead && (
              <div className="shrink-0 mt-2 w-2 h-2 rounded-full bg-tumba-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
