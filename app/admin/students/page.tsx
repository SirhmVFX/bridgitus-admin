"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllStudents, updateStudent, deleteStudent,
  getAttemptsByStudent, getProgressByStudent, getCompletionsByStudent,
  getAllMaterials,
  type Student, type TestAttempt, type StudentProgress, type MaterialCompletion, type LearningMaterial,
} from "@/lib/firestore";
import {
  MdPeople, MdEdit, MdDelete, MdClose, MdSearch,
  MdVisibility, MdBadge, MdSchool, MdEmail, MdOutgoingMail,
} from "react-icons/md";

const GRADES = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<TestAttempt[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [studentCompletions, setStudentCompletions] = useState<MaterialCompletion[]>([]);
  const [allMaterials, setAllMaterials] = useState<LearningMaterial[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusEdit, setStatusEdit] = useState<Student["status"]>("active");
  const [gradeEdit, setGradeEdit] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const [s, mats] = await Promise.all([getAllStudents(), getAllMaterials()]);
      setStudents(s); setAllMaterials(mats);
    } catch (err) {
      console.error("Failed to load students:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load data. Check your Firebase configuration and Firestore security rules.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function openView(s: Student) {
    setViewStudent(s);
    setDetailLoading(true);
    try {
      const [att, prog, comps] = await Promise.all([
        getAttemptsByStudent(s.id!),
        getProgressByStudent(s.id!),
        getCompletionsByStudent(s.id!),
      ]);
      setStudentAttempts(att);
      setStudentProgress(prog);
      setStudentCompletions(comps);
    } catch (err) {
      console.error("Failed to load student detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  function openEdit(s: Student) {
    setEditStudent(s);
    setStatusEdit(s.status);
    setGradeEdit(s.grade);
  }

  async function handleSaveEdit() {
    if (!editStudent?.id) return;
    setSaving(true);
    try {
      await updateStudent(editStudent.id, { status: statusEdit, grade: gradeEdit });
      await load();
      setEditStudent(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this student record? This cannot be undone.")) return;
    await deleteStudent(id); await load();
  }

  async function handleResendOnboarding(s: Student) {
    if (!s.id) return;
    if (!confirm(`Resend onboarding email for ${s.firstName} ${s.lastName}?\n\nThis emails login details (Student ID + portal link) and triggers a Firebase password-reset email.`)) {
      return;
    }
    setResendingId(s.id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/students/resend-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: s.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend");
      }
      setActionMsg({
        type: "ok",
        text: `${data.message} · Student ID: ${data.studentId} · Email: ${data.email}`,
      });
      await load();
    } catch (err: unknown) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to resend onboarding email",
      });
    } finally {
      setResendingId(null);
    }
  }

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    const gradeNorm = (s.grade || "").toString().replace(/^grade\s*/i, "").trim().toLowerCase();
    const sMatch =
      !q ||
      `${s.firstName} ${s.lastName} ${s.studentId} ${s.email} ${s.parentEmail || ""} ${s.school || ""} grade ${s.grade} ${gradeNorm}`
        .toLowerCase()
        .includes(q) ||
      gradeNorm === q.replace(/^grade\s*/i, "").trim();
    const filterGrade = gradeFilter === "all" ? "" : gradeFilter.replace(/^grade\s*/i, "").trim().toLowerCase();
    const gMatch = !filterGrade || gradeNorm === filterGrade;
    const stMatch = statusFilter === "all" || s.status === statusFilter;
    return sMatch && gMatch && stMatch;
  });

  const avgScore = (atts: TestAttempt[]) => {
    const approved = atts.filter((a) => a.status === "approved");
    if (!approved.length) return null;
    return Math.round(approved.reduce((s, a) => s + a.percentage, 0) / approved.length);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-500 text-sm mt-0.5">{students.length} enrolled student{students.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="flex">
            <div className="relative flex-1 min-w-48">
              <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, email, or grade…" className="admin-input pl-8" />
            </div>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="admin-input w-auto min-w-[9rem]" title="Filter by grade">
              <option value="all">All Grades</option>
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input w-auto">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {actionMsg && (
          <div className={`px-4 py-3 text-sm border ${actionMsg.type === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-700"
            }`}>
            {actionMsg.text}
            <button type="button" className="ml-3 underline" onClick={() => setActionMsg(null)}>Dismiss</button>
          </div>
        )}

        {/* Table */}
        <div className="admin-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-[#00369b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading students…</p>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center">
              <p className="text-red-500 font-semibold mb-2">Failed to load students</p>
              <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{loadError}</p>
              <button onClick={load} className="btn-primary text-sm">Retry</button>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-xs text-amber-700 text-left max-w-lg mx-auto">
                <p className="font-semibold mb-1">Troubleshooting tips:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Ensure you are logged in as an admin user registered in Firestore (/admins collection)</li>
                  <li>Check your Firestore security rules allow authenticated reads on the &apos;students&apos; collection</li>
                  <li>Verify your Firebase env vars in .env.local are correct</li>
                </ul>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MdPeople size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No students found.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr>
                <th>Student</th><th>Student ID</th><th>Grade</th><th>School</th>
                <th>Parent Email</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00369b]/10 flex items-center justify-center text-[#00369b] text-xs font-bold shrink-0">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs text-[#00369b] font-bold">{s.studentId}</span></td>
                    <td><span className="badge badge-blue">Grade {s.grade}</span></td>
                    <td className="text-gray-600 text-sm">{s.school}</td>
                    <td className="text-gray-600 text-sm">{s.parentEmail}</td>
                    <td><span className={`badge ${s.status === "active" ? "badge-green" : s.status === "suspended" ? "badge-red" : "badge-gray"}`}>{s.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => openView(s)} className="p-1.5 text-gray-400 hover:text-[#00369b]" title="Quick view"><MdVisibility size={16} /></button>
                        <a href={`/admin/students/${s.id}`} className="p-1.5 text-gray-400 hover:text-[#00369b] inline-flex" title="Full details">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </a>
                        <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-[#00369b]" title="Edit"><MdEdit size={16} /></button>
                        <button onClick={() => handleDelete(s.id!)} className="p-1.5 text-gray-400 hover:text-red-500" title="Delete"><MdDelete size={16} /></button>
                        <button
                          onClick={() => handleResendOnboarding(s)}
                          disabled={resendingId === s.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border border-[#00369b]/30 text-[#00369b] hover:bg-[#00369b] hover:text-white disabled:opacity-40 transition-colors"
                          title="Resend onboarding email"
                        >
                          {resendingId === s.id ? (
                            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MdOutgoingMail size={13} />
                          )}
                          Resend onboarding email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View modal */}
      {viewStudent && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewStudent(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">Student Record</h2>
              <button onClick={() => setViewStudent(null)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: "75vh" }}>
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#00369b] flex items-center justify-center text-white text-xl font-bold">
                  {viewStudent.firstName?.[0]}{viewStudent.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{viewStudent.firstName} {viewStudent.lastName}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="badge badge-blue font-mono">{viewStudent.studentId}</span>
                    <span className={`badge ${viewStudent.status === "active" ? "badge-green" : "badge-gray"}`}>{viewStudent.status}</span>
                    <span className="badge badge-blue">Grade {viewStudent.grade}</span>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Login Credentials</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Student ID</p><p className="font-mono font-bold text-[#00369b]">{viewStudent.studentId}</p></div>
                  <div><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800">{viewStudent.email}</p></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MdEmail size={12} /> Credentials were emailed at registration.</p>
              </div>

              {/* Personal info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Student Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { l: "DOB", v: viewStudent.dateOfBirth },
                    { l: "Gender", v: viewStudent.gender },
                    { l: "School", v: viewStudent.school },
                    { l: "Grade", v: viewStudent.grade },
                    { l: "Subjects", v: viewStudent.subjects?.join(", ") },
                    { l: "Postcode", v: viewStudent.postcode },
                  ].map(({ l, v }) => (
                    <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-800">{v || "—"}</p></div>
                  ))}
                </div>
              </div>

              {/* Parent */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Parent / Guardian</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Name</p><p className="font-medium">{viewStudent.parentFirstName} {viewStudent.parentLastName}</p></div>
                  <div><p className="text-xs text-gray-400">Phone</p><p className="font-medium">{viewStudent.parentPhone}</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-400">Email</p><p className="font-medium">{viewStudent.parentEmail}</p></div>
                </div>
              </div>

              {/* Academic */}
              {detailLoading ? (
                <div className="text-sm text-gray-400 text-center py-4">Loading academic data…</div>
              ) : (
                <>
                  {studentAttempts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Test Results</p>
                      <div className="space-y-2">
                        {studentAttempts.map((a) => (
                          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                            <span className="text-gray-700">{a.testTitle ?? "Test"} (Attempt #{a.attemptNumber})</span>
                            <div className="flex items-center gap-2">
                              {a.status === "approved" && (
                                <span className={`font-bold ${a.passed ? "text-emerald-600" : "text-red-500"}`}>{a.percentage}%</span>
                              )}
                              <span className={`badge ${a.status === "approved" ? (a.passed ? "badge-green" : "badge-red") : "badge-yellow"}`}>
                                {a.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {studentProgress.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Progress by Subject</p>
                      {studentProgress.map((p) => (
                        <div key={p.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{p.subject}</span>
                            <span className="font-bold text-gray-900">{p.overallScore}%</span>
                          </div>
                          <div className="h-2 bg-gray-100">
                            <div className="h-full bg-[#00369b]" style={{ width: `${p.overallScore}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Materials completed */}
                  {(() => {
                    const gradeM = allMaterials.filter((m) => m.grade === viewStudent?.grade);
                    if (gradeM.length === 0) return null;
                    const completedIds = new Set(studentCompletions.map((c) => c.materialId));
                    const doneCount = gradeM.filter((m) => completedIds.has(m.id!)).length;
                    return (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Materials — {doneCount}/{gradeM.length} completed
                        </p>
                        <div className="h-2 bg-gray-100 mb-3">
                          <div className="h-full bg-emerald-500" style={{ width: `${gradeM.length > 0 ? Math.round((doneCount / gradeM.length) * 100) : 0}%` }} />
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {gradeM.map((m) => (
                            <div key={m.id} className={`flex items-center justify-between text-sm px-3 py-1.5 ${completedIds.has(m.id!) ? "bg-emerald-50" : "bg-gray-50"}`}>
                              <span className={completedIds.has(m.id!) ? "text-emerald-700 font-medium" : "text-gray-500"}>{m.title}</span>
                              <span className={`text-xs font-semibold ${completedIds.has(m.id!) ? "text-emerald-600" : "text-gray-400"}`}>
                                {completedIds.has(m.id!) ? "✓ Done" : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editStudent && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditStudent(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">Edit Student</h2>
              <button onClick={() => setEditStudent(null)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-gray-800">{editStudent.firstName} {editStudent.lastName} · {editStudent.studentId}</p>
              <div>
                <label className="admin-label">Grade</label>
                <select value={gradeEdit} onChange={(e) => setGradeEdit(e.target.value)} className="admin-input">
                  {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Account Status</label>
                <select value={statusEdit} onChange={(e) => setStatusEdit(e.target.value as Student["status"])} className="admin-input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
                <button onClick={() => setEditStudent(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
