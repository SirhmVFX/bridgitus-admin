import type { Question } from "@/lib/firestore";

/**
 * Deterministic MCQ extractor for well-structured worksheet text.
 * Used as fallback when AI conversion fails or returns nothing.
 */
export function parseMcqLocally(pdfText: string): {
  questions: Question[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const text = pdfText.replace(/\r\n/g, "\n");

  // Split on numbered question starts: "1." "1)" "Q1" "Question 1"
  const parts = text.split(/(?=(?:^|\n)\s*(?:Q(?:uestion)?\s*)?\d{1,3}[\).\]]\s+)/i);
  const questions: Question[] = [];

  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk || chunk.length < 10) continue;

    const stemMatch = chunk.match(
      /^(?:Q(?:uestion)?\s*)?(\d{1,3})[\).\]]\s*([\s\S]+?)(?=\n\s*[A-Da-d][\).\]]\s)/i,
    );
    if (!stemMatch) continue;

    const qNum = stemMatch[1];
    let stem = stemMatch[2].replace(/\s+/g, " ").trim();
    if (!stem || stem.length < 3) continue;

    const optionMatches = [
      ...chunk.matchAll(/(?:^|\n)\s*([A-Da-d])[\).\]]\s*([^\n]+)/g),
    ];
    if (optionMatches.length < 2) continue;

    const options = optionMatches.slice(0, 4).map((m) => m[2].replace(/\s+/g, " ").trim());
    while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);

    // Answer markers
    let correctAnswer = "";
    const answerLine = chunk.match(
      /(?:answer|correct|ans)\s*[:\-–]?\s*([A-Da-d])\b/i,
    );
    if (answerLine) {
      const idx = "ABCD".indexOf(answerLine[1].toUpperCase());
      if (idx >= 0) correctAnswer = options[idx];
    }
    // Asterisk next to option
    if (!correctAnswer) {
      for (let i = 0; i < optionMatches.length && i < 4; i++) {
        if (/\*/.test(optionMatches[i][0]) || /\*/.test(optionMatches[i][2])) {
          correctAnswer = options[i];
          break;
        }
      }
    }
    if (!correctAnswer) {
      correctAnswer = options[0];
      warnings.push(`Question ${qNum}: no clear answer marker — defaulted to option A.`);
    }

    questions.push({
      id: `q${qNum}`,
      type: "multiple_choice",
      text: stem,
      options: options.slice(0, 4),
      correctAnswer,
      points: 1,
    });

    if (questions.length >= 50) break;
  }

  if (questions.length === 0) {
    warnings.push(
      "Local parser found no MCQs. Ensure questions are numbered and options are labeled A–D.",
    );
  }

  return { questions, warnings };
}
