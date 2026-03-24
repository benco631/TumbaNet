"use client";

import { useSession } from "next-auth/react";
import { HighlightsIcon, ArchiveIcon, LockIcon } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface Entry {
  id: string;
  content: string;
  title: string;
  tags: string | null;
  imageUrl: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

interface Summary {
  id: string;
  month: number;
  year: number;
  summary: string;
  committed: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SikumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pastSummaries, setPastSummaries] = useState<Summary[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [viewMode, setViewMode] = useState<"current" | "archive">("current");

  // Admin state
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [editSummaryText, setEditSummaryText] = useState("");
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [addMonth, setAddMonth] = useState(1);
  const [addYear, setAddYear] = useState(new Date().getFullYear());
  const [addSummaryText, setAddSummaryText] = useState("");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchEntries = useCallback(async () => {
    const res = await fetch(
      `/api/entries?month=${currentMonth}&year=${currentYear}`
    );
    const data = await res.json();
    setEntries(data.entries || []);
    setCurrentSummary(data.summary || null);
    setLoading(false);
  }, [currentMonth, currentYear]);

  const fetchSummaries = useCallback(async () => {
    const res = await fetch("/api/summaries");
    const data = await res.json();
    setPastSummaries(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchEntries();
      fetchSummaries();
    }
  }, [status, router, fetchEntries, fetchSummaries]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setSubmitting(true);

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: newContent,
        title: newTitle || undefined,
        tags: newTags || undefined,
        imageUrl: newImageUrl || undefined,
      }),
    });

    if (res.ok) {
      setNewContent("");
      setNewTitle("");
      setNewTags("");
      setNewImageUrl("");
      setShowAdvanced(false);
      fetchEntries();
    }
    setSubmitting(false);
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/entries?id=${id}`, { method: "DELETE" });
    fetchEntries();
  }

  async function saveEditSummary(summaryId: string) {
    await fetch("/api/admin/summaries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: summaryId, summary: editSummaryText }),
    });
    setEditingSummary(null);
    fetchSummaries();
  }

  async function addHistorySummary(e: React.FormEvent) {
    e.preventDefault();
    if (!addSummaryText.trim()) return;

    await fetch("/api/admin/summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: addMonth,
        year: addYear,
        summary: addSummaryText,
      }),
    });
    setAddSummaryText("");
    setShowAddHistory(false);
    fetchSummaries();
  }

  async function deleteHistorySummary(id: string) {
    if (!confirm("Delete this month's highlights?")) return;
    await fetch(`/api/admin/summaries?id=${id}`, { method: "DELETE" });
    fetchSummaries();
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  // Group entries by tag
  const tagCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.tags) {
      e.tags.split(",").forEach((t) => {
        const tag = t.trim();
        if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HighlightsIcon size={32} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
            <span>Monthly Highlights</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {MONTH_NAMES[currentMonth - 1]} {currentYear} &mdash; Document what happened this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            {entries.length} memories this month
          </span>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setViewMode("current")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            viewMode === "current"
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          Current Month
        </button>
        <button
          onClick={() => setViewMode("archive")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            viewMode === "archive"
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          Archive
        </button>
      </div>

      {viewMode === "current" ? (
        <>
          {/* Add entry form */}
          {!currentSummary?.committed && (
            <form onSubmit={addEntry} className="mb-8 p-5 rounded-2xl border border-tumba-500/20 bg-tumba-500/5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="flex-1 px-5 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
                    placeholder="What happened? e.g. Sam started working at the bar..."
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newContent.trim()}
                    className="px-6 py-3 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-tumba-500/20"
                  >
                    {submitting ? "..." : "Add +"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-tumba-400 hover:text-tumba-300 self-start"
                >
                  {showAdvanced ? "Less options" : "More options (title, tags, image)"}
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
                      placeholder="Title (optional)"
                    />
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
                      placeholder="Tags: funny, epic, drama"
                    />
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
                      placeholder="Image URL (optional)"
                    />
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Tags bar */}
          {Object.keys(tagCounts).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(tagCounts).map(([tag, count]) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-tumba-500/10 text-tumba-400 border border-tumba-500/20">
                  #{tag} ({count})
                </span>
              ))}
            </div>
          )}

          {/* Entries list */}
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-secondary)]">
                <HighlightsIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
                <p className="text-lg">No entries yet this month</p>
                <p className="text-sm mt-1">Be the first to add something!</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5">
                      {entry.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {entry.user.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      {entry.title && (
                        <h4 className="font-semibold text-tumba-400 mb-1">{entry.title}</h4>
                      )}
                      <p className="text-[var(--text-primary)]">{entry.content}</p>
                      {entry.imageUrl && (
                        <img
                          src={entry.imageUrl}
                          alt=""
                          className="mt-2 rounded-lg max-h-48 object-cover border border-[var(--border)]"
                        />
                      )}
                      {entry.tags && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.tags.split(",").map((tag) => (
                            <span key={tag.trim()} className="text-[10px] px-2 py-0.5 rounded-full bg-tumba-500/10 text-tumba-400">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {entry.user.id === userId && !currentSummary?.committed && (
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm transition-all px-2 py-1 rounded hover:bg-red-500/10 shrink-0"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {currentSummary?.committed && (
            <div className="mt-8 p-6 rounded-2xl border border-green-500/20 bg-green-500/5 text-center">
              <p className="text-green-400 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  This month has been committed and finalized!
                  <LockIcon size={14} strokeWidth={2} className="inline" />
                </span>
              </p>
            </div>
          )}
        </>
      ) : (
        /* Archive view */
        <div className="space-y-6">
          {/* Admin: Add History */}
          {isAdmin && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddHistory(!showAddHistory)}
                className="px-4 py-2 rounded-xl bg-tumba-500/10 text-tumba-400 text-sm font-medium hover:bg-tumba-500/20 transition-colors border border-tumba-500/20"
              >
                {showAddHistory ? "Cancel" : "+ Add Past Month"}
              </button>

              {showAddHistory && (
                <form
                  onSubmit={addHistorySummary}
                  className="mt-4 p-5 rounded-2xl border border-tumba-500/20 bg-tumba-500/5 space-y-4"
                >
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">Month</label>
                      <select
                        value={addMonth}
                        onChange={(e) => setAddMonth(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">Year</label>
                      <input
                        type="number"
                        value={addYear}
                        onChange={(e) => setAddYear(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                      Summary (one entry per line)
                    </label>
                    <textarea
                      value={addSummaryText}
                      onChange={(e) => setAddSummaryText(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 resize-none"
                      placeholder={"Sam: Started working at the bar\nDan: Got a new car"}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!addSummaryText.trim()}
                    className="px-6 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50"
                  >
                    Add to History
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Archive Grid */}
          {pastSummaries.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-secondary)]">
              <ArchiveIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
              <p className="text-lg">No past highlights yet</p>
              <p className="text-sm mt-1">
                Highlights are automatically committed at the end of each month!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pastSummaries.map((summary) => {
                const entryCount = summary.summary.split("\n").filter((l) => l.trim()).length;
                return (
                  <div
                    key={summary.id}
                    className="group p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-tumba-500/30 transition-all"
                  >
                    {/* Month Header */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-lg font-bold text-white">
                          {MONTH_NAMES[summary.month - 1]?.substring(0, 3)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {MONTH_NAMES[summary.month - 1]} {summary.year}
                          </h3>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {entryCount} memories
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              if (editingSummary === summary.id) {
                                setEditingSummary(null);
                              } else {
                                setEditingSummary(summary.id);
                                setEditSummaryText(summary.summary);
                              }
                            }}
                            className="text-xs text-tumba-400 hover:text-tumba-300 px-2 py-1 rounded hover:bg-tumba-500/10"
                          >
                            {editingSummary === summary.id ? "Cancel" : "Edit"}
                          </button>
                          <button
                            onClick={() => deleteHistorySummary(summary.id)}
                            className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {editingSummary === summary.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editSummaryText}
                          onChange={(e) => setEditSummaryText(e.target.value)}
                          rows={8}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 resize-none text-sm"
                        />
                        <button
                          onClick={() => saveEditSummary(summary.id)}
                          className="px-4 py-2 rounded-lg bg-tumba-500 text-white text-sm font-medium hover:bg-tumba-400 transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {summary.summary.split("\n").filter((l) => l.trim()).map((line, i) => {
                          const colonIdx = line.indexOf(": ");
                          const author = colonIdx > -1 ? line.slice(0, colonIdx) : "";
                          const content = colonIdx > -1 ? line.slice(colonIdx + 2) : line;
                          return (
                            <div
                              key={i}
                              className="flex gap-2 text-sm py-1 px-2.5 rounded-lg bg-[var(--bg-primary)]/50"
                            >
                              {author ? (
                                <>
                                  <span className="font-medium text-tumba-400 shrink-0">{author}:</span>
                                  <span className="text-[var(--text-primary)]">{content}</span>
                                </>
                              ) : (
                                <span className="text-[var(--text-primary)]">{line}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
