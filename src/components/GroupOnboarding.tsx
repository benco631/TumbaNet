"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroup } from "./GroupProvider";
import Logo from "./Logo";

type Step = "choose" | "create" | "join" | "join-result";

export default function GroupOnboarding() {
  const [step, setStep] = useState<Step>("choose");
  const [joinResult, setJoinResult] = useState<{ status: string; groupName: string } | null>(null);

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl font-extrabold">
            <span className="gradient-text">Welcome to TumbaNet</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">
            Create or join a group to get started
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "choose" && <ChooseStep key="choose" onChoice={setStep} />}
          {step === "create" && <CreateStep key="create" onBack={() => setStep("choose")} />}
          {step === "join" && (
            <JoinStep
              key="join"
              onBack={() => setStep("choose")}
              onResult={(result) => {
                setJoinResult(result);
                setStep("join-result");
              }}
            />
          )}
          {step === "join-result" && joinResult && (
            <JoinResultStep
              key="join-result"
              result={joinResult}
              onBack={() => setStep("choose")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChooseStep({ onChoice }: { onChoice: (step: Step) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <button
        onClick={() => onChoice("create")}
        className="w-full p-6 rounded-2xl border border-tumba-500/30 bg-gradient-to-br from-tumba-900/40 via-[var(--bg-card)] to-[var(--bg-card)] hover:border-tumba-500/50 transition-all group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-tumba-500/15 flex items-center justify-center group-hover:bg-tumba-500/25 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tumba-400">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Open a Group</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Create a new group and invite your friends
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onChoice("join")}
        className="w-full p-6 rounded-2xl border border-tumba-500/30 bg-gradient-to-br from-tumba-900/40 via-[var(--bg-card)] to-[var(--bg-card)] hover:border-tumba-500/50 transition-all group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-neon-pink/15 flex items-center justify-center group-hover:bg-neon-pink/25 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon-pink">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Join a Group</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Enter an invite code or use an invite link
            </p>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function CreateStep({ onBack }: { onBack: () => void }) {
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
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <form onSubmit={handleCreate} className="space-y-5">
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-bold">Create your group</h2>

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
                🔓 Open
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
                🔒 Closed
                <p className="text-[10px] mt-0.5 opacity-70">Admin approval needed</p>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors font-medium"
          >
            Back
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
    </motion.div>
  );
}

function JoinStep({
  onBack,
  onResult,
}: {
  onBack: () => void;
  onResult: (result: { status: string; groupName: string }) => void;
}) {
  const { refreshGroups } = useGroup();
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      if (data.status === "joined" || data.status === "already_member") {
        await refreshGroups();
        window.location.reload();
      } else {
        onResult({ status: data.status, groupName: data.group?.name || "the group" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <form onSubmit={handleJoin} className="space-y-5">
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-bold">Join a group</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Enter the invite code you received from the group admin.
          </p>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50 transition-colors text-center text-lg tracking-wider font-mono"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!inviteCode.trim() || isSubmitting}
            className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Joining..." : "Join"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function JoinResultStep({
  result,
  onBack,
}: {
  result: { status: string; groupName: string };
  onBack: () => void;
}) {
  if (result.status === "requested") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-premium p-6 text-center space-y-4"
      >
        <div className="h-16 w-16 mx-auto rounded-full bg-yellow-500/15 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold">Request Sent!</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Your request to join <span className="font-semibold text-[var(--text-primary)]">{result.groupName}</span> has been sent.
          The group admin will review and approve or decline your request.
        </p>
        <button
          onClick={onBack}
          className="btn-secondary px-6 py-2.5 mt-2"
        >
          Back to Menu
        </button>
      </motion.div>
    );
  }

  if (result.status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-premium p-6 text-center space-y-4"
      >
        <div className="h-16 w-16 mx-auto rounded-full bg-blue-500/15 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold">Already Pending</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          You already have a pending request to join <span className="font-semibold text-[var(--text-primary)]">{result.groupName}</span>.
          Please wait for admin approval.
        </p>
        <button
          onClick={onBack}
          className="btn-secondary px-6 py-2.5 mt-2"
        >
          Back to Menu
        </button>
      </motion.div>
    );
  }

  return null;
}
