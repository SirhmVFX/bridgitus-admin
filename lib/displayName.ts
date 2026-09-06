/** Human-readable labels — never show Firestore document IDs in the UI. */

import type { Student } from "@/lib/firestore";

const BAD_NAME_PLACEHOLDERS = new Set([
  "unknown student",
  "unknown",
  "n/a",
  "na",
  "null",
  "undefined",
  "student",
  "student (name unavailable)",
]);

function isUsableDisplayName(value?: string | null): boolean {
  const t = value?.trim();
  if (!t) return false;
  if (looksLikeDocId(t)) return false;
  if (BAD_NAME_PLACEHOLDERS.has(t.toLowerCase())) return false;
  return true;
}

export function personDisplayName(input: {
  studentName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  student?: { firstName?: string; lastName?: string; studentId?: string } | null;
  fallback?: string;
}): string {
  if (isUsableDisplayName(input.studentName)) return input.studentName!.trim();

  if (input.student) {
    const n = `${input.student.firstName ?? ""} ${input.student.lastName ?? ""}`.trim();
    if (n) return n;
    if (input.student.studentId && !looksLikeDocId(input.student.studentId)) {
      return `Student ${input.student.studentId}`;
    }
  }

  const n = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  if (n) return n;

  return input.fallback ?? "Student (name unavailable)";
}

export function titleDisplayName(
  title?: string | null,
  fallback = "Untitled",
): string {
  const t = title?.trim();
  return t || fallback;
}

/** True if value looks like a Firestore auto-id (not a BRG login code). */
export function looksLikeDocId(value?: string | null): boolean {
  if (!value) return false;
  if (/^BRG-/i.test(value)) return false;
  return /^[A-Za-z0-9]{16,}$/.test(value);
}

/** Lookup by Firestore id, Auth uid, or BRG studentId code. */
export function buildStudentLookup(students: Student[]): Map<string, Student> {
  const map = new Map<string, Student>();
  for (const s of students) {
    if (s.id) map.set(s.id, s);
    if (s.uid) map.set(s.uid, s);
    if (s.studentId) map.set(s.studentId, s);
  }
  return map;
}

export function resolveStudent(
  lookup: Map<string, Student>,
  ...keys: Array<string | undefined | null>
): Student | undefined {
  for (const key of keys) {
    if (!key) continue;
    const hit = lookup.get(key);
    if (hit) return hit;
  }
  return undefined;
}
