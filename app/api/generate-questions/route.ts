import { NextResponse } from "next/server";
import { generateQuestions, isAiConfigured, aiConfigError } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    if (!isAiConfigured()) {
      return NextResponse.json({ error: aiConfigError() }, { status: 503 });
    }

    const body = await request.json();
    const { curriculum, subject, year, topic, subtopic, count, difficulty, format, context, prompt } = body;

    if (!curriculum || !subject || !year || !topic || !count || !difficulty || !format || !context) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const questions = await generateQuestions({
      curriculum,
      subject,
      year,
      topic,
      subtopic,
      count,
      difficulty,
      format,
      context,
      prompt,
    });
    return NextResponse.json({ questions }, { status: 200 });
  } catch (error: unknown) {
    console.error("generate-questions error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}
