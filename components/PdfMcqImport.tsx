"use client";

import ModalPortal from "@/components/ModalPortal";

import { useRef, useState } from "react";
import { MdPictureAsPdf, MdClose } from "react-icons/md";
import { adminFetch } from "@/lib/adminFetch";
import type { Question } from "@/lib/firestore";

type Props = {
  onImported: (questions: Question[]) => void;
  className?: string;
};

const MAX_MB = 20;

export default function PdfMcqImport({ onImported, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setWarnings([]);

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds the ${MAX_MB}MB limit.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await adminFetch("/api/parse-mcq-pdf", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to import MCQs from PDF.");
      }
      const questions = (data.questions ?? []) as Question[];
      if (!questions.length) {
        throw new Error("No questions were returned from this PDF.");
      }
      if (Array.isArray(data.warnings) && data.warnings.length) {
        setWarnings(data.warnings.map(String));
      }
      onImported(
        questions.map((q) => ({
          ...q,
          id: crypto.randomUUID(),
          type: "multiple_choice",
          points: q.points ?? 1,
        }))
      );
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setWarnings([]);
          setOpen(true);
        }}
        className="btn-secondary text-xs flex items-center gap-1 py-1 border-rose-300 text-rose-800 hover:bg-rose-50"
      >
        <MdPictureAsPdf size={14} /> Import MCQs from PDF
      </button>

      {open && (
        <ModalPortal>
<div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !loading && setOpen(false)}
        >
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">Import MCQs from PDF</h2>
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-[#001233] mb-2">
                  PDF criteria for conversion:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs leading-relaxed">
                  <li>Text-based PDF (not scanned images only)</li>
                  <li>Each question numbered (1. 2. or Q1 Q2)</li>
                  <li>Multiple choice options labeled A) B) C) D) or A. B. C. D.</li>
                  <li>
                    Correct answers indicated (e.g. Answer: B, or * next to correct
                    option, or an answer key section)
                  </li>
                  <li>Prefer English; max ~50 questions per PDF</li>
                  <li>File size under 20MB</li>
                </ol>
              </div>

              <div>
                <label className="admin-label">PDF file</label>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={loading}
                  onChange={handleFile}
                  className="admin-input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#00369b] file:text-white"
                />
              </div>

              {loading && (
                <p className="text-sm text-[#00369b] font-medium">
                  Extracting text and converting to MCQs… this can take a minute.
                </p>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
                  {warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
</ModalPortal>
      )}
    </div>
  );
}
