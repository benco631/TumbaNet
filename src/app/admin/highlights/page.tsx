"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

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

export default function AdminHighlightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addMonth, setAddMonth] = useState(1);
  const [addYear, setAddYear] = useState(new Date().getFullYear());
  const [addText, setAddText] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchSummaries = useCallback(async () => {
    const res = await fetch("/api/summaries");
    const data = await res.json();
    setSummaries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      if (!isAdmin) {
        router.push("/");
        return;
      }
      fetchSummaries();
    }
  }, [status, router, isAdmin, fetchSummaries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addText.trim()) return;
    setAddSubmitting(true);

    const res = await fetch("/api/admin/summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: addMonth, year: addYear, summary: addText }),
    });

    if (res.ok) {
      setAddText("");
      setShowAdd(false);
      fetchSummaries();
    }
    setAddSubmitting(false);
  }

  async function handleEdit(id: string) {
    if (!editText.trim()) return;
    setEditSubmitting(true);

    const res = await fetch("/api/admin/summaries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, summary: editText }),
    });

    if (res.ok) {
      setEditingId(null);
      fetchSummaries();
    }
    setEditSubmitting(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/admin/summaries?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    fetchSummaries();
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-tumba-400 bg-tumba-500/10 px-2 py-0.5 rounded-full border border-tumba-500/20">
              Admin
            </span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">&#x1F4DD;</span>
            <span>Manage Historic Highlights</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Add, edit, or remove monthly highlights
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all self-start sm:self-auto ${
            showAdd
              ? "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]"
              : "bg-tumba-500 text-white shadow-lg shadow-tumba-500/20 hover:bg-tumba-400"
          }`}
        >
          {showAdd ? "Cancel" : "+ Add Month"}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-8 p-6 rounded-2xl border border-tumba-500/20 bg-tumba-500/5 space-y-5"
        >
          <h2 className="text-lg font-semibold text-tumba-400">Add Historic Highlight</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Month</label>
              <select
                value={addMonth}
                onChange={(e) => setAddMonth(parseInt(e.target.value))}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Year</label>
              <input
                type="number"
                value={addYear}
                onChange={(e) => setAddYear(parseInt(e.target.value))}
                className="w-28 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Highlights (one per line, format: &ldquo;Name: What happened&rdquo;)
            </label>
            <textarea
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 resize-none"
              placeholder={"Sam: Started working at the bar\nDan: Got a new car"}
            />
          </div>
          <button
            type="submit"
            disabled={addSubmitting || !addText.trim()}
            className="px-6 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-tumba-500/20"
          >
            {addSubmitting ? "Adding..." : "Add to History"}
          </button>
        </form>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="text-2xl font-bold text-tumba-400">{summaries.length}</div>
          <div className="text-sm text-[var(--text-secondary)]">Total Months</div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="text-2xl font-bold text-tumba-400">
            {summaries.reduce((acc, s) => acc + s.summary.split("\n").filter(l => l.trim()).length, 0)}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Total Entries</div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-tumba-400">
            {summaries.length > 0
              ? `${MONTH_NAMES[(summaries[0]?.month ?? 1) - 1]?.slice(0, 3)} ${summaries[0]?.year}`
              : "N/A"}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Latest Month</div>
        </div>
      </div>

      {/* Summaries list */}
      {summaries.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <div className="text-5xl mb-4">&#x1F4DA;</div>
          <p className="text-lg">No historic highlights yet</p>
          <p className="text-sm mt-1">Click &ldquo;+ Add Month&rdquo; to add the first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => {
            const entryLines = summary.summary.split("\n").filter(l => l.trim());
            const isEditing = editingId === summary.id;
            const isDeleting = deletingId === summary.id;

            return (
              <div
                key={summary.id}
                className={`rounded-2xl border bg-[var(--bg-card)] transition-all overflow-hidden ${
                  isEditing ? "border-tumba-500/40" : "border-[var(--border)]"
                }`}
              >
                {/* Month header */}
                <div className="flex items-center justify-between gap-3 p-5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-lg">
                      &#x1F4C5;
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {MONTH_NAMES[summary.month - 1]} {summary.year}
                      </h3>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {entryLines.length} {entryLines.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(summary.id);
                            setEditText(summary.summary);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-tumba-400 hover:bg-tumba-500/10 transition-colors border border-tumba-500/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(summary.id)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20 disabled:opacity-50"
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={Math.max(6, entryLines.length + 2)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 resize-none text-sm font-mono"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(summary.id)}
                          disabled={editSubmitting || !editText.trim()}
                          className="px-5 py-2 rounded-xl bg-tumba-500 text-white text-sm font-semibold hover:bg-tumba-400 transition-colors disabled:opacity-50 shadow-lg shadow-tumba-500/20"
                        >
                          {editSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {entryLines.map((line, i) => {
                        const colonIdx = line.indexOf(": ");
                        const author = colonIdx > -1 ? line.slice(0, colonIdx) : "";
                        const content = colonIdx > -1 ? line.slice(colonIdx + 2) : line;
                        return (
                          <div
                            key={i}
                            className="flex gap-2 text-sm py-2 px-3 rounded-lg bg-[var(--bg-primary)]/50"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
