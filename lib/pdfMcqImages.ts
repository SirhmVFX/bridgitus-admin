import sharp from "sharp";
import { extractImages, extractText, getDocumentProxy } from "unpdf";
import { uploadBase64ToCloudinary } from "@/lib/cloudinary";
import type { Question } from "@/lib/firestore";

type PdfDoc = Awaited<ReturnType<typeof getDocumentProxy>>;

export type ExtractedPdfImage = {
  page: number;
  width: number;
  height: number;
  pngBase64: string;
  area: number;
};

const MIN_SIDE = 64;
const MIN_AREA = 8_000;
const MAX_IMAGES = 40;

/** Convert unpdf raw pixel buffers into PNG base64 strings (filtered). */
export async function extractPdfDiagrams(
  pdf: PdfDoc,
): Promise<{ images: ExtractedPdfImage[]; warnings: string[] }> {
  const warnings: string[] = [];
  const images: ExtractedPdfImage[] = [];
  const totalPages = pdf.numPages ?? 0;

  for (let page = 1; page <= totalPages; page++) {
    let pageImages: Awaited<ReturnType<typeof extractImages>> = [];
    try {
      pageImages = await extractImages(pdf, page);
    } catch (err) {
      console.error(`extractImages page ${page}:`, err);
      warnings.push(`Could not read embedded images on page ${page}.`);
      continue;
    }

    for (const img of pageImages) {
      if (!img?.data || !img.width || !img.height) continue;
      if (img.width < MIN_SIDE || img.height < MIN_SIDE) continue;
      const area = img.width * img.height;
      if (area < MIN_AREA) continue;

      try {
        const png = await sharp(Buffer.from(img.data), {
          raw: {
            width: img.width,
            height: img.height,
            channels: img.channels,
          },
        })
          .png()
          .toBuffer();

        images.push({
          page,
          width: img.width,
          height: img.height,
          pngBase64: png.toString("base64"),
          area,
        });
      } catch (convErr) {
        console.error("PNG convert error:", convErr);
      }

      if (images.length >= MAX_IMAGES) {
        warnings.push(`Stopped after extracting ${MAX_IMAGES} diagrams from the PDF.`);
        return { images, warnings };
      }
    }
  }

  // Prefer larger diagrams first (graphs over icons that slipped through)
  images.sort((a, b) => b.area - a.area || a.page - b.page);
  return { images, warnings };
}

/** Map question numbers to pages using per-page text. */
export async function mapQuestionsToPages(
  pdf: PdfDoc,
  questions: Question[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text ?? "")];

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i] ?? "";
    const pageNum = i + 1;
    const nums = [
      ...pageText.matchAll(/(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d{1,3})[\).\]]/gi),
    ].map((m) => m[1]);

    for (const num of nums) {
      const q = questions.find((item) => {
        const m = /^q(\d+)$/i.exec(item.id);
        return m?.[1] === num || item.id === `q${num}`;
      });
      if (q && !map.has(q.id)) map.set(q.id, pageNum);
    }
  }

  // Fallback: sequential fill for questions still unmapped
  let cursor = 1;
  for (const q of questions) {
    if (map.has(q.id)) {
      cursor = map.get(q.id)!;
      continue;
    }
    map.set(q.id, Math.min(cursor, pages.length || 1));
  }

  return map;
}

/**
 * Upload extracted PDF diagrams and attach imageUrl to questions.
 * One image per question max; prefers diagrams from the same page as the question.
 */
export async function attachPdfImagesToQuestions(
  pdf: PdfDoc,
  questions: Question[],
): Promise<{ questions: Question[]; warnings: string[]; attached: number }> {
  const warnings: string[] = [];
  if (!questions.length) {
    return { questions, warnings, attached: 0 };
  }

  let images: ExtractedPdfImage[] = [];
  try {
    const extracted = await extractPdfDiagrams(pdf);
    images = extracted.images;
    warnings.push(...extracted.warnings);
  } catch (err) {
    console.error("extractPdfDiagrams error:", err);
    warnings.push(
      "Could not extract diagrams from this PDF. Questions were imported without images.",
    );
    return { questions, warnings, attached: 0 };
  }

  if (!images.length) {
    warnings.push(
      "No usable embedded diagrams/graphs found in the PDF (vector drawings may not extract).",
    );
    return { questions, warnings, attached: 0 };
  }

  const pageMap = await mapQuestionsToPages(pdf, questions);
  const usedImageIndexes = new Set<number>();
  const next: Question[] = [];
  let attached = 0;

  async function uploadImage(img: ExtractedPdfImage): Promise<string | null> {
    try {
      return await uploadBase64ToCloudinary(
        img.pngBase64,
        "image/png",
        "bridgitus/question-images",
      );
    } catch (err) {
      console.error("Cloudinary upload for PDF image failed:", err);
      return null;
    }
  }

  for (const q of questions) {
    if (q.imageUrl) {
      next.push(q);
      continue;
    }

    const page = pageMap.get(q.id) ?? 1;
    let pickIdx = images.findIndex(
      (img, i) => !usedImageIndexes.has(i) && img.page === page,
    );
    if (pickIdx < 0) {
      pickIdx = images.findIndex((_, i) => !usedImageIndexes.has(i));
    }
    if (pickIdx < 0) {
      next.push(q);
      continue;
    }

    usedImageIndexes.add(pickIdx);
    const url = await uploadImage(images[pickIdx]);
    if (url) {
      attached++;
      next.push({ ...q, imageUrl: url });
    } else {
      next.push(q);
      warnings.push(`Failed to upload diagram for ${q.id}.`);
    }
  }

  const leftover = images.length - usedImageIndexes.size;
  if (attached > 0) {
    warnings.push(
      `Attached ${attached} diagram(s)/graph(s) from the PDF to question(s).`,
    );
  }
  if (leftover > 0) {
    warnings.push(
      `${leftover} extra embedded image(s) were not assigned (one diagram per question).`,
    );
  }

  return { questions: next, warnings, attached };
}
