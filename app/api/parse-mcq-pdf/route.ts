import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
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
        { error: "Missing PDF file. Upload a file under the field name \"file\"." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "PDF exceeds the 20MB size limit." },
        { status: 400 }
      );
    }

    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    if (!name.endsWith(".pdf") && type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    let extracted = "";
    try {
      const result = await parser.getText();
      extracted = (result.text || "").trim();
    } finally {
      await parser.destroy().catch(() => {});
    }

    if (!extracted || extracted.replace(/\s+/g, "").length < 20) {
      return NextResponse.json(
        {
          error:
            "This PDF has no extractable text. Use a text-based PDF (not a scanned image-only document).",
        },
        { status: 400 }
      );
    }

    const { questions, warnings } = await parseMcqFromText(extracted);

    return NextResponse.json({
      questions,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error: unknown) {
    console.error("parse-mcq-pdf error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF MCQ import failed: ${message}` },
      { status: 500 }
    );
  }
}
