import { NextResponse } from "next/server";
import { createSimilarQuestions, isAiConfigured, aiConfigError } from "@/lib/ai";
import { requireAdmin, isAdminAuthOk } from "@/lib/requireAdmin";

export async function POST(request: Request) {
  try {
    const adminAuthResult = await requireAdmin(request);
    if (!isAdminAuthOk(adminAuthResult)) return adminAuthResult;

    if (!isAiConfigured()) {
      return NextResponse.json({ error: aiConfigError() }, { status: 503 });
    }

    const body = await request.json();
    const { question, count = 3 } = body;

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const questions = await createSimilarQuestions({ question, count });
    return NextResponse.json({ questions }, { status: 200 });
  } catch (error: unknown) {
    console.error("create-similar error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
  }
}
