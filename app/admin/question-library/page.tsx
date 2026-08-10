"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllQuestionSets, deleteQuestionSet,
  type QuestionSet, type AIQuestion,
} from "@/lib/firestore";
import {
  MdLibraryBooks, MdDelete, MdExpandMore, MdExpandLess,
  MdSearch, MdAdd, MdPrint, MdContentCopy, MdArrowBack,
  MdFolder, MdFolderOpen,
} from "react-icons/md";
import { Timestamp } from "firebase/firestore";

// ── Question card in detail view ───────────────────────────────────────────

function QuestionItem({ q, i }: { q: AIQuestion; i: number }) {
  return (
    <div className="admin-card space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 bg-[#00369b] text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 font-semibold">{q.type.replace("_", " ")}</span>
        <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
        {q.difficulty && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5">{q.difficulty}</span>}
      </div>
      <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{q.text}</p>
      {q.options && (
        <div className="grid grid-cols-2 gap-1.5">
          {q.options.map((opt, j) => (
            <div key={j} className={`text-xs px-3 py-1.5 border ${opt === q.correctAnswer ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold" : "border-gray-100 text-gray-600"}`}>
              {opt === q.correctAnswer && "✓ "}{opt}
            </div>
          ))}
        </div>
      )}
      {!q.options && (
        <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
          <strong>Answer:</strong> {q.correctAnswer}
        </div>
      )}
      {q.explanation && (
        <div className="bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          <strong>Explanation:</strong> {q.explanation}
        </div>
      )}
      {q.workedSolution && (
        <div className="bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 font-mono whitespace-pre-wrap">
          <strong className="font-sans">Worked Solution:</strong>{"\n"}{q.workedSolution}
        </div>
      )}
    </div>
  );
}

// ── Set card inside a folder ───────────────────────────────────────────────

function SetCard({
  set, onDelete, onViewQuestions,
}: {
  set: QuestionSet;
  onDelete: (id: string) => void;
  onViewQuestions: (set: QuestionSet) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const diffColor: Record<string, string> = {
    Support: "badge-yellow", Core: "badge-blue", Extension: "badge-red",
  };

  return (
    <div className="border border-gray-200 bg-white p-4 space-y-3 hover:border-[#00369b]/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{set.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="badge badge-blue text-xs">{set.curriculum}</span>
            <span className="badge badge-gray text-xs">{set.year}</span>
            <span className={`badge ${diffColor[set.difficulty] ?? "badge-gray"} text-xs`}>{set.difficulty}</span>
            <span className="badge badge-gray text-xs">{set.format}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {set.topic}{set.subtopic ? ` › ${set.subtopic}` : ""} · {set.questionCount} questions ·{" "}
            {set.questions.reduce((s, q) => s + q.points, 0)} pts
            {set.createdAt && ` · ${(set.createdAt as Timestamp)?.toDate?.()?.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) ?? ""}`}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onViewQuestions(set)} title="View questions"
            className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdContentCopy size={16} /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-[#00369b]">
            {expanded ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
          </button>
          <button onClick={() => onDelete(set.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={16} /></button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          {set.questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 text-sm">
              <span className="w-5 h-5 bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="flex-1">
                <p className="text-gray-700 text-xs leading-relaxed">{q.text}</p>
                {q.correctAnswer && (
                  <p className="text-xs text-emerald-600 mt-0.5">✓ {q.correctAnswer}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subject folder component ───────────────────────────────────────────────

function SubjectFolder({
  subject, sets, onDelete, onViewQuestions, defaultOpen,
}: {
  subject: string;
  sets: QuestionSet[];
  onDelete: (id: string) => void;
  onViewQuestions: (set: QuestionSet) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const totalQ = sets.reduce((s, qs) => s + qs.questionCount, 0);

  return (
    <div className="border border-gray-200 overflow-hidden">
      {/* Folder header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {open
          ? <MdFolderOpen size={22} className="text-amber-500 shrink-0" />
          : <MdFolder size={22} className="text-amber-400 shrink-0" />}
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{subject}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {sets.length} question set{sets.length !== 1 ? "s" : ""} · {totalQ} question{totalQ !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs bg-[#00369b]/10 text-[#00369b] font-semibold px-2 py-0.5">
            {sets.length} set{sets.length !== 1 ? "s" : ""}
          </span>
          {open ? <MdExpandLess size={20} className="text-gray-400" /> : <MdExpandMore size={20} className="text-gray-400" />}
        </div>
      </button>

      {/* Folder contents */}
      {open && (
        <div className="p-4 space-y-3 bg-white border-t border-gray-200">
          {sets.map((set) => (
            <SetCard key={set.id} set={set} onDelete={onDelete} onViewQuestions={onViewQuestions} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function QuestionLibraryPage() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"folders" | "flat">("folders");

  async function load() {
    try {
      const data = await getAllQuestionSets();
      setSets(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this question set? This cannot be undone.")) return;
    await deleteQuestionSet(id);
    setSets(prev => prev.filter(s => s.id !== id));
  }

  const difficulties = ["all", "Support", "Core", "Extension"];

  const filtered = sets.filter(s => {
    const q = search.toLowerCase();
    const textMatch = !search || s.title.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q);
    const diffMatch = filterDifficulty === "all" || s.difficulty === filterDifficulty;
    return textMatch && diffMatch;
  });

  // Group by subject
  const subjectMap = filtered.reduce<Record<string, QuestionSet[]>>((acc, s) => {
    const key = s.subject || "Uncategorised";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const subjects = Object.keys(subjectMap).sort();

  // ── Detail view ────────────────────────────────────────────────────────
  if (viewingSet) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-5">
          <button onClick={() => setViewingSet(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
            <MdArrowBack size={16} /> Back to Library
          </button>

          <div className="section-header">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MdFolder size={16} className="text-amber-500" />
                <span className="text-sm text-gray-400">{viewingSet.subject}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{viewingSet.title}</h1>
              <p className="text-gray-500 text-sm">{viewingSet.subject} · {viewingSet.year} · {viewingSet.difficulty} · {viewingSet.questionCount} questions</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
                <MdPrint size={15} /> Print / PDF
              </button>
            </div>
          </div>

          <div className="space-y-4" id="print-area">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: "Questions", value: viewingSet.questionCount },
                { label: "Total Points", value: viewingSet.questions.reduce((s, q) => s + q.points, 0) },
                { label: "Difficulty", value: viewingSet.difficulty },
                { label: "Format", value: viewingSet.format },
              ].map(s => (
                <div key={s.label} className="admin-card py-3">
                  <p className="text-xl font-bold text-[#00369b]">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            {viewingSet.questions.map((q, i) => (
              <QuestionItem key={q.id} q={q} i={i} />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Library list view ──────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MdLibraryBooks size={22} className="text-[#00369b]" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Question Library</h1>
              <p className="text-gray-500 text-sm">
                {sets.length} saved set{sets.length !== 1 ? "s" : ""} across {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Link href="/admin/ai-generator" className="btn-primary flex items-center gap-2 text-sm">
            <MdAdd size={16} /> Generate New Set
          </Link>
        </div>

        {/* Filters + view toggle */}
        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <MdSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, topic, subject…" className="admin-input pl-8 w-full" />
          </div>
          <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="admin-input w-auto">
            {difficulties.map(d => <option key={d} value={d}>{d === "all" ? "All Difficulties" : d}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded">
            <button onClick={() => setView("folders")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${view === "folders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <MdFolder size={13} /> Folders
            </button>
            <button onClick={() => setView("flat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${view === "flat" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <MdLibraryBooks size={13} /> All
            </button>
          </div>

          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="admin-card text-center py-12 text-gray-400 text-sm">Loading question library…</div>
        ) : loadError ? (
          <div className="admin-card text-center py-10">
            <p className="text-red-600 text-sm">{loadError}</p>
            <button onClick={load} className="btn-primary mt-3 text-sm">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-card text-center py-14">
            <MdLibraryBooks size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{sets.length === 0 ? "No question sets yet" : "No results match your filters"}</p>
            <p className="text-gray-400 text-sm mt-1">
              {sets.length === 0 ? "Use the AI Generator to create your first question set." : "Try adjusting your search or filters."}
            </p>
            {sets.length === 0 && (
              <Link href="/admin/ai-generator" className="btn-primary mt-4 inline-flex items-center gap-2">
                <MdAdd size={16} /> Go to Generator
              </Link>
            )}
          </div>
        ) : view === "folders" ? (
          /* Folder view */
          <div className="space-y-3">
            {subjects.map((subject, idx) => (
              <SubjectFolder
                key={subject}
                subject={subject}
                sets={subjectMap[subject]}
                onDelete={handleDelete}
                onViewQuestions={setViewingSet}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        ) : (
          /* Flat view */
          <div className="space-y-4">
            {filtered.map(set => (
              <div key={set.id} className="admin-card space-y-0 p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <MdFolder size={13} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">{set.subject}</span>
                </div>
                <div className="px-4 pb-4">
                  <SetCard set={set} onDelete={handleDelete} onViewQuestions={setViewingSet} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
