import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIQuestion } from "./firestore";

const geminiModel = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const geminiApiVersion = process.env.GEMINI_API_VERSION ?? "v1";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/** Temporary meta used during generation before diagrams are attached. */
type QuestionWithDiagramMeta = AIQuestion & {
  needsDiagram?: boolean;
  diagramPrompt?: string;
};

function sanitizeJson(raw: string): string {
  const match = raw.match(/\[[\s\S]*\]/);
  const text = match ? match[0] : raw;
  return text.replace(/\\([^"\\/bfnrtu])/g, (_, char) => char);
}

export interface GenerateQuestionsParams {
  curriculum: string;
  subject: string;
  year: string;
  topic: string;
  subtopic?: string;
  count: number;
  difficulty: string;
  format: string;
  context: string;
  prompt?: string;
}

// Build the prompt — structured so Gemini returns clean JSON
function buildPrompt(p: GenerateQuestionsParams, count: number, idOffset = 0): string {
  const formatNote =
    p.format === "Multiple Choice" ? "All questions must be multiple_choice with exactly 4 options." :
      p.format === "Short Answer" ? "All questions must be short_answer." :
        p.format === "True/False" ? "All questions must be true_false." :
          p.format === "Extended Response" ? "All questions must be extended_response (no options needed)." :
            "Mix question types: use a variety of multiple_choice, true_false, and short_answer.";

  const diffNote =
    p.difficulty === "Support" ? "Use simple language, single-step problems, foundational concepts. Suitable for students who need extra scaffolding." :
      p.difficulty === "Extension" ? "Use complex multi-step problems, higher-order thinking, application to novel situations." :
        "Use grade-appropriate standard difficulty — the typical expected level for this year group.";

  const ctxNote =
    p.context === "Real-life" ? "Frame all questions in real-world, relatable scenarios." :
      p.context === "Exam-style" ? "Use formal exam-style wording and presentation." :
        p.context === "Problem-solving" ? "Focus on problem-solving and mathematical reasoning." :
          p.context === "Worded problems" ? "All questions should be worded problems requiring interpretation." :
            "Use abstract, concept-focused questions.";

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
${p.prompt ? `
CUSTOM PROMPT: ${p.prompt}
` : ""}
MATHEMATICS, SCIENCE & GEOMETRY NOTATION RULES — ALWAYS apply for relevant subjects:
- Use Unicode symbols directly: × ÷ ± √ π ∞ ≤ ≥ ≠ ∈ ∑ ∫ ⁰ ¹ ² ³ ⁴ ⁵ ½ ¼ ¾ ° → ∠ ∥ ⊥ △ ▲ ◯
- Write exponents: x² or x^2 (never x**2). Compound exponents: (x+1)^2
- Write fractions: ¾, 2/3, or (3x+1)/(x−2). Never ambiguous slashes.
- Square roots: √16, √(3x+1). Cube root: ∛8. Use brackets for compound radicands.
- Equations: use proper minus sign − (not hyphen -). Example: 3x² − 7x + 2 = 0
- Geometry shapes: always describe with full measurements. Example: "a right-angled triangle with legs 3 cm and 4 cm and hypotenuse 5 cm"
- DIAGRAMS: When a question naturally needs a visual (number line, coordinate grid, geometric figure, graph, circuit diagram, bar chart, shapes, maps), set needsDiagram to true and provide diagramPrompt. Also include a short [DIAGRAM: ...] note in the question text. Only set needsDiagram true when a diagram genuinely helps — not for every question.
  Examples of diagramPrompt:
  "Clean educational diagram: a coordinate plane with axes from -5 to 5, line through (-2,1) and (2,3), labelled axes, white background, black lines, suitable for a Year 8 maths worksheet"
  "Clean educational diagram: rectangle ABCD, AB=8cm BC=5cm, midpoint M on AB labelled, white background, black outlines"
- DATA TABLES: Use pipe notation:
  | x | 1 | 2 | 3 | 4 |
  | y | 3 | 7 | 11 | 15 |
- SHAPES in options: describe shapes textually: "an equilateral triangle", "a circle with radius 6 cm", "a parallelogram with base 10 cm and height 4 cm"

WORKED SOLUTIONS must:
- Show every step numbered (1. 2. 3. …)
- Use all proper math symbols and notation
- Explain the reasoning at each step, not just the calculation
- For geometry: state theorems/rules used (e.g., "By Pythagoras' theorem: a² + b² = c²")

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation, no code fences, no text before or after the array.
Every element must have ALL these exact fields:

[
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

STRICT RULES:
- multiple_choice: exactly 4 options starting "A) ", "B) ", "C) ", "D) ". correctAnswer must exactly match one option string.
- true_false: options must be ["True", "False"]. correctAnswer must be "True" or "False".
- short_answer: omit options entirely. correctAnswer is the key term or value expected.
- extended_response: omit options entirely. correctAnswer is a model answer outline.
- All ${count} questions must test DIFFERENT aspects of the topic — no repetition.
- Question ids must run from "q${startId}" to "q${endId}" sequentially.
- needsDiagram: true only when a diagram/image materially helps understanding (geometry, graphs, charts, shapes, number lines). Otherwise false and diagramPrompt "".
- Do NOT wrap in markdown code fences. Start the response with [ and end with ].

Return the JSON array now:`;
}

export async function generateQuestions(params: GenerateQuestionsParams): Promise<AIQuestion[]> {
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 32768,
    },
  }, {
    apiVersion: geminiApiVersion,
  });

  // For large sets, batch into chunks of 15 to avoid token truncation
  const BATCH_SIZE = 15;
  if (params.count > BATCH_SIZE) {
    const allQuestions: AIQuestion[] = [];
    let remaining = params.count;
    let batchNum = 0;

    while (remaining > 0) {
      const batchCount = Math.min(BATCH_SIZE, remaining);
      const idOffset = batchNum * BATCH_SIZE;
      const prompt = buildPrompt({ ...params, count: batchCount }, batchCount, idOffset);

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let batch: AIQuestion[];
      try {
        batch = JSON.parse(sanitizeJson(text));
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error(`Batch ${batchNum + 1} did not return valid JSON. Please try again.`);
        batch = JSON.parse(sanitizeJson(match[0]));
      }

      if (!Array.isArray(batch)) throw new Error("Expected an array of questions.");

      // Normalise and push
      batch.forEach((q, i) => {
        const raw = q as QuestionWithDiagramMeta;
        allQuestions.push({
          id: q.id ?? `q${idOffset + i + 1}`,
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
        } as AIQuestion);
      });

      remaining -= batchCount;
      batchNum++;
    }

    return allQuestions;
  }

  // Single batch
  const prompt = buildPrompt(params, params.count, 0);
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let questions: AIQuestion[];
  try {
    questions = JSON.parse(sanitizeJson(text));
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Gemini did not return valid JSON. Please try again.");
    questions = JSON.parse(sanitizeJson(match[0]));
  }

  if (!Array.isArray(questions)) throw new Error("Expected an array of questions.");

  return questions.map((q, i) => {
    const raw = q as QuestionWithDiagramMeta;
    return {
      id: q.id ?? `q${i + 1}`,
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
  });
}

// ── Student performance analysis ───────────────────────────────────────────

export interface StudentAnalysisPayload {
  studentName: string;
  grade: string;
  totals: {
    questionsAnswered: number;
    correct: number;
    timeSpentMinutes: number;
  };
  topicStats: Array<{
    subject: string;
    topic: string;
    accuracy: number;      // 0–100
    questionsAnswered: number;
  }>;
  recentQuestions: Array<{
    subject: string;
    topic: string;
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    correct: boolean;
  }>;
}

export interface StudentSubjectAnalysis {
  subject: string;
  strengths: string[];
  weakAreas: string[];
  support: string[];       // what is required to support the student
}

export interface StudentQuestionInsight {
  question: string;
  issue: string;           // what the answer reveals about the misunderstanding
  recommendation: string;  // how to address it
}

export interface StudentAnalysis {
  overview: string;
  subjects: StudentSubjectAnalysis[];
  questionInsights: StudentQuestionInsight[];
  priorityActions: string[];
}

export async function analyzeStudentPerformance(payload: StudentAnalysisPayload): Promise<StudentAnalysis> {
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 8192 },
  }, {
    apiVersion: geminiApiVersion,
  });

  const prompt = `You are an expert educational data analyst and tutor. Analyse this student's learning data and identify where they are lacking, where they need help, and what is required to support them — per subject and per answered question.

STUDENT: ${payload.studentName} (Grade ${payload.grade})
TOTALS: ${payload.totals.questionsAnswered} questions answered, ${payload.totals.correct} correct, ${payload.totals.timeSpentMinutes} minutes of learning time tracked.

TOPIC PERFORMANCE (subject | topic | accuracy % | questions answered):
${payload.topicStats.map(t => `- ${t.subject} | ${t.topic} | ${t.accuracy}% | ${t.questionsAnswered}`).join("\n") || "- No topic data yet"}

RECENT ANSWERED QUESTIONS (most recent first):
${payload.recentQuestions.map((q, i) =>
    `${i + 1}. [${q.subject} · ${q.topic}] ${q.correct ? "CORRECT" : "INCORRECT"}
   Q: ${q.question}
   Student answered: ${q.studentAnswer || "(no answer)"}
   Correct answer: ${q.correctAnswer}`).join("\n") || "No answered questions yet"}

Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "overview": "2-3 sentence plain-English summary of the student's overall performance and engagement.",
  "subjects": [
    {
      "subject": "Mathematics",
      "strengths": ["specific strength 1", "..."],
      "weakAreas": ["specific area the student is lacking, with topic names", "..."],
      "support": ["concrete action required to support them (e.g. scaffolded fraction worksheets, revisit place value)", "..."]
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
- Be specific and practical — name topics and suggest concrete resources or strategies.

Return the JSON object now:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: StudentAnalysis;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini did not return valid JSON. Please try again.");
    parsed = JSON.parse(match[0]);
  }

  return {
    overview: parsed.overview ?? "",
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
    questionInsights: Array.isArray(parsed.questionInsights) ? parsed.questionInsights : [],
    priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [],
  };
}

export interface CreateSimilarParams {
  question: AIQuestion;
  count?: number;
}

export async function createSimilarQuestions(params: CreateSimilarParams): Promise<AIQuestion[]> {
  const { question, count = 3 } = params;
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: { temperature: 0.8, topP: 0.9, maxOutputTokens: 8192 },
  }, {
    apiVersion: geminiApiVersion,
  });

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

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
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

Return the JSON array now:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  let questions: AIQuestion[];
  try {
    questions = JSON.parse(sanitizeJson(text));
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Gemini did not return valid JSON.");
    questions = JSON.parse(sanitizeJson(match[0]));
  }

  return questions.map((q, i) => ({
    id: q.id ?? `s${i + 1}`,
    type: q.type ?? question.type,
    text: q.text ?? "",
    options: q.options,
    correctAnswer: q.correctAnswer ?? "",
    points: q.points ?? question.points ?? 1,
    explanation: q.explanation ?? "",
    workedSolution: q.workedSolution ?? "",
    topic: q.topic ?? question.topic,
    subtopic: q.subtopic ?? question.subtopic,
    difficulty: q.difficulty ?? question.difficulty,
  }));
}

// ── Diagram / image generation (Gemini image models) ───────────────────────
// Uses Nano Banana / Gemini Flash Image models. Override with GEMINI_IMAGE_MODEL.
// Recommended: gemini-2.5-flash-image (or gemini-2.0-flash-preview-image-generation)

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

/** Generate one educational diagram via Gemini image model and upload to Cloudinary. */
export async function generateQuestionDiagram(
  question: AIQuestion,
  options?: { force?: boolean }
): Promise<string | null> {
  let promptText = extractDiagramPrompt(question as QuestionWithDiagramMeta);
  if (!promptText && options?.force) {
    promptText = `Educational worksheet diagram or graph that helps a student understand this question: ${question.text}`;
  }
  if (!promptText) return null;

  const imageModel =
    process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const imageApiVersion = process.env.GEMINI_IMAGE_API_VERSION ?? "v1beta";

  const model = genAI.getGenerativeModel(
    {
      model: imageModel,
      // responseModalities is supported by Gemini image models
      generationConfig: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...( { responseModalities: ["TEXT", "IMAGE"] } as any ),
      },
    },
    { apiVersion: imageApiVersion }
  );

  const fullPrompt = `Create a clear, simple educational diagram for a school worksheet.
Style: clean black lines on white background, labelled where helpful, no photorealism, no watermarks, no decorative clutter.
Diagram content: ${promptText}`;

  const result = await model.generateContent(fullPrompt);
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inline = (part as any).inlineData as
      | { data?: string; mimeType?: string }
      | undefined;
    if (inline?.data) {
      const { uploadBase64ToCloudinary } = await import("./cloudinary");
      return uploadBase64ToCloudinary(
        inline.data,
        inline.mimeType || "image/png",
        "bridgitus/question-images"
      );
    }
  }

  return null;
}

/**
 * For questions that need diagrams, generate images and attach imageUrl.
 * Skips questions that already have an image. Failures are non-fatal per question.
 */
export async function attachDiagramsToQuestions(
  questions: AIQuestion[]
): Promise<{ questions: AIQuestion[]; generated: number; failed: number }> {
  let generated = 0;
  let failed = 0;
  const out: AIQuestion[] = [];

  for (const q of questions) {
    const prompt = extractDiagramPrompt(q as QuestionWithDiagramMeta);
    if (!prompt || q.imageUrl) {
      // Drop ephemeral meta fields if present
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
      console.error(`Diagram generation failed for ${q.id}:`, err);
      failed++;
      const { needsDiagram: _n, diagramPrompt: _d, ...rest } = q as QuestionWithDiagramMeta;
      out.push(rest);
    }
  }

  return { questions: out, generated, failed };
}
