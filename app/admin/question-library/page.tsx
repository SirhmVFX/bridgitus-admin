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
} from "react-icons/md";
import { Timestamp } from "firebase/firestore";

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
    <div className="admin-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{set.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="badge badge-blue text-xs">{set.curriculum}</span>
            <span className="badge badge-gray text-xs">{set.subject}</span>
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
          <button onClick={() => onViewQuestions(set)} title="View & use questions"
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

export default function QuestionLibraryPage() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);
  const [loadError, setLoadError] = useState("");

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

  const subjects = ["all", ...Array.from(new Set(sets.map(s => s.subject)))];
  const difficulties = ["all", "Support", "Core", "Extension"];

  const filtered = sets.filter(s => {
    const q = search.toLowerCase();
    const textMatch = !search || s.title.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q);
    const subjectMatch = filterSubject === "all" || s.subject === filterSubject;
    const diffMatch = filterDifficulty === "all" || s.difficulty === filterDifficulty;
    return textMatch && subjectMatch && diffMatch;
  });

  // Detail view for a set
  if (viewingSet) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-5">
          <button onClick={() => setViewingSet(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
            <MdArrowBack size={16} /> Back to Library
          </button>

          <div className="section-header">
            <div>
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
              <div key={q.id} className="admin-card space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 bg-[#00369b] text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 font-semibold">{q.type.replace("_", " ")}</span>
                  <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">{q.text}</p>
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
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MdLibraryBooks size={22} className="text-[#00369b]" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Question Library</h1>
              <p className="text-gray-500 text-sm">{sets.length} saved question set{sets.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Link href="/admin/ai-generator" className="btn-primary flex items-center gap-2 text-sm">
            <MdAdd size={16} /> Generate New Set
          </Link>
        </div>

        {/* Filters */}
        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <MdSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sets…" className="admin-input pl-8 w-full" />
          </div>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="admin-input w-auto">
            {subjects.map(s => <option key={s} value={s}>{s === "all" ? "All Subjects" : s}</option>)}
          </select>
          <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="admin-input w-auto">
            {difficulties.map(d => <option key={d} value={d}>{d === "all" ? "All Difficulties" : d}</option>)}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

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
        ) : (
          <div className="space-y-4">
            {filtered.map(set => (
              <SetCard key={set.id} set={set} onDelete={handleDelete} onViewQuestions={setViewingSet} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
