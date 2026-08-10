import { NextResponse } from "next/server";
import { checkAndCreatePaymentAlerts } from "@/lib/firestore";

// This route can be called by a cron job (e.g. Vercel Cron, external cron)
// or manually from the admin dashboard.
// Protect it with a shared secret.
export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-cron-secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
