"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import WysiwygEditor from "@/components/WysiwygEditor";
import {
  getAllTests, createTest, updateTest, deleteTest,
  getAllAttempts, reviewAttempt, getAllMaterials, getAllQuestionSets,
  createAnnouncement,
  type Test, type TestAttempt, type Question, type QuestionType, type LearningMaterial, type QuestionSet,
} from "@/lib/firestore";
import {
  MdAdd, MdEdit, MdDelete, MdClose, MdCheck, MdCancel,
  MdQuiz, MdVisibility, MdVisibilityOff, MdPending, MdLibraryBooks, MdAutoAwesome,
} from "react-icons/md";

const GRADES = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function newQuestion(type: QuestionType = "multiple_choice"): Question {
  const base = {
    id: crypto.randomUUID(),
    type,
    text: "",
    correctAnswer: "",
    points: 1,
    explanation: "",
  };

  return type === "multiple_choice"
    ? { ...base, options: ["", "", "", ""] }
    : base;
}

const EMPTY_TEST: Omit<Test, "id"> = {
  title: "", description: "", grade: "1", subject: "",
  type: "test", questions: [newQuestion()],
  totalPoints: 1, passMark: 60, maxAttempts: 3,
  timeLimit: 0, linkedMaterialId: "", published: false,
};

export default function TestsPage() {
  const [tab, setTab] = useState<"tests" | "results">("tests");
  const [tests, setTests] = useState<Test[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState<Omit<Test, "id">>(EMPTY_TEST);
  const [saving, setSaving] = useState(false);
  const [reviewModal, setReviewModal] = useState<TestAttempt | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [libraryModal, setLibraryModal] = useState(false);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [libLoading, setLibLoading] = useState(false);

  async function load() {
    try {
      const [t, a, mats] = await Promise.all([getAllTests(), getAllAttempts(), getAllMaterials()]);
      setTests(t); setAttempts(a); setMaterials(mats);
    } catch (err) {
      console.error("Tests load error:", err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function calcTotal(qs: Question[]) {
    return qs.reduce((s, q) => s + (q.points || 0), 0);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_TEST, questions: [newQuestion()] });
    setModalOpen(true);
  }

  function openEdit(t: Test) {
    setEditing(t);
    setForm({
      title: t.title, description: t.description, grade: t.grade,
      subject: t.subject, type: t.type, questions: t.questions,
      totalPoints: t.totalPoints, passMark: t.passMark,
      maxAttempts: t.maxAttempts, timeLimit: t.timeLimit ?? 0,
      linkedMaterialId: t.linkedMaterialId ?? "",
      published: t.published,
    });
    setModalOpen(true);
  }

  function updateQ(idx: number, patch: Partial<Question>) {
    const qs = [...form.questions];
    qs[idx] = { ...qs[idx], ...patch };
    const total = calcTotal(qs);
    setForm((f) => ({ ...f, questions: qs, totalPoints: total }));
  }

  function addQuestion(type: QuestionType) {
    const qs = [...form.questions, newQuestion(type)];
    setForm((f) => ({ ...f, questions: qs, totalPoints: calcTotal(qs) }));
  }

  function removeQuestion(idx: number) {
    const qs = form.questions.filter((_, i) => i !== idx);
    setForm((f) => ({ ...f, questions: qs, totalPoints: calcTotal(qs) }));
  }

  async function openLibrary() {
    setLibLoading(true);
    setLibraryModal(true);
    try {
      const sets = await getAllQuestionSets();
      setQuestionSets(sets);
    } finally {
      setLibLoading(false);
    }
  }

  function importFromSet(set: QuestionSet) {
    // Convert AIQuestion → Question (they share all needed fields)
    const imported: Question[] = set.questions.map((aq) => {
      const type = (aq.type === "extended_response" ? "short_answer" : aq.type) as QuestionType;
      const base = {
        id: crypto.randomUUID(),
        type,
        text: aq.text,
        correctAnswer: aq.correctAnswer,
        points: aq.points ?? 1,
        explanation: aq.explanation ?? "",
        ...(aq.imageUrl ? { imageUrl: aq.imageUrl } : {}),
      };
      return type === "multiple_choice"
        ? { ...base, options: aq.options ?? ["", "", "", ""] }
        : base;
    });
    const merged = [...form.questions.filter((q) => q.text.trim() !== ""), ...imported];
    setForm((f) => ({ ...f, questions: merged, totalPoints: calcTotal(merged) }));
    setLibraryModal(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, totalPoints: calcTotal(form.questions) };
      if (editing?.id) await updateTest(editing.id, data);
      else await createTest(data);
      if (data.published) {
        await createAnnouncement({
          title: editing ? `Updated ${data.type}: ${data.title}` : `New ${data.type}: ${data.title}`,
          body: `A new ${data.type === "exam" ? "exam" : "test"} is now published for Grade ${data.grade}. Check your portal to start it now.`,
          targetGrades: [data.grade],
          pinned: false,
          published: true,
        });
      }
      await load(); setModalOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this test?")) return;
    await deleteTest(id); await load();
  }

  async function handleReview(status: "approved" | "rejected") {
    if (!reviewModal?.id) return;
    setReviewing(true);
    try {
      await reviewAttempt(reviewModal.id, status, reviewComment);
      await load(); setReviewModal(null); setReviewComment("");
    } finally { setReviewing(false); }
  }

  const pending = attempts.filter((a) => a.status === "pending_review");

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tests &amp; Exams</h1>
            <p className="text-gray-500 text-sm mt-0.5">Create assessments and review student results</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <MdAdd size={18} /> Create Test
            </button>
            <a href="/admin/question-library" className="btn-secondary flex items-center gap-2 text-sm">
              <MdLibraryBooks size={16} /> Question Library
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(["tests", "results"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
              {t === "results" ? `Results${pending.length > 0 ? ` (${pending.length} pending)` : ""}` : "Tests"}
            </button>
          ))}
        </div>

        {tab === "tests" && (
          <div className="admin-card p-0 overflow-hidden">
            {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
              : tests.length === 0 ? (
                <div className="p-12 text-center">
                  <MdQuiz size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No tests yet. Create your first one.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr>
                    <th>Title</th><th>Grade</th><th>Subject</th><th>Type</th>
                    <th>Questions</th><th>Pass Mark</th><th>Attempts</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td><p className="font-medium text-gray-800">{t.title}</p></td>
                        <td><span className="badge badge-blue">Grade {t.grade}</span></td>
                        <td className="text-gray-600">{t.subject}</td>
                        <td><span className={`badge ${t.type === "exam" ? "badge-red" : "badge-blue"}`}>{t.type}</span></td>
                        <td className="text-gray-600">{t.questions.length} ({t.totalPoints} pts)</td>
                        <td className="text-gray-600">{t.passMark}%</td>
                        <td className="text-gray-600">Max {t.maxAttempts}</td>
                        <td><span className={`badge ${t.published ? "badge-green" : "badge-yellow"}`}>{t.published ? "Live" : "Draft"}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={16} /></button>
                            <a href={`/admin/analytics/test/${t.id}`} className="p-1.5 text-gray-400 hover:text-purple-600 inline-flex" title="Analytics">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                            </a>
                            <button onClick={() => handleDelete(t.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {tab === "results" && (
          <div className="admin-card p-0 overflow-hidden">
            {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
              : attempts.length === 0 ? (
                <div className="p-12 text-center">
                  <MdPending size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No submissions yet.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr>
                    <th>Student</th><th>Test</th><th>Attempt</th><th>Score</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a.id}>
                        <td><p className="font-medium text-gray-800">{a.studentName ?? a.studentId}</p></td>
                        <td className="text-gray-600">{a.testTitle ?? a.testId}</td>
                        <td className="text-gray-500">#{a.attemptNumber}</td>
                        <td>
                          <span className={`font-bold text-sm ${a.status === "approved" ? (a.passed ? "text-emerald-600" : "text-red-500") : "text-gray-500"}`}>
                            {a.status === "approved" ? `${a.percentage}%` : "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${a.status === "approved" ? (a.passed ? "badge-green" : "badge-red")
                            : a.status === "rejected" ? "badge-red" : "badge-yellow"
                            }`}>{a.status.replace("_", " ")}</span>
                        </td>
                        <td>
                          {a.status === "pending_review" && (
                            <button onClick={() => { setReviewModal(a); setReviewComment(""); }}
                              className="btn-primary text-xs py-1 px-3">Review</button>
                          )}
                          {a.status !== "pending_review" && (
                            <span className="text-xs text-gray-400">{a.adminComment || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">Review Submission</h2>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="font-semibold">Student:</span> {reviewModal.studentName ?? reviewModal.studentId}</p>
                <p><span className="font-semibold">Test:</span> {reviewModal.testTitle}</p>
                <p><span className="font-semibold">Score:</span> {reviewModal.percentage}% ({reviewModal.score}/{reviewModal.totalPoints} pts)</p>
                <p><span className="font-semibold">Passed:</span> {reviewModal.passed ? "✅ Yes" : "❌ No"}</p>
              </div>
              <div>
                <label className="admin-label">Answers Submitted</label>
                <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-gray-600 space-y-1">
                  {Object.entries(reviewModal.answers).map(([qId, ans]) => (
                    <p key={qId}><span className="font-mono text-gray-400">{qId.slice(0, 8)}…</span>: {ans}</p>
                  ))}
                </div>
              </div>
              <div>
                <label className="admin-label">Comment (optional)</label>
                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                  rows={3} placeholder="Feedback for the student…"
                  className="admin-input resize-none" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => handleReview("approved")} disabled={reviewing}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                  <MdCheck size={16} /> Approve
                </button>
                <button onClick={() => handleReview("rejected")} disabled={reviewing}
                  className="flex items-center gap-2 btn-danger text-sm rounded-lg">
                  <MdCancel size={16} /> Reject
                </button>
                <button onClick={() => setReviewModal(null)} className="btn-secondary text-sm ml-auto">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Test Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>

          {/* Library Picker Modal */}
          {libraryModal && (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setLibraryModal(false)}>
              <div className="modal-box" style={{ maxWidth: 680 }}>
                <div className="modal-header">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MdAutoAwesome size={16} className="text-purple-600" /> Import from Question Library
                  </h2>
                  <button onClick={() => setLibraryModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto" style={{ maxHeight: "65vh" }}>
                  {libLoading ? (
                    <div className="py-12 text-center text-gray-400 text-sm">Loading library…</div>
                  ) : questionSets.length === 0 ? (
                    <div className="py-12 text-center">
                      <MdLibraryBooks size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No question sets saved yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Generate questions in the AI Generator and save them to the library first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questionSets.map((set) => (
                        <div key={set.id} className="border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{set.title}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">{set.subject}</span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5">{set.curriculum}</span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5">{set.year}</span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5">{set.difficulty}</span>
                                <span className="text-xs text-gray-400">{set.questions.length} questions</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{set.topic}{set.subtopic ? ` › ${set.subtopic}` : ""}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => importFromSet(set)}
                              className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition-colors">
                              <MdAdd size={15} /> Import
                            </button>
                          </div>
                          {/* Preview first 2 questions */}
                          <div className="mt-3 space-y-1.5">
                            {set.questions.slice(0, 2).map((q, i) => (
                              <p key={i} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-200 line-clamp-1">
                                Q{i + 1}: {q.text}
                              </p>
                            ))}
                            {set.questions.length > 2 && (
                              <p className="text-xs text-gray-400 pl-2">+ {set.questions.length - 2} more questions…</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="modal-box" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">{editing ? "Edit Test" : "Create Test / Exam"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: "75vh" }}>
              {/* Meta */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="admin-label">Title *</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" placeholder="e.g. Chapter 3 Quiz" />
                </div>
                <div>
                  <label className="admin-label">Grade *</label>
                  <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="admin-input">
                    {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Subject *</label>
                  <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="admin-input" placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label className="admin-label">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "test" | "exam" })} className="admin-input">
                    <option value="test">Test</option>
                    <option value="exam">Exam</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">Pass Mark (%)</label>
                  <input type="number" min={0} max={100} value={form.passMark} onChange={(e) => setForm({ ...form, passMark: Number(e.target.value) })} className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">Max Attempts</label>
                  <input type="number" min={1} value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })} className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">Time Limit (minutes, 0 = unlimited)</label>
                  <input type="number" min={0} value={form.timeLimit ?? 0} onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })} className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">Unlock After Material (optional)</label>
                  <select value={form.linkedMaterialId ?? ""} onChange={(e) => setForm({ ...form, linkedMaterialId: e.target.value })} className="admin-input">
                    <option value="">— No prerequisite (always visible) —</option>
                    {materials.filter((m) => m.grade === form.grade).map((m) => (
                      <option key={m.id} value={m.id}>{m.title} · {m.subject}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Students must complete this material before the test unlocks.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="admin-label">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="admin-input resize-none" placeholder="Brief description for students" />
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Questions <span className="text-gray-400 font-normal text-sm">({form.questions.length} · {calcTotal(form.questions)} pts total)</span></h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={openLibrary}
                      className="btn-secondary text-xs flex items-center gap-1 py-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                      <MdAutoAwesome size={12} /> Import from Library
                    </button>
                    {(["multiple_choice", "true_false", "short_answer"] as QuestionType[]).map((t) => (
                      <button key={t} type="button" onClick={() => addQuestion(t)}
                        className="btn-secondary text-xs flex items-center gap-1 py-1">
                        <MdAdd size={12} />{t.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-5">
                  {form.questions.map((q, idx) => (
                    <div key={q.id} className="border border-gray-200 rounded-xl p-4 relative">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Q{idx + 1} · {q.type.replace("_", " ")}</span>
                        {form.questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(idx)} className="text-red-400 hover:text-red-600"><MdClose size={16} /></button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="admin-label">Question Text</label>
                          <textarea value={q.text} onChange={(e) => updateQ(idx, { text: e.target.value })} rows={2} className="admin-input resize-none" placeholder="Enter question…" />
                        </div>
                        {q.type === "multiple_choice" && (
                          <div>
                            <label className="admin-label">Options (mark correct with radio)</label>
                            {(q.options ?? ["", "", "", ""]).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2 mb-2">
                                <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === opt && opt !== ""}
                                  onChange={() => updateQ(idx, { correctAnswer: opt })} className="shrink-0" />
                                <input value={opt} onChange={(e) => {
                                  const opts = [...(q.options ?? [])];
                                  opts[oi] = e.target.value;
                                  updateQ(idx, { options: opts });
                                }} className="admin-input" placeholder={`Option ${oi + 1}`} />
                              </div>
                            ))}
                            <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>
                          </div>
                        )}
                        {q.type === "true_false" && (
                          <div>
                            <label className="admin-label">Correct Answer</label>
                            <select value={q.correctAnswer} onChange={(e) => updateQ(idx, { correctAnswer: e.target.value })} className="admin-input w-auto">
                              <option value="">Select…</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                        )}
                        {q.type === "short_answer" && (
                          <div>
                            <label className="admin-label">Model Answer (keyword match)</label>
                            <input value={q.correctAnswer} onChange={(e) => updateQ(idx, { correctAnswer: e.target.value })} className="admin-input" placeholder="Key term the answer must contain…" />
                            <p className="text-xs text-gray-400 mt-1">Student answer is correct if it contains this text.</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="admin-label">Points</label>
                            <input type="number" min={1} value={q.points} onChange={(e) => updateQ(idx, { points: Number(e.target.value) })} className="admin-input" />
                          </div>
                          <div>
                            <label className="admin-label">Explanation (shown after)</label>
                            <input value={q.explanation ?? ""} onChange={(e) => updateQ(idx, { explanation: e.target.value })} className="admin-input" placeholder="Optional…" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm({ ...form, published: !form.published })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${form.published ? "bg-[#00369b]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${form.published ? "left-5" : "left-0.5"}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{form.published ? "Published (live to students)" : "Save as Draft"}</span>
              </label>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Test"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
