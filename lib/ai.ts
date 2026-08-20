/**
 * AI provider router — OpenAI first (when OPENAI_API_KEY is set), else Gemini.
 */
import type { AIQuestion } from "./firestore";
import * as gemini from "./gemini";
import * as openai from "./openai";

export type {
  GenerateQuestionsParams,
  CreateSimilarParams,
  StudentAnalysisPayload,
  StudentAnalysis,
} from "./gemini";

export function getAiProvider(): "openai" | "gemini" {
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "gemini";
}

export function isAiConfigured(): boolean {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(
    openaiKey ||
      (geminiKey && geminiKey !== "your_gemini_api_key_here")
  );
}

export function aiConfigError(): string {
  return "No AI key configured. Add OPENAI_API_KEY (preferred) or GEMINI_API_KEY to .env.local. Get an OpenAI key at https://platform.openai.com/api-keys";
}

export async function generateQuestions(
  params: gemini.GenerateQuestionsParams
): Promise<AIQuestion[]> {
  if (getAiProvider() === "openai") return openai.generateQuestions(params);
  return gemini.generateQuestions(params);
}

export async function createSimilarQuestions(
  params: gemini.CreateSimilarParams
): Promise<AIQuestion[]> {
  if (getAiProvider() === "openai") return openai.createSimilarQuestions(params);
  return gemini.createSimilarQuestions(params);
}

export async function analyzeStudentPerformance(
  payload: gemini.StudentAnalysisPayload
): Promise<gemini.StudentAnalysis> {
  if (getAiProvider() === "openai") return openai.analyzeStudentPerformance(payload);
  return gemini.analyzeStudentPerformance(payload);
}

export async function attachDiagramsToQuestions(
  questions: AIQuestion[]
): Promise<{ questions: AIQuestion[]; generated: number; failed: number }> {
  if (getAiProvider() === "openai") return openai.attachDiagramsToQuestions(questions);
  return gemini.attachDiagramsToQuestions(questions);
}

/** Generate a diagram for one question (admin clicks per question). */
export async function generateQuestionDiagram(
  question: AIQuestion,
  options?: { force?: boolean }
): Promise<string | null> {
  if (getAiProvider() === "openai") {
    return openai.generateQuestionDiagram(question, options);
  }
  return gemini.generateQuestionDiagram(question, options);
}
