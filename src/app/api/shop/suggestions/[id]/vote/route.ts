import { NextRequest, NextResponse } from "next/server";
import { requireUser, toErrorResponse } from "@/lib/shop/api-helpers";
import {
  castVote,
  clearVote,
  ShopServiceError,
} from "@/lib/shop/suggestion-service";
import { VOTE_VALUE } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

// POST /api/shop/suggestions/[id]/vote   body: { value: 1 | -1 }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const value = body?.value === VOTE_VALUE.UP ? VOTE_VALUE.UP : body?.value === VOTE_VALUE.DOWN ? VOTE_VALUE.DOWN : null;
    if (value === null) {
      return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
    }
    const suggestion = await castVote(params.id, auth.user.id, value);
    return NextResponse.json({ suggestion });
  } catch (err) {
    if (err instanceof ShopServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}

// DELETE /api/shop/suggestions/[id]/vote  — withdraw your vote
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const suggestion = await clearVote(params.id, auth.user.id);
    return NextResponse.json({ suggestion });
  } catch (err) {
    if (err instanceof ShopServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}
