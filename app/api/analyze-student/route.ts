import { NextResponse } from "next/server";
import {
  analyzeStudentPerformance,
  isAiConfigured,
  aiConfigError,
  type StudentAnalysisPayload,
} from "@/lib/ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!isAiConfigured()) {
      return NextResponse.json({ error: aiConfigError() }, { status: 503 });
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
