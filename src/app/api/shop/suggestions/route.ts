import { NextRequest, NextResponse } from "next/server";
import { requireUser, toErrorResponse } from "@/lib/shop/api-helpers";
import {
  createSuggestion,
  listSuggestions,
  ShopServiceError,
} from "@/lib/shop/suggestion-service";
import { SUGGESTION_STATUS, type SuggestionStatus } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

// GET /api/shop/suggestions?status=PENDING
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && statusParam in SUGGESTION_STATUS
      ? (statusParam as SuggestionStatus)
      : undefined;

  try {
    const suggestions = await listSuggestions(auth.user.id, status ? { status } : undefined);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/shop/suggestions
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const suggestion = await createSuggestion(auth.user.id, body);
    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (err) {
    if (err instanceof ShopServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}
