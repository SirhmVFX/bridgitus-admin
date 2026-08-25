/** Normalize "Year 8" / "Grade 8" / "8" → "8" for comparisons. */
export function normalizeYearGrade(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^year\s+/i, "")
    .replace(/^grade\s+/i, "")
    .replace(/^yr\s+/i, "");
}

export function yearsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeYearGrade(a);
  const nb = normalizeYearGrade(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** True if a question-set year is allowed for the given test grade or assignment grades. */
export function setYearMatchesTarget(
  setYear: string | null | undefined,
  targetGradeOrGrades: string | string[] | null | undefined
): boolean {
  if (!setYear) return false;
  const targets = Array.isArray(targetGradeOrGrades)
    ? targetGradeOrGrades
    : targetGradeOrGrades
      ? [targetGradeOrGrades]
      : [];
  if (!targets.length) return true; // no target yet — allow (will warn in UI)
  return targets.every((g) => yearsMatch(setYear, g));
}
