// Shop suggestion service — the single entry point for all suggestion-related
// business logic. API routes should be thin adapters: parse request, call one
// of these functions, shape the response. All state transitions (voting,
// approval, rejection, expiry, promotion to a ShopItem, creator bonus) live here.
//
// Design notes:
// - Every mutation is idempotent where possible and defensive against races.
// - Promotion of an approved suggestion into a ShopItem happens inside a
//   $transaction so the system can never end up with "APPROVED but no item".
// - Creator bonus (coin credit + CoinTransaction audit entry) is also
//   inside that transaction.
// - `sweepExpiredSuggestions` is lazy-called from `listSuggestions` so we never
//   need a cron job; every list-read opportunistically advances expired rows.

import { prisma } from "@/lib/prisma";
import {
  SUGGESTION_STATUS,
  SHOP_ITEM_SOURCE,
  VOTE_VALUE,
  VOTING_RULES,
  REWARD_RULES,
  SUGGESTION_LIMITS,
  computeSuggestionExpiry,
  evaluateVotes,
  tallyVotes,
  type SuggestionStatus,
  type VoteValue,
} from "./config";
import type { CreateSuggestionInput, ShopSuggestionDTO } from "./types";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type SuggestionWithRelations = Awaited<ReturnType<typeof fetchSuggestionById>>;

async function fetchSuggestionById(id: string) {
  return prisma.shopSuggestion.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      votes: true,
      approvedItem: { select: { id: true } },
    },
  });
}

async function fetchAllSuggestions(filter?: { status?: SuggestionStatus }) {
  return prisma.shopSuggestion.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      votes: true,
      approvedItem: { select: { id: true } },
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// DTO mapper
// ──────────────────────────────────────────────────────────────────────────────

export function toSuggestionDTO(
  row: NonNullable<SuggestionWithRelations>,
  viewerId: string | null,
): ShopSuggestionDTO {
  const tally = tallyVotes(row.votes.map((v) => v.value));
  const mine = viewerId ? row.votes.find((v) => v.userId === viewerId) : null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    category: row.category,
    imageUrl: row.imageUrl,
    status: row.status as SuggestionStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    resolutionNote: row.resolutionNote,
    creator: {
      id: row.creator.id,
      name: row.creator.name,
      avatar: row.creator.avatar,
    },
    upvotes: tally.upvotes,
    downvotes: tally.downvotes,
    totalVotes: tally.total,
    approvalRatio: tally.ratio,
    myVote: (mine?.value as 1 | -1 | undefined) ?? 0,
    approvedItemId: row.approvedItem?.id ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────

export class ShopServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "ShopServiceError";
  }
}

function validateInput(input: CreateSuggestionInput) {
  const title = input.title?.trim();
  const description = input.description?.trim();

  if (!title || title.length < SUGGESTION_LIMITS.titleMin || title.length > SUGGESTION_LIMITS.titleMax) {
    throw new ShopServiceError(
      `Title must be ${SUGGESTION_LIMITS.titleMin}-${SUGGESTION_LIMITS.titleMax} characters`,
    );
  }
  if (
    !description ||
    description.length < SUGGESTION_LIMITS.descriptionMin ||
    description.length > SUGGESTION_LIMITS.descriptionMax
  ) {
    throw new ShopServiceError(
      `Description must be ${SUGGESTION_LIMITS.descriptionMin}-${SUGGESTION_LIMITS.descriptionMax} characters`,
    );
  }
  if (
    !Number.isInteger(input.price) ||
    input.price < SUGGESTION_LIMITS.priceMin ||
    input.price > SUGGESTION_LIMITS.priceMax
  ) {
    throw new ShopServiceError(
      `Price must be an integer between ${SUGGESTION_LIMITS.priceMin} and ${SUGGESTION_LIMITS.priceMax}`,
    );
  }
  return {
    title,
    description,
    price: input.price,
    category: input.category?.trim() || "general",
    imageUrl: input.imageUrl?.trim() || null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create a new community suggestion. Automatically casts the creator's
 * upvote when `VOTING_RULES.autoUpvoteCreator` is enabled.
 */
export async function createSuggestion(creatorId: string, input: CreateSuggestionInput) {
  const clean = validateInput(input);
  const expiresAt = computeSuggestionExpiry();

  const created = await prisma.shopSuggestion.create({
    data: {
      title: clean.title,
      description: clean.description,
      price: clean.price,
      category: clean.category,
      imageUrl: clean.imageUrl,
      creatorId,
      expiresAt,
      status: SUGGESTION_STATUS.PENDING,
      votes: VOTING_RULES.autoUpvoteCreator
        ? {
            create: {
              userId: creatorId,
              value: VOTE_VALUE.UP,
            },
          }
        : undefined,
    },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      votes: true,
      approvedItem: { select: { id: true } },
    },
  });

  return toSuggestionDTO(created, creatorId);
}

/**
 * Cast or update a vote on a suggestion. If the user has already voted with the
 * same value, this is a no-op (idempotent). If they voted the opposite way, the
 * vote is flipped. After the write, the suggestion's status is re-evaluated —
 * so voting can directly trigger APPROVED/REJECTED transitions.
 */
export async function castVote(
  suggestionId: string,
  userId: string,
  value: VoteValue,
): Promise<ShopSuggestionDTO> {
  if (value !== VOTE_VALUE.UP && value !== VOTE_VALUE.DOWN) {
    throw new ShopServiceError("Invalid vote value");
  }

  const suggestion = await prisma.shopSuggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true, status: true, expiresAt: true },
  });
  if (!suggestion) throw new ShopServiceError("Suggestion not found", 404);
  if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
    throw new ShopServiceError("Voting on this suggestion is closed", 409);
  }
  if (suggestion.expiresAt <= new Date()) {
    // Lazy-expire: mark it and bail.
    await evaluateAndTransition(suggestionId);
    throw new ShopServiceError("Voting period has ended", 409);
  }

  await prisma.shopSuggestionVote.upsert({
    where: {
      suggestionId_userId: { suggestionId, userId },
    },
    create: { suggestionId, userId, value },
    update: { value },
  });

  await evaluateAndTransition(suggestionId);

  const fresh = await fetchSuggestionById(suggestionId);
  if (!fresh) throw new ShopServiceError("Suggestion vanished", 500);
  return toSuggestionDTO(fresh, userId);
}

/** Remove the viewer's vote on a suggestion (idempotent). */
export async function clearVote(
  suggestionId: string,
  userId: string,
): Promise<ShopSuggestionDTO> {
  const suggestion = await prisma.shopSuggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true, status: true },
  });
  if (!suggestion) throw new ShopServiceError("Suggestion not found", 404);
  if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
    throw new ShopServiceError("Voting on this suggestion is closed", 409);
  }

  await prisma.shopSuggestionVote.deleteMany({
    where: { suggestionId, userId },
  });

  await evaluateAndTransition(suggestionId);

  const fresh = await fetchSuggestionById(suggestionId);
  if (!fresh) throw new ShopServiceError("Suggestion vanished", 500);
  return toSuggestionDTO(fresh, userId);
}

/**
 * Recompute the suggestion's status from its current votes + expiry.
 * If the verdict changes state, persist it — and, for APPROVED, promote to a
 * ShopItem and credit the creator bonus inside the same transaction.
 */
export async function evaluateAndTransition(suggestionId: string): Promise<void> {
  const row = await fetchSuggestionById(suggestionId);
  if (!row) return;
  if (row.status !== SUGGESTION_STATUS.PENDING) return;

  const tally = tallyVotes(row.votes.map((v) => v.value));
  const verdict = evaluateVotes(tally, { expiresAt: row.expiresAt });
  if (verdict.status === "PENDING") return;

  if (verdict.status === "APPROVED") {
    await promoteSuggestionToItem(row.id, row.creatorId);
    return;
  }

  // REJECTED or EXPIRED
  await prisma.shopSuggestion.update({
    where: { id: row.id },
    data: {
      status: verdict.status,
      resolvedAt: new Date(),
      resolutionNote:
        verdict.status === "EXPIRED"
          ? "Voting window ended without enough support"
          : "Rejected by community vote",
    },
  });
}

/**
 * Promote a PENDING suggestion into an ADMIN-visible ShopItem and credit
 * the creator their approval bonus. Atomic: either everything commits or nothing.
 *
 * Safe against double-promotion — if a race triggers this twice, the second
 * call no-ops because the suggestion will already be APPROVED.
 */
export async function promoteSuggestionToItem(
  suggestionId: string,
  creatorId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.shopSuggestion.findUnique({
      where: { id: suggestionId },
      select: { status: true, title: true, description: true, price: true, category: true, imageUrl: true },
    });
    if (!current || current.status !== SUGGESTION_STATUS.PENDING) return; // idempotent

    const item = await tx.shopItem.create({
      data: {
        title: current.title,
        description: current.description,
        price: current.price,
        category: current.category,
        imageUrl: current.imageUrl,
        active: true,
        source: SHOP_ITEM_SOURCE.COMMUNITY,
        createdById: creatorId,
        suggestionId,
      },
    });

    await tx.shopSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: SUGGESTION_STATUS.APPROVED,
        resolvedAt: new Date(),
        resolutionNote: "Approved by community vote",
      },
    });

    if (REWARD_RULES.creatorApprovalBonus > 0) {
      await tx.user.update({
        where: { id: creatorId },
        data: { tumbaCoins: { increment: REWARD_RULES.creatorApprovalBonus } },
      });
      await tx.coinTransaction.create({
        data: {
          userId: creatorId,
          amount: REWARD_RULES.creatorApprovalBonus,
          reason: `Shop suggestion approved: ${item.title}`,
        },
      });
    }
  });
}

/**
 * Admin-forced resolution. Bypasses voting rules. Used from the admin panel
 * when moderation needs to override community judgment. Still credits creator
 * bonus on approval (consistent with community-approval behavior).
 */
export async function adminResolve(
  suggestionId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string,
): Promise<void> {
  const row = await prisma.shopSuggestion.findUnique({
    where: { id: suggestionId },
    select: { status: true, creatorId: true },
  });
  if (!row) throw new ShopServiceError("Suggestion not found", 404);
  if (row.status !== SUGGESTION_STATUS.PENDING) {
    throw new ShopServiceError("Suggestion is already resolved", 409);
  }

  if (decision === "APPROVED") {
    await promoteSuggestionToItem(suggestionId, row.creatorId);
    if (note) {
      await prisma.shopSuggestion.update({
        where: { id: suggestionId },
        data: { resolutionNote: note },
      });
    }
    return;
  }

  await prisma.shopSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: SUGGESTION_STATUS.REJECTED,
      resolvedAt: new Date(),
      resolutionNote: note?.trim() || "Rejected by moderator",
    },
  });
}

/**
 * Advance any PENDING suggestions whose deadline has passed. Cheap — runs
 * opportunistically from `listSuggestions` so production never needs a cron.
 */
export async function sweepExpiredSuggestions(): Promise<void> {
  const now = new Date();
  const due = await prisma.shopSuggestion.findMany({
    where: { status: SUGGESTION_STATUS.PENDING, expiresAt: { lte: now } },
    select: { id: true },
  });
  for (const { id } of due) {
    await evaluateAndTransition(id);
  }
}

/**
 * List suggestions for the current viewer. Optionally filter by status.
 * Runs `sweepExpiredSuggestions` first so expired rows never appear as PENDING.
 */
export async function listSuggestions(
  viewerId: string | null,
  filter?: { status?: SuggestionStatus },
): Promise<ShopSuggestionDTO[]> {
  await sweepExpiredSuggestions();
  const rows = await fetchAllSuggestions(filter);
  return rows.map((row) => toSuggestionDTO(row, viewerId));
}

/** Fetch a single suggestion. Useful for detail routes and after-write reads. */
export async function getSuggestion(
  id: string,
  viewerId: string | null,
): Promise<ShopSuggestionDTO | null> {
  const row = await fetchSuggestionById(id);
  return row ? toSuggestionDTO(row, viewerId) : null;
}
