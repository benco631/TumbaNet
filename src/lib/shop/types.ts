// Shared DTOs for the shop suggestion / voting flow.
// The server shapes Prisma rows into these; the client consumes them directly.

import type { SuggestionStatus } from "./config";

export interface SuggestionCreator {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ShopSuggestionDTO {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  status: SuggestionStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expiresAt: string; // ISO
  resolvedAt: string | null;
  resolutionNote: string | null;
  creator: SuggestionCreator;
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  approvalRatio: number; // 0..1
  myVote: 1 | -1 | 0; // 0 = hasn't voted
  approvedItemId: string | null;
}

export interface CreateSuggestionInput {
  title: string;
  description: string;
  price: number;
  category?: string;
  imageUrl?: string | null;
}

export interface VoteInput {
  value: 1 | -1;
}
