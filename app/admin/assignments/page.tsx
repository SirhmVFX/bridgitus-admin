"use client";

import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import WysiwygEditor from "@/components/WysiwygEditor";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  getAllAssignments, createAssignment, updateAssignment, deleteAssignment,
  getAllStudents, getSubmissionsByAssignment, gradeSubmission, getAllMaterials,
  getAllQuestionSets, createAnnouncement,
  type Assignment, type Student, type AssignmentSubmission,
  type LearningMaterial, type QuestionSet, type Question, type QuestionType,
} from "@/lib/firestore";
import {
  MdAdd, MdEdit, MdDelete, MdClose, MdSearch, MdVisibility,
  MdOpenInNew, MdUpload, MdGrade, MdAutoAwesome, MdLibraryBooks,
  MdQuiz, MdCheckCircle, MdCancel,
} from "react-icons/md";

const GRADES = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const EMPTY: Omit<Assignment, "id"> = {
  title: "", description: "", grade: "1", subject: "",
  type: "custom", platformUrl: "", platform: "other",
  content: "", fileUrl: "", fileName: "", dueDate: "",
  maxScore: 100, linkedMaterialId: "", targetGrades: ["1"],
  targetStudentIds: [], published: false,
  questions: [], totalPoints: 0, passMark: 60,
  timeLimit: 0, maxAttempts: 1,
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<Omit<Assignment, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [subModal, setSubModal] = useState<{ a: Assignment; subs: AssignmentSubmission[] } | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [libModal, setLibModal] = useState(false);
  const [libMode, setLibMode] = useState<"worksheet" | "quiz">("quiz");
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [libLoading, setLibLoading] = useState(false);

  async function load() {
    try {
      const [a, s, mats] = await Promise.all([getAllAssignments(), getAllStudents(), getAllMaterials()]);
      setAssignments(a); setStudents(s); setMaterials(mats);
    } catch (err) { console.error("Assignments load error:", err); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }

  function openEdit(a: Assignment) {
    setEditing(a);
    setForm({
      title: a.title, description: a.description, grade: a.grade,
      subject: a.subject, type: a.type, platformUrl: a.platformUrl ?? "",
      platform: a.platform ?? "other", content: a.content ?? "",
      fileUrl: a.fileUrl ?? "", fileName: a.fileName ?? "",
      dueDate: a.dueDate ?? "", maxScore: a.maxScore ?? 100,
      linkedMaterialId: a.linkedMaterialId ?? "",
      targetGrades: a.targetGrades, targetStudentIds: a.targetStudentIds ?? [],
      published: a.published,
      questions: a.questions ?? [], totalPoints: a.totalPoints ?? 0,
      passMark: a.passMark ?? 60, timeLimit: a.timeLimit ?? 0,
      maxAttempts: a.maxAttempts ?? 1,
    });
    setModalOpen(true);
  }

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

  function updateQuestion(index: number, patch: Partial<Question>) {
    const qs = [...(form.questions ?? [])];
    qs[index] = { ...qs[index], ...patch };
    const total = qs.reduce((sum, q) => sum + (q.points ?? 0), 0);
    setForm((current) => ({ ...current, questions: qs, totalPoints: total, maxScore: total }));
  }

  function addQuestion(type: QuestionType) {
    const qs = [...(form.questions ?? []), newQuestion(type)];
    const total = qs.reduce((sum, q) => sum + (q.points ?? 0), 0);
    setForm((current) => ({ ...current, questions: qs, totalPoints: total, maxScore: total, type: "quiz" }));
  }

  function removeQuestion(index: number) {
    const qs = (form.questions ?? []).filter((_, i) => i !== index);
    const total = qs.reduce((sum, q) => sum + (q.points ?? 0), 0);
    setForm((current) => ({ ...current, questions: qs, totalPoints: total, maxScore: total }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFileUploading(true);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/assignments");
      setForm((f) => ({ ...f, fileUrl: url, fileName: file.name }));
    } catch (err) { alert(err instanceof Error ? err.message : "Upload failed"); }
    finally { setFileUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form };
      if (data.type === "quiz") {
        data.totalPoints = (data.questions ?? []).reduce((s, q) => s + (q.points ?? 1), 0);
        data.maxScore = data.totalPoints;
      }
      if (editing?.id) {
        await updateAssignment(editing.id, data);
      } else {
        await createAssignment(data);
      }
      if (data.published) {
        await createAnnouncement({
          title: editing ? `Updated assignment: ${data.title}` : `New assignment: ${data.title}`,
          body: `A new ${data.type === "quiz" ? "quiz assignment" : "assignment"} has been published for Grade ${data.targetGrades.join(", ")}. Check your portal to start it now.
${data.description ? `\n\n${data.description}` : ""}`,
          targetGrades: data.targetGrades,
          pinned: false,
          published: true,
        });
        // Email students + parents via Amazon SES
        fetch("/api/notify-students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: data.type === "quiz" ? "quiz" : "assignment",
            title: data.title,
            subject: data.subject,
            description: data.description,
            grades: data.targetGrades,
            studentIds: data.targetStudentIds?.length ? data.targetStudentIds : undefined,
            portalPath: "/portal/assignments",
          }),
        }).catch((err) => console.error("Student notify failed:", err));
      }
      await load(); setModalOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment?")) return;
    await deleteAssignment(id); await load();
  }

  async function openLibrary(mode: "worksheet" | "quiz") {
    setLibMode(mode);
    setLibLoading(true);
    setLibModal(true);
    try { setQuestionSets(await getAllQuestionSets()); }
    finally { setLibLoading(false); }
  }

  /** Import as interactive quiz — stores actual Question[] on the assignment */
  function importSetAsQuiz(set: QuestionSet) {
    const qs: Question[] = set.questions.map((aq) => ({
      id: aq.id ?? crypto.randomUUID(),
      type: (aq.type === "extended_response" ? "short_answer" : aq.type) as Question["type"],
      text: aq.text, options: aq.options,
      correctAnswer: aq.correctAnswer, points: aq.points ?? 1,
      explanation: (aq.explanation ?? "") as string,
      workedSolution: (aq.workedSolution ?? "") as string,
    }));
    const total = qs.reduce((s, q) => s + q.points, 0);
    setForm((f) => ({
      ...f, type: "quiz",
      title: f.title || set.title,
      subject: f.subject || set.subject,
      description: f.description || `${set.subject} — ${set.topic} (${set.difficulty})`,
      questions: [...(f.questions ?? []), ...qs],
      totalPoints: (f.totalPoints ?? 0) + total,
      maxScore: (f.totalPoints ?? 0) + total,
    }));
    setLibModal(false);
  }

  /** Import as worksheet (original behaviour) */
  function importSetAsContent(set: QuestionSet) {
    const lines: string[] = [
      `<h3>${set.title}</h3>`,
      `<p><strong>Subject:</strong> ${set.subject} &nbsp;|&nbsp; <strong>Topic:</strong> ${set.topic}${set.subtopic ? ` › ${set.subtopic}` : ""} &nbsp;|&nbsp; <strong>Difficulty:</strong> ${set.difficulty}</p><hr/>`,
    ];
    set.questions.forEach((q, i) => {
      lines.push(`<p><strong>Q${i + 1}.</strong> ${q.text}</p>`);
      if (q.type === "multiple_choice" && q.options)
        lines.push(`<ul>${q.options.map((o) => `<li>${o}</li>`).join("")}</ul>`);
      else if (q.type === "true_false") lines.push(`<p><em>True &nbsp;/&nbsp; False</em></p>`);
      else lines.push(`<p>Answer: _______________________________________________</p>`);
    });
    setForm((f) => ({
      ...f, type: "custom",
      title: f.title || set.title, subject: f.subject || set.subject,
      content: (f.content ? f.content + "\n" : "") + lines.join("\n"),
      description: f.description || `${set.subject} worksheet — ${set.topic} (${set.difficulty})`,
    }));
    setLibModal(false);
  }

  async function openSubmissions(a: Assignment) {
    const subs = await getSubmissionsByAssignment(a.id!);
    setSubModal({ a, subs });
  }

  async function handleGrade(subId: string) {
    if (!gradeScore) return;
    await gradeSubmission(subId, Number(gradeScore), gradeFeedback);
    if (subModal) {
      const subs = await getSubmissionsByAssignment(subModal.a.id!);
      setSubModal({ ...subModal, subs });
    }
    setGradingId(null); setGradeScore(""); setGradeFeedback("");
  }

  function toggleGrade(g: string) {
    const grades = form.targetGrades.includes(g)
      ? form.targetGrades.filter((x) => x !== g)
      : [...form.targetGrades, g];
    setForm({ ...form, targetGrades: grades, grade: grades[0] ?? "1" });
  }

  const filtered = assignments.filter((a) => {
    const gMatch = gradeFilter === "all" || a.targetGrades.includes(gradeFilter);
    const sMatch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return gMatch && sMatch;
  });

  const studentName = (id: string) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.firstName} ${s.lastName}` : id;
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-500 text-sm mt-0.5">IXL, DeltaMath, custom and auto-graded quiz assignments</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><MdAdd size={18} />Add Assignment</button>
        </div>

        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assignments…" className="admin-input pl-8" />
          </div>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="admin-input w-auto">
            <option value="all">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="admin-card p-0 overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            : filtered.length === 0 ? <div className="p-12 text-center text-gray-400">No assignments yet.</div>
              : (
                <table className="admin-table">
                  <thead><tr>
                    <th>Title</th><th>Type</th><th>Subject</th><th>Grades</th><th>Due</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id}>
                        <td><p className="font-medium text-gray-800">{a.title}</p></td>
                        <td>
                          <span className={`badge text-white ${a.type === "ixl" ? "bg-orange-500" : a.type === "deltamath" ? "bg-blue-600" : a.type === "quiz" ? "bg-purple-600" : "badge-gray"}`}>
                            {a.type === "ixl" ? "IXL" : a.type === "deltamath" ? "DeltaMath" : a.type === "quiz" ? "Quiz" : a.type}
                          </span>
                        </td>
                        <td className="text-gray-600">{a.subject}</td>
                        <td className="text-gray-500 text-xs">{a.targetGrades.map(g => `G${g}`).join(", ")}</td>
                        <td className="text-gray-500 text-xs">{a.dueDate || "—"}</td>
                        <td><span className={`badge ${a.published ? "badge-green" : "badge-yellow"}`}>{a.published ? "Live" : "Draft"}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            {a.platformUrl && <a href={a.platformUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdOpenInNew size={16} /></a>}
                            <button onClick={() => openSubmissions(a)} className="p-1.5 text-gray-400 hover:text-[#00369b]" title="View submissions"><MdVisibility size={16} /></button>
                            <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={16} /></button>
                            <button onClick={() => handleDelete(a.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>

        {/* Submissions modal */}
      {subModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSubModal(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold">Submissions — {subModal.a.title}</h2>
              <button onClick={() => setSubModal(null)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {subModal.subs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No submissions yet.</p>
              ) : (
                <div className="space-y-3">
                  {subModal.subs.map((sub) => (
                    <div key={sub.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{sub.studentName ?? studentName(sub.studentId)}</p>
                          <span className={`badge text-xs ${sub.status === "graded" ? "badge-green" : sub.status === "submitted" ? "badge-blue" : "badge-yellow"}`}>
                            {sub.status}
                          </span>
                        </div>
                        <div className="text-right">
                          {sub.score !== undefined && <p className="font-bold text-[#00369b]">{sub.score}/{subModal.a.maxScore}</p>}
                          {sub.status === "submitted" && gradingId !== sub.id && (
                            <button onClick={() => { setGradingId(sub.id!); setGradeScore(""); setGradeFeedback(""); }}
                              className="btn-primary text-xs py-1 px-2 mt-1 flex items-center gap-1">
                              <MdGrade size={12} /> Grade
                            </button>
                          )}
                        </div>
                      </div>
                      {sub.feedback && <p className="text-xs text-gray-500 mt-2 italic">{sub.feedback}</p>}
                      {gradingId === sub.id && (
                        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="admin-label">Score</label>
                              <input type="number" min={0} max={subModal.a.maxScore} value={gradeScore}
                                onChange={(e) => setGradeScore(e.target.value)} className="admin-input" placeholder={`0–${subModal.a.maxScore}`} />
                            </div>
                            <div className="flex-2">
                              <label className="admin-label">Feedback</label>
                              <input value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)}
                                className="admin-input" placeholder="Optional comment…" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleGrade(sub.id!)} className="btn-primary text-xs py-1.5 px-3">Save Grade</button>
                            <button onClick={() => setGradingId(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="modal-overlay " onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h2 className="font-semibold">{editing ? "Edit Assignment" : "Add Assignment"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: "75vh" }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="admin-label">Title *</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" placeholder="Assignment title" />
                </div>
                <div>
                  <label className="admin-label">Type *</label>
                  <select value={form.type} onChange={(e) => {
                    const nextType = e.target.value as Assignment["type"];
                    if (nextType === "quiz" && !(form.questions?.length ?? 0)) {
                      const initial = newQuestion();
                      setForm({ ...form, type: nextType, questions: [initial], totalPoints: initial.points, maxScore: initial.points });
                    } else {
                      setForm({ ...form, type: nextType });
                    }
                  }} className="admin-input">
                    <option value="">Select Type</option>
                    <option value="quiz">Quiz</option>
                    <option value="ixl">IXL</option>
                    <option value="deltamath">DeltaMath</option>
                    
                    <option value="document">Document</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">Subject *</label>
                  <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="admin-input" placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label className="admin-label">Due Date</label>
                  <input type="date" value={form.dueDate ?? ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">Max Score</label>
                  <input type="number" min={0} value={form.maxScore ?? 100} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} className="admin-input" />
                </div>
              </div>

              {/* Platform URL */}
              {(form.type === "ixl" || form.type === "deltamath") && (
                <div>
                  <label className="admin-label">{form.type === "ixl" ? "IXL" : "DeltaMath"} Activity URL *</label>
                  <input type="url" required value={form.platformUrl ?? ""} onChange={(e) => setForm({ ...form, platformUrl: e.target.value })} className="admin-input" placeholder="https://www.ixl.com/…" />
                </div>
              )}

              {form.type === "quiz" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Questions</p>
                      <p className="text-xs text-gray-500">{(form.questions?.length ?? 0)} · {form.totalPoints ?? 0} pts total</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openLibrary("quiz")} className="btn-secondary text-sm">Import from Library</button>
                      <button type="button" onClick={() => addQuestion("multiple_choice")} className="btn-secondary text-sm">+ multiple choice</button>
                      <button type="button" onClick={() => addQuestion("true_false")} className="btn-secondary text-sm">+ true false</button>
                      <button type="button" onClick={() => addQuestion("short_answer")} className="btn-secondary text-sm">+ short answer</button>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="admin-label">Pass mark (%)</label>
                        <input type="number" min={0} max={100} value={form.passMark ?? 60}
                          onChange={(e) => setForm({ ...form, passMark: Number(e.target.value) })}
                          className="admin-input" />
                      </div>
                      <div>
                        <label className="admin-label">Time limit (mins)</label>
                        <input type="number" min={0} value={form.timeLimit ?? 0}
                          onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })}
                          className="admin-input" />
                      </div>
                      <div>
                        <label className="admin-label">Max attempts</label>
                        <input type="number" min={1} value={form.maxAttempts ?? 1}
                          onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                          className="admin-input" />
                      </div>
                    </div>

                    {(form.questions ?? []).map((question, qIndex) => (
                      <div key={question.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-sm text-gray-900">Question {qIndex + 1}</p>
                              <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 text-sm font-semibold hover:underline">Remove</button>
                            </div>
                            <textarea value={question.text} onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                              className="admin-input resize-none" rows={2} placeholder="Question text" />
                          </div>
                          <div className="grid gap-3 w-full sm:w-52">
                            <div>
                              <label className="admin-label">Type</label>
                              <select value={question.type} onChange={(e) => updateQuestion(qIndex, { type: e.target.value as QuestionType })} className="admin-input">
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="true_false">True / False</option>
                                <option value="short_answer">Short Answer</option>
                              </select>
                            </div>
                            <div>
                              <label className="admin-label">Points</label>
                              <input type="number" min={0} value={question.points ?? 1}
                                onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
                                className="admin-input" />
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="admin-label">Correct answer</label>
                            {question.type === "multiple_choice" && (
                              <select value={question.correctAnswer} onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })} className="admin-input">
                                <option value="">Select correct option</option>
                                {(question.options ?? []).map((option, optionIndex) => (
                                  <option key={optionIndex} value={option}>{option || `Option ${optionIndex + 1}`}</option>
                                ))}
                              </select>
                            )}
                            {question.type === "true_false" && (
                              <select value={question.correctAnswer} onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })} className="admin-input">
                                <option value="">Select correct answer</option>
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            )}
                            {question.type === "short_answer" && (
                              <input value={question.correctAnswer} onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                                className="admin-input" placeholder="Answer text" />
                            )}
                          </div>
                          {question.type === "multiple_choice" && (
                            <div className="space-y-2">
                              <label className="admin-label">Options</label>
                              {(question.options ?? []).map((option, optionIndex) => (
                                <input key={optionIndex} value={option} onChange={(e) => {
                                  const options = [...(question.options ?? [])];
                                  options[optionIndex] = e.target.value;
                                  updateQuestion(qIndex, { options });
                                }} className="admin-input" placeholder={`Option ${optionIndex + 1}`} />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <label className="admin-label">Explanation (optional)</label>
                          <textarea value={question.explanation ?? ""} onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })} rows={2} className="admin-input resize-none" placeholder="Solution notes or feedback" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="admin-label">Full Content / Instructions (optional)</label>
                <WysiwygEditor content={form.content ?? ""} onChange={(html) => setForm({ ...form, content: html })} placeholder="Detailed instructions, questions…" />
              </div>

              {/* File upload */}
              {form.type === "document" && (
                <div>
                  <label className="admin-label">Attach Document / PDF</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={fileUploading} className="btn-secondary flex items-center gap-2">
                      <MdUpload size={16} />{fileUploading ? "Uploading…" : "Upload File"}
                    </button>
                    {form.fileUrl && <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00369b] hover:underline">{form.fileName || "Uploaded file"}</a>}
                  </div>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
              )}

              {/* Unlock after material */}
              <div>
                <label className="admin-label">Unlock After Material (optional)</label>
                <select value={form.linkedMaterialId ?? ""} onChange={(e) => setForm({ ...form, linkedMaterialId: e.target.value })} className="admin-input">
                  <option value="">— No prerequisite (always visible) —</option>
                  {materials.filter((m) => form.targetGrades.includes(m.grade)).map((m) => (
                    <option key={m.id} value={m.id}>{m.title} · Grade {m.grade} · {m.subject}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Students must complete this material before the assignment unlocks.</p>
              </div>

              {/* Target grades */}
              <div>
                <label className="admin-label">Target Grades *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GRADES.map((g) => (
                    <button key={g} type="button" onClick={() => toggleGrade(g)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${form.targetGrades.includes(g) ? "bg-[#00369b] text-white border-[#00369b]" : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                        }`}>
                      Grade {g}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Assignment will appear for all students in selected grades (or specific students below).</p>
              </div>

              {/* Target specific students */}
              <div>
                <label className="admin-label">Assign to Specific Students (leave empty for all in grade)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {students.filter((s) => form.targetGrades.includes(s.grade)).map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                      <input type="checkbox" checked={form.targetStudentIds?.includes(s.id!) ?? false}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...(form.targetStudentIds ?? []), s.id!]
                            : (form.targetStudentIds ?? []).filter((id) => id !== s.id!);
                          setForm({ ...form, targetStudentIds: ids });
                        }} />
                      <span className="font-mono text-xs text-[#00369b]">{s.studentId}</span>
                      <span>{s.firstName} {s.lastName}</span>
                      <span className="text-gray-400">— Grade {s.grade}</span>
                    </label>
                  ))}
                  {students.filter((s) => form.targetGrades.includes(s.grade)).length === 0 && (
                    <p className="text-xs text-gray-400 px-2 py-2">Select target grades first to see students.</p>
                  )}
                </div>
              </div>

              {/* Publish */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm({ ...form, published: !form.published })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${form.published ? "bg-[#00369b]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${form.published ? "left-5" : "left-0.5"}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{form.published ? "Published" : "Save as Draft"}</span>
              </label>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save Changes" : "Create Assignment"}</button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Library Picker Modal — rendered after Create modal so it stacks on top */}
      {libModal && (
        <div className="modal-overlay" style={{ zIndex: 99999999 }} onClick={(e) => e.target === e.currentTarget && setLibModal(false)}>
          <div className="modal-box" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MdAutoAwesome size={16} className="text-purple-600" /> Import from Question Library
              </h2>
              <button onClick={() => setLibModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <div className="p-4 bg-amber-50 border-b border-amber-100 text-xs text-amber-800 flex items-start gap-2">
              <MdAutoAwesome size={14} className="shrink-0 mt-0.5 text-amber-600" />
              {libMode === "quiz"
                ? "Imported questions will be added as quiz items, ready for students to take inside the portal."
                : "Imported questions will be added as formatted worksheet content for students to complete."}
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
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
                        <div className="flex flex-col gap-2 shrink-0">
                          <button type="button" onClick={() => importSetAsContent(set)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition-colors">
                            <MdAdd size={15} /> Import as Worksheet
                          </button>
                          <button type="button" onClick={() => importSetAsQuiz(set)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                            <MdQuiz size={15} /> Import as Quiz
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {set.questions.slice(0, 2).map((q, i) => (
                          <p key={i} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-200 line-clamp-1">
                            Q{i + 1}: {q.text}
                          </p>
                        ))}
                        {set.questions.length > 2 && (
                          <p className="text-xs text-gray-400 pl-2">+ {set.questions.length - 2} more…</p>
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
      </div>
    </AdminLayout>
  )
}