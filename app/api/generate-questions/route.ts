import { NextResponse } from "next/server";
import { generateQuestions } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
      return NextResponse.json(
        { error: "Gemini API key not configured. Add GEMINI_API_KEY to your .env.local file. Get a free key at https://aistudio.google.com" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { curriculum, subject, year, topic, subtopic, count, difficulty, format, context, prompt } = body;

    if (!curriculum || !subject || !year || !topic || !count || !difficulty || !format || !context) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const questions = await generateQuestions({ curriculum, subject, year, topic, subtopic, count, difficulty, format, context, prompt });
    return NextResponse.json({ questions }, { status: 200 });
  } catch (error: unknown) {
    console.error("generate-questions error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}
