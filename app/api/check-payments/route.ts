import { NextResponse } from "next/server";
import { checkAndCreatePaymentAlerts } from "@/lib/firestore";
import { requireAdmin, isAdminAuthOk } from "@/lib/requireAdmin";

// Cron (x-cron-secret) or signed-in admin can trigger this.
export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-cron-secret");
    const cronOk = Boolean(
      process.env.CRON_SECRET && secret === process.env.CRON_SECRET
    );
    if (!cronOk) {
      const adminAuthResult = await requireAdmin(request);
      if (!isAdminAuthOk(adminAuthResult)) return adminAuthResult;
    }
    const count = await checkAndCreatePaymentAlerts();
    return NextResponse.json({ ok: true, alertsCreated: count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/Vercel cron trigger
export async function GET(request: Request) {
  return POST(request);
}
