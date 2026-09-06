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

async function readApiError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const data = JSON.parse(raw) as { error?: string; message?: string };
    if (data.error?.trim()) return data.error.trim();
    if (data.message?.trim()) return data.message.trim();
  } catch {
    /* non-JSON body */
  }
  if (res.status === 413) {
    return "Upload was rejected as too large. Use a PDF under 20MB.";
  }
  if (res.status === 401 || res.status === 403) {
    return "Session expired or not authorized. Refresh and sign in again.";
  }
  if (res.status >= 500) {
    return `Server error (${res.status}). The PDF importer may still be deploying, or AI/PDF parsing failed — try again in a moment.`;
  }
  const snippet = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  return snippet || `Import failed (HTTP ${res.status}).`;
}

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
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      const data = (await res.json().catch(() => ({}))) as {
        questions?: Question[];
        warnings?: string[];
      };
      const questions = data.questions ?? [];
      if (!questions.length) {
        throw new Error(
          "No questions were returned from this PDF. Check numbering, A–D options, and answer markers.",
        );
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
        })),
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
            <div className="modal-box max-w-lg flex flex-col max-h-[min(92vh,720px)] !overflow-hidden">
              <div className="modal-header shrink-0">
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
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 whitespace-pre-wrap break-words">
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
