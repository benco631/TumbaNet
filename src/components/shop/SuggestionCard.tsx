"use client";

import { ThumbsUp, ThumbsDown, Clock, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { CoinAmountMd } from "@/components/TumbaCoin";
import type { ShopSuggestionDTO } from "@/lib/shop/types";

interface Props {
  suggestion: ShopSuggestionDTO;
  onVote: (value: 1 | -1) => void;
  onClearVote: () => void;
  onAdminApprove?: () => void;
  onAdminReject?: () => void;
  pending?: boolean;
  isAdmin?: boolean;
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
  return `${mins}m left`;
}

export default function SuggestionCard({
  suggestion,
  onVote,
  onClearVote,
  onAdminApprove,
  onAdminReject,
  pending,
  isAdmin,
}: Props) {
  const isPending = suggestion.status === "PENDING";
  const isApproved = suggestion.status === "APPROVED";
  const isRejected = suggestion.status === "REJECTED";
  const isExpired = suggestion.status === "EXPIRED";

  const ratioPct = Math.round(suggestion.approvalRatio * 100);

  function handleUp() {
    if (!isPending || pending) return;
    if (suggestion.myVote === 1) onClearVote();
    else onVote(1);
  }

  function handleDown() {
    if (!isPending || pending) return;
    if (suggestion.myVote === -1) onClearVote();
    else onVote(-1);
  }

  return (
    <motion.div
      layout
      className={`relative p-4 sm:p-5 rounded-2xl border bg-[var(--bg-card)] flex flex-col gap-3 transition-all ${
        isPending
          ? "border-tumba-500/25 shadow-[0_0_20px_rgba(192,38,211,0.08)]"
          : isApproved
            ? "border-green-500/30"
            : "border-red-500/20 opacity-80"
      }`}
    >
      {/* Status ribbon */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {suggestion.creator.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={suggestion.creator.avatar}
              alt={suggestion.creator.name}
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-tumba-500/20 text-tumba-400 flex items-center justify-center text-xs font-bold shrink-0">
              {suggestion.creator.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-[var(--text-secondary)] truncate">
            Suggested by <span className="text-[var(--text-primary)] font-medium">{suggestion.creator.name}</span>
          </span>
        </div>

        {isPending && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-tumba-500/15 text-tumba-400 font-semibold flex items-center gap-1">
            <Clock size={11} strokeWidth={2.25} />
            {timeLeft(suggestion.expiresAt)}
          </span>
        )}
        {isApproved && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={11} strokeWidth={2.25} />
            Approved
          </span>
        )}
        {isRejected && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold flex items-center gap-1">
            <XCircle size={11} strokeWidth={2.25} />
            Rejected
          </span>
        )}
        {isExpired && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-secondary)] font-semibold flex items-center gap-1">
            <Clock size={11} strokeWidth={2.25} />
            Expired
          </span>
        )}
      </div>

      {/* Title + description */}
      <div>
        <h3 className="font-semibold text-base mb-1">{suggestion.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{suggestion.description}</p>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between">
        <CoinAmountMd amount={suggestion.price} />
        {suggestion.category !== "general" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium capitalize">
            {suggestion.category}
          </span>
        )}
      </div>

      {/* Vote progress bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
          <span>{suggestion.totalVotes} votes</span>
          <span>{ratioPct}% approval</span>
        </div>
        <div className="h-1.5 rounded-full bg-red-500/15 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-tumba-500 to-neon-pink"
            initial={false}
            animate={{ width: `${ratioPct}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
          />
        </div>
      </div>

      {/* Vote buttons */}
      {isPending && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUp}
            disabled={pending}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
              suggestion.myVote === 1
                ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/20"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
            }`}
          >
            <ThumbsUp size={15} strokeWidth={2} />
            <span>{suggestion.upvotes}</span>
          </button>
          <button
            type="button"
            onClick={handleDown}
            disabled={pending}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
              suggestion.myVote === -1
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
            }`}
          >
            <ThumbsDown size={15} strokeWidth={2} />
            <span>{suggestion.downvotes}</span>
          </button>
        </div>
      )}

      {/* Admin override */}
      {isAdmin && isPending && (onAdminApprove || onAdminReject) && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <ShieldCheck size={13} strokeWidth={2} className="text-tumba-400 shrink-0" />
          <span className="text-[11px] text-[var(--text-secondary)] mr-auto">Admin override</span>
          {onAdminApprove && (
            <button
              onClick={onAdminApprove}
              disabled={pending}
              className="text-xs px-2.5 py-1 rounded-lg text-green-400 hover:bg-green-500/10 disabled:opacity-50"
            >
              Force approve
            </button>
          )}
          {onAdminReject && (
            <button
              onClick={onAdminReject}
              disabled={pending}
              className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              Force reject
            </button>
          )}
        </div>
      )}

      {/* Resolution note for resolved suggestions */}
      {!isPending && suggestion.resolutionNote && (
        <p className="text-[11px] text-[var(--text-secondary)] italic">{suggestion.resolutionNote}</p>
      )}
    </motion.div>
  );
}
