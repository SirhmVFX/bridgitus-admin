"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllStudents, getAllTests, getAllAssignments, getAttemptsByStudent,
  getPracticeAttemptsByStudent, getLearningGapsByStudent,
  getStudySessionsByStudent, getSubmissionsByStudent, formatStudyTime, displayTopic,
  type Student, type Test, type TestAttempt, type AiPracticeAttempt,
  type LearningGap, type StudySession, type AIQuestion, type Question,
  type Assignment, type AssignmentSubmission, type PracticeAttempt,
} from "@/lib/firestore";
import { Timestamp, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudentAnalysis, StudentAnalysisPayload } from "@/lib/gemini";
import {
  MdBarChart, MdQuiz, MdTimer, MdExtension, MdAutoAwesome,
  MdCheckCircle, MdCancel, MdWarning, MdRefresh, MdPerson, MdDownload,
  MdSchool, MdEmojiEvents,
} from "react-icons/md";
import { PracticePieChart, SkillMountainChart } from "@/components/AnalyticsCharts";
import { adminFetch } from "@/lib/adminFetch";
import { formatGradeLabel, STUDENT_GRADES } from "@/lib/grades";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnsweredQuestion {
  subject: string;
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  correct: boolean;
  answeredAt: Date | null;
  source: "quiz" | "assignment" | "practice";
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Date-range options for the practice chart
type RangeKey = "1d" | "1w" | "2w" | "3w" | "1m" | "6m" | "1y" | "2y";
const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: "1d", label: "Today", days: 1 },
  { key: "1w", label: "1 Week", days: 7 },
  { key: "2w", label: "2 Weeks", days: 14 },
  { key: "3w", label: "3 Weeks", days: 21 },
  { key: "1m", label: "1 Month", days: 30 },
  { key: "6m", label: "6 Months", days: 182 },
  { key: "1y", label: "1 Year", days: 365 },
  { key: "2y", label: "2 Years", days: 730 },
];

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
  practice: AiPracticeAttempt[],
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
        subject: test.subject, topic: test.title,
        question: q.text, studentAnswer: given,
        correctAnswer: q.correctAnswer,
        correct: isAnswerCorrect(q, given),
        answeredAt, source: "quiz",
      });
    }
  }

  for (const pa of practice) {
    const answeredAt = tsToDate(pa.submittedAt);
    for (const q of pa.questions ?? []) {
      const given = pa.answers?.[q.id];
      if (given === undefined) continue;
      rows.push({
        subject: pa.subject, topic: displayTopic(q.topic || pa.topic, pa.subject),
        question: q.text, studentAnswer: given,
        correctAnswer: q.correctAnswer,
        correct: isAnswerCorrect(q, given),
        answeredAt, source: "practice",
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
        subject: assignment.subject, topic: assignment.title,
        question: q.text, studentAnswer: given,
        correctAnswer: q.correctAnswer,
        correct: isAnswerCorrect(q, given),
        answeredAt, source: "assignment",
      });
    }
  }

  return rows.sort((a, b) => (b.answeredAt?.getTime() ?? 0) - (a.answeredAt?.getTime() ?? 0));
}

// ── Fetch NAPLAN/Selective attempts for a student (admin side) ─────────────

async function getStudentExamAttempts(
  studentId: string,
  program: "naplan" | "selective"
): Promise<PracticeAttempt[]> {
  const snap = await getDocs(
    query(collection(db, "practiceAttempts"), where("studentId", "==", studentId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as PracticeAttempt) }))
    .filter((a) => Boolean(a.paperId) && a.program === program)
    .sort(
      (a, b) =>
        (b.submittedAt as Timestamp)?.toMillis() -
        (a.submittedAt as Timestamp)?.toMillis() || 0
    );
}

// ── Build time-bucketed bar chart data for any date range ─────────────────

interface BarBucket {
  label: string;
  count: number;
}

function buildRangeChart(answered: AnsweredQuestion[], days: number): BarBucket[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const inRange = answered.filter(
    (a) => a.answeredAt && a.answeredAt >= cutoff
  );

  if (days <= 1) {
    // Hourly buckets for today
    const buckets: number[] = new Array(24).fill(0);
    for (const a of inRange) {
      if (a.answeredAt) buckets[a.answeredAt.getHours()]++;
    }
    return buckets.map((count, h) => ({
      label: h % 6 === 0 ? `${h}:00` : "",
      count,
    }));
  }

  if (days <= 21) {
    // Daily buckets
    const bucketMap: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
      bucketMap[key] = 0;
    }
    for (const a of inRange) {
      if (a.answeredAt) {
        const key = a.answeredAt.toLocaleDateString("en-CA");
        if (key in bucketMap) bucketMap[key]++;
      }
    }
    return Object.entries(bucketMap).map(([date, count]) => ({
      label: new Date(date + "T12:00").toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      }),
      count,
    }));
  }

  if (days <= 182) {
    // Weekly buckets
    const weekCount = Math.ceil(days / 7);
    const buckets: { start: Date; end: Date; count: number }[] = [];
    for (let i = weekCount - 1; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      buckets.push({ start, end, count: 0 });
    }
    for (const a of inRange) {
      if (!a.answeredAt) continue;
      for (const b of buckets) {
        if (a.answeredAt >= b.start && a.answeredAt < b.end) {
          b.count++;
          break;
        }
      }
    }
    return buckets.map((b) => ({
      label: b.start.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      count: b.count,
    }));
  }

  // Monthly buckets (1y / 2y)
  const monthCount = Math.round(days / 30);
  const bucketMap: Record<string, number> = {};
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    bucketMap[key] = 0;
  }
  for (const a of inRange) {
    if (!a.answeredAt) continue;
    const key = `${a.answeredAt.getFullYear()}-${String(a.answeredAt.getMonth() + 1).padStart(2, "0")}`;
    if (key in bucketMap) bucketMap[key]++;
  }
  return Object.entries(bucketMap).map(([key, count]) => {
    const [y, m] = key.split("-");
    return {
      label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-AU", {
        month: "short",
        year: days > 365 ? "2-digit" : undefined,
      }),
      count,
    };
  });
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
      const topicAgg: Record<string, { subject: string; correct: number; total: number }> = {};
      for (const a of answered) {
        const key = `${a.subject}|${a.topic}`;
        topicAgg[key] ??= { subject: a.subject, correct: 0, total: 0 };
        topicAgg[key].total++;
        if (a.correct) topicAgg[key].correct++;
      }
      const topicStats = Object.entries(topicAgg).map(([key, v]) => ({
        subject: v.subject, topic: key.split("|")[1],
        accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        questionsAnswered: v.total,
      }));
      for (const g of gaps) {
        if (!topicStats.some(t => t.topic === displayTopic(g.topic, g.subject))) {
          topicStats.push({
            subject: g.subject, topic: displayTopic(g.topic, g.subject),
            accuracy: g.accuracy, questionsAnswered: g.attemptCount,
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
        recentQuestions: [
          ...answered.filter(a => !a.correct).slice(0, 20),
          ...answered.filter(a => a.correct).slice(0, 10),
        ].map(a => ({
          subject: a.subject, topic: a.topic, question: a.question,
          studentAnswer: a.studentAnswer, correctAnswer: a.correctAnswer, correct: a.correct,
        })),
      };

      const res = await adminFetch("/api/analyze-student", {
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
          <div className="bg-purple-50 border border-purple-200 px-4 py-3">
            <p className="text-sm text-purple-900 leading-relaxed">{analysis.overview}</p>
          </div>

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

  // Grade filter for student selector (task 2)
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // Date range for practice chart (task 3)
  const [rangeKey, setRangeKey] = useState<RangeKey>("1y");

  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [practice, setPractice] = useState<AiPracticeAttempt[]>([]);
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizSubs, setQuizSubs] = useState<AssignmentSubmission[]>([]);

  // NAPLAN / Selective (task 6)
  const [naplanAttempts, setNaplanAttempts] = useState<PracticeAttempt[]>([]);
  const [selectiveAttempts, setSelectiveAttempts] = useState<PracticeAttempt[]>([]);

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
      getStudentExamAttempts(selectedId, "naplan"),
      getStudentExamAttempts(selectedId, "selective"),
    ])
      .then(([att, pa, g, ss, subs, naplan, selective]) => {
        setAttempts(att); setPractice(pa); setGaps(g); setSessions(ss); setQuizSubs(subs);
        setNaplanAttempts(naplan); setSelectiveAttempts(selective);
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

  // Summary stats — always "this year" regardless of chart range
  const answeredThisYear = answered.filter(a => a.answeredAt && a.answeredAt.getFullYear() === currentYear);
  const timeSpentSeconds = sessions
    .filter(s => s.date.startsWith(String(currentYear)))
    .reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  const skillsProgressed = gaps.filter(g => g.resolved || g.accuracy >= 80).length;

  const skillsPractised = gaps.length;
  const skillsProficient = gaps.filter(g => g.accuracy >= 80 && g.accuracy < 95).length;
  const skillsMastered = gaps.filter(g => g.accuracy >= 95).length;

  function buildCategoryRows(items: AnsweredQuestion[]) {
    const agg: Record<string, { subject: string; count: number }> = {};
    for (const a of items) {
      agg[a.topic] ??= { subject: a.subject, count: 0 };
      agg[a.topic].count++;
    }
    const total = items.length || 1;
    return Object.entries(agg)
      .map(([topic, v]) => ({ topic, subject: v.subject, count: v.count, pct: Math.round((v.count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Quizzes = portal tests + AI practice; Assignments = quiz assignments only (no NAPLAN/selective)
  const quizCategoryRows = useMemo(
    () => buildCategoryRows(answered.filter((a) => a.source === "quiz" || a.source === "practice")),
    [answered]
  );
  const assignmentCategoryRows = useMemo(
    () => buildCategoryRows(answered.filter((a) => a.source === "assignment")),
    [answered]
  );

  // Practice chart — respects selected range
  const selectedRange = RANGE_OPTIONS.find(r => r.key === rangeKey) ?? RANGE_OPTIONS[6];
  const chartBuckets = useMemo(
    () => buildRangeChart(answered, selectedRange.days),
    [answered, selectedRange.days]
  );
  const maxBucket = Math.max(...chartBuckets.map(b => b.count), 1);
  const chartTotal = chartBuckets.reduce((s, b) => s + b.count, 0);

  // Filtered students for selector (task 2)
  const filteredStudents = useMemo(
    () =>
      gradeFilter === "all"
        ? students
        : students.filter((s) => s.grade === gradeFilter),
    [students, gradeFilter]
  );

  // When grade filter changes, auto-select the first student in that grade
  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedId(filteredStudents[0].id!);
    } else {
      setSelectedId("");
    }
  }, [gradeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Download helpers — respect selected date range (task 3) ──────────────

  function downloadAnalyticsCsv() {
    if (!student) return;
    const rangeLabel = selectedRange.label;
    const cutoff = new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000);
    const rangeAnswered =
      rangeKey === "1y" && selectedRange.days === 365
        ? answeredThisYear
        : answered.filter((a) => a.answeredAt && a.answeredAt >= cutoff);

    const lines = [
      ["Bridgitus Learning — Student Analytics"],
      ["Student", `${student.firstName} ${student.lastName}`],
      ["Student ID", student.studentId],
      ["Grade", student.grade],
      ["Report period", rangeLabel],
      ["Questions in period", String(rangeAnswered.length)],
      ["Time spent (this year)", formatStudyTime(timeSpentSeconds)],
      [],
      ["Source", "Subject", "Topic", "Correct", "Answered at"],
      ...rangeAnswered.map((a) => [
        a.source, a.subject, a.topic, a.correct ? "yes" : "no",
        a.answeredAt?.toISOString() || "",
      ]),
      [],
      ["Quizzes by category (tests + AI practice)"],
      ...quizCategoryRows.map((r) => [r.topic, r.subject, String(r.count), `${r.pct}%`]),
      [],
      ["Assignments by category"],
      ...assignmentCategoryRows.map((r) => [r.topic, r.subject, String(r.count), `${r.pct}%`]),
      [],
      ["NAPLAN attempts"],
      ...(naplanAttempts.length
        ? naplanAttempts.map((a) => [
          a.paperTitle ?? "Paper",
          a.status,
          typeof a.percentage === "number" ? `${a.percentage}%` : "—",
          tsToDate(a.submittedAt)?.toISOString() ?? "",
        ])
        : [["No NAPLAN data"]]),
      [],
      ["Selective Entry attempts"],
      ...(selectiveAttempts.length
        ? selectiveAttempts.map((a) => [
          a.paperTitle ?? "Paper",
          a.status,
          typeof a.percentage === "number" ? `${a.percentage}%` : "—",
          tsToDate(a.submittedAt)?.toISOString() ?? "",
        ])
        : [["No Selective data"]]),
    ];
    const csv = lines
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.studentId}-analytics-${rangeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printAnalyticsForParent() {
    if (!student) return;
    const rangeLabel = selectedRange.label;
    const cutoff = new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000);
    const rangeAnswered =
      rangeKey === "1y" && selectedRange.days === 365
        ? answeredThisYear
        : answered.filter((a) => a.answeredAt && a.answeredAt >= cutoff);

    const naplanAvg = (() => {
      const graded = naplanAttempts.filter((a) => typeof a.percentage === "number");
      if (!graded.length) return "—";
      return `${Math.round(graded.reduce((s, a) => s + (a.percentage ?? 0), 0) / graded.length)}%`;
    })();
    const selectiveAvg = (() => {
      const graded = selectiveAttempts.filter((a) => typeof a.percentage === "number");
      if (!graded.length) return "—";
      return `${Math.round(graded.reduce((s, a) => s + (a.percentage ?? 0), 0) / graded.length)}%`;
    })();

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${student.firstName} Analytics</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#111}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f4f6fb}
        .stat{display:inline-block;margin:12px 24px 0 0}
        .stat b{display:block;font-size:22px}
        h2{margin-top:24px;margin-bottom:8px;font-size:15px;color:#00369b}
        .badge{display:inline-block;font-size:11px;padding:2px 7px;border-radius:99px;font-weight:600}
        .green{background:#dcfce7;color:#166534}
        .red{background:#fee2e2;color:#991b1b}
      </style></head><body>
      <h1>Bridgitus Learning — Progress Report</h1>
      <p><strong>${student.firstName} ${student.lastName}</strong> · ${student.studentId} · ${formatGradeLabel(student.grade)}</p>
      <p>Report period: <strong>${rangeLabel}</strong> · Generated: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div class="stat"><b>${rangeAnswered.length}</b>Questions in period</div>
      <div class="stat"><b>${formatStudyTime(timeSpentSeconds)}</b>Learning time (this year)</div>
      <div class="stat"><b>${skillsProgressed}</b>Skills progressed</div>

      <h2>Quizzes by category (portal tests + AI practice)</h2>
      <table><tr><th>Topic</th><th>Subject</th><th>Count</th><th>%</th></tr>
      ${quizCategoryRows.map((r) => `<tr><td>${r.topic}</td><td>${r.subject}</td><td>${r.count}</td><td>${r.pct}%</td></tr>`).join("") || "<tr><td colspan=4>No data</td></tr>"}
      </table>

      <h2>Assignments by category</h2>
      <table><tr><th>Topic</th><th>Subject</th><th>Count</th><th>%</th></tr>
      ${assignmentCategoryRows.map((r) => `<tr><td>${r.topic}</td><td>${r.subject}</td><td>${r.count}</td><td>${r.pct}%</td></tr>`).join("") || "<tr><td colspan=4>No data</td></tr>"}
      </table>

      <h2>NAPLAN Practice</h2>
      <p>Attempts: ${naplanAttempts.length} · Avg score: ${naplanAvg}</p>
      ${naplanAttempts.length ? `<table><tr><th>Paper</th><th>Status</th><th>Score</th><th>Date</th></tr>
      ${naplanAttempts.map((a) => `<tr><td>${a.paperTitle ?? "Paper"}</td><td>${a.status}</td><td>${typeof a.percentage === "number" ? `${a.percentage}%` : "—"}</td><td>${tsToDate(a.submittedAt)?.toLocaleDateString("en-AU") ?? "—"}</td></tr>`).join("")}
      </table>` : "<p style='color:#999'>No NAPLAN attempts yet.</p>"}

      <h2>Selective Entry Prep</h2>
      <p>Attempts: ${selectiveAttempts.length} · Avg score: ${selectiveAvg}</p>
      ${selectiveAttempts.length ? `<table><tr><th>Paper</th><th>Status</th><th>Score</th><th>Date</th></tr>
      ${selectiveAttempts.map((a) => `<tr><td>${a.paperTitle ?? "Paper"}</td><td>${a.status}</td><td>${typeof a.percentage === "number" ? `${a.percentage}%` : "—"}</td><td>${tsToDate(a.submittedAt)?.toLocaleDateString("en-AU") ?? "—"}</td></tr>`).join("")}
      </table>` : "<p style='color:#999'>No Selective Entry attempts yet.</p>"}

      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <AdminLayout>
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MdBarChart size={22} className="text-[#00369b]" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Student Analytics</h1>
              <p className="text-gray-500 text-sm">Usage, progress and AI learning analysis per student</p>
            </div>
          </div>

          {/* Grade filter + student selector (tasks 2 & 3) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Grade filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="admin-input w-36"
              disabled={loading}
              title="Filter by grade"
            >
              <option value="all">All Grades</option>
              {STUDENT_GRADES.map((g) => (
                <option key={g} value={g}>
                  {formatGradeLabel(g)}
                </option>
              ))}
            </select>

            {/* Student selector */}
            <div className="flex items-center gap-1.5">
              <MdPerson size={18} className="text-gray-400" />
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="admin-input w-56"
                disabled={loading}
              >
                {filteredStudents.length === 0 && (
                  <option value="">No students in this grade</option>
                )}
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                    {gradeFilter === "all" ? ` · ${formatGradeLabel(s.grade)}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {student && (
              <>
                <button
                  type="button"
                  onClick={downloadAnalyticsCsv}
                  className="btn-secondary flex items-center gap-1.5 text-sm cursor-pointer"
                  title={`Download CSV for period: ${selectedRange.label}`}
                >
                  <MdDownload size={16} /> CSV
                </button>
                <button
                  type="button"
                  onClick={printAnalyticsForParent}
                  className="btn-primary flex items-center gap-1.5 text-sm cursor-pointer"
                  title={`Print report for period: ${selectedRange.label}`}
                >
                  <MdDownload size={16} /> Print / PDF
                </button>
              </>
            )}
          </div>
        </div>

        {loading || detailLoading ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="admin-card h-28 animate-pulse" />)}
          </div>
        ) : !student ? (
          <div className="admin-card text-center py-16 text-gray-400">
            {gradeFilter !== "all"
              ? `No students in ${formatGradeLabel(gradeFilter)} yet.`
              : "No students enrolled yet."}
          </div>
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

            {/* Category pies — quiz/assignment only, no NAPLAN/selective (task 6) */}
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="admin-card">
                <h2 className="font-semibold text-gray-900 mb-1">Quizzes by Category</h2>
                <p className="text-xs text-gray-400 mb-4">Portal tests + AI practice</p>
                <PracticePieChart rows={quizCategoryRows} />
              </div>
              <div className="admin-card">
                <h2 className="font-semibold text-gray-900 mb-1">Assignments by Category</h2>
                <p className="text-xs text-gray-400 mb-4">Quiz assignments only</p>
                <PracticePieChart rows={assignmentCategoryRows} />
              </div>
            </div>

            {/* Practice chart with date-range selector (task 3) */}
            <div className="admin-card">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Practice Activity · {selectedRange.label}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {chartTotal} questions from tests, quiz assignments &amp; AI practice
                  </p>
                </div>
                {/* Range selector */}
                <div className="flex flex-wrap gap-1">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRangeKey(opt.key)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${rangeKey === opt.key
                          ? "bg-[#00369b] text-white border-[#00369b]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#00369b]"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {chartTotal === 0 ? (
                <div className="h-44 flex items-center justify-center text-sm text-gray-400">
                  No activity in this period.
                </div>
              ) : (
                <div className="flex items-end gap-1 h-44 overflow-x-auto pb-1">
                  {chartBuckets.map((bucket, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-end h-full gap-0.5"
                      style={{ minWidth: chartBuckets.length > 30 ? 8 : 18 }}
                    >
                      {bucket.count > 0 && (
                        <span className="text-[9px] font-bold text-gray-600">
                          {bucket.count}
                        </span>
                      )}
                      <div
                        className="w-full bg-[#00c1ff] rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${(bucket.count / maxBucket) * 100}%`,
                          minHeight: bucket.count > 0 ? 3 : 0,
                        }}
                      />
                      {bucket.label && (
                        <span
                          className="text-gray-400 leading-tight text-center"
                          style={{ fontSize: 9 }}
                        >
                          {bucket.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NAPLAN chart (task 6) */}
            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <MdSchool size={16} className="text-[#00369b]" /> NAPLAN Practice
              </h2>
              <p className="text-xs text-gray-400 mb-4">Years 2–9 exam prep attempts</p>
              {naplanAttempts.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No NAPLAN attempts yet for this student.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">{naplanAttempts.length}</p>
                      <p className="text-xs text-gray-400">Attempts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {naplanAttempts.filter((a) => a.status === "graded").length}
                      </p>
                      <p className="text-xs text-gray-400">Graded</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {(() => {
                          const graded = naplanAttempts.filter((a) => typeof a.percentage === "number");
                          if (!graded.length) return "—";
                          return `${Math.round(graded.reduce((s, a) => s + (a.percentage ?? 0), 0) / graded.length)}%`;
                        })()}
                      </p>
                      <p className="text-xs text-gray-400">Avg score</p>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  {naplanAttempts.filter((a) => typeof a.percentage === "number").length > 0 && (
                    <div className="flex items-end gap-1 h-24">
                      {naplanAttempts.slice(0, 12).map((a, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                          {typeof a.percentage === "number" && (
                            <span className="text-[9px] font-bold text-gray-500">{a.percentage}%</span>
                          )}
                          <div
                            className="w-full rounded-t-sm transition-all"
                            style={{
                              height: `${((a.percentage ?? 0) / 100) * 100}%`,
                              background: (a.percentage ?? 0) >= 80 ? "#22c55e" : (a.percentage ?? 0) >= 60 ? "#3b82f6" : "#f59e0b",
                              minHeight: typeof a.percentage === "number" ? 3 : 0,
                            }}
                          />
                          <span className="text-[9px] text-gray-400 truncate w-full text-center">
                            {(a.paperTitle ?? "Paper").slice(0, 8)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="divide-y divide-slate-100">
                    {naplanAttempts.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="font-medium text-gray-800 truncate max-w-[60%]">
                          {a.paperTitle ?? "Paper"}
                        </span>
                        <span className="text-gray-500">
                          {typeof a.percentage === "number" ? `${a.percentage}%` : a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selective Entry chart (task 6) */}
            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <MdEmojiEvents size={16} className="text-amber-500" /> Selective Entry Prep
              </h2>
              <p className="text-xs text-gray-400 mb-4">Years 8–9 exam prep attempts</p>
              {selectiveAttempts.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No Selective Entry attempts yet for this student.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">{selectiveAttempts.length}</p>
                      <p className="text-xs text-gray-400">Attempts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {selectiveAttempts.filter((a) => a.status === "graded").length}
                      </p>
                      <p className="text-xs text-gray-400">Graded</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {(() => {
                          const graded = selectiveAttempts.filter((a) => typeof a.percentage === "number");
                          if (!graded.length) return "—";
                          return `${Math.round(graded.reduce((s, a) => s + (a.percentage ?? 0), 0) / graded.length)}%`;
                        })()}
                      </p>
                      <p className="text-xs text-gray-400">Avg score</p>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  {selectiveAttempts.filter((a) => typeof a.percentage === "number").length > 0 && (
                    <div className="flex items-end gap-1 h-24">
                      {selectiveAttempts.slice(0, 12).map((a, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                          {typeof a.percentage === "number" && (
                            <span className="text-[9px] font-bold text-gray-500">{a.percentage}%</span>
                          )}
                          <div
                            className="w-full rounded-t-sm transition-all"
                            style={{
                              height: `${((a.percentage ?? 0) / 100) * 100}%`,
                              background: (a.percentage ?? 0) >= 80 ? "#22c55e" : (a.percentage ?? 0) >= 60 ? "#3b82f6" : "#f59e0b",
                              minHeight: typeof a.percentage === "number" ? 3 : 0,
                            }}
                          />
                          <span className="text-[9px] text-gray-400 truncate w-full text-center">
                            {(a.paperTitle ?? "Paper").slice(0, 8)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="divide-y divide-slate-100">
                    {selectiveAttempts.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="font-medium text-gray-800 truncate max-w-[60%]">
                          {a.paperTitle ?? "Paper"}
                        </span>
                        <span className="text-gray-500">
                          {typeof a.percentage === "number" ? `${a.percentage}%` : a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MdRefresh size={12} /> {answered.length} total answered
                  </span>
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
