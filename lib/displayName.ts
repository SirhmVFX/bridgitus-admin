/** Human-readable labels — never show Firestore document IDs in the UI. */

export function personDisplayName(input: {
  studentName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  student?: { firstName?: string; lastName?: string } | null;
  fallback?: string;
}): string {
  const fromDenorm = input.studentName?.trim();
  if (fromDenorm) return fromDenorm;

  if (input.student) {
    const n = `${input.student.firstName ?? ""} ${input.student.lastName ?? ""}`.trim();
    if (n) return n;
  }

  const n = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  if (n) return n;

  return input.fallback ?? "Unknown student";
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
