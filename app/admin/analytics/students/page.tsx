"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllStudents, getAllTests, getAllAssignments, getAttemptsByStudent,
  getPracticeAttemptsByStudent, getLearningGapsByStudent,
  getStudySessionsByStudent, getSubmissionsByStudent, formatStudyTime, displayTopic,
  type Student, type Test, type TestAttempt, type PracticeAttempt,
  type LearningGap, type StudySession, type AIQuestion, type Question,
  type Assignment, type AssignmentSubmission,
} from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import type { StudentAnalysis, StudentAnalysisPayload } from "@/lib/gemini";
import {
  MdBarChart, MdQuiz, MdTimer, MdExtension, MdAutoAwesome,
  MdCheckCircle, MdCancel, MdWarning, MdRefresh, MdPerson,
} from "react-icons/md";
import { PracticePieChart, SkillMountainChart } from "@/components/AnalyticsCharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnsweredQuestion {
  subject: string;
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  correct: boolean;
  answeredAt: Date | null;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function tsToDate(ts: unknown): Date | null {
  if (ts instanceof Timestamp) return ts.toDate();
  const candidate = ts as { toDate?: () => Date } | null;
  if (candidate && typeof candidate.toDate === "function") return candidate.toDate();
  return null;
}

function isAnswerCorrect(q: AIQuestion | Question, given: string): boolean {
  const g = (given ?? "").trim().toLowerCase();
  const c = (q.correctAnswer ?? "").trim().toLowerCase();
  if (!g) return false;
  if (q.type === "short_answer" || q.type === "extended_response") return g.includes(c);
  return g === c;
}

/** Flattens test + practice + quiz assignment attempts into answered questions. */
function collectAnsweredQuestions(
  attempts: TestAttempt[],
  practice: PracticeAttempt[],
  testsById: Map<string, Test>,
  quizSubs: AssignmentSubmission[] = [],
  assignmentsById: Map<string, Assignment> = new Map()
): AnsweredQuestion[] {
  const rows: AnsweredQuestion[] = [];

  for (const att of attempts) {
    const test = testsById.get(att.testId);
    if (!test) continue;
    const answeredAt = tsToDate(att.submittedAt);
    for (const q of test.questions ?? []) {
      const given = att.answers?.[q.id];
      if (given === undefined) continue;
      rows.push({
        subject: test.subject,
        topic: test.title,
        question: q.text,
        studentAnswer: given,
        correctAnswer: q.correctAnswer,
        correct: isAnswerCorrect(q, given),
        answeredAt,
      });
    }
  }

  for (const pa of practice) {
    const answeredAt = tsToDate(pa.submittedAt);
    for (const q of pa.questions ?? []) {
      const given = pa.answers?.[q.id];
      if (given === undefined) continue;
      rows.push({
        subject: pa.subject,
        topic: displayTopic(q.topic || pa.topic, pa.subject),
        question: q.text,
        studentAnswer: given,
        correctAnswer: q.correctAnswer,
        correct: isAnswerCorrect(q, given),
        answeredAt,
      });
    }
  }

  for (const sub of quizSubs) {
    const assignment = assignmentsById.get(sub.assignmentId);
    if (!assignment || assignment.type !== "quiz" || !assignment.questions?.length) continue;
    if (sub.status !== "graded" && sub.status !== "submitted") continue;
    const answeredAt = tsToDate(sub.submittedAt);
    for (const q of assignment.questions) {
      const given = sub.answers?.[q.id];
      if (given === undefined) continue;
      rows.push({
        subject: assignment.subject,
        topic: assignment.title,
        question: q.text,
        studentAnswer: given,
        correctAnswer: q.correctAnswer,
        correct: isAnswerCorrect(q, given),
        answeredAt,
      });
    }
  }

  return rows.sort((a, b) => (b.answeredAt?.getTime() ?? 0) - (a.answeredAt?.getTime() ?? 0));
}

// ── AI Insights panel ──────────────────────────────────────────────────────

function AIInsightsPanel({
  student,
  answered,
  gaps,
  timeSpentSeconds,
}: {
  student: Student;
  answered: AnsweredQuestion[];
  gaps: LearningGap[];
  timeSpentSeconds: number;
}) {
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      // Topic stats from answered questions + recorded gaps
      const topicAgg: Record<string, { subject: string; correct: number; total: number }> = {};
      for (const a of answered) {
        const key = `${a.subject}|${a.topic}`;
        topicAgg[key] ??= { subject: a.subject, correct: 0, total: 0 };
        topicAgg[key].total++;
        if (a.correct) topicAgg[key].correct++;
      }
      const topicStats = Object.entries(topicAgg).map(([key, v]) => ({
        subject: v.subject,
        topic: key.split("|")[1],
        accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        questionsAnswered: v.total,
      }));
      for (const g of gaps) {
        if (!topicStats.some(t => t.topic === displayTopic(g.topic, g.subject))) {
          topicStats.push({
            subject: g.subject,
            topic: displayTopic(g.topic, g.subject),
            accuracy: g.accuracy,
            questionsAnswered: g.attemptCount,
          });
        }
      }

      const payload: StudentAnalysisPayload = {
        studentName: `${student.firstName} ${student.lastName}`,
        grade: student.grade,
        totals: {
          questionsAnswered: answered.length,
          correct: answered.filter(a => a.correct).length,
          timeSpentMinutes: Math.round(timeSpentSeconds / 60),
        },
        topicStats,
        // Recent questions, prioritising incorrect answers so the AI can
        // analyse each misunderstanding
        recentQuestions: [
          ...answered.filter(a => !a.correct).slice(0, 20),
          ...answered.filter(a => a.correct).slice(0, 10),
        ].map(a => ({
          subject: a.subject, topic: a.topic, question: a.question,
          studentAnswer: a.studentAnswer, correctAnswer: a.correctAnswer, correct: a.correct,
        })),
      };

      const res = await fetch("/api/analyze-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <MdAutoAwesome size={18} className="text-purple-600" /> AI Learning Analysis
        </h2>
        <button onClick={generate} disabled={loading || answered.length === 0}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 transition-colors">
          {loading
            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analysing…</>
            : <><MdAutoAwesome size={15} /> {analysis ? "Re-analyse" : "Generate AI Analysis"}</>}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Gemini analyses every answered question to find where the student is lacking, what they need help with,
        and what is required to support them in each subject.
      </p>

      {answered.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">No answered questions yet — the student needs to complete tests or practice first.</p>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-3">{error}</p>}

      {analysis && (
        <div className="space-y-5">
          {/* Overview */}
          <div className="bg-purple-50 border border-purple-200 px-4 py-3">
            <p className="text-sm text-purple-900 leading-relaxed">{analysis.overview}</p>
          </div>

          {/* Priority actions */}
          {analysis.priorityActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Priority Actions</p>
              <ol className="space-y-1.5">
                {analysis.priorityActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Per subject */}
          {analysis.subjects.map((s) => (
            <div key={s.subject} className="border border-gray-200">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <p className="font-semibold text-gray-900 text-sm">{s.subject}</p>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-4">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1"><MdCheckCircle size={13} /> Strengths</p>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    {s.strengths.length ? s.strengths.map((x, i) => <li key={i}>{x}</li>) : <li className="list-none text-gray-400">None identified yet</li>}
                  </ul>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1"><MdWarning size={13} /> Weak Areas</p>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    {s.weakAreas.length ? s.weakAreas.map((x, i) => <li key={i}>{x}</li>) : <li className="list-none text-gray-400">None identified</li>}
                  </ul>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1"><MdExtension size={13} /> Support Required</p>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    {s.support.length ? s.support.map((x, i) => <li key={i}>{x}</li>) : <li className="list-none text-gray-400">Keep monitoring</li>}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {/* Question insights */}
          {analysis.questionInsights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Question-level Insights</p>
              <div className="space-y-2">
                {analysis.questionInsights.map((qi, i) => (
                  <div key={i} className="border border-gray-200 p-3 space-y-1.5">
                    <p className="text-sm font-medium text-gray-800 flex items-start gap-2">
                      <MdCancel size={15} className="text-red-500 shrink-0 mt-0.5" /> {qi.question}
                    </p>
                    <p className="text-xs text-gray-600"><span className="font-semibold text-red-600">Issue:</span> {qi.issue}</p>
                    <p className="text-xs text-gray-600"><span className="font-semibold text-blue-600">Recommendation:</span> {qi.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function StudentAnalyticsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [practice, setPractice] = useState<PracticeAttempt[]>([]);
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizSubs, setQuizSubs] = useState<AssignmentSubmission[]>([]);

  useEffect(() => {
    Promise.all([getAllStudents(), getAllTests(), getAllAssignments()])
      .then(([s, t, a]) => {
        setStudents(s); setTests(t); setAssignments(a.filter((x) => x.type === "quiz"));
        if (s.length > 0) setSelectedId(s[0].id!);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    Promise.all([
      getAttemptsByStudent(selectedId),
      getPracticeAttemptsByStudent(selectedId),
      getLearningGapsByStudent(selectedId),
      getStudySessionsByStudent(selectedId),
      getSubmissionsByStudent(selectedId),
    ])
      .then(([att, pa, g, ss, subs]) => {
        setAttempts(att); setPractice(pa); setGaps(g); setSessions(ss); setQuizSubs(subs);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const student = students.find(s => s.id === selectedId) ?? null;
  const testsById = useMemo(() => new Map(tests.map(t => [t.id!, t])), [tests]);
  const assignmentsById = useMemo(() => new Map(assignments.map(a => [a.id!, a])), [assignments]);

  const answered = useMemo(
    () => collectAnsweredQuestions(attempts, practice, testsById, quizSubs, assignmentsById),
    [attempts, practice, testsById, quizSubs, assignmentsById]
  );

  const currentYear = new Date().getFullYear();

  // Summary stats (IXL-style)
  const answeredThisYear = answered.filter(a => a.answeredAt && a.answeredAt.getFullYear() === currentYear);
  const timeSpentSeconds = sessions
    .filter(s => s.date.startsWith(String(currentYear)))
    .reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  const skillsProgressed = gaps.filter(g => g.resolved || g.accuracy >= 80).length;

  // Skill progress tiers (IXL-style)
  const skillsPractised = gaps.length;
  const skillsProficient = gaps.filter(g => g.accuracy >= 80 && g.accuracy < 95).length;
  const skillsMastered = gaps.filter(g => g.accuracy >= 95).length;

  // Practice by category (topic share)
  const categoryRows = useMemo(() => {
    const agg: Record<string, { subject: string; count: number }> = {};
    for (const a of answered) {
      const key = a.topic;
      agg[key] ??= { subject: a.subject, count: 0 };
      agg[key].count++;
    }
    const total = answered.length || 1;
    return Object.entries(agg)
      .map(([topic, v]) => ({ topic, subject: v.subject, count: v.count, pct: Math.round((v.count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [answered]);

  // Practice by month (current year)
  const monthCounts = useMemo(() => {
    const counts = new Array(12).fill(0) as number[];
    for (const a of answeredThisYear) {
      if (a.answeredAt) counts[a.answeredAt.getMonth()]++;
    }
    return counts;
  }, [answeredThisYear]);
  const maxMonth = Math.max(...monthCounts, 1);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MdBarChart size={22} className="text-[#00369b]" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Student Analytics</h1>
              <p className="text-gray-500 text-sm">Usage, progress and AI learning analysis per student</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MdPerson size={18} className="text-gray-400" />
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="admin-input w-64" disabled={loading}>
              {students.length === 0 && <option value="">No students</option>}
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} · {s.studentId} · Grade {s.grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading || detailLoading ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="admin-card h-28 animate-pulse" />)}
          </div>
        ) : !student ? (
          <div className="admin-card text-center py-16 text-gray-400">No students enrolled yet.</div>
        ) : (
          <>
            {/* IXL-style summary */}
            <div className="admin-card">
              <p className="text-sm text-gray-500 mb-4">
                This school year, <span className="font-bold text-gray-900">{student.firstName}</span> has…
              </p>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 bg-emerald-50 flex items-center justify-center shrink-0">
                    <MdQuiz size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Answered</p>
                    <p className="text-3xl font-black text-gray-900">{answeredThisYear.length}</p>
                    <p className="text-xs text-gray-400">questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 bg-blue-50 flex items-center justify-center shrink-0">
                    <MdTimer size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Spent</p>
                    <p className="text-3xl font-black text-gray-900">{formatStudyTime(timeSpentSeconds)}</p>
                    <p className="text-xs text-gray-400">learning</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 bg-purple-50 flex items-center justify-center shrink-0">
                    <MdExtension size={22} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Made progress in</p>
                    <p className="text-3xl font-black text-gray-900">{skillsProgressed}</p>
                    <p className="text-xs text-gray-400">skills</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill progress mountain */}
            <div className="admin-card">
              <SkillMountainChart
                mastered={skillsMastered}
                proficient={skillsProficient}
                practised={skillsPractised}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Practice by category — pie */}
              <div className="admin-card">
                <h2 className="font-semibold text-gray-900 mb-4">Practice by Category</h2>
                <PracticePieChart rows={categoryRows} />
              </div>

              {/* Practice by month */}
              <div className="admin-card">
                <h2 className="font-semibold text-gray-900 mb-4">Practice by Month · {currentYear}</h2>
                <div className="flex items-end gap-1.5 h-44">
                  {monthCounts.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                      {count > 0 && <span className="text-[10px] font-bold text-gray-600">{count}</span>}
                      <div className="w-full bg-[#00c1ff] transition-all duration-500"
                        style={{ height: `${(count / maxMonth) * 100}%`, minHeight: count > 0 ? 3 : 0 }} />
                      <span className="text-[10px] text-gray-400">{MONTH_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">Questions from tests, quiz assignments &amp; AI practice</p>
              </div>
            </div>

            {/* Topic accuracy */}
            {gaps.length > 0 && (
              <div className="admin-card">
                <h2 className="font-semibold text-gray-900 mb-4">Topic Accuracy &amp; Learning Gaps</h2>
                <div className="space-y-3">
                  {gaps.map((g) => {
                    const color = g.accuracy < 40 ? "#ef4444" : g.accuracy < 60 ? "#f59e0b" : g.accuracy < 80 ? "#3b82f6" : "#22c55e";
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-700 font-medium">{displayTopic(g.topic, g.subject)}</p>
                            <span className="text-xs text-gray-400">{g.subject} · {g.attemptCount} attempt{g.attemptCount !== 1 ? "s" : ""}</span>
                            {g.resolved && <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5">Resolved</span>}
                          </div>
                          <span className="text-xs font-bold" style={{ color }}>{g.accuracy}%</span>
                        </div>
                        <div className="h-2 bg-gray-100">
                          <div className="h-full transition-all duration-500" style={{ width: `${g.accuracy}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI analysis */}
            <AIInsightsPanel
              student={student}
              answered={answered}
              gaps={gaps}
              timeSpentSeconds={timeSpentSeconds}
            />

            {/* Recent answers */}
            {answered.length > 0 && (
              <div className="admin-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Recent Answers</h2>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><MdRefresh size={12} /> {answered.length} total answered</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {answered.slice(0, 30).map((a, i) => (
                    <div key={i} className={`border px-3 py-2.5 ${a.correct ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
                      <div className="flex items-start gap-2">
                        {a.correct
                          ? <MdCheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          : <MdCancel size={15} className="text-red-500 shrink-0 mt-0.5" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 leading-snug">{a.question}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className={a.correct ? "text-emerald-700" : "text-red-600"}>
                              Answered: {a.studentAnswer || "(blank)"}
                            </span>
                            {!a.correct && <span className="text-gray-500"> · Correct: {a.correctAnswer}</span>}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {a.subject} · {a.topic}
                            {a.answeredAt ? ` · ${a.answeredAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
