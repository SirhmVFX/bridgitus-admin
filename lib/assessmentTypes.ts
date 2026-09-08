/** Shared labels/colors for assessment types (tests page + portal). */

export type AssessmentType = "test" | "exam" | "diagnostic" | "assessment";

export const ASSESSMENT_TYPES: AssessmentType[] = [
  "diagnostic",
  "assessment",
  "test",
  "exam",
];

export function assessmentTypeLabel(type?: string | null): string {
  switch (type) {
    case "diagnostic":
      return "Diagnostic";
    case "assessment":
      return "Assessment";
    case "exam":
      return "Exam";
    case "test":
      return "Test";
    default:
      return type ? String(type) : "Assessment";
  }
}

export function assessmentTypeBadgeClass(type?: string | null): string {
  switch (type) {
    case "exam":
      return "badge-red";
    case "diagnostic":
      return "badge-yellow";
    case "assessment":
      return "badge-blue";
    case "test":
    default:
      return "badge-blue";
  }
}

export function assessmentTypePillClass(type?: string | null): string {
  switch (type) {
    case "exam":
      return "bg-red-100 text-red-700";
    case "diagnostic":
      return "bg-amber-100 text-amber-800";
    case "assessment":
      return "bg-indigo-100 text-indigo-700";
    case "test":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export function assessmentTypeBarClass(type?: string | null): string {
  switch (type) {
    case "exam":
      return "bg-red-500";
    case "diagnostic":
      return "bg-amber-500";
    case "assessment":
      return "bg-indigo-500";
    case "test":
    default:
      return "bg-secondary-color";
  }
}
