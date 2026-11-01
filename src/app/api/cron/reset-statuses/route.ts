import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Daily reset (Vercel Cron, vercel.json: "0 15 * * *" = 00:00 KST): every
 * child goes back home — `place_id` null, not 가는 중 — so yesterday's
 * "어린이집" never lingers into a new day. Only rows not already home are
 * touched (their `updated_at` becomes now). Sends no pushes; Realtime
 * delivers the change to open dashboards.
 *
 * Vercel calls it with `Authorization: Bearer $CRON_SECRET`; anything else
 * (or no CRON_SECRET configured) is a 401.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("current_statuses")
    .update(
      { place_id: null, going: false, updated_at: new Date().toISOString() },
      { count: "exact" }
    )
    .or("place_id.not.is.null,going.eq.true");

  if (error) {
    console.error("daily status reset failed:", error.message);
    return NextResponse.json({ error: "reset failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reset: count ?? 0 });
}
