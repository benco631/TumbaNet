"use client";

import { useSession } from "next-auth/react";
import { DictionaryIcon, SearchIcon, UpvoteIcon, DownvoteIcon, CommentsIcon, CloseIcon } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MotionPage } from "@/components/motion";
import { staggerContainer, fadeInUp } from "@/lib/animations";

interface DictComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface DictEntry {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  createdAt: string;
  user: { id: string; name: string };
  comments: DictComment[];
  totalRating: number;
  ratingCount: number;
  userRating: number;
  _count: { comments: number };
}

export default function DictionaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchEntries = useCallback(async (searchTerm?: string) => {
    const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
    const res = await fetch(`/api/dictionary${params}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchEntries();
    }
  }, [status, router, fetchEntries]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === "authenticated") {
        fetchEntries(search);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, fetchEntries]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    setSubmitting(true);

    const res = await fetch("/api/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, definition, example }),
    });

    if (res.ok) {
      setTerm("");
      setDefinition("");
      setExample("");
      setShowForm(false);
      fetchEntries(search);
    }
    setSubmitting(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this definition?")) return;
    await fetch(`/api/dictionary?id=${id}`, { method: "DELETE" });
    fetchEntries(search);
  }

  async function rate(entryId: string, value: number) {
    const entry = entries.find((e) => e.id === entryId);
    const newValue = entry?.userRating === value ? 0 : value;

    const res = await fetch("/api/dictionary/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dictionaryEntryId: entryId, value: newValue }),
    });

    if (res.ok) {
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, totalRating: data.totalRating, ratingCount: data.ratingCount, userRating: data.userRating }
            : e
        )
      );
    }
  }

  async function addComment(entryId: string) {
    const content = commentInputs[entryId]?.trim();
    if (!content) return;

    const res = await fetch("/api/dictionary/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dictionaryEntryId: entryId, content }),
    });

    if (res.ok) {
      setCommentInputs((prev) => ({ ...prev, [entryId]: "" }));
      fetchEntries(search);
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/dictionary/comments?id=${commentId}`, { method: "DELETE" });
    fetchEntries(search);
  }

  function toggleComments(entryId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <MotionPage className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <DictionaryIcon size={32} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
            <span>Tumba Dictionary</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            The official Tumba slang & inside jokes encyclopedia
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all shadow-lg shadow-tumba-500/20 whitespace-nowrap self-start sm:self-auto"
        >
          {showForm ? "Cancel" : "+ New Word"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form
          onSubmit={addEntry}
          className="mb-8 p-5 rounded-2xl border border-tumba-500/20 bg-tumba-500/5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Term / Word
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500"
              placeholder='e.g. "Lehishtamben"'
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Definition
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 resize-none"
              placeholder="What does it mean in Tumba language?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Example (optional)
            </label>
            <input
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500"
              placeholder='"Bro, don&#39;t lehishtamben on me right now"'
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !term.trim() || !definition.trim()}
            className="px-6 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-tumba-500/20"
          >
            {submitting ? "Adding..." : "Add Definition"}
          </button>
        </form>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
            placeholder="Search the Tumba Dictionary..."
          />
        </div>
      </div>

      {/* Entries */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <DictionaryIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
            <p className="text-lg">
              {search ? "No results found" : "No definitions yet"}
            </p>
            <p className="text-sm mt-1">
              {search
                ? "Try a different search term"
                : "Be the first to add a Tumba word!"}
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <motion.div
              variants={fadeInUp}
              key={entry.id}
              className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all"
            >
              {/* Term Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-tumba-400">
                    {entry.term}
                  </h3>
                  <p className="text-[var(--text-primary)] mt-2 whitespace-pre-wrap">
                    {entry.definition}
                  </p>
                  {entry.example && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)] italic border-l-2 border-tumba-500/30 pl-3">
                      &ldquo;{entry.example}&rdquo;
                    </p>
                  )}
                </div>

                {/* Rating */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => rate(entry.id, 1)}
                    className={`p-1 rounded transition-colors ${
                      entry.userRating === 1
                        ? "text-tumba-400"
                        : "text-[var(--text-secondary)] hover:text-tumba-400"
                    }`}
                  >
                    <UpvoteIcon size={14} strokeWidth={2} />
                  </button>
                  <span
                    className={`text-lg font-bold ${
                      entry.totalRating > 0
                        ? "text-tumba-400"
                        : entry.totalRating < 0
                          ? "text-red-400"
                          : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {entry.totalRating}
                  </span>
                  <button
                    onClick={() => rate(entry.id, -1)}
                    className={`p-1 rounded transition-colors ${
                      entry.userRating === -1
                        ? "text-red-400"
                        : "text-[var(--text-secondary)] hover:text-red-400"
                    }`}
                  >
                    <DownvoteIcon size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span>by {entry.user.name}</span>
                  <span>
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleComments(entry.id)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                  >
                    <CommentsIcon size={13} strokeWidth={1.75} /> {entry._count.comments}
                  </button>
                  {(entry.user.id === userId || isAdmin) && (
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Comments section */}
              {expandedComments.has(entry.id) && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3">
                  {entry.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex items-start gap-2 text-sm group"
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                        {comment.user.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-xs text-tumba-400">
                          {comment.user.name}
                        </span>
                        <p className="text-[var(--text-primary)] text-sm">
                          {comment.content}
                        </p>
                      </div>
                      {(comment.user.id === userId || isAdmin) && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-400/60 hover:text-red-400 transition-all"
                        >
                          <CloseIcon size={12} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInputs[entry.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [entry.id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
                      placeholder="Add a comment..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addComment(entry.id);
                      }}
                    />
                    <button
                      onClick={() => addComment(entry.id)}
                      disabled={!commentInputs[entry.id]?.trim()}
                      className="px-3 py-1.5 text-sm rounded-lg bg-tumba-500 text-white font-medium hover:bg-tumba-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </MotionPage>
  );
}
