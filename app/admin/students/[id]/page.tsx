"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  getStudentById, updateStudent, getAttemptsByStudent, getProgressByStudent,
  getCompletionsByStudent, getAllMaterials, getAllTests, getAllAssignments,
  getSubmissionsByAssignment, getPracticeAttemptsByStudent, getLearningGapsByStudent,
  getStudySessionsByStudent, getSubmissionsByStudent, getAllStudents,
  formatStudyTime, displayTopic,
  type Student, type TestAttempt, type StudentProgress,
  type MaterialCompletion, type LearningMaterial, type Test, type Assignment,
  type PracticeAttempt, type LearningGap, type StudySession, type AssignmentSubmission,
  type Question, type AIQuestion,
} from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import {
  MdArrowBack, MdPerson, MdEmail, MdPhone,
  MdCheckCircle, MdPending, MdCancel, MdBarChart,
  MdMenuBook, MdQuiz, MdAssignment, MdEdit, MdSave,
  MdDownload, MdLockReset, MdGroupAdd, MdVisibility, MdVisibilityOff,
} from "react-icons/md";
import { PracticePieChart, SkillMountainChart } from "@/components/AnalyticsCharts";

type Tab = "overview" | "materials" | "tests" | "assignments" | "progress" | "analytics";

interface AnsweredQuestion {
  subject: string;
  topic: string;
  correct: boolean;
  answeredAt: Date | null;
  source: "quiz" | "assignment" | "practice";
}

function tsToDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  const c = ts as { toDate?: () => Date; seconds?: number };
  if (typeof c.toDate === "function") return c.toDate();
  if (typeof c.seconds === "number") return new Date(c.seconds * 1000);
  return null;
}

function isAnswerCorrect(q: Question | AIQuestion, given: string): boolean {
  const g = (given ?? "").trim().toLowerCase();
  const c = (q.correctAnswer ?? "").trim().toLowerCase();
  if (!g) return false;
  if (q.type === "short_answer" || (q as { type?: string }).type === "extended_response") return g.includes(c);
  return g === c;
}

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
    .slice(0, 8);
}

const emptyEdit = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "", school: "", grade: "",
  subjects: "", parentFirstName: "", parentLastName: "", parentEmail: "", parentPhone: "",
  postcode: "", status: "active" as Student["status"], planId: "", planTitle: "",
  paymentStatus: "pending" as Student["paymentStatus"],
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [student, setStudent] = useState<Student | null>(null);
  const [siblings, setSiblings] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [completions, setCompletions] = useState<MaterialCompletion[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, string>>({});
  const [practice, setPractice] = useState<PracticeAttempt[]>([]);
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizSubs, setQuizSubs] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(emptyEdit);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [siblingForm, setSiblingForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "", school: "", grade: "", subjects: "",
  });
  const [siblingBusy, setSiblingBusy] = useState(false);
  const [siblingMsg, setSiblingMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [s, att, prog, comps, mats, tst, asgn, pa, g, ss, subs, allStudents] = await Promise.all([
        getStudentById(id),
        getAttemptsByStudent(id),
        getProgressByStudent(id),
        getCompletionsByStudent(id),
        getAllMaterials(),
        getAllTests(),
        getAllAssignments(),
        getPracticeAttemptsByStudent(id),
        getLearningGapsByStudent(id),
        getStudySessionsByStudent(id),
        getSubmissionsByStudent(id),
        getAllStudents(),
      ]);
      setStudent(s); setAttempts(att); setProgress(prog);
      setCompletions(comps); setMaterials(mats); setTests(tst);
      setAssignments(asgn);
      setPractice(pa); setGaps(g); setSessions(ss); setQuizSubs(subs);
      if (s) {
        setEdit({
          firstName: s.firstName || "",
          lastName: s.lastName || "",
          dateOfBirth: s.dateOfBirth || "",
          gender: s.gender || "",
          school: s.school || "",
          grade: s.grade || "",
          subjects: (s.subjects || []).join(", "),
          parentFirstName: s.parentFirstName || "",
          parentLastName: s.parentLastName || "",
          parentEmail: s.parentEmail || "",
          parentPhone: s.parentPhone || "",
          postcode: s.postcode || "",
          status: s.status,
          planId: s.planId || "",
          planTitle: s.planTitle || "",
          paymentStatus: s.paymentStatus,
        });
        const parentEmail = (s.parentEmail || s.email || "").toLowerCase();
        setSiblings(
          allStudents.filter(
            (x) =>
              x.id !== s.id &&
              (x.parentEmail || x.email || "").toLowerCase() === parentEmail
          )
        );
      }
      const statuses: Record<string, string> = {};
      await Promise.all(asgn.map(async (a) => {
        if (a.id) {
          const subList = await getSubmissionsByAssignment(a.id);
          const mine = subList.find((sub) => sub.studentId === id);
          statuses[a.id] = mine?.status ?? "not_started";
        }
      }));
      setAssignmentStatuses(statuses);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!student?.id) return;
    setSaving(true);
    const patch: Partial<Student> = {
      firstName: edit.firstName.trim(),
      lastName: edit.lastName.trim(),
      dateOfBirth: edit.dateOfBirth.trim(),
      gender: edit.gender.trim(),
      school: edit.school.trim(),
      grade: edit.grade.trim(),
      subjects: edit.subjects.split(",").map((x) => x.trim()).filter(Boolean),
      parentFirstName: edit.parentFirstName.trim(),
      parentLastName: edit.parentLastName.trim(),
      parentEmail: edit.parentEmail.trim().toLowerCase(),
      parentPhone: edit.parentPhone.trim(),
      postcode: edit.postcode.trim(),
      status: edit.status,
      planId: edit.planId.trim(),
      planTitle: edit.planTitle.trim(),
      paymentStatus: edit.paymentStatus,
      email: edit.parentEmail.trim().toLowerCase() || student.email,
    };
    await updateStudent(student.id, patch);
    setStudent((s) => (s ? { ...s, ...patch } : s));
    setEditing(false);
    setSaving(false);
  }

  async function handleResetPassword() {
    if (!student?.id) return;
    if (!confirm(`Reset password for ${student.firstName}? A new password will be generated and emailed to the parent if SES is enabled.`)) return;
    setResetBusy(true);
    setResetMsg("");
    try {
      const res = await fetch("/api/students/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, emailParent: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setStudent((s) => (s ? { ...s, issuedPassword: data.password } : s));
      setShowPassword(true);
      setResetMsg(`New password: ${data.password}${data.emailed ? " (emailed to parent)" : " (email not sent — copy and share manually)"}`);
    } catch (err: unknown) {
      setResetMsg(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetBusy(false);
    }
  }

  async function handleAddSibling() {
    if (!student?.id) return;
    setSiblingBusy(true);
    setSiblingMsg("");
    try {
      const res = await fetch("/api/students/add-family-sibling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceStudentId: student.id,
          ...siblingForm,
          subjects: siblingForm.subjects,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSiblingMsg(`Added ${siblingForm.firstName} — Student ID ${data.studentId}, password ${data.password}`);
      setSiblingForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "", school: "", grade: student.grade, subjects: "" });
      const all = await getAllStudents();
      const parentEmail = (student.parentEmail || student.email || "").toLowerCase();
      setSiblings(all.filter((x) => x.id !== student.id && (x.parentEmail || x.email || "").toLowerCase() === parentEmail));
    } catch (err: unknown) {
      setSiblingMsg(err instanceof Error ? err.message : "Failed to add sibling");
    } finally {
      setSiblingBusy(false);
    }
  }

  const testsById = useMemo(() => new Map(tests.map((t) => [t.id!, t])), [tests]);
  const quizAssignments = useMemo(() => assignments.filter((a) => a.type === "quiz"), [assignments]);
  const assignmentsById = useMemo(() => new Map(quizAssignments.map((a) => [a.id!, a])), [quizAssignments]);

  const answered = useMemo(() => {
    const rows: AnsweredQuestion[] = [];
    for (const att of attempts) {
      const test = testsById.get(att.testId);
      if (!test) continue;
      const answeredAt = tsToDate(att.submittedAt);
      for (const q of test.questions ?? []) {
        const given = att.answers?.[q.id];
        if (given === undefined) continue;
        rows.push({ subject: test.subject, topic: test.title, correct: isAnswerCorrect(q, given), answeredAt, source: "quiz" });
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
          correct: isAnswerCorrect(q, given),
          answeredAt,
          source: "practice",
        });
      }
    }
    for (const sub of quizSubs) {
      if (sub.status !== "graded" && sub.status !== "submitted") continue;
      const assignment = assignmentsById.get(sub.assignmentId);
      if (!assignment?.questions?.length) continue;
      const answeredAt = tsToDate(sub.submittedAt) ?? new Date();
      for (const q of assignment.questions) {
        const given = sub.answers?.[q.id];
        if (given === undefined) continue;
        rows.push({
          subject: assignment.subject,
          topic: assignment.title,
          correct: isAnswerCorrect(q, given),
          answeredAt,
          source: "assignment",
        });
      }
    }
    return rows;
  }, [attempts, practice, quizSubs, testsById, assignmentsById]);

  // Admin pies: Quizzes = portal tests + AI practice; Assignments = quiz assignments
  const quizCategoryRows = useMemo(
    () => buildCategoryRows(answered.filter((a) => a.source === "quiz" || a.source === "practice")),
    [answered]
  );
  const assignmentCategoryRows = useMemo(
    () => buildCategoryRows(answered.filter((a) => a.source === "assignment")),
    [answered]
  );

  const currentYear = new Date().getFullYear();
  const answeredThisYear = answered.filter((a) => !a.answeredAt || a.answeredAt.getFullYear() === currentYear);
  const yearSeconds = sessions
    .filter((s) => s.date.startsWith(String(currentYear)))
    .reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  const skillsPractised = gaps.length;
  const skillsProficient = gaps.filter((g) => g.accuracy >= 80 && g.accuracy < 95).length;
  const skillsMastered = gaps.filter((g) => g.accuracy >= 95).length;

  function downloadAnalyticsCsv() {
    if (!student) return;
    const lines = [
      ["Bridgitus Learning — Student Analytics Report"],
      ["Student", `${student.firstName} ${student.lastName}`],
      ["Student ID", student.studentId],
      ["Grade", student.grade],
      ["Parent email", student.parentEmail || student.email],
      ["Plan", student.planTitle || ""],
      ["Questions answered (year)", String(answeredThisYear.length)],
      ["Time spent (year)", formatStudyTime(yearSeconds)],
      [],
      ["Source", "Subject", "Topic", "Correct", "Answered at"],
      ...answered.map((a) => [
        a.source,
        a.subject,
        a.topic,
        a.correct ? "yes" : "no",
        a.answeredAt?.toISOString() || "",
      ]),
      [],
      ["Quizzes by category (tests + AI practice)"],
      ["Topic", "Subject", "Count", "Pct"],
      ...quizCategoryRows.map((r) => [r.topic, r.subject, String(r.count), `${r.pct}%`]),
      [],
      ["Assignments by category"],
      ["Topic", "Subject", "Count", "Pct"],
      ...assignmentCategoryRows.map((r) => [r.topic, r.subject, String(r.count), `${r.pct}%`]),
    ];
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.studentId}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printAnalyticsForParent() {
    if (!student) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${student.firstName} Analytics</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#111}
        h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px}
        .meta{color:#555;font-size:13px} table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left} th{background:#f4f6fb}
        .stat{display:inline-block;margin-right:24px;margin-top:12px}
        .stat b{display:block;font-size:22px}
      </style></head><body>
      <h1>Bridgitus Learning — Progress Report</h1>
      <p class="meta">${student.firstName} ${student.lastName} · ${student.studentId} · Grade ${student.grade}</p>
      <p class="meta">Parent: ${student.parentFirstName || ""} ${student.parentLastName || ""} · ${student.parentEmail || student.email}</p>
      <p class="meta">Plan: ${student.planTitle || "—"} · Generated ${new Date().toLocaleString()}</p>
      <div>
        <div class="stat"><b>${answeredThisYear.length}</b>Questions answered (${currentYear})</div>
        <div class="stat"><b>${formatStudyTime(yearSeconds)}</b>Learning time</div>
        <div class="stat"><b>${skillsPractised}</b>Skills practised</div>
      </div>
      <h2>Quizzes by category (portal tests + AI practice)</h2>
      <table><tr><th>Topic</th><th>Subject</th><th>Questions</th><th>%</th></tr>
      ${quizCategoryRows.map((r) => `<tr><td>${r.topic}</td><td>${r.subject}</td><td>${r.count}</td><td>${r.pct}%</td></tr>`).join("") || "<tr><td colspan=4>No data</td></tr>"}
      </table>
      <h2>Assignments by category (quiz assignments)</h2>
      <table><tr><th>Topic</th><th>Subject</th><th>Questions</th><th>%</th></tr>
      ${assignmentCategoryRows.map((r) => `<tr><td>${r.topic}</td><td>${r.subject}</td><td>${r.count}</td><td>${r.pct}%</td></tr>`).join("") || "<tr><td colspan=4>No data</td></tr>"}
      </table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-[#00369b] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }
  if (!student) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-gray-500">Student not found.</p>
          <Link href="/admin/students" className="btn-primary mt-4 inline-block">Back to Students</Link>
        </div>
      </AdminLayout>
    );
  }

  const gradeMaterials = materials.filter((m) => m.grade === student.grade);
  const completedIds = new Set(completions.map((c) => c.materialId));
  const doneMats = gradeMaterials.filter((m) => completedIds.has(m.id!)).length;
  const approvedAttempts = attempts.filter((a) => a.status === "approved");
  const avgScore = approvedAttempts.length > 0
    ? Math.round(approvedAttempts.reduce((s, a) => s + a.percentage, 0) / approvedAttempts.length) : 0;
  const myTests = tests.filter((t) => t.grade === student.grade);
  const myAssignments = assignments.filter((a) => a.targetGrades.includes(student.grade));
  const paymentColor = student.paymentStatus === "paid" ? "badge-green" : student.paymentStatus === "waived" ? "badge-blue" : student.paymentStatus === "failed" ? "badge-red" : "badge-yellow";
  const isFamily = /family/i.test(student.planTitle || "");

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: MdPerson },
    { key: "materials", label: "Materials", icon: MdMenuBook },
    { key: "tests", label: "Tests", icon: MdQuiz },
    { key: "assignments", label: "Assignments", icon: MdAssignment },
    { key: "progress", label: "Progress", icon: MdBarChart },
    { key: "analytics", label: "Analytics", icon: MdBarChart },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <Link href="/admin/students" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <MdArrowBack size={16} /> Back to Students
        </Link>

        <div className="admin-card">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#00369b] flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {student.firstName?.[0]}{student.lastName?.[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="badge badge-blue font-mono">{student.studentId}</span>
                  <span className={`badge ${student.status === "active" ? "badge-green" : student.status === "suspended" ? "badge-red" : "badge-gray"}`}>{student.status}</span>
                  <span className="badge badge-blue">Grade {student.grade}</span>
                  {student.planTitle && <span className="badge badge-blue">{student.planTitle}</span>}
                  <span className={`badge ${paymentColor}`}>
                    {student.paymentStatus === "paid" ? "✓ Paid" : student.paymentStatus === "waived" ? "Waived" : student.paymentStatus === "failed" ? "Failed" : "Pending Payment"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MdEmail size={13}/>{student.parentEmail || student.email}</span>
                  {student.parentPhone && <span className="flex items-center gap-1"><MdPhone size={13}/>{student.parentPhone}</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2 text-sm py-1.5 cursor-pointer">
              <MdEdit size={14}/>{editing ? "Cancel" : "Edit details"}
            </button>
          </div>

          {editing && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
              {([
                ["firstName", "First name"], ["lastName", "Last name"],
                ["dateOfBirth", "Date of birth"], ["gender", "Gender"],
                ["school", "School"], ["grade", "Grade"],
                ["subjects", "Subjects (comma-separated)"], ["postcode", "Postcode"],
                ["parentFirstName", "Parent first name"], ["parentLastName", "Parent last name"],
                ["parentEmail", "Parent email"], ["parentPhone", "Parent phone"],
                ["planTitle", "Plan title"], ["planId", "Plan ID"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="admin-label">{label}</label>
                  <input
                    className="admin-input"
                    value={edit[key]}
                    onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="admin-label">Status</label>
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Student["status"] })} className="admin-input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Payment status</label>
                <select value={edit.paymentStatus} onChange={(e) => setEdit({ ...edit, paymentStatus: e.target.value as Student["paymentStatus"] })} className="admin-input">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="waived">Waived</option>
                  <option value="failed">Failed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                  <MdSave size={14}/>{saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Materials Done", value: `${doneMats}/${gradeMaterials.length}` },
            { label: "Tests Taken", value: approvedAttempts.length },
            { label: "Avg Test Score", value: `${avgScore}%` },
            { label: "Assignments", value: myAssignments.length },
          ].map((s) => (
            <div key={s.label} className="admin-card py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 bg-gray-100 p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer ${tab === t.key ? "bg-white text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon size={14}/>{t.label}
            </button>
          ))}
        </div>

        <div className="admin-card">
          {tab === "overview" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Student Information</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["First Name", student.firstName], ["Last Name", student.lastName],
                    ["Date of Birth", student.dateOfBirth], ["Gender", student.gender],
                    ["School", student.school], ["Grade", student.grade],
                    ["Postcode", student.postcode], ["Subjects", student.subjects?.join(", ")],
                    ["Plan", student.planTitle || "—"],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-800">{v || "—"}</p></div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Parent / Guardian</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["Name", `${student.parentFirstName} ${student.parentLastName}`],
                    ["Email", student.parentEmail], ["Phone", student.parentPhone],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-800">{v || "—"}</p></div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Login Credentials</p>
                <div className="bg-blue-50 border border-blue-200 p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Student ID</p>
                      <p className="font-mono font-bold text-[#00369b] text-base">{student.studentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Password (for staff to share)</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-[#00369b] text-base">
                          {student.issuedPassword
                            ? (showPassword ? student.issuedPassword : "••••••••••")
                            : "Not on file — reset to generate"}
                        </p>
                        {student.issuedPassword && (
                          <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-500 cursor-pointer">
                            {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleResetPassword} disabled={resetBusy}
                      className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60 cursor-pointer">
                      <MdLockReset size={16} />{resetBusy ? "Resetting…" : "Reset password"}
                    </button>
                  </div>
                  {resetMsg && <p className="text-xs text-gray-700 bg-white border border-blue-100 px-3 py-2">{resetMsg}</p>}
                </div>
              </div>

              {(siblings.length > 0 || isFamily) && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Family / siblings</p>
                  {siblings.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {siblings.map((sib) => (
                        <li key={sib.id} className="flex items-center justify-between border border-gray-200 px-3 py-2">
                          <span>{sib.firstName} {sib.lastName} · <span className="font-mono text-[#00369b]">{sib.studentId}</span> · Grade {sib.grade}</span>
                          <Link href={`/admin/students/${sib.id}`} className="text-[#00369b] text-xs font-semibold hover:underline">Open</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No other siblings linked to this parent email yet.</p>
                  )}

                  {isFamily && siblings.length + 1 < 3 && (
                    <div className="border border-dashed border-gray-300 p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <MdGroupAdd size={16} /> Add another child to this Family Plan
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {([
                          ["firstName", "First name"], ["lastName", "Last name"],
                          ["dateOfBirth", "DOB"], ["gender", "Gender"],
                          ["school", "School"], ["grade", "Grade"],
                          ["subjects", "Subjects (comma-separated)"],
                        ] as const).map(([key, label]) => (
                          <div key={key} className={key === "subjects" ? "sm:col-span-2" : ""}>
                            <label className="admin-label">{label}</label>
                            <input
                              className="admin-input"
                              value={siblingForm[key]}
                              onChange={(e) => setSiblingForm({ ...siblingForm, [key]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={handleAddSibling} disabled={siblingBusy}
                        className="btn-primary text-sm disabled:opacity-60 cursor-pointer">
                        {siblingBusy ? "Adding…" : "Add sibling"}
                      </button>
                      {siblingMsg && <p className="text-xs text-gray-700">{siblingMsg}</p>}
                    </div>
                  )}
                  {!isFamily && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
                      To add siblings, set Plan title to <strong>Family Plan</strong> (Edit details), or have the parent re-register with the Family Plan using the same parent email.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "materials" && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Materials — Grade {student.grade} · {doneMats}/{gradeMaterials.length} completed
              </p>
              <div className="h-2.5 bg-gray-100 mb-5">
                <div className="h-full bg-[#00369b]" style={{ width: `${gradeMaterials.length > 0 ? Math.round((doneMats / gradeMaterials.length) * 100) : 0}%` }} />
              </div>
              {gradeMaterials.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No materials published for Grade {student.grade}.</p>
              ) : (
                <div className="space-y-2">
                  {gradeMaterials.map((m) => {
                    const done = completedIds.has(m.id!);
                    return (
                      <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${done ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
                        <div>
                          <p className={`font-medium text-sm ${done ? "text-emerald-800" : "text-gray-700"}`}>{m.title}</p>
                          <p className="text-xs text-gray-400">{m.subject}{m.estimatedMinutes ? ` · ${m.estimatedMinutes} min` : ""}</p>
                        </div>
                        <span className={`badge ${done ? "badge-green" : "badge-gray"}`}>{done ? "✓ Done" : "Not Started"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "tests" && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tests & Exams — Grade {student.grade}</p>
              {attempts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No test submissions yet.</p>
              ) : (
                <div className="space-y-3">
                  {myTests.map((test) => {
                    const testAttempts = attempts.filter((a) => a.testId === test.id);
                    if (testAttempts.length === 0) return null;
                    const best = Math.max(...testAttempts.filter((a) => a.status === "approved").map((a) => a.percentage), 0);
                    return (
                      <div key={test.id} className="border border-gray-200 p-4 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">{test.title}</p>
                            <p className="text-xs text-gray-400">{test.subject} · {test.type} · {testAttempts.length} attempt{testAttempts.length !== 1 ? "s" : ""}</p>
                          </div>
                          {best > 0 && <span className={`text-lg font-bold ${best >= test.passMark ? "text-emerald-600" : "text-red-500"}`}>{best}%</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {testAttempts.map((a) => (
                            <div key={a.id} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 ${a.status === "approved" ? (a.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600") : a.status === "pending_review" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                              {a.status === "approved" ? (a.passed ? <MdCheckCircle size={11}/> : <MdCancel size={11}/>) : <MdPending size={11}/>}
                              Attempt {a.attemptNumber}{a.status === "approved" ? ` · ${a.percentage}%` : a.status === "pending_review" ? " · Pending" : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}
            </div>
          )}

          {tab === "assignments" && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assignments — Grade {student.grade}</p>
              {myAssignments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No assignments for this grade yet.</p>
              ) : (
                <div className="space-y-2">
                  {myAssignments.map((a) => {
                    const status = assignmentStatuses[a.id!] ?? "not_started";
                    const statusColor: Record<string, string> = { not_started: "badge-gray", in_progress: "badge-yellow", submitted: "badge-blue", graded: "badge-green" };
                    return (
                      <div key={a.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
                        <div>
                          <p className="font-medium text-sm text-gray-800">{a.title}</p>
                          <p className="text-xs text-gray-400">{a.subject} · {a.type}{a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}</p>
                        </div>
                        <span className={`badge ${statusColor[status]}`}>{status.replace("_", " ")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "progress" && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Academic Progress by Subject</p>
              {progress.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No progress data yet.</p>
              ) : (
                progress.map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-medium text-gray-700">{p.subject} · Grade {p.grade}</span>
                      <span className="font-bold text-gray-900">{p.overallScore}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100">
                      <div className="h-full transition-all" style={{ width: `${p.overallScore}%`, background: p.overallScore >= 80 ? "#22c55e" : p.overallScore >= 60 ? "#3b82f6" : p.overallScore >= 40 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "analytics" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Student Analytics</h2>
                  <p className="text-xs text-gray-400">For parent reports — download CSV or print PDF</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={downloadAnalyticsCsv}
                    className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
                    <MdDownload size={16} /> Download CSV
                  </button>
                  <button type="button" onClick={printAnalyticsForParent}
                    className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
                    <MdDownload size={16} /> Print / PDF for parent
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-center">
                <div className="border border-gray-200 p-4">
                  <p className="text-2xl font-black">{answeredThisYear.length}</p>
                  <p className="text-xs text-gray-500">Questions answered ({currentYear})</p>
                </div>
                <div className="border border-gray-200 p-4">
                  <p className="text-2xl font-black">{formatStudyTime(yearSeconds)}</p>
                  <p className="text-xs text-gray-500">Learning time</p>
                </div>
                <div className="border border-gray-200 p-4">
                  <p className="text-2xl font-black">{skillsPractised}</p>
                  <p className="text-xs text-gray-500">Skills practised</p>
                </div>
              </div>

              <SkillMountainChart mastered={skillsMastered} proficient={skillsProficient} practised={skillsPractised} />

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Quizzes by Category</h3>
                  <p className="text-xs text-gray-400 mb-3">Portal tests + AI practice</p>
                  <PracticePieChart rows={quizCategoryRows} />
                </div>
                <div className="border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Assignments by Category</h3>
                  <p className="text-xs text-gray-400 mb-3">Quiz assignments</p>
                  <PracticePieChart rows={assignmentCategoryRows} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
