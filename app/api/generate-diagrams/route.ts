import { NextResponse } from "next/server";
import { attachDiagramsToQuestions } from "@/lib/gemini";
import type { AIQuestion } from "@/lib/firestore";

/**
 * POST /api/generate-diagrams
 * Body: { questions: AIQuestion[] }
 * Generates educational diagrams (via Gemini image model) for questions that need them.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
      return NextResponse.json(
        { error: "Gemini API key not configured." },
        { status: 500 }
      );
    }

    const { questions } = (await request.json()) as { questions: AIQuestion[] };
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "No questions provided." }, { status: 400 });
    }

    const result = await attachDiagramsToQuestions(questions);
    return NextResponse.json({
      questions: result.questions,
      generated: result.generated,
      failed: result.failed,
      message:
        result.generated > 0
          ? `Generated ${result.generated} diagram${result.generated !== 1 ? "s" : ""}${result.failed ? ` (${result.failed} skipped/failed)` : ""}.`
          : "No questions needed diagrams (or generation was skipped).",
    });
  } catch (error: unknown) {
    console.error("generate-diagrams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Diagram generation failed" },
      { status: 500 }
    );
  }
}
