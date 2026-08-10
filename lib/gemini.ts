import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIQuestion } from "./firestore";

const geminiModel = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const geminiApiVersion = process.env.GEMINI_API_VERSION ?? "v1";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

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
- DIAGRAMS: When a question naturally needs a visual (number line, coordinate grid, geometric figure, graph, circuit diagram, bar chart), include a clear text description in square brackets immediately after the question. Describe shapes with exact measurements and orientation. Format:
  [DIAGRAM: A coordinate grid with x-axis from −5 to 5 and y-axis from −5 to 5. A straight line passes through points (−2, 1) and (2, 3).]
  [DIAGRAM: A rectangle ABCD with AB = 8 cm and BC = 5 cm. M is the midpoint of AB.]
  [DIAGRAM: A number line from 0 to 10 with an arrow pointing to the position 3.5.]
  [DIAGRAM: A pie chart divided into 4 sectors: Red 40%, Blue 25%, Green 20%, Yellow 15%.]
  [DIAGRAM: A circle with radius 6 cm and a shaded sector of 90° between the positive x-axis and a line through the center.]
  [DIAGRAM: A triangle with vertices at (0,0), (4,0), and (4,3) shown on a coordinate grid.]
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
    "workedSolution": "1. First step with symbols.\\n2. Second step.\\n3. Final answer."
  }
]

STRICT RULES:
- multiple_choice: exactly 4 options starting "A) ", "B) ", "C) ", "D) ". correctAnswer must exactly match one option string.
- true_false: options must be ["True", "False"]. correctAnswer must be "True" or "False".
- short_answer: omit options entirely. correctAnswer is the key term or value expected.
- extended_response: omit options entirely. correctAnswer is a model answer outline.
- All ${count} questions must test DIFFERENT aspects of the topic — no repetition.
- Question ids must run from "q${startId}" to "q${endId}" sequentially.
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
        });
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

  return questions.map((q, i) => ({
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
  }));
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
