"use client";

import { useMemo, useState } from "react";
import type { Student } from "@/lib/firestore";
import {
  ACCESS_DURATION_OPTIONS,
  formatPlanExpiresAt,
  getPlanKind,
  type AccessDurationPreset,
} from "@/lib/planEntitlements";
import { reactivateStudentAccess } from "@/lib/reactivateAccess";
import { MdLockOpen, MdClose } from "react-icons/md";
import ModalPortal from "@/components/ModalPortal";

type Props = {
  student: Student;
  open: boolean;
  onClose: () => void;
  onDone: (updated: Partial<Student> & { id: string }) => void;
};

export default function ReactivateAccessModal({
  student,
  open,
  onClose,
  onDone,
}: Props) {
  const kind = getPlanKind(student.planTitle);
  const defaultPreset: AccessDurationPreset =
    kind === "basic" || kind === "standard" || kind === "premium"
      ? "quota_reset"
      : kind === "family"
        ? "30"
        : "plan_default";

  const [preset, setPreset] = useState<AccessDurationPreset>(defaultPreset);
  const [customDays, setCustomDays] = useState(30);
  const [applyHousehold, setApplyHousehold] = useState(
    /family/i.test(student.planTitle || "")
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hint = useMemo(
    () => ACCESS_DURATION_OPTIONS.find((o) => o.value === preset)?.hint ?? "",
    [preset]
  );

  if (!open || !student.id) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student.id) return;
    setBusy(true);
    setError("");
    try {
      const result = await reactivateStudentAccess({
        studentId: student.id,
        preset,
        customDays,
        applyToHousehold: applyHousehold,
        note: note.trim() || undefined,
      });

      const next: Partial<Student> & { id: string } = {
        id: student.id,
        status: "active",
        paymentStatus: result.mode === "waive" ? "waived" : "paid",
        planExpiresAt: result.expiresAt
          ? ({ toDate: () => result.expiresAt! } as Student["planExpiresAt"])
          : undefined,
      };
      onDone(next);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reactivation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Access
              </p>
              <h2 className="text-lg font-bold text-[#001233] flex items-center gap-2">
                <MdLockOpen className="text-[#00369b]" /> Reactivate / extend access
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {student.firstName} {student.lastName}
                {student.planTitle ? ` · ${student.planTitle}` : ""}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Current expiry: {formatPlanExpiresAt(student)} · Status:{" "}
                {student.status} · Payment: {student.paymentStatus}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              aria-label="Close"
            >
              <MdClose size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div>
              <label className="admin-label">Access length</label>
              <select
                className="admin-input"
                value={preset}
                onChange={(e) => setPreset(e.target.value as AccessDurationPreset)}
              >
                {ACCESS_DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
            </div>

            {preset === "custom" && (
              <div>
                <label className="admin-label">Custom days from today</label>
                <input
                  type="number"
                  min={1}
                  max={730}
                  className="admin-input"
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                />
              </div>
            )}

            {/family/i.test(student.planTitle || "") && (
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={applyHousehold}
                  onChange={(e) => setApplyHousehold(e.target.checked)}
                />
                <span>
                  Apply to Family Plan household (siblings sharing this parent
                  email)
                </span>
              </label>
            )}

            <div>
              <label className="admin-label">Note (optional, saved on record)</label>
              <input
                className="admin-input"
                placeholder="e.g. Parent paid monthly — extend after week lockout"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {busy ? "Updating…" : "Reactivate student"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
