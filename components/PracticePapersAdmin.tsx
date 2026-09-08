"use client";

import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import ModalPortal from "@/components/ModalPortal";
import Pagination from "@/components/Pagination";
import WysiwygEditor from "@/components/WysiwygEditor";
import { paginate } from "@/lib/pagination";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatSchedule } from "@/lib/schedule";
import {
  getPracticePapers,
  createPracticePaper,
  updatePracticePaper,
  deletePracticePaper,
  getAttemptsByPaper,
  gradePracticeAttempt,
  getAllStudents,
  clearPracticeAttemptsForRetake,
  type PracticePaper,
  type PracticeAttempt,
  type PracticeProgram,
  type Question,
  type QuestionType,
  type Student,
} from "@/lib/firestore";
import {
  personDisplayName,
  buildStudentLookup,
  resolveStudent,
} from "@/lib/displayName";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdUpload,
  MdGrade,
  MdVisibility,
  MdVisibilityOff,
  MdQuiz,
  MdAttachFile,
  MdReplay,
} from "react-icons/md";
import PdfMcqImport from "@/components/PdfMcqImport";
import QuestionMediaControls from "@/components/QuestionMediaControls";
import SubmittedFileButton from "@/components/SubmittedFileButton";

const QUIZ_TYPES = new Set(["quiz", "exam", "test"]);

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

type FormState = Omit<PracticePaper, "id">;

function emptyForm(program: PracticeProgram, defaultYears: string[]): FormState {
  return {
    program,
    title: "",
    description: "",
    yearLevels: [...defaultYears.slice(0, 1)],
    subject: "",
    type: "quiz",
    questions: [newQuestion()],
    totalPoints: 1,
    passMark: 60,
    timeLimit: 0,
    maxAttempts: 3,
    fileUrl: "",
    fileName: "",
    content: "",
    startAt: "",
    dueAt: "",
    published: false,
  };
}

export default function PracticePapersAdmin({
  program,
  title,
  subtitle,
  yearOptions,
  subjects,
}: {
  program: PracticeProgram;
  title: string;
  subtitle: string;
  yearOptions: string[];
  subjects: string[];
}) {
  const [papers, setPapers] = useState<PracticePaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PracticePaper | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(program, yearOptions));
  const [saving, setSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState("all");
  const [attemptsModal, setAttemptsModal] = useState<{
    paper: PracticePaper;
    attempts: PracticeAttempt[];
  } | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [p, studs] = await Promise.all([
        getPracticePapers(program),
        getAllStudents(),
      ]);
      setPapers(p);
      setStudents(studs);
    } catch (err) {
      console.error("Practice papers load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);

  function calcTotal(qs: Question[]) {
    return qs.reduce((s, q) => s + (q.points || 0), 0);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(program, yearOptions));
    setModalOpen(true);
  }

  function openEdit(p: PracticePaper) {
    setEditing(p);
    setForm({
      program,
      title: p.title,
      description: p.description,
      yearLevels: p.yearLevels?.length ? [...p.yearLevels] : [yearOptions[0]],
      subject: p.subject,
      type: p.type,
      questions: p.questions?.length ? p.questions : [newQuestion()],
      totalPoints: p.totalPoints ?? 0,
      passMark: p.passMark ?? 60,
      timeLimit: p.timeLimit ?? 0,
      maxAttempts: p.maxAttempts ?? 3,
      fileUrl: p.fileUrl ?? "",
      fileName: p.fileName ?? "",
      content: p.content ?? "",
      startAt: p.startAt ?? "",
      dueAt: p.dueAt ?? "",
      published: p.published,
    });
    setModalOpen(true);
  }

  function toggleYear(y: string) {
    setForm((f) => {
      const has = f.yearLevels.includes(y);
      const yearLevels = has
        ? f.yearLevels.filter((x) => x !== y)
        : [...f.yearLevels, y];
      return { ...f, yearLevels: yearLevels.length ? yearLevels : [y] };
    });
  }

  function updateQ(idx: number, patch: Partial<Question>) {
    const qs = [...(form.questions ?? [])];
    qs[idx] = { ...qs[idx], ...patch };
    setForm((f) => ({ ...f, questions: qs, totalPoints: calcTotal(qs) }));
  }

  function addQuestion(type: QuestionType) {
    const qs = [...(form.questions ?? []), newQuestion(type)];
    setForm((f) => ({ ...f, questions: qs, totalPoints: calcTotal(qs) }));
  }

  function removeQuestion(idx: number) {
    const qs = (form.questions ?? []).filter((_, i) => i !== idx);
    setForm((f) => ({
      ...f,
      questions: qs.length ? qs : [newQuestion()],
      totalPoints: calcTotal(qs),
    }));
  }

  function importMcqFromPdf(imported: Question[]) {
    const existing = (form.questions ?? []).filter((q) => q.text.trim() !== "");
    const qs = [...existing, ...imported];
    setForm((f) => ({
      ...f,
      questions: qs,
      totalPoints: calcTotal(qs),
    }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const url = await uploadToCloudinary(file, `bridgitus/${program}`);
      setForm((f) => ({ ...f, fileUrl: url, fileName: file.name }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.yearLevels.length) {
      alert("Select at least one year level.");
      return;
    }
    setSaving(true);
    try {
      const isQuiz = QUIZ_TYPES.has(form.type);
      const data: Omit<PracticePaper, "id"> = {
        ...form,
        program,
        questions: isQuiz ? form.questions : [],
        totalPoints: isQuiz ? calcTotal(form.questions ?? []) : form.totalPoints ?? 100,
        fileUrl: form.type === "document" || form.type === "custom" ? form.fileUrl : "",
        fileName: form.type === "document" || form.type === "custom" ? form.fileName : "",
      };
      if (editing?.id) await updatePracticePaper(editing.id, data);
      else await createPracticePaper(data);
      await load();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this practice paper?")) return;
    await deletePracticePaper(id);
    await load();
  }

  async function openAttempts(paper: PracticePaper) {
    const attempts = await getAttemptsByPaper(paper.id!);
    setAttemptsModal({ paper, attempts });
    setGradingId(null);
  }

  async function handleGrade(attemptId: string) {
    if (!attemptsModal) return;
    const score = Number(gradeScore);
    if (Number.isNaN(score)) return;
    const max =
      attemptsModal.paper.totalPoints ??
      attemptsModal.paper.maxAttempts ??
      100;
    await gradePracticeAttempt(attemptId, score, gradeFeedback, {
      totalPoints: attemptsModal.paper.totalPoints ?? max,
      passMark: attemptsModal.paper.passMark ?? 60,
    });
    const attempts = await getAttemptsByPaper(attemptsModal.paper.id!);
    setAttemptsModal({ ...attemptsModal, attempts });
    setGradingId(null);
    setGradeScore("");
    setGradeFeedback("");
  }

  async function handlePracticeRetake(att: PracticeAttempt) {
    if (!attemptsModal) return;
    const s = resolveStudent(
      buildStudentLookup(students),
      att.studentId,
      att.studentUid,
    );
    const name = personDisplayName({
      studentName: att.studentName,
      student: s,
    });
    if (
      !confirm(
        `Allow ${name} to retake "${attemptsModal.paper.title}"? This clears their previous attempts.`,
      )
    )
      return;
    const n = await clearPracticeAttemptsForRetake(
      att.paperId,
      att.studentId,
      att.studentUid,
    );
    alert(`Cleared ${n} attempt(s). ${name} can take it again.`);
    const attempts = await getAttemptsByPaper(attemptsModal.paper.id!);
    setAttemptsModal({ ...attemptsModal, attempts });
  }

  const filtered =
    yearFilter === "all"
      ? papers
      : papers.filter((p) => p.yearLevels?.includes(yearFilter));
  const slice = paginate(filtered, page);

  return (
    <AdminLayout>
      <div className="w-full space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
              Exam Prep
            </p>
            <h1 className="text-2xl lg:text-[1.75rem] font-extrabold text-[#001233] tracking-tight">
              {title}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> Create Paper
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setYearFilter("all");
              setPage(1);
            }}
            className={`filter-pill${yearFilter === "all" ? " active" : ""}`}
          >
            All years
          </button>
          {yearOptions.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setYearFilter(y);
                setPage(1);
              }}
              className={`filter-pill${yearFilter === y ? " active" : ""}`}
            >
              Year {y}
            </button>
          ))}
        </div>

        <div className="admin-card !p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MdQuiz size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No papers yet. Create your first one.</p>
            </div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Years</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-gray-800">{p.title}</p>
                        {p.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(p.yearLevels ?? []).map((y) => (
                            <span key={y} className="badge badge-blue">
                              Y{y}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-gray-600">{p.subject}</td>
                      <td>
                        <span className="badge badge-blue">{p.type}</span>
                      </td>
                      <td className="text-xs text-gray-500">
                        {p.startAt || p.dueAt ? (
                          <>
                            {p.startAt ? `Starts ${formatSchedule(p.startAt)}` : null}
                            {p.startAt && p.dueAt ? " · " : null}
                            {p.dueAt ? `Due ${formatSchedule(p.dueAt)}` : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {p.published ? (
                          <span className="badge badge-green flex items-center gap-1 w-fit">
                            <MdVisibility size={12} /> Live
                          </span>
                        ) : (
                          <span className="badge badge-yellow flex items-center gap-1 w-fit">
                            <MdVisibilityOff size={12} /> Draft
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openAttempts(p)}
                            className="p-2 text-slate-500 hover:text-[#00369b] rounded-lg hover:bg-slate-50"
                            title="View attempts"
                          >
                            <MdGrade size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 text-slate-500 hover:text-[#00369b] rounded-lg hover:bg-slate-50"
                            title="Edit"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id!)}
                            className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination slice={slice} onPageChange={setPage} />
            </>
          )}
        </div>

        {/* Attempts / grading modal */}
        {attemptsModal && (
          <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001233]/50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-[#001233]">Attempts</h2>
                  <p className="text-sm text-slate-500">{attemptsModal.paper.title}</p>
                </div>
                <button
                  onClick={() => setAttemptsModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  <MdClose size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: "65vh" }}>
                {attemptsModal.attempts.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No attempts yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {attemptsModal.attempts.map((att) => (
                      <div
                        key={att.id}
                        className="border border-gray-200 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-800">
                              {personDisplayName({
                                studentName: att.studentName,
                                student: resolveStudent(buildStudentLookup(students), att.studentId, att.studentUid),
                              })}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Attempt #{att.attemptNumber}
                            </p>
                            <span
                              className={`badge text-xs mt-1 ${
                                att.status === "graded"
                                  ? "badge-green"
                                  : att.status === "submitted"
                                    ? "badge-blue"
                                    : "badge-yellow"
                              }`}
                            >
                              {att.status}
                            </span>
                          </div>
                          <div className="text-right">
                            {att.score !== undefined && (
                              <p className="font-bold text-[#00369b]">
                                {att.score}
                                {att.totalPoints != null
                                  ? `/${att.totalPoints}`
                                  : ""}
                                {att.percentage != null
                                  ? ` (${att.percentage}%)`
                                  : ""}
                              </p>
                            )}
                            {(att.status === "submitted" ||
                              att.status === "pending_review" ||
                              att.status === "graded") &&
                              gradingId !== att.id && (
                                <button
                                  onClick={() => {
                                    setGradingId(att.id!);
                                    setGradeScore(
                                      att.score != null ? String(att.score) : ""
                                    );
                                    setGradeFeedback(att.feedback ?? "");
                                  }}
                                  className="btn-primary text-xs py-1 px-2 mt-1 inline-flex items-center gap-1"
                                >
                                  <MdGrade size={12} />{" "}
                                  {att.status === "graded" ? "Update" : "Grade"}
                                </button>
                              )}
                          </div>
                        </div>
                        {att.feedback && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            {att.feedback}
                          </p>
                        )}
                        <div className="mt-2">
                          <SubmittedFileButton
                            url={att.attachmentUrl}
                            name={att.attachmentName}
                            emptyLabel=""
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePracticeRetake(att)}
                          className="mt-2 text-xs text-amber-700 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                          title="Allow retake"
                        >
                          <MdReplay size={12} /> Allow retake
                        </button>
                        {gradingId === att.id && (
                          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="admin-label">Score</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={gradeScore}
                                  onChange={(e) => setGradeScore(e.target.value)}
                                  className="admin-input"
                                  placeholder={`0–${attemptsModal.paper.totalPoints ?? 100}`}
                                />
                              </div>
                              <div className="flex-[2]">
                                <label className="admin-label">Feedback</label>
                                <input
                                  value={gradeFeedback}
                                  onChange={(e) =>
                                    setGradeFeedback(e.target.value)
                                  }
                                  className="admin-input"
                                  placeholder="Optional comment…"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                              Student will see this grade and feedback in their portal
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleGrade(att.id!)}
                                className="btn-primary text-xs py-1.5 px-3"
                              >
                                Save Grade
                              </button>
                              <button
                                onClick={() => setGradingId(null)}
                                className="btn-secondary text-xs py-1.5 px-3"
                              >
                                Cancel
                              </button>
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
          </ModalPortal>
        )}

        {/* Create / edit modal */}
        {modalOpen && (
          <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001233]/50">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-[#001233]">
                  {editing ? "Edit Paper" : "Create Paper"}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  <MdClose size={20} />
                </button>
              </div>
              <form
                onSubmit={handleSave}
                className="p-6 overflow-y-auto space-y-4"
                style={{ maxHeight: "75vh" }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="admin-label">Title</label>
                    <input
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="admin-label">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={2}
                      className="admin-input resize-none"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      className="admin-input"
                      required
                    >
                      <option value="">Select…</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value as PracticePaper["type"],
                        })
                      }
                      className="admin-input"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                      <option value="test">Test</option>
                      <option value="document">Document</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="admin-label">Year levels</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {yearOptions.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => toggleYear(y)}
                        className={`filter-pill${
                          form.yearLevels.includes(y) ? " active" : ""
                        }`}
                      >
                        Year {y}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Opens at</label>
                    <input
                      type="datetime-local"
                      value={form.startAt ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, startAt: e.target.value })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Due at</label>
                    <input
                      type="datetime-local"
                      value={form.dueAt ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, dueAt: e.target.value })
                      }
                      className="admin-input"
                    />
                  </div>
                </div>

                {QUIZ_TYPES.has(form.type) && (
                  <>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="admin-label">Pass mark %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.passMark ?? 60}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              passMark: Number(e.target.value),
                            })
                          }
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label className="admin-label">Time limit (min)</label>
                        <input
                          type="number"
                          min={0}
                          value={form.timeLimit ?? 0}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              timeLimit: Number(e.target.value),
                            })
                          }
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label className="admin-label">Max attempts</label>
                        <input
                          type="number"
                          min={1}
                          value={form.maxAttempts ?? 3}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              maxAttempts: Number(e.target.value),
                            })
                          }
                          className="admin-input"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="admin-label !mb-0">
                          Questions ({form.questions?.length ?? 0} ·{" "}
                          {form.totalPoints ?? 0} pts)
                        </label>
                        <div className="flex flex-wrap gap-1 items-center">
                          <PdfMcqImport onImported={importMcqFromPdf} />
                          {(
                            [
                              "multiple_choice",
                              "true_false",
                              "short_answer",
                            ] as QuestionType[]
                          ).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => addQuestion(t)}
                              className="btn-secondary text-xs py-1 px-2"
                            >
                              + {t.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(form.questions ?? []).map((q, qi) => (
                          <div
                            key={q.id}
                            className="border border-slate-200 rounded-xl p-4"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-slate-400">
                                Q{qi + 1} · {q.type.replace("_", " ")}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeQuestion(qi)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                            <textarea
                              required
                              value={q.text}
                              onChange={(e) =>
                                updateQ(qi, { text: e.target.value })
                              }
                              rows={2}
                              className="admin-input resize-none mb-2"
                              placeholder="Question text"
                            />
                            <QuestionMediaControls
                              imageUrl={q.imageUrl}
                              videoUrl={q.videoUrl}
                              videoName={q.videoName}
                              onChange={(patch) =>
                                updateQ(qi, {
                                  ...(patch.imageUrl === null
                                    ? { imageUrl: undefined }
                                    : patch.imageUrl !== undefined
                                      ? { imageUrl: patch.imageUrl }
                                      : {}),
                                  ...(patch.videoUrl === null
                                    ? { videoUrl: undefined, videoName: undefined }
                                    : patch.videoUrl !== undefined
                                      ? {
                                          videoUrl: patch.videoUrl,
                                          videoName:
                                            patch.videoName === null
                                              ? undefined
                                              : patch.videoName ?? q.videoName,
                                        }
                                      : {}),
                                })
                              }
                            />
                            <div className="grid sm:grid-cols-2 gap-2">
                              <div>
                                <label className="admin-label">Points</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={q.points}
                                  onChange={(e) =>
                                    updateQ(qi, {
                                      points: Number(e.target.value),
                                    })
                                  }
                                  className="admin-input"
                                />
                              </div>
                              <div>
                                <label className="admin-label">
                                  Correct answer
                                </label>
                                {q.type === "true_false" ? (
                                  <select
                                    value={q.correctAnswer}
                                    onChange={(e) =>
                                      updateQ(qi, {
                                        correctAnswer: e.target.value,
                                      })
                                    }
                                    className="admin-input"
                                  >
                                    <option value="">Select…</option>
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                  </select>
                                ) : (
                                  <input
                                    required
                                    value={q.correctAnswer}
                                    onChange={(e) =>
                                      updateQ(qi, {
                                        correctAnswer: e.target.value,
                                      })
                                    }
                                    className="admin-input"
                                    placeholder={
                                      q.type === "multiple_choice"
                                        ? "Must match an option"
                                        : "Expected answer"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                            {q.type === "multiple_choice" && (
                              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                                {(q.options ?? ["", "", "", ""]).map(
                                  (opt, oi) => (
                                    <input
                                      key={oi}
                                      required
                                      value={opt}
                                      onChange={(e) => {
                                        const options = [
                                          ...(q.options ?? ["", "", "", ""]),
                                        ];
                                        options[oi] = e.target.value;
                                        updateQ(qi, { options });
                                      }}
                                      className="admin-input"
                                      placeholder={`Option ${oi + 1}`}
                                    />
                                  )
                                )}
                              </div>
                            )}
                            <div className="mt-2">
                              <label className="admin-label">
                                Answer explanation (shown after)
                              </label>
                              <textarea
                                value={q.explanation ?? ""}
                                onChange={(e) =>
                                  updateQ(qi, { explanation: e.target.value })
                                }
                                rows={2}
                                className="admin-input resize-none"
                                placeholder="Optional explanation students see after answering…"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(form.type === "document" || form.type === "custom") && (
                  <>
                    <div>
                      <label className="admin-label">Max score</label>
                      <input
                        type="number"
                        min={1}
                        value={form.totalPoints ?? 100}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            totalPoints: Number(e.target.value),
                          })
                        }
                        className="admin-input max-w-[160px]"
                      />
                    </div>
                    <div>
                      <label className="admin-label">Attach document / PDF</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={fileUploading}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <MdUpload size={16} />
                          {fileUploading ? "Uploading…" : "Upload File"}
                        </button>
                        {form.fileUrl && (
                          <a
                            href={form.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#00369b] hover:underline"
                          >
                            {form.fileName || "Uploaded file"}
                          </a>
                        )}
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="admin-label">
                    Instructions (optional)
                  </label>
                  <WysiwygEditor
                    content={form.content ?? ""}
                    onChange={(html) => setForm({ ...form, content: html })}
                    placeholder="Instructions for students…"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  Published (visible to students)
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? "Saving…" : editing ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
          </ModalPortal>
        )}
      </div>
    </AdminLayout>
  );
}
