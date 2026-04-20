"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroup } from "@/components/GroupProvider";
import { MotionPage } from "@/components/motion";

export default function CreateGroupPage() {
  const router = useRouter();
  const { refreshGroups } = useGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"OPEN" | "CLOSED">("OPEN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), privacy }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }

      await refreshGroups();
      router.push("/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MotionPage className="max-w-lg mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-extrabold mb-6">Create a New Group</h1>

      <form onSubmit={handleCreate} className="space-y-5">
        <div className="card-premium p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Tumbas, Class 12B..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50 transition-colors"
              maxLength={50}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50 transition-colors"
              maxLength={150}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Privacy
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPrivacy("OPEN")}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  privacy === "OPEN"
                    ? "border-tumba-500 bg-tumba-500/15 text-tumba-400"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-tumba-500/30"
                }`}
              >
                Open
                <p className="text-[10px] mt-0.5 opacity-70">Anyone with link can join</p>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("CLOSED")}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  privacy === "CLOSED"
                    ? "border-tumba-500 bg-tumba-500/15 text-tumba-400"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-tumba-500/30"
                }`}
              >
                Closed
                <p className="text-[10px] mt-0.5 opacity-70">Admin approval needed</p>
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </MotionPage>
  );
}
