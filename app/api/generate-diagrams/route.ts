import { NextResponse } from "next/server";
import {
  generateQuestionDiagram,
  attachDiagramsToQuestions,
  isAiConfigured,
  aiConfigError,
} from "@/lib/ai";
import type { AIQuestion } from "@/lib/firestore";

/**
 * POST /api/generate-diagrams
 * Body:
 *   { question: AIQuestion, force?: boolean }  — one question (preferred; admin clicks per card)
 *   { questions: AIQuestion[] }                — batch (optional / legacy)
 */
export async function POST(request: Request) {
  try {
    if (!isAiConfigured()) {
      return NextResponse.json({ error: aiConfigError() }, { status: 503 });
    }

    const body = (await request.json()) as {
      question?: AIQuestion;
      questions?: AIQuestion[];
      force?: boolean;
    };

    // Single-question path (credit-friendly)
    if (body.question?.id) {
      const imageUrl = await generateQuestionDiagram(body.question, {
        force: body.force !== false,
      });
      if (!imageUrl) {
        return NextResponse.json(
          { error: "Could not generate a diagram for this question. Try again or upload an image manually." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        questionId: body.question.id,
        imageUrl,
        message: "Diagram generated.",
      });
    }

    const questions = body.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "No question provided." }, { status: 400 });
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
