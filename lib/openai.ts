import OpenAI from "openai";
import type { AIQuestion } from "./firestore";
import type {
  CreateSimilarParams,
  GenerateQuestionsParams,
  StudentAnalysis,
  StudentAnalysisPayload,
} from "./gemini";

/** Temporary meta used during generation before diagrams are attached. */
type QuestionWithDiagramMeta = AIQuestion & {
  needsDiagram?: boolean;
  diagramPrompt?: string;
};

const openaiTextModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const openaiImageModel = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey: key });
}

function sanitizeJson(raw: string): string {
  const match = raw.match(/\[[\s\S]*\]/);
  const text = match ? match[0] : raw;
  return text.replace(/\\([^"\\/bfnrtu])/g, (_, char) => char);
}

function parseQuestionsArray(raw: string): AIQuestion[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(sanitizeJson(cleaned));
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    /* fall through */
  }

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("OpenAI did not return valid JSON. Please try again.");
  return JSON.parse(sanitizeJson(match[0]));
}

function normalizeQuestion(
  q: AIQuestion,
  i: number,
  params: { topic: string; subtopic?: string; difficulty: string },
  idPrefix = "q",
  idOffset = 0
): AIQuestion {
  const raw = q as QuestionWithDiagramMeta;
  return {
    id: q.id ?? `${idPrefix}${idOffset + i + 1}`,
    type: q.type ?? "multiple_choice",
    text: q.text ?? "",
    options: q.options,
    correctAnswer: q.correctAnswer ?? "",
    points: q.points ?? 1,
    explanation: q.explanation ?? "",
    workedSolution: q.workedSolution ?? "",
    topic: q.topic ?? params.topic,
    subtopic: q.subtopic ?? params.subtopic ?? params.topic,
    difficulty: q.difficulty ?? params.difficulty,
    ...(raw.needsDiagram ? { needsDiagram: true } : {}),
    ...(raw.diagramPrompt ? { diagramPrompt: raw.diagramPrompt } : {}),
  } as AIQuestion;
}

function buildPrompt(p: GenerateQuestionsParams, count: number, idOffset = 0): string {
  const formatNote =
    p.format === "Multiple Choice"
      ? "All questions must be multiple_choice with exactly 4 options."
      : p.format === "Short Answer"
        ? "All questions must be short_answer."
        : p.format === "True/False"
          ? "All questions must be true_false."
          : p.format === "Extended Response"
            ? "All questions must be extended_response (no options needed)."
            : "Mix question types: use a variety of multiple_choice, true_false, and short_answer.";

  const diffNote =
    p.difficulty === "Support"
      ? "Use simple language, single-step problems, foundational concepts. Suitable for students who need extra scaffolding."
      : p.difficulty === "Extension"
        ? "Use complex multi-step problems, higher-order thinking, application to novel situations."
        : "Use grade-appropriate standard difficulty — the typical expected level for this year group.";

  const ctxNote =
    p.context === "Real-life"
      ? "Frame all questions in real-world, relatable scenarios."
      : p.context === "Exam-style"
        ? "Use formal exam-style wording and presentation."
        : p.context === "Problem-solving"
          ? "Focus on problem-solving and mathematical reasoning."
          : p.context === "Worded problems"
            ? "All questions should be worded problems requiring interpretation."
            : "Use abstract, concept-focused questions.";

  const startId = idOffset + 1;
  const endId = idOffset + count;

  return `You are an expert ${p.subject} teacher creating a high-quality question set for students.

CURRICULUM: ${p.curriculum}
SUBJECT: ${p.subject}
YEAR LEVEL: ${p.year}
TOPIC: ${p.topic}${p.subtopic ? `\nSUBTOPIC: ${p.subtopic}` : ""}
DIFFICULTY: ${p.difficulty}
COUNT: exactly ${count} questions (ids q${startId} through q${endId})

QUESTION FORMAT RULE: ${formatNote}
DIFFICULTY RULE: ${diffNote}
CONTEXT RULE: ${ctxNote}
${p.prompt ? `\nCUSTOM PROMPT: ${p.prompt}\n` : ""}
MATHEMATICS, SCIENCE & GEOMETRY NOTATION RULES — ALWAYS apply for relevant subjects:
- Use Unicode symbols directly: × ÷ ± √ π ∞ ≤ ≥ ≠ ∈ ∑ ∫ ⁰ ¹ ² ³ ⁴ ⁵ ½ ¼ ¾ ° → ∠ ∥ ⊥ △ ▲ ◯
- Write exponents: x² or x^2 (never x**2). Compound exponents: (x+1)^2
- Write fractions: ¾, 2/3, or (3x+1)/(x−2). Never ambiguous slashes.
- Square roots: √16, √(3x+1). Cube root: ∛8. Use brackets for compound radicands.
- Equations: use proper minus sign − (not hyphen -). Example: 3x² − 7x + 2 = 0
- Geometry shapes: always describe with full measurements.
- DIAGRAMS: When a question naturally needs a visual (number line, coordinate grid, geometric figure, graph, circuit diagram, bar chart, shapes, maps), set needsDiagram to true and provide diagramPrompt. Also include a short [DIAGRAM: ...] note in the question text. Only set needsDiagram true when a diagram genuinely helps.
- DATA TABLES: Use pipe notation.
- SHAPES in options: describe shapes textually.

WORKED SOLUTIONS must:
- Show every step numbered (1. 2. 3. …)
- Use all proper math symbols and notation
- Explain the reasoning at each step

CRITICAL: Return ONLY a valid JSON object with shape {"questions":[...]} . No markdown.
Every element must have ALL these exact fields:

{
  "questions": [
    {
      "id": "q${startId}",
      "type": "multiple_choice",
      "text": "Question text with proper math notation and [DIAGRAM: ...] if needed",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correctAnswer": "A) option1",
      "points": 1,
      "topic": "${p.topic}",
      "subtopic": "${p.subtopic ?? p.topic}",
      "difficulty": "${p.difficulty}",
      "explanation": "Brief explanation of why this answer is correct (1-2 sentences).",
      "workedSolution": "1. First step with symbols.\\n2. Second step.\\n3. Final answer.",
      "needsDiagram": false,
      "diagramPrompt": ""
    }
  ]
}

STRICT RULES:
- multiple_choice: exactly 4 options starting "A) ", "B) ", "C) ", "D) ". correctAnswer must exactly match one option string.
- true_false: options must be ["True", "False"]. correctAnswer must be "True" or "False".
- short_answer / extended_response: omit options.
- All ${count} questions must test DIFFERENT aspects of the topic.
- Question ids must run from "q${startId}" to "q${endId}" sequentially.
- needsDiagram: true only when a diagram/image materially helps understanding.`;
}

async function chatJson(system: string, user: string, maxTokens = 16384): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: openaiTextModel,
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response.");
  return text;
}

export async function generateQuestions(params: GenerateQuestionsParams): Promise<AIQuestion[]> {
  const BATCH_SIZE = 15;
  const allQuestions: AIQuestion[] = [];
  let remaining = params.count;
  let batchNum = 0;

  while (remaining > 0) {
    const batchCount = Math.min(BATCH_SIZE, remaining);
    const idOffset = batchNum * BATCH_SIZE;
    const prompt = buildPrompt({ ...params, count: batchCount }, batchCount, idOffset);
    const text = await chatJson(
      "You generate educational quiz questions. Always respond with valid JSON only.",
      prompt
    );
    const batch = parseQuestionsArray(text);
    if (!Array.isArray(batch)) throw new Error("Expected an array of questions.");
    batch.forEach((q, i) => {
      allQuestions.push(normalizeQuestion(q, i, params, "q", idOffset));
    });
    remaining -= batchCount;
    batchNum++;
  }

  return allQuestions;
}

export async function analyzeStudentPerformance(
  payload: StudentAnalysisPayload
): Promise<StudentAnalysis> {
  const prompt = `You are an expert educational data analyst and tutor. Analyse this student's learning data and identify where they are lacking, where they need help, and what is required to support them — per subject and per answered question.

STUDENT: ${payload.studentName} (Grade ${payload.grade})
TOTALS: ${payload.totals.questionsAnswered} questions answered, ${payload.totals.correct} correct, ${payload.totals.timeSpentMinutes} minutes of learning time tracked.

TOPIC PERFORMANCE (subject | topic | accuracy % | questions answered):
${payload.topicStats.map((t) => `- ${t.subject} | ${t.topic} | ${t.accuracy}% | ${t.questionsAnswered}`).join("\n") || "- No topic data yet"}

RECENT ANSWERED QUESTIONS (most recent first):
${
  payload.recentQuestions
    .map(
      (q, i) =>
        `${i + 1}. [${q.subject} · ${q.topic}] ${q.correct ? "CORRECT" : "INCORRECT"}
   Q: ${q.question}
   Student answered: ${q.studentAnswer || "(no answer)"}
   Correct answer: ${q.correctAnswer}`
    )
    .join("\n") || "No answered questions yet"
}

Return ONLY a valid JSON object with this exact structure:
{
  "overview": "2-3 sentence plain-English summary of the student's overall performance and engagement.",
  "subjects": [
    {
      "subject": "Mathematics",
      "strengths": ["specific strength 1"],
      "weakAreas": ["specific area the student is lacking"],
      "support": ["concrete action required to support them"]
    }
  ],
  "questionInsights": [
    {
      "question": "short quote or paraphrase of an incorrectly answered question",
      "issue": "what the student's answer reveals about their misunderstanding",
      "recommendation": "how a tutor should address this"
    }
  ],
  "priorityActions": ["top 3-5 prioritised actions for tutors/parents"]
}

Rules:
- Base every claim on the data provided; do not invent results.
- Cover EVERY subject that appears in the data.
- questionInsights should cover the incorrect answers (up to 10, most important first).
- Be specific and practical.`;

  const text = await chatJson(
    "You are an educational analyst. Respond with valid JSON only.",
    prompt,
    8192
  );

  let parsed: StudentAnalysis;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI did not return valid JSON. Please try again.");
    parsed = JSON.parse(match[0]);
  }

  return {
    overview: parsed.overview ?? "",
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
    questionInsights: Array.isArray(parsed.questionInsights) ? parsed.questionInsights : [],
    priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [],
  };
}

export async function createSimilarQuestions(params: CreateSimilarParams): Promise<AIQuestion[]> {
  const { question, count = 3 } = params;
  const prompt = `You are an expert teacher. A student got the following question WRONG and needs practice on similar questions.

ORIGINAL QUESTION:
Type: ${question.type}
Topic: ${question.topic} — ${question.subtopic}
Difficulty: ${question.difficulty}
Question: ${question.text}
${question.options ? `Options: ${question.options.join(", ")}` : ""}
Correct Answer: ${question.correctAnswer}

Generate EXACTLY ${count} NEW questions that are similar in style, topic, and difficulty.
They must test the same concept but use different numbers, scenarios, or contexts.

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "id": "s1",
      "type": "${question.type}",
      "text": "Question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A) ...",
      "points": ${question.points ?? 1},
      "topic": "${question.topic}",
      "subtopic": "${question.subtopic ?? question.topic}",
      "difficulty": "${question.difficulty}",
      "explanation": "Brief explanation.",
      "workedSolution": "Step-by-step solution."
    }
  ]
}`;

  const text = await chatJson(
    "You generate practice questions. Respond with valid JSON only.",
    prompt,
    8192
  );
  const questions = parseQuestionsArray(text);
  return questions.map((q, i) =>
    normalizeQuestion(
      q,
      i,
      {
        topic: question.topic ?? "General",
        subtopic: question.subtopic,
        difficulty: question.difficulty ?? "Core",
      },
      "s",
      0
    )
  );
}

const DIAGRAM_TAG = /\[DIAGRAM:\s*([^\]]+)\]/i;

function extractDiagramPrompt(q: QuestionWithDiagramMeta): string | null {
  if (q.imageUrl) return null;
  if (q.diagramPrompt && q.diagramPrompt.trim()) return q.diagramPrompt.trim();
  const m = q.text?.match(DIAGRAM_TAG);
  if (m?.[1]) return m[1].trim();
  if (q.needsDiagram) {
    return `Educational worksheet diagram that helps a student understand this question: ${q.text}`;
  }
  return null;
}

/** Generate one educational diagram via OpenAI Images and upload to Cloudinary. */
export async function generateQuestionDiagram(
  question: AIQuestion,
  options?: { force?: boolean }
): Promise<string | null> {
  let promptText = extractDiagramPrompt(question as QuestionWithDiagramMeta);
  if (!promptText && options?.force) {
    promptText = `Educational worksheet diagram or graph that helps a student understand this question: ${question.text}`;
  }
  if (!promptText) return null;

  const client = getClient();
  const fullPrompt = `Create a clear, simple educational diagram for a school worksheet.
Style: clean black lines on white background, labelled where helpful, no photorealism, no watermarks, no decorative clutter, no people faces.
Diagram content: ${promptText}`;

  const result = await client.images.generate({
    model: openaiImageModel,
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    // dall-e-3 / gpt-image-* support b64 when available
    response_format: "b64_json",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    // Some accounts return URL only
    const url = result.data?.[0]?.url;
    if (url) {
      const imgRes = await fetch(url);
      if (!imgRes.ok) return null;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const { uploadBase64ToCloudinary } = await import("./cloudinary");
      return uploadBase64ToCloudinary(buf.toString("base64"), "image/png", "bridgitus/question-images");
    }
    return null;
  }

  const { uploadBase64ToCloudinary } = await import("./cloudinary");
  return uploadBase64ToCloudinary(b64, "image/png", "bridgitus/question-images");
}

export async function attachDiagramsToQuestions(
  questions: AIQuestion[]
): Promise<{ questions: AIQuestion[]; generated: number; failed: number }> {
  let generated = 0;
  let failed = 0;
  const out: AIQuestion[] = [];

  for (const q of questions) {
    const prompt = extractDiagramPrompt(q as QuestionWithDiagramMeta);
    if (!prompt || q.imageUrl) {
      const { needsDiagram: _n, diagramPrompt: _d, ...rest } = q as QuestionWithDiagramMeta;
      out.push(rest);
      continue;
    }
    try {
      const imageUrl = await generateQuestionDiagram(q);
      const { needsDiagram: _n, diagramPrompt: _d, ...rest } = q as QuestionWithDiagramMeta;
      if (imageUrl) {
        generated++;
        out.push({ ...rest, imageUrl });
      } else {
        failed++;
        out.push(rest);
      }
    } catch (err) {
      console.error(`OpenAI diagram generation failed for ${q.id}:`, err);
      failed++;
      const { needsDiagram: _n, diagramPrompt: _d, ...rest } = q as QuestionWithDiagramMeta;
      out.push(rest);
    }
  }

  return { questions: out, generated, failed };
}
