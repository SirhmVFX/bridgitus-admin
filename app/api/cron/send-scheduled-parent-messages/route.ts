import { NextRequest, NextResponse } from "next/server";
import { flushDueScheduledParentMessages } from "@/lib/parentMessageDelivery";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron (or manual) endpoint to deliver scheduled parent messages.
 * Protect with CRON_SECRET when set: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await flushDueScheduledParentMessages();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("cron send-scheduled-parent-messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 },
    );
  }
}
