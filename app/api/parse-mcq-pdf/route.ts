import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { parseMcqFromText, isAiConfigured, aiConfigError } from "@/lib/ai";
import { requireAdmin, isAdminAuthOk } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const adminAuthResult = await requireAdmin(request);
    if (!isAdminAuthOk(adminAuthResult)) return adminAuthResult;

    if (!isAiConfigured()) {
      return NextResponse.json({ error: aiConfigError() }, { status: 503 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing PDF file. Upload a file under the field name "file".' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "PDF exceeds the 20MB size limit." },
        { status: 400 },
      );
    }

    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    if (!name.endsWith(".pdf") && type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let extracted = "";
    try {
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      extracted = (typeof text === "string" ? text : text.join("\n")).trim();
    } catch (parseErr) {
      console.error("unpdf extract error:", parseErr);
      const detail =
        parseErr instanceof Error ? parseErr.message : "Could not read PDF";
      return NextResponse.json(
        {
          error: `Could not read this PDF (${detail}). Try a text-based PDF that is not password-protected or image-only.`,
        },
        { status: 400 },
      );
    }

    if (!extracted || extracted.replace(/\s+/g, "").length < 20) {
      return NextResponse.json(
        {
          error:
            "This PDF has no extractable text. Use a text-based PDF (not a scanned image-only document).",
        },
        { status: 400 },
      );
    }

    let questions;
    let warnings: string[] = [];
    try {
      const result = await parseMcqFromText(extracted);
      questions = result.questions;
      warnings = result.warnings;
    } catch (aiErr) {
      console.error("parseMcqFromText error:", aiErr);
      const detail =
        aiErr instanceof Error ? aiErr.message : "AI conversion failed";
      return NextResponse.json(
        {
          error: `Text was extracted, but AI could not convert it to MCQs: ${detail}`,
        },
        { status: 502 },
      );
    }

    if (!questions?.length) {
      return NextResponse.json(
        {
          error:
            "No multiple-choice questions were found. Check numbering (1. / Q1), options (A–D), and that answers are indicated.",
          warnings,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      questions,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error: unknown) {
    console.error("parse-mcq-pdf error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF MCQ import failed: ${message}` },
      { status: 500 },
    );
  }
}
