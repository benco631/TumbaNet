// Shop suggestion + voting configuration
// Single source of truth for all approval rules and limits.

export const SUGGESTION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export type SuggestionStatus =
  (typeof SUGGESTION_STATUS)[keyof typeof SUGGESTION_STATUS];

export const VOTE_VALUE = {
  UP: 1,
  DOWN: -1,
} as const;

export type VoteValue = (typeof VOTE_VALUE)[keyof typeof VOTE_VALUE];

export const SHOP_ITEM_SOURCE = {
  ADMIN: "ADMIN",
  BUILT_IN: "BUILT_IN",
  COMMUNITY: "COMMUNITY",
} as const;

export type ShopItemSource =
  (typeof SHOP_ITEM_SOURCE)[keyof typeof SHOP_ITEM_SOURCE];

/**
 * Rules that govern how community suggestions are approved.
 * All values are tunable — the resolver reads them dynamically,
 * so changing the constant instantly shifts production behavior
 * (no migration required).
 */
export const VOTING_RULES = {
  /** Minimum total votes (up + down) required before approval can trigger. */
  minVotes: 3,
  /** Minimum approval ratio (upvotes / totalVotes) required to approve. */
  approvalRatio: 0.6,
  /** Days a suggestion stays open for voting before auto-expiring. */
  votingDurationDays: 7,
  /**
   * If true, a suggestion that has reached minVotes but the ratio is mathematically
   * unrecoverable (even with all remaining community votes flipping to up) is
   * rejected early. Saves moderation noise and stops dead proposals lingering.
   */
  earlyRejectOnFailedRatio: true,
  /** Auto-register the creator as an upvoter when they submit. */
  autoUpvoteCreator: true,
} as const;

/**
 * Coin rewards related to the suggestion lifecycle.
 * Creators whose items are approved by the community get a bonus —
 * this incentivizes quality submissions without making it pay-to-win.
 */
export const REWARD_RULES = {
  /** Coins credited to the creator when their suggestion is approved. */
  creatorApprovalBonus: 50,
} as const;

/**
 * Input limits. Enforced on both the API and the form.
 * Kept conservative to avoid abuse and keep the UI readable.
 */
export const SUGGESTION_LIMITS = {
  titleMin: 3,
  titleMax: 60,
  descriptionMin: 5,
  descriptionMax: 400,
  priceMin: 10,
  priceMax: 2000,
} as const;

export interface VoteTally {
  upvotes: number;
  downvotes: number;
  total: number;
  ratio: number; // 0..1
}

/**
 * Compute the vote tally from raw vote values.
 * Returns ratio = 0 when there are zero votes (defensive — never NaN).
 */
export function tallyVotes(values: number[]): VoteTally {
  let upvotes = 0;
  let downvotes = 0;
  for (const v of values) {
    if (v > 0) upvotes++;
    else if (v < 0) downvotes++;
  }
  const total = upvotes + downvotes;
  const ratio = total === 0 ? 0 : upvotes / total;
  return { upvotes, downvotes, total, ratio };
}

export type VoteVerdict =
  | { status: "PENDING"; reason: "below_threshold" | "awaiting_more_votes" }
  | { status: "APPROVED"; reason: "ratio_met" }
  | { status: "REJECTED"; reason: "ratio_unreachable" }
  | { status: "EXPIRED"; reason: "deadline_passed" };

/**
 * Given a current tally and (optionally) an expiry, decide what state
 * the suggestion should transition to. Pure function — no DB, no side effects.
 */
export function evaluateVotes(
  tally: VoteTally,
  opts: { expiresAt: Date; now?: Date },
): VoteVerdict {
  const now = opts.now ?? new Date();

  // Expiry wins over everything else.
  if (now >= opts.expiresAt) {
    if (tally.total >= VOTING_RULES.minVotes && tally.ratio >= VOTING_RULES.approvalRatio) {
      return { status: "APPROVED", reason: "ratio_met" };
    }
    return { status: "EXPIRED", reason: "deadline_passed" };
  }

  // Early approve: ratio met AND enough votes.
  if (tally.total >= VOTING_RULES.minVotes && tally.ratio >= VOTING_RULES.approvalRatio) {
    return { status: "APPROVED", reason: "ratio_met" };
  }

  // Early reject: even if ALL remaining votes flipped up, ratio still can't be reached.
  // We don't know "remaining" population, so we only early-reject when the current ratio
  // is mathematically stuck below threshold AND we've hit minVotes. Practically: if
  // downvotes are so dominant that the ratio can't climb back to approvalRatio without
  // a huge influx, we bail. Keep this simple: reject when ratio < approvalRatio and
  // downvotes >= 2 * upvotes + 1 AND minVotes reached.
  if (
    VOTING_RULES.earlyRejectOnFailedRatio &&
    tally.total >= VOTING_RULES.minVotes &&
    tally.downvotes >= tally.upvotes * 2 + 1
  ) {
    return { status: "REJECTED", reason: "ratio_unreachable" };
  }

  return {
    status: "PENDING",
    reason: tally.total < VOTING_RULES.minVotes ? "below_threshold" : "awaiting_more_votes",
  };
}

export function computeSuggestionExpiry(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + VOTING_RULES.votingDurationDays);
  return d;
}
