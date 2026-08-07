"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  getStudentById, updateStudent, getAttemptsByStudent, getProgressByStudent,
  getCompletionsByStudent, getAllMaterials, getAllTests, getAllAssignments,
  getSubmissionsByAssignment,
  type Student, type TestAttempt, type StudentProgress,
  type MaterialCompletion, type LearningMaterial, type Test, type Assignment,
} from "@/lib/firestore";
import {
  MdArrowBack, MdPerson, MdSchool, MdEmail, MdPhone, MdBadge,
  MdPayment, MdCheckCircle, MdPending, MdCancel, MdBarChart,
  MdMenuBook, MdQuiz, MdAssignment, MdEdit, MdSave,
} from "react-icons/md";

type Tab = "overview" | "materials" | "tests" | "assignments" | "progress";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [completions, setCompletions] = useState<MaterialCompletion[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [statusEdit, setStatusEdit] = useState<Student["status"]>("active");
  const [gradeEdit, setGradeEdit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [s, att, prog, comps, mats, tst, asgn] = await Promise.all([
        getStudentById(id),
        getAttemptsByStudent(id),
        getProgressByStudent(id),
        getCompletionsByStudent(id),
        getAllMaterials(),
        getAllTests(),
        getAllAssignments(),
      ]);
      setStudent(s); setAttempts(att); setProgress(prog);
      setCompletions(comps); setMaterials(mats); setTests(tst);
      setAssignments(asgn);
      if (s) { setStatusEdit(s.status); setGradeEdit(s.grade); }
      // Load assignment submission statuses for this student
      const statuses: Record<string, string> = {};
      await Promise.all(asgn.map(async (a) => {
        if (a.id) {
          const subs = await getSubmissionsByAssignment(a.id);
          const mine = subs.find((sub) => sub.studentId === id);
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
    await updateStudent(student.id, { status: statusEdit, grade: gradeEdit });
    setStudent((s) => s ? { ...s, status: statusEdit, grade: gradeEdit } : s);
    setEditing(false); setSaving(false);
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

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview",    label: "Overview",    icon: MdPerson },
    { key: "materials",   label: "Materials",   icon: MdMenuBook },
    { key: "tests",       label: "Tests",       icon: MdQuiz },
    { key: "assignments", label: "Assignments", icon: MdAssignment },
    { key: "progress",    label: "Progress",    icon: MdBarChart },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Back */}
        <Link href="/admin/students" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <MdArrowBack size={16} /> Back to Students
        </Link>

        {/* Student header card */}
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
                  <span className={`badge ${paymentColor}`}>
                    {student.paymentStatus === "paid" ? "✓ Paid" : student.paymentStatus === "waived" ? "Waived" : student.paymentStatus === "failed" ? "Failed" : "Pending Payment"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MdEmail size={13}/>{student.email}</span>
                  {student.parentPhone && <span className="flex items-center gap-1"><MdPhone size={13}/>{student.parentPhone}</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
              <MdEdit size={14}/>{editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {editing && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-end">
              <div>
                <label className="admin-label">Grade</label>
                <select value={gradeEdit} onChange={(e) => setGradeEdit(e.target.value)} className="admin-input w-auto">
                  {["Pre-K","K","1","2","3","4","5","6","7","8","9","10","11","12"].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Status</label>
                <select value={statusEdit} onChange={(e) => setStatusEdit(e.target.value as Student["status"])} className="admin-input w-auto">
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                </select>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <MdSave size={14}/>{saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Materials Done",   value: `${doneMats}/${gradeMaterials.length}`, color: "bg-indigo-50 text-indigo-600" },
            { label: "Tests Taken",      value: approvedAttempts.length,                color: "bg-blue-50 text-blue-600" },
            { label: "Avg Test Score",   value: `${avgScore}%`,                          color: "bg-emerald-50 text-emerald-600" },
            { label: "Assignments",      value: myAssignments.length,                    color: "bg-amber-50 text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="admin-card py-4 text-center">
              <p className={`text-2xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-all ${tab === t.key ? "bg-white text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon size={14}/>{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="admin-card">

          {/* Overview */}
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
                <div className="grid sm:grid-cols-2 gap-3 text-sm bg-blue-50 border border-blue-200 p-4">
                  <div><p className="text-xs text-gray-400">Student ID</p><p className="font-mono font-bold text-[#00369b] text-base">{student.studentId}</p></div>
                  <div><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800">{student.email}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Materials */}
          {tab === "materials" && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Materials — Grade {student.grade} · {doneMats}/{gradeMaterials.length} completed
              </p>
              <div className="h-2.5 bg-gray-100 mb-5">
                <div className="h-full bg-[#00369b]" style={{ width: `${gradeMaterials.length > 0 ? Math.round((doneMats/gradeMaterials.length)*100) : 0}%` }}/>
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

          {/* Tests */}
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
                        {testAttempts.some((a) => a.adminComment) && (
                          <div className="mt-2 p-2 bg-blue-50 text-xs text-blue-600">
                            {testAttempts.filter((a) => a.adminComment).map((a) => <p key={a.id}>Attempt {a.attemptNumber}: {a.adminComment}</p>)}
                          </div>
                        )}
                      </div>
                    );
                  }).filter(Boolean)}
                  {myTests.every((t) => !attempts.some((a) => a.testId === t.id)) && (
                    <p className="text-sm text-gray-400 text-center py-4">No attempts on any tests yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Assignments */}
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
                          <p className="text-xs text-gray-400">{a.subject} · {a.type}{a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString("en-AU", {day:"numeric",month:"short"})}` : ""}</p>
                        </div>
                        <span className={`badge ${statusColor[status]}`}>{status.replace("_", " ")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {tab === "progress" && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Academic Progress by Subject</p>
              {progress.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No progress data yet. Progress is recorded when tests are approved.</p>
              ) : (
                progress.map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-medium text-gray-700">{p.subject} · Grade {p.grade}</span>
                      <span className="font-bold text-gray-900">{p.overallScore}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100">
                      <div className="h-full transition-all" style={{ width: `${p.overallScore}%`, background: p.overallScore >= 80 ? "#22c55e" : p.overallScore >= 60 ? "#3b82f6" : p.overallScore >= 40 ? "#f59e0b" : "#ef4444" }}/>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      <span>Tests: {p.testsCompleted} taken, {p.testsPassed} passed</span>
                      <span>Materials: {p.materialsCompleted} completed</span>
                      <span>Assignments: {p.assignmentsCompleted} done</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}
