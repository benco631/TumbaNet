import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser, toErrorResponse } from "@/lib/shop/api-helpers";
import {
  adminResolve,
  getSuggestion,
  ShopServiceError,
} from "@/lib/shop/suggestion-service";

export const dynamic = "force-dynamic";

// GET /api/shop/suggestions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    const suggestion = await getSuggestion(params.id, auth.user.id);
    if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ suggestion });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/shop/suggestions/[id]  — admin-only moderation override
// Body: { action: "APPROVE" | "REJECT", note?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const action = body?.action;
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    await adminResolve(
      params.id,
      action === "APPROVE" ? "APPROVED" : "REJECTED",
      typeof body?.note === "string" ? body.note : undefined,
    );
    const fresh = await getSuggestion(params.id, auth.user.id);
    return NextResponse.json({ suggestion: fresh });
  } catch (err) {
    if (err instanceof ShopServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}
