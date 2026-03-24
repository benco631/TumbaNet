"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";
import {
  EditIcon,
  TagIcon,
  ActivityIcon,
  StatsIcon,
  HistoryIcon,
  CameraIcon,
  UploadIcon,
  CloseIcon,
  HostIcon,
  CarIcon,
  CoinsIcon,
  HighlightsIcon,
  DictionaryIcon,
  EventsIcon,
  MarketIcon,
  ShopIcon,
  AlbumIcon,
  WearIndexIcon,
  PackageIcon,
  ChevronRightIcon,
} from "@/lib/icons";

// ── Types ──────────────────────────────────────────────────────────────────

type ModalTab = "edit" | "tag" | "activity" | "stats" | "history";

interface ProfileData {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  nickname: string | null;
  tag: string | null;
  tumbaCoins: number;
  status: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  detail: string | null;
  createdAt: string;
}

interface StatsData {
  tumbaCoins: number;
  hostCount: number;
  carCount: number;
  wearIndex: number;
  entriesCount: number;
  dictionaryCount: number;
  eventsCreated: number;
  eventsRsvp: number;
  betsCount: number;
  wagersCount: number;
  mediaCount: number;
  purchasesCount: number;
  totalSpent: number;
}

interface HistoryPurchase {
  id: string;
  price: number;
  createdAt: string;
  shopItem: { title: string; category: string; imageUrl: string | null };
}
interface HistoryActivityLog {
  id: string;
  type: string;
  note: string | null;
  createdAt: string;
}
interface HistoryRsvp {
  id: string;
  status: string;
  event: { id: string; title: string; date: string; category: string };
}
interface HistoryDictEntry {
  id: string;
  term: string;
  definition: string;
  createdAt: string;
}
interface HistoryData {
  purchases: HistoryPurchase[];
  activityLogs: HistoryActivityLog[];
  eventParticipation: HistoryRsvp[];
  dictionaryContributions: HistoryDictEntry[];
}

// ── Avatar helper ──────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = "sm",
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-20 w-20 text-3xl"
      : size === "md"
        ? "h-10 w-10 text-lg"
        : "h-8 w-8 text-sm";

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className={`${cls} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center font-bold text-white shrink-0`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ── Activity icon map ──────────────────────────────────────────────────────

function ActivityTypeIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    host:       <HostIcon       size={14} strokeWidth={1.75} className="text-tumba-400"  />,
    car:        <CarIcon        size={14} strokeWidth={1.75} className="text-blue-400"   />,
    highlight:  <HighlightsIcon size={14} strokeWidth={1.75} className="text-purple-400" />,
    event:      <EventsIcon     size={14} strokeWidth={1.75} className="text-green-400"  />,
    media:      <AlbumIcon      size={14} strokeWidth={1.75} className="text-pink-400"   />,
    bet:        <MarketIcon     size={14} strokeWidth={1.75} className="text-yellow-400" />,
    wager:      <CoinsIcon      size={14} strokeWidth={1.75} className="text-yellow-300" />,
    purchase:   <ShopIcon       size={14} strokeWidth={1.75} className="text-orange-400" />,
    dictionary: <DictionaryIcon size={14} strokeWidth={1.75} className="text-cyan-400"   />,
  };
  return (
    <>
      {map[type] ?? (
        <ActivityIcon size={14} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
      )}
    </>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  highlight = false,
  small = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-center ${
        small ? "px-2 py-2.5" : "p-3.5"
      } ${highlight ? "border-tumba-500/20 bg-tumba-500/5" : ""}`}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`font-bold ${highlight ? "text-xl text-tumba-400" : small ? "text-lg" : "text-xl"}`}>
        {value}
      </p>
      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ── History section ────────────────────────────────────────────────────────

function HistorySection({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        {title}
      </p>
      {empty ? (
        <p className="text-xs text-[var(--text-secondary)] italic py-2">{emptyText}</p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

function HistoryRow({
  icon,
  primary,
  secondary,
  date,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  date: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <div className="h-6 w-6 rounded-md bg-[var(--bg-primary)] flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate">{primary}</p>
        {secondary && (
          <p className="text-[11px] text-[var(--text-secondary)] truncate">{secondary}</p>
        )}
      </div>
      <time className="text-[11px] text-[var(--text-secondary)] shrink-0 mt-0.5">
        {new Date(date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </time>
    </div>
  );
}

// ── Main ProfileMenu ───────────────────────────────────────────────────────

interface ProfileMenuProps {
  size?: "sm" | "md";
}

export default function ProfileMenu({ size = "sm" }: ProfileMenuProps) {
  const { data: session, update: updateSession } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab | null>(null);

  // SSR guard: portals need document.body
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Profile data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Edit tab
  const [editBio, setEditBio] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Tag tab
  const [editTag, setEditTag] = useState("");
  const [tagSaving, setTagSaving] = useState(false);

  // Lazy data
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const userId = (session?.user as { id?: string })?.id;

  // Load profile once
  const loadProfile = useCallback(async () => {
    if (!userId || profileLoaded) return;
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditBio(data.bio ?? "");
        setEditNickname(data.nickname ?? "");
        setEditTag(data.tag ?? "");
        setProfileLoaded(true);
      }
    } catch { /* silent */ }
  }, [userId, profileLoaded]);

  useEffect(() => {
    if (session) loadProfile();
  }, [session, loadProfile]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = modalTab ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalTab]);

  // ── Modal open / close ──────────────────────────────────────────────────

  const openModal = (tab: ModalTab) => {
    setMenuOpen(false);
    setModalTab(tab);
    if (tab === "activity" && !activity)  loadActivity();
    if (tab === "stats"    && !stats)     loadStats();
    if (tab === "history"  && !history)   loadHistory();
  };

  const closeModal = () => setModalTab(null);

  // ── Lazy loaders ────────────────────────────────────────────────────────

  async function loadActivity() {
    if (!userId) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/activity`);
      if (res.ok) setActivity(await res.json());
    } finally { setActivityLoading(false); }
  }
  async function loadStats() {
    if (!userId) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      if (res.ok) setStats(await res.json());
    } finally { setStatsLoading(false); }
  }
  async function loadHistory() {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/history`);
      if (res.ok) setHistory(await res.json());
    } finally { setHistoryLoading(false); }
  }

  // ── Avatar upload ────────────────────────────────────────────────────────

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    // Reset input so the same file can be re-selected later
    e.target.value = "";
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", avatarFile);
      const res = await fetch("/api/users/avatar", { method: "POST", body: fd });
      if (res.ok) {
        const { avatar } = await res.json();
        setProfile((p) => (p ? { ...p, avatar } : p));
        setAvatarFile(null);
        setAvatarPreview(null);
        await updateSession();
      }
    } finally { setAvatarUploading(false); }
  }

  function cancelAvatarPreview() {
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
  }

  // ── Save profile ────────────────────────────────────────────────────────

  async function saveProfile() {
    if (!userId) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: editBio, nickname: editNickname }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => (p ? { ...p, bio: data.bio, nickname: data.nickname } : p));
      }
    } finally { setEditSaving(false); }
  }

  async function saveTag() {
    if (!userId) return;
    setTagSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: editTag }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => (p ? { ...p, tag: data.tag } : p));
      }
    } finally { setTagSaving(false); }
  }

  if (!session) return null;

  const avatarSrc = avatarPreview ?? profile?.avatar ?? null;
  const displayName = session.user?.name ?? "";
  const avatarSize = size === "md" ? "md" : "sm";

  const MENU_ITEMS: { tab: ModalTab; label: string; icon: React.ReactNode; sub: string }[] = [
    {
      tab: "edit",
      label: "Edit Profile",
      icon: <EditIcon size={16} strokeWidth={1.75} />,
      sub: "Avatar, bio & nickname",
    },
    {
      tab: "tag",
      label: profile?.tag ? "Edit Tag" : "Add Tag",
      icon: <TagIcon size={16} strokeWidth={1.75} />,
      sub: profile?.tag ? `"${profile.tag}"` : "Set your group label",
    },
    {
      tab: "activity",
      label: "Activity",
      icon: <ActivityIcon size={16} strokeWidth={1.75} />,
      sub: "Your recent actions",
    },
    {
      tab: "stats",
      label: "Stats",
      icon: <StatsIcon size={16} strokeWidth={1.75} />,
      sub: "Your numbers",
    },
    {
      tab: "history",
      label: "History",
      icon: <HistoryIcon size={16} strokeWidth={1.75} />,
      sub: "Full archive",
    },
  ];

  const TABS: ModalTab[] = ["edit", "tag", "activity", "stats", "history"];
  const TAB_ICONS: Record<ModalTab, React.ReactNode> = {
    edit:     <EditIcon     size={17} strokeWidth={1.75} />,
    tag:      <TagIcon      size={17} strokeWidth={1.75} />,
    activity: <ActivityIcon size={17} strokeWidth={1.75} />,
    stats:    <StatsIcon    size={17} strokeWidth={1.75} />,
    history:  <HistoryIcon  size={17} strokeWidth={1.75} />,
  };
  const TAB_LABELS: Record<ModalTab, string> = {
    edit:     "Edit",
    tag:      "Tag",
    activity: "Activity",
    stats:    "Stats",
    history:  "History",
  };

  // ── Modal content ────────────────────────────────────────────────────────

  const modalContent = (
    <>
      {/* Backdrop — catches outside taps to close */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onPointerDown={closeModal}
      />

      {/* Sheet — stop propagation so taps inside don't close the modal */}
      <div
        className="fixed bottom-0 inset-x-0 z-[9999] lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[480px] lg:rounded-2xl rounded-t-3xl bg-[var(--bg-secondary)] border border-[var(--border)] max-h-[92dvh] flex flex-col shadow-2xl pb-safe"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden shrink-0">
          <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <Avatar src={profile?.avatar ?? null} name={displayName} size="sm" />
            <div>
              <p className="text-sm font-bold leading-tight">{displayName}</p>
              {profile?.tag && (
                <p className="text-[11px] text-tumba-400 leading-tight">{profile.tag}</p>
              )}
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)] shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setModalTab(tab);
                if (tab === "activity" && !activity) loadActivity();
                if (tab === "stats"    && !stats)    loadStats();
                if (tab === "history"  && !history)  loadHistory();
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${
                modalTab === tab
                  ? "border-tumba-500 text-tumba-400"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {TAB_ICONS[tab]}
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── EDIT PROFILE ── */}
          {modalTab === "edit" && (
            <div className="p-5 space-y-6">

              {/* Avatar section */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                  Profile Picture
                </p>

                {/* Current / preview avatar */}
                <div className="flex items-center gap-5 mb-4">
                  <div className="relative shrink-0">
                    <Avatar src={avatarSrc} name={displayName} size="lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {avatarFile ? (
                      <>
                        <p className="text-xs text-tumba-400 mb-2 font-medium">
                          Preview — looks good?
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={uploadAvatar}
                            disabled={avatarUploading}
                            className="px-4 py-2 text-xs rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-colors disabled:opacity-50 shadow-lg shadow-tumba-500/20"
                          >
                            {avatarUploading ? "Uploading…" : "Save Photo"}
                          </button>
                          <button
                            onClick={cancelAvatarPreview}
                            className="px-4 py-2 text-xs rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Choose a photo from your gallery or take one with your camera.
                        JPEG, PNG or WEBP · max 5 MB.
                      </p>
                    )}
                  </div>
                </div>

                {/* Two upload buttons */}
                {!avatarFile && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Upload from gallery */}
                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-card-hover)] hover:border-tumba-500/40 transition-all active:scale-[0.98]">
                      <UploadIcon size={16} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
                      Upload Photo
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                    </label>

                    {/* Take photo with camera */}
                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-card-hover)] hover:border-tumba-500/40 transition-all active:scale-[0.98]">
                      <CameraIcon size={16} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
                      Take Photo
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border)]" />

              {/* Nickname */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                  Nickname
                </label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
                  placeholder='e.g. "The Planner"'
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                  Shown in quotes next to your name on your profile page.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors resize-none"
                  placeholder="Tell the Tumbas something about yourself…"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                  {editBio.length} / 300
                </p>
              </div>

              <button
                onClick={saveProfile}
                disabled={editSaving}
                className="w-full py-3 rounded-xl bg-tumba-500 text-white font-semibold text-sm hover:bg-tumba-400 transition-all disabled:opacity-50 shadow-lg shadow-tumba-500/20"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}

          {/* ── TAG ── */}
          {modalTab === "tag" && (
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Your Group Tag
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                  A funny label the group knows you by. Shown below your name everywhere.
                </p>
                <input
                  type="text"
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value)}
                  maxLength={60}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
                  placeholder="e.g. The Driver King"
                />
              </div>

              {/* Suggestions */}
              <div>
                <p className="text-[11px] text-[var(--text-secondary)] mb-2 uppercase tracking-wider font-semibold">
                  Suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "The Driver King",
                    "Certified Problem",
                    "Snack Minister",
                    "Host Supreme",
                    "Late Arrival",
                    "The Organizer",
                    "Always Hungry",
                    "The Historian",
                    "Chief Vibe Officer",
                    "Wildcard",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditTag(s)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-tumba-500/50 hover:text-tumba-400 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={saveTag}
                  disabled={tagSaving}
                  className="flex-1 py-3 rounded-xl bg-tumba-500 text-white font-semibold text-sm hover:bg-tumba-400 transition-all disabled:opacity-50 shadow-lg shadow-tumba-500/20"
                >
                  {tagSaving ? "Saving…" : "Save Tag"}
                </button>
                {profile?.tag && (
                  <button
                    onClick={async () => { setEditTag(""); await saveTag(); }}
                    className="px-5 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {modalTab === "activity" && (
            <div className="p-5">
              {activityLoading ? (
                <div className="py-16 text-center text-tumba-400 animate-pulse text-sm">
                  Loading…
                </div>
              ) : !activity?.length ? (
                <div className="py-16 text-center">
                  <ActivityIcon
                    size={40}
                    strokeWidth={1.25}
                    className="mx-auto mb-3 text-[var(--text-secondary)]"
                  />
                  <p className="text-[var(--text-secondary)] text-sm">No activity yet</p>
                </div>
              ) : (
                <div>
                  {activity.map((item, i) => (
                    <div
                      key={`${item.id}-${i}`}
                      className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0"
                    >
                      <div className="h-7 w-7 rounded-lg bg-[var(--bg-card)] flex items-center justify-center shrink-0 mt-0.5">
                        <ActivityTypeIcon type={item.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)]">{item.description}</p>
                        {item.detail && (
                          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                            {item.detail}
                          </p>
                        )}
                      </div>
                      <time className="text-[11px] text-[var(--text-secondary)] shrink-0 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STATS ── */}
          {modalTab === "stats" && (
            <div className="p-5">
              {statsLoading ? (
                <div className="py-16 text-center text-tumba-400 animate-pulse text-sm">Loading…</div>
              ) : !stats ? (
                <div className="py-16 text-center text-[var(--text-secondary)] text-sm">No data</div>
              ) : (
                <div className="space-y-5">
                  {/* Highlight stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="TumbaCoins" value={stats.tumbaCoins} icon={<TumbaCoinIcon size={20} />} highlight />
                    <StatCard label="Wear Index"  value={stats.wearIndex}   icon={<WearIndexIcon size={18} strokeWidth={1.75} className="text-tumba-400" />} highlight />
                  </div>

                  {/* Contributions */}
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Contributions</p>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Times Hosted" value={stats.hostCount} icon={<HostIcon size={16} strokeWidth={1.75} className="text-tumba-400" />} />
                      <StatCard label="Times Drove"  value={stats.carCount}  icon={<CarIcon  size={16} strokeWidth={1.75} className="text-blue-400"  />} />
                    </div>
                  </div>

                  {/* App activity */}
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">App Activity</p>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard label="Highlights"  value={stats.entriesCount}    icon={<HighlightsIcon  size={14} strokeWidth={1.75} className="text-purple-400" />} small />
                      <StatCard label="Dictionary"  value={stats.dictionaryCount} icon={<DictionaryIcon  size={14} strokeWidth={1.75} className="text-cyan-400"   />} small />
                      <StatCard label="Events"      value={stats.eventsCreated}   icon={<EventsIcon      size={14} strokeWidth={1.75} className="text-green-400"  />} small />
                      <StatCard label="Bets"        value={stats.betsCount}       icon={<MarketIcon      size={14} strokeWidth={1.75} className="text-yellow-400" />} small />
                      <StatCard label="Wagers"      value={stats.wagersCount}     icon={<TumbaCoinIcon size={16} />} small />
                      <StatCard label="Media"       value={stats.mediaCount}      icon={<AlbumIcon       size={14} strokeWidth={1.75} className="text-pink-400"   />} small />
                    </div>
                  </div>

                  {/* Shop */}
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Shop</p>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Purchases" value={stats.purchasesCount} icon={<ShopIcon  size={16} strokeWidth={1.75} className="text-orange-400" />} />
                      <StatCard label="TC Spent"  value={stats.totalSpent}     icon={<TumbaCoinIcon size={18} />} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY ── */}
          {modalTab === "history" && (
            <div className="p-5 space-y-6">
              {historyLoading ? (
                <div className="py-16 text-center text-tumba-400 animate-pulse text-sm">Loading…</div>
              ) : !history ? (
                <div className="py-16 text-center text-[var(--text-secondary)] text-sm">No data</div>
              ) : (
                <>
                  <HistorySection title="Hosting & Driving" empty={history.activityLogs.length === 0} emptyText="No contributions yet">
                    {history.activityLogs.map((l) => (
                      <HistoryRow
                        key={l.id}
                        icon={l.type === "HOST" ? <HostIcon size={13} strokeWidth={1.75} className="text-tumba-400" /> : <CarIcon size={13} strokeWidth={1.75} className="text-blue-400" />}
                        primary={l.type === "HOST" ? "Hosted" : "Drove"}
                        secondary={l.note ?? undefined}
                        date={l.createdAt}
                      />
                    ))}
                  </HistorySection>

                  <HistorySection title="Event Participation" empty={history.eventParticipation.length === 0} emptyText="No events yet">
                    {history.eventParticipation.map((r) => (
                      <HistoryRow
                        key={r.id}
                        icon={<EventsIcon size={13} strokeWidth={1.75} className="text-green-400" />}
                        primary={r.event.title}
                        secondary={r.status.replace(/_/g, " ")}
                        date={r.event.date}
                      />
                    ))}
                  </HistorySection>

                  <HistorySection title="Purchase History" empty={history.purchases.length === 0} emptyText="No purchases yet">
                    {history.purchases.map((p) => (
                      <HistoryRow
                        key={p.id}
                        icon={<PackageIcon size={13} strokeWidth={1.75} className="text-orange-400" />}
                        primary={p.shopItem.title}
                        secondary={`${p.price} TC`}
                        date={p.createdAt}
                      />
                    ))}
                  </HistorySection>

                  <HistorySection title="Dictionary Contributions" empty={history.dictionaryContributions.length === 0} emptyText="No words added yet">
                    {history.dictionaryContributions.map((d) => (
                      <HistoryRow
                        key={d.id}
                        icon={<DictionaryIcon size={13} strokeWidth={1.75} className="text-cyan-400" />}
                        primary={d.term}
                        secondary={d.definition.slice(0, 70) + (d.definition.length > 70 ? "…" : "")}
                        date={d.createdAt}
                      />
                    ))}
                  </HistorySection>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Transparent overlay behind dropdown — closes it on outside tap/click */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[58]"
          onPointerDown={() => setMenuOpen(false)}
        />
      )}

      {/* Avatar button + dropdown (positioned relative) */}
      <div className="relative">
        <button
          onPointerDown={(e) => {
            e.stopPropagation(); // don't let the transparent overlay catch this
            setMenuOpen((o) => !o);
          }}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-tumba-500"
          aria-label="Profile menu"
        >
          <Avatar src={avatarSrc} name={displayName} size={avatarSize} />
        </button>

        {/* Dropdown card */}
        {menuOpen && (
          <div className="absolute top-11 right-0 z-[60] w-56 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl shadow-black/50 overflow-hidden">
            {/* User header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
              <Avatar src={profile?.avatar ?? null} name={displayName} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                {profile?.tag && (
                  <p className="text-[11px] text-tumba-400 truncate">{profile.tag}</p>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.tab}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    openModal(item.tab);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-card)] active:bg-[var(--bg-card-hover)] transition-colors group"
                >
                  <span className="text-tumba-400 shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">{item.sub}</p>
                  </div>
                  <ChevronRightIcon size={14} strokeWidth={1.75} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal — rendered via portal at document.body to escape stacking contexts */}
      {mounted && modalTab && createPortal(modalContent, document.body)}
    </>
  );
}
