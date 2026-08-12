import { NextResponse } from "next/server";
import { analyzeStudentPerformance, type StudentAnalysisPayload } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const payload = (await request.json()) as StudentAnalysisPayload;
    if (!payload?.studentName) {
      return NextResponse.json({ error: "Missing student data." }, { status: 400 });
    }

    const analysis = await analyzeStudentPerformance(payload);
    return NextResponse.json({ analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
