"use client";

/**
 * Generic per-question results modal — works for:
 *  assignments, portal tests, NAPLAN, selective entry.
 *
 * Props accept plain data (no specific Firestore type required):
 *   questions  — any array with { id, text, type, correctAnswer, points,
 *                options?, imageUrl?, videoUrl?, explanation?, workedSolution? }
 *   answers    — Record<questionId, studentAnswerString>
 *   title      — paper / assignment / test title
 *   studentName
 *   score / totalPoints / percentage / passed (optional — auto-calculated when absent)
 */

import { MdClose, MdCheckCircle, MdCancel } from "react-icons/md";

export interface ResultQuestion {
  id: string;
  type: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  imageUrl?: string;
  videoUrl?: string;
  videoName?: string;
  explanation?: string;
  workedSolution?: string;
}

function isCorrect(q: ResultQuestion, given: string): boolean {
  const g = (given ?? "").trim().toLowerCase();
  const c = (q.correctAnswer ?? "").trim().toLowerCase();
  if (!g) return false;
  if (q.type === "short_answer" || q.type === "extended_response") return g.includes(c);
  return g === c;
}

export default function StudentResultsModal({
  studentName,
  title,
  questions,
  answers,
  score: scoreProp,
  totalPoints: totalProp,
  percentage: pctProp,
  passed: passedProp,
  passMark,
  onClose,
}: {
  studentName: string;
  title: string;
  questions: ResultQuestion[];
  answers: Record<string, string>;
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
  passMark?: number;
  onClose: () => void;
}) {
  const results = questions.map((q) => {
    const given = answers[q.id] ?? "";
    return { q, given, correct: isCorrect(q, given) };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;

  // Use stored values when available, fall back to re-calculation
  const displayPct =
    pctProp ??
    (totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0);
  const displayScore = scoreProp ?? correctCount;
  const displayTotal = totalProp ?? totalCount;
  const displayPassed = passedProp ?? (passMark != null ? displayPct >= passMark : null);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-snug">
              {studentName} — Results
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Score summary */}
        <div
          className={`grid gap-4 px-6 py-4 border-b border-gray-100 ${
            displayPassed !== null ? "grid-cols-4" : "grid-cols-3"
          } bg-gray-50`}
        >
          <div className="text-center">
            <p className="text-2xl font-black text-emerald-600">{correctCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-red-500">{totalCount - correctCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Incorrect</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-[#00369b]">
              {displayScore}/{displayTotal}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Score</p>
          </div>
          {displayPassed !== null && (
            <div className="text-center">
              <p
                className={`text-2xl font-black ${
                  displayPassed ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {displayPct}%
              </p>
              <p
                className={`text-xs font-semibold mt-0.5 ${
                  displayPassed ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {displayPassed ? "PASSED" : "FAILED"}
              </p>
            </div>
          )}
          {displayPassed === null && (
            <div className="text-center col-span-0 hidden" />
          )}
        </div>

        {/* Question list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No questions found for this submission.
            </p>
          ) : (
            results.map((r, idx) => (
              <div
                key={r.q.id}
                className={`border rounded-xl overflow-hidden ${
                  r.correct
                    ? "border-emerald-200"
                    : "border-red-200"
                }`}
              >
                {/* Question header row */}
                <div
                  className={`flex items-start gap-2.5 px-4 py-3 ${
                    r.correct ? "bg-emerald-50/60" : "bg-red-50/60"
                  }`}
                >
                  {r.correct ? (
                    <MdCheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <MdCancel size={18} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Q{idx + 1} · {r.q.points} pt{r.q.points !== 1 ? "s" : ""}
                    </p>
                    {/* Question text — support HTML (test questions use dangerouslySetInnerHTML-style rich text) */}
                    <p
                      className="text-sm font-medium text-gray-800 leading-snug"
                      dangerouslySetInnerHTML={{ __html: r.q.text }}
                    />
                  </div>
                </div>

                {/* Question body: image, answer breakdown, explanation */}
                <div className="px-4 py-3 bg-white space-y-2.5">
                  {/* Question image */}
                  {r.q.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.q.imageUrl}
                      alt={`Q${idx + 1} diagram`}
                      className="max-h-56 max-w-full border border-gray-200 rounded-lg object-contain"
                    />
                  )}

                  {/* Multiple choice — show all options colour-coded */}
                  {r.q.type === "multiple_choice" && r.q.options && (
                    <div className="space-y-1">
                      {r.q.options.map((opt, oi) => {
                        const isChosen =
                          opt.trim().toLowerCase() === r.given.trim().toLowerCase();
                        const isCorr =
                          opt.trim().toLowerCase() ===
                          r.q.correctAnswer.trim().toLowerCase();
                        return (
                          <div
                            key={oi}
                            className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                              isCorr
                                ? "bg-emerald-100 text-emerald-800 font-semibold"
                                : isChosen && !isCorr
                                ? "bg-red-100 text-red-700 font-semibold"
                                : "text-gray-500 bg-gray-50"
                            }`}
                          >
                            {isCorr && (
                              <MdCheckCircle size={12} className="text-emerald-600 shrink-0" />
                            )}
                            {isChosen && !isCorr && (
                              <MdCancel size={12} className="text-red-500 shrink-0" />
                            )}
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True/False + short answer */}
                  {r.q.type !== "multiple_choice" && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">
                        <span
                          className={
                            r.correct
                              ? "text-emerald-700 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          Student answered:
                        </span>{" "}
                        {r.given || <em className="text-gray-400">(blank)</em>}
                        {r.correct ? " ✓" : " ✗"}
                      </p>
                      {!r.correct && r.q.correctAnswer && (
                        <p className="text-xs text-gray-500">
                          <span className="text-emerald-700 font-semibold">
                            Correct answer:
                          </span>{" "}
                          {r.q.correctAnswer}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {r.q.explanation && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-[11px] font-semibold text-blue-700 mb-0.5">
                        Explanation
                      </p>
                      <p className="text-xs text-blue-700">{r.q.explanation}</p>
                    </div>
                  )}

                  {/* Worked solution */}
                  {r.q.workedSolution && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-600 mb-0.5">
                        Worked Solution
                      </p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {r.q.workedSolution}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
