"use client";

import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  CURRICULA,
  getSubjects,
  getYears,
  getTopics,
  getSubtopics,
  DIFFICULTY_LEVELS,
  QUESTION_FORMATS,
  CONTEXTS,
  QUESTION_COUNTS,
} from "@/lib/curriculum";
import { createQuestionSet, type AIQuestion } from "@/lib/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  MdAutoAwesome,
  MdSave,
  MdEdit,
  MdDelete,
  MdAdd,
  MdRefresh,
  MdCheckCircle,
  MdCancel,
  MdExpandMore,
  MdExpandLess,
  MdPrint,
  MdImage,
  MdClose,
} from "react-icons/md";

// ── Question Card ──────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  onEdit,
  onDelete,
  onCreateSimilar,
  editing,
  onSaveEdit,
  onUpdateImage,
  onGenerateDiagram,
  generatingDiagram,
}: {
  q: AIQuestion;
  index: number;
  onEdit: (q: AIQuestion) => void;
  onDelete: () => void;
  onCreateSimilar: (q: AIQuestion) => void;
  editing: boolean;
  onSaveEdit: (updated: AIQuestion) => void;
  onUpdateImage: (questionId: string, imageUrl: string | undefined) => void;
  onGenerateDiagram: (q: AIQuestion) => void;
  generatingDiagram: boolean;
}) {
  const [editForm, setEditForm] = useState<AIQuestion>(q);
  const [showSolution, setShowSolution] = useState(false);
  const [optionsRaw, setOptionsRaw] = useState((q.options ?? []).join("\n"));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditForm(q);
    setOptionsRaw((q.options ?? []).join("\n"));
  }, [q]);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file (PNG, JPG, GIF, WebP).");
      return;
    }
    setUploadingImage(true);
    setImageError("");
    try {
      const url = await uploadToCloudinary(file, "bridgitus/question-images");
      onUpdateImage(q.id, url);
    } catch (err: unknown) {
      setImageError(
        err instanceof Error ? err.message : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  const typeLabel: Record<string, string> = {
    multiple_choice: "MC",
    true_false: "T/F",
    short_answer: "SA",
    extended_response: "ER",
  };
  const typeColor: Record<string, string> = {
    multiple_choice: "bg-blue-100 text-blue-700",
    true_false: "bg-purple-100 text-purple-700",
    short_answer: "bg-amber-100 text-amber-700",
    extended_response: "bg-red-100 text-red-700",
  };

  if (editing) {
    return (
      <div className="border-2 border-[#00369b] bg-blue-50 p-4 space-y-3">
        <p className="text-xs font-bold text-[#00369b] uppercase">
          Editing Q{index + 1}
        </p>
        <div>
          <label className="admin-label">Question Text</label>
          <textarea
            value={editForm.text}
            onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
            rows={3}
            className="admin-input resize-none w-full"
          />
        </div>
        {(q.type === "multiple_choice" || q.type === "true_false") && (
          <div>
            <label className="admin-label">Options (one per line)</label>
            <textarea
              value={optionsRaw}
              onChange={(e) => setOptionsRaw(e.target.value)}
              rows={4}
              className="admin-input resize-none w-full font-mono text-xs"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="admin-label">Correct Answer</label>
            <input
              value={editForm.correctAnswer}
              onChange={(e) =>
                setEditForm({ ...editForm, correctAnswer: e.target.value })
              }
              className="admin-input w-full"
            />
          </div>
          <div>
            <label className="admin-label">Points</label>
            <input
              type="number"
              min={1}
              value={editForm.points}
              onChange={(e) =>
                setEditForm({ ...editForm, points: Number(e.target.value) })
              }
              className="admin-input w-full"
            />
          </div>
        </div>
        <div>
          <label className="admin-label">Explanation</label>
          <textarea
            value={editForm.explanation ?? ""}
            onChange={(e) =>
              setEditForm({ ...editForm, explanation: e.target.value })
            }
            rows={2}
            className="admin-input resize-none w-full"
          />
        </div>
        <div>
          <label className="admin-label">Worked Solution</label>
          <textarea
            value={editForm.workedSolution ?? ""}
            onChange={(e) =>
              setEditForm({ ...editForm, workedSolution: e.target.value })
            }
            rows={4}
            className="admin-input resize-none w-full"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onSaveEdit({
                ...editForm,
                options: optionsRaw
                  ? optionsRaw.split("\n").filter(Boolean)
                  : undefined,
              })
            }
            className="btn-primary flex items-center gap-1 text-xs py-1.5"
          >
            <MdCheckCircle size={14} /> Save
          </button>
          <button
            onClick={() => onEdit({ id: "" } as AIQuestion)}
            className="btn-secondary flex items-center gap-1 text-xs py-1.5"
          >
            <MdCancel size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-6 h-6 bg-[#00369b] text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 ${typeColor[q.type] ?? "bg-gray-100 text-gray-600"}`}
          >
            {typeLabel[q.type] ?? q.type}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5">
            {q.difficulty}
          </span>
          <span className="text-xs text-gray-400">
            {q.points} pt{q.points !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onCreateSimilar(q)}
            title="Create 3 similar"
            className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
          >
            <MdAdd size={15} />
          </button>
          <button
            onClick={() => onEdit(q)}
            className="p-1.5 text-gray-400 hover:text-[#00369b]"
          >
            <MdEdit size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500"
          >
            <MdDelete size={15} />
          </button>
        </div>
      </div>

      {/* Question */}
      <p className="text-sm text-gray-800 font-medium leading-relaxed">
        {q.text}
      </p>

      {/* Diagram image */}
      {q.imageUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={q.imageUrl}
            alt={`Diagram for question ${index + 1}`}
            className="max-h-56 border border-gray-200 object-contain"
          />
          <div className="mt-1.5 flex flex-wrap gap-3">
            <button
              onClick={() => onGenerateDiagram(q)}
              disabled={generatingDiagram || uploadingImage}
              className="text-xs text-purple-700 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <MdAutoAwesome size={13} />
              {generatingDiagram ? "Generating…" : "Regenerate AI diagram"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || generatingDiagram}
              className="text-xs text-[#00369b] font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <MdImage size={13} />{" "}
              {uploadingImage ? "Uploading…" : "Upload / replace image"}
            </button>
            <button
              onClick={() => onUpdateImage(q.id, undefined)}
              className="text-xs text-red-500 font-medium hover:underline flex items-center gap-1"
            >
              <MdClose size={13} /> Remove image
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-400">Add a diagram for this question (optional)</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onGenerateDiagram(q)}
              disabled={generatingDiagram || uploadingImage}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-700 border border-purple-200 bg-purple-50 px-3 py-2 hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {generatingDiagram ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  Generating diagram…
                </>
              ) : (
                <>
                  <MdAutoAwesome size={14} /> Generate diagram / graph
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || generatingDiagram}
              className="flex items-center gap-1.5 text-xs font-medium text-[#00369b] border border-[#00369b]/30 bg-white px-3 py-2 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {uploadingImage ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#00369b] border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <MdImage size={14} /> Upload image
                </>
              )}
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      {imageError && <p className="text-xs text-red-600">{imageError}</p>}

      {/* Options */}
      {q.options && q.options.length > 0 && (
        <div className="space-y-1 pl-2">
          {q.options.map((opt, i) => (
            <div
              key={i}
              className={`text-xs px-3 py-1.5 border ${
                opt === q.correctAnswer
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold"
                  : "border-gray-100 text-gray-600"
              }`}
            >
              {opt === q.correctAnswer && <span className="mr-1">✓</span>}
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Short/extended answer */}
      {!q.options && (
        <div className="bg-emerald-50 border border-emerald-200 px-3 py-2">
          <p className="text-xs font-semibold text-emerald-700">
            Model Answer:
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">{q.correctAnswer}</p>
        </div>
      )}

      {/* Explanation + Worked Solution toggleable */}
      <div>
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="flex items-center gap-1 text-xs text-[#00369b] font-medium hover:underline"
        >
          {showSolution ? (
            <MdExpandLess size={14} />
          ) : (
            <MdExpandMore size={14} />
          )}
          {showSolution ? "Hide" : "Show"} explanation & solution
        </button>
        {showSolution && (
          <div className="mt-2 space-y-2">
            {q.explanation && (
              <div className="bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-xs font-semibold text-blue-700 mb-0.5">
                  Explanation
                </p>
                <p className="text-xs text-blue-700">{q.explanation}</p>
              </div>
            )}
            {q.workedSolution && (
              <div className="bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-xs font-semibold text-gray-600 mb-0.5">
                  Worked Solution
                </p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {q.workedSolution}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AIGeneratorPage() {
  // Form state — curriculum → year level → subject → topic → subtopic
  const [curriculum, setCurriculum] = useState(CURRICULA[0].id);
  const [year, setYear] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [customSubject, setCustomSubject] = useState(false);
  const [customTopic, setCustomTopic] = useState(false);
  const [count, setCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>("Core");
  const [format, setFormat] = useState<string>("Mixed");
  const [context, setContext] = useState<string>("Real-life");
  const [prompt, setPrompt] = useState<string>("");
  const [title, setTitle] = useState("");

  // Derived options — subjects depend on the selected year level
  const years = getYears(curriculum);
  const subjects = year ? getSubjects(curriculum, year) : [];

  // Reset cascades: curriculum → year → subject → topic → subtopic
  useEffect(() => {
    setYear("");
    setSubject("");
    setTopic("");
    setSubtopic("");
    setCustomSubject(false);
    setCustomTopic(false);
  }, [curriculum]);
  useEffect(() => {
    setSubject("");
    setTopic("");
    setSubtopic("");
    setCustomSubject(false);
    setCustomTopic(false);
  }, [year]);
  useEffect(() => {
    if (!customSubject) {
      setTopic("");
      setSubtopic("");
      setCustomTopic(false);
    }
  }, [subject, customSubject]);
  useEffect(() => {
    if (!customTopic) setSubtopic("");
  }, [topic, customTopic]);
  useEffect(() => {
    if (topic)
      setTitle(
        `${subject} — ${topic}${subtopic ? ` (${subtopic})` : ""} — ${difficulty} — ${count} Questions`,
      );
  }, [subject, topic, subtopic, difficulty, count]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatingDiagramId, setGeneratingDiagramId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Create similar state
  const [creatingSimFor, setCreatingSimFor] = useState<string | null>(null);

  async function handleGenerate() {
    if (!year || !subject || !topic || !count) {
      setError("Please fill in Curriculum, Year Level, Subject and Topic.");
      return;
    }
    setGenerating(true);
    setError("");
    setQuestions([]);
    setSaved(false);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculum,
          subject,
          year,
          topic,
          subtopic,
          count,
          difficulty,
          format,
          context,
          prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setQuestions(data.questions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateDiagram(q: AIQuestion) {
    setGeneratingDiagramId(q.id);
    setError("");
    try {
      const res = await fetch("/api/generate-diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Diagram generation failed");
      if (data.imageUrl) {
        setQuestions((prev) =>
          prev.map((item) =>
            item.id === q.id ? { ...item, imageUrl: data.imageUrl as string } : item
          )
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Diagram generation failed");
    } finally {
      setGeneratingDiagramId(null);
    }
  }

  async function handleCreateSimilar(q: AIQuestion) {
    setCreatingSimFor(q.id);
    try {
      const res = await fetch("/api/create-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Append after the current question
      const idx = questions.findIndex((x) => x.id === q.id);
      const newQ = (data.questions as AIQuestion[]).map((nq, i) => ({
        ...nq,
        id: `${q.id}-sim${i + 1}`,
      }));
      const updated = [...questions];
      updated.splice(idx + 1, 0, ...newQ);
      setQuestions(updated);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create similar questions",
      );
    } finally {
      setCreatingSimFor(null);
    }
  }

  function handleEdit(q: AIQuestion) {
    setEditingId(q.id || null);
  }

  function handleSaveEdit(updated: AIQuestion) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q)),
    );
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this question?")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function handleUpdateImage(questionId: string, imageUrl: string | undefined) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (!imageUrl) {
          const rest = { ...q };
          delete rest.imageUrl;
          return rest;
        }
        return { ...q, imageUrl };
      }),
    );
  }

  async function handleSaveToLibrary() {
    if (!questions.length) return;
    setSaving(true);
    try {
      await createQuestionSet({
        title: title || `${subject} — ${topic} — ${difficulty}`,
        curriculum,
        subject,
        year,
        topic,
        subtopic,
        difficulty,
        format,
        context,
        questionCount: questions.length,
        questions,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MdAutoAwesome size={22} className="text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AI Question Generator
              </h1>
              <p className="text-gray-500 text-sm">
                Powered by OpenAI · diagrams only when you click Generate
              </p>
            </div>
          </div>
          {questions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handlePrint}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <MdPrint size={16} /> Print / PDF
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={saving}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
              >
                <MdSave size={16} />
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save to Library"}
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="admin-card space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-100">
                01 · Build your question set
              </p>

              {/* Curriculum */}
              <div>
                <label className="admin-label">Curriculum</label>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="admin-input w-full"
                >
                  {CURRICULA.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Level + Subject (subjects depend on the year level) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Year Level</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="admin-input w-full"
                  >
                    <option value="">Select…</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="admin-label !mb-0">Subject</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSubject((v) => !v);
                        setSubject("");
                        setTopic("");
                        setSubtopic("");
                        setCustomTopic(false);
                      }}
                      className="text-[11px] font-semibold text-purple-700 hover:underline"
                    >
                      {customSubject ? "Pick from list" : "Type custom"}
                    </button>
                  </div>
                  {customSubject ? (
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="admin-input w-full"
                      placeholder="e.g. Mathematics"
                      disabled={!year}
                    />
                  ) : (
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="admin-input w-full"
                      disabled={!year}
                    >
                      <option value="">Select…</option>
                      {subjects.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Topic */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="admin-label !mb-0">Topic</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTopic((v) => !v);
                      setTopic("");
                      setSubtopic("");
                    }}
                    disabled={!subject}
                    className="text-[11px] font-semibold text-purple-700 hover:underline disabled:opacity-40"
                  >
                    {customTopic ? "Pick from list" : "Type custom"}
                  </button>
                </div>
                {customTopic || customSubject ? (
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="admin-input w-full"
                    placeholder="e.g. Transformations — Reflection"
                    disabled={!subject}
                  />
                ) : (
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="admin-input w-full"
                    disabled={!subject}
                  >
                    <option value="">Select…</option>
                    {getTopics(curriculum, year, subject).map((t) => (
                      <option key={t.name}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subtopic */}
              <div>
                <label className="admin-label">
                  Subtopic{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {customTopic || customSubject ? (
                  <input
                    type="text"
                    value={subtopic}
                    onChange={(e) => setSubtopic(e.target.value)}
                    className="admin-input w-full"
                    placeholder="Optional focus area"
                    disabled={!topic}
                  />
                ) : (
                  <select
                    value={subtopic}
                    onChange={(e) => setSubtopic(e.target.value)}
                    className="admin-input w-full"
                    disabled={!topic}
                  >
                    <option value="">All subtopics</option>
                    {getSubtopics(curriculum, year, subject, topic).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Count + Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Questions</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="admin-input w-full"
                  >
                    {QUESTION_COUNTS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="admin-input w-full"
                  >
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="admin-label">Question Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="admin-input w-full"
                >
                  {QUESTION_FORMATS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Context */}
              <div>
                <label className="admin-label">Context</label>
                <select
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="admin-input w-full"
                >
                  {CONTEXTS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="admin-label">
                  Prompt / Extra Instructions
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="admin-input resize-none w-full"
                  placeholder="Give the generator a detailed prompt to generate the questions."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Give the generator a detailed prompt to generate the
                  questions.
                </p>
              </div>

              <div>
                <label className="admin-label">Set Title (for library)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="admin-input w-full"
                  placeholder="Auto-filled when topic is selected"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || !subject || !year || !topic}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3.5 flex items-center justify-center gap-2 transition-colors"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating {count} questions…
                  </>
                ) : (
                  <>
                    <MdAutoAwesome size={18} />
                    Generate questions →
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                AI-generated content should be reviewed by an educator before
                use.
              </p>
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="lg:col-span-3 space-y-4">
            {questions.length === 0 && !generating && (
              <div className="admin-card text-center py-16">
                <MdAutoAwesome
                  size={40}
                  className="mx-auto text-purple-200 mb-3"
                />
                <p className="text-gray-500 font-medium">
                  Your generated questions will appear here
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Fill in the form and click Generate
                </p>
              </div>
            )}

            {generating && (
              <div className="admin-card text-center py-16">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">
                  AI is generating your questions…
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  This usually takes 5–15 seconds
                </p>
              </div>
            )}

            {questions.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {questions.length} question
                    {questions.length !== 1 ? "s" : ""} generated
                    <span className="text-gray-400 font-normal ml-2">
                      · {questions.reduce((s, q) => s + q.points, 0)} total
                      points
                    </span>
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-xs text-purple-600 font-medium hover:underline disabled:opacity-40"
                  >
                    <MdRefresh size={14} /> Regenerate
                  </button>
                </div>

                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      q={q}
                      index={i}
                      onEdit={handleEdit}
                      onDelete={() => handleDelete(q.id)}
                      onCreateSimilar={handleCreateSimilar}
                      editing={editingId === q.id}
                      onSaveEdit={handleSaveEdit}
                      onUpdateImage={handleUpdateImage}
                      onGenerateDiagram={handleGenerateDiagram}
                      generatingDiagram={generatingDiagramId === q.id}
                    />
                  ))}
                </div>

                {creatingSimFor && (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
                    <span className="text-sm text-gray-500 ml-2">
                      Creating similar questions…
                    </span>
                  </div>
                )}

                {/* Save to library CTA */}
                {!saved && (
                  <div className="bg-purple-50 border border-purple-200 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-purple-800">
                        Save this question set
                      </p>
                      <p className="text-xs text-purple-600">
                        Save to your Question Library to reuse, import into
                        tests, or print later.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={saving}
                      className="bg-purple-600 text-white text-sm font-bold px-4 py-2 hover:bg-purple-700 disabled:opacity-60 whitespace-nowrap"
                    >
                      {saving ? "Saving…" : "Save to Library"}
                    </button>
                  </div>
                )}
                {saved && (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 text-center text-sm text-emerald-700 font-semibold flex items-center justify-center gap-2">
                    <MdCheckCircle size={16} /> Saved to Question Library!
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header,
          nav,
          aside,
          .admin-card > div:first-child,
          button {
            display: none !important;
          }
          .lg\\:col-span-2 {
            display: none !important;
          }
          .lg\\:col-span-3 {
            width: 100% !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
