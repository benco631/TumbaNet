"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroup } from "@/components/GroupProvider";
import { MotionPage } from "@/components/motion";

interface CreatedGroup {
  id: string;
  name: string;
  inviteCode: string;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const { refreshGroups } = useGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"OPEN" | "CLOSED">("OPEN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedGroup | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      await refreshGroups();
      setCreated({ id: data.id, name: data.name, inviteCode: data.inviteCode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteLink = created ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${created.inviteCode}` : "";

  const copyCode = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.inviteCode);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  };

  if (created) {
    return (
      <MotionPage className="max-w-lg mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)]">
        <div className="card-premium p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h1 className="text-2xl font-extrabold">Group Created!</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Share the invite below to bring people into <span className="font-semibold text-[var(--text-primary)]">{created.name}</span>.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-[var(--text-secondary)]">Invite Code</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] font-mono text-center text-2xl tracking-[0.3em] font-bold">
                {created.inviteCode}
              </code>
              <button
                type="button"
                onClick={copyCode}
                className="btn-primary px-5 text-sm font-semibold"
              >
                {copied === "code" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-[var(--text-secondary)]">Invite Link</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs truncate">
                {inviteLink}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="btn-secondary px-5 text-sm font-semibold"
              >
                {copied === "link" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/groups")}
              className="flex-1 btn-secondary py-3 font-medium"
            >
              View Groups
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 btn-primary py-3 font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </MotionPage>
    );
  }

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
