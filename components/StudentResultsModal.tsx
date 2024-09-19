"use client";

/**
 * Shared per-question quiz-results modal.
 * Used in:
 *  - app/admin/analytics/assignment/[id]/page.tsx
 *  - app/admin/assignments/page.tsx  (submissions modal)
 *  - app/admin/students/[id]/page.tsx (assignments tab)
 */

import { MdClose, MdCheckCircle, MdCancel } from "react-icons/md";
import type { Assignment, AssignmentSubmission, Student, Question } from "@/lib/firestore";

function isAnswerCorrect(q: Question, given: string): boolean {
  const g = (given ?? "").trim().toLowerCase();
  const c = (q.correctAnswer ?? "").trim().toLowerCase();
  if (!g) return false;
  if (q.type === "short_answer") return g.includes(c);
  return g === c;
}

export default function StudentResultsModal({
  studentName,
  submission,
  assignment,
  onClose,
}: {
  studentName: string;
  submission: AssignmentSubmission;
  assignment: Assignment;
  onClose: () => void;
}) {
  const questions = assignment.questions ?? [];
  const answers = submission.answers ?? {};

  const results = questions.map((q) => {
    const given = answers[q.id] ?? "";
    return { q, given, correct: isAnswerCorrect(q, given) };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {studentName} — Results
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{assignment.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Score summary */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-black text-emerald-600">{correctCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-red-500">{totalCount - correctCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Incorrect</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-[#00369b]">{pct}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Score</p>
          </div>
        </div>

        {/* Question list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No quiz questions found for this assignment.
            </p>
          ) : (
            results.map((r, idx) => (
              <div
                key={r.q.id}
                className={`border rounded-xl p-4 ${
                  r.correct
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-red-200 bg-red-50/40"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {r.correct ? (
                    <MdCheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <MdCancel size={18} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Q{idx + 1} · {r.q.points} pt{r.q.points !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm font-medium text-gray-800 leading-snug">
                      {r.q.text}
                    </p>

                    {/* Multiple choice */}
                    {r.q.type === "multiple_choice" && r.q.options && (
                      <div className="mt-2 space-y-1">
                        {r.q.options.map((opt, oi) => {
                          const isChosen = opt.trim().toLowerCase() === r.given.trim().toLowerCase();
                          const isCorrect = opt.trim().toLowerCase() === r.q.correctAnswer.trim().toLowerCase();
                          return (
                            <div
                              key={oi}
                              className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                                isCorrect
                                  ? "bg-emerald-100 text-emerald-800 font-semibold"
                                  : isChosen && !isCorrect
                                  ? "bg-red-100 text-red-700 font-semibold"
                                  : "text-gray-600"
                              }`}
                            >
                              {isCorrect && <MdCheckCircle size={12} className="text-emerald-600 shrink-0" />}
                              {isChosen && !isCorrect && <MdCancel size={12} className="text-red-500 shrink-0" />}
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True/false + short answer */}
                    {r.q.type !== "multiple_choice" && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">
                          <span className={r.correct ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                            Student answered:
                          </span>{" "}
                          {r.given || "(blank)"}
                        </p>
                        {!r.correct && (
                          <p className="text-xs text-gray-500">
                            <span className="text-emerald-700 font-semibold">Correct answer:</span>{" "}
                            {r.q.correctAnswer}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    {r.q.explanation && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 mt-2">
                        <span className="font-semibold">Explanation:</span> {r.q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
