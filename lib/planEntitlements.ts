import type { Student } from "./firestore";

/** Usage quotas tied to each pricing plan. */
export interface PlanQuotaState {
  classesAllowed: number;
  assessmentsAllowed: number;
  classesUsed: number;
  assessmentsUsed: number;
  assignmentMinutesAllowed?: number;
  assignmentMinutesUsed?: number;
}

export type PlanKind = "family" | "basic" | "standard" | "premium" | "other";

export function getPlanKind(planTitle?: string | null): PlanKind {
  const t = (planTitle || "").toLowerCase();
  if (t.includes("family")) return "family";
  if (t.includes("basic") || t.includes("pay as you go") || t.includes("casual"))
    return "basic";
  if (t.includes("premium") || t.includes("success")) return "premium";
  if (t.includes("standard") || t.includes("growth")) return "standard";
  return "other";
}

export function isFamilyPlanTitle(planTitle?: string | null): boolean {
  return getPlanKind(planTitle) === "family";
}

/**
 * Entitlements applied at payment / reactivation time.
 * Family defaults to 7 days; admin can override to 30 (month) etc.
 */
export function getPlanEntitlements(planTitle?: string | null): {
  kind: PlanKind;
  durationDays: number | null;
  quotas: Omit<
    PlanQuotaState,
    "classesUsed" | "assessmentsUsed" | "assignmentMinutesUsed"
  > | null;
} {
  const kind = getPlanKind(planTitle);
  switch (kind) {
    case "family":
      return { kind, durationDays: 7, quotas: null };
    case "basic":
      return {
        kind,
        durationDays: null,
        quotas: {
          classesAllowed: 1,
          assessmentsAllowed: 1,
          assignmentMinutesAllowed: 60,
        },
      };
    case "standard":
      return {
        kind,
        durationDays: null,
        quotas: { classesAllowed: 20, assessmentsAllowed: 20 },
      };
    case "premium":
      return {
        kind,
        durationDays: null,
        quotas: { classesAllowed: 30, assessmentsAllowed: 30 },
      };
    default:
      return { kind, durationDays: 30, quotas: null };
  }
}

export function buildQuotaState(planTitle?: string | null): PlanQuotaState | null {
  const { quotas } = getPlanEntitlements(planTitle);
  if (!quotas) return null;
  return {
    ...quotas,
    classesUsed: 0,
    assessmentsUsed: 0,
    assignmentMinutesUsed: 0,
  };
}

export type AccessDurationPreset =
  | "plan_default"
  | "7"
  | "14"
  | "21"
  | "30"
  | "70"
  | "105"
  | "quota_reset"
  | "custom"
  | "waive";

export const ACCESS_DURATION_OPTIONS: {
  value: AccessDurationPreset;
  label: string;
  hint: string;
}[] = [
  {
    value: "plan_default",
    label: "Plan default",
    hint: "Family = 7 days; quota plans reset classes/assessments",
  },
  { value: "7", label: "1 week (7 days)", hint: "Typical Family / weekly billing" },
  { value: "14", label: "2 weeks (14 days)", hint: "Extend for a fortnight" },
  { value: "21", label: "3 weeks (21 days)", hint: "Extend for three weeks" },
  { value: "30", label: "1 month (30 days)", hint: "Use when parent paid for a month" },
  { value: "70", label: "10 weeks (70 days)", hint: "Standard-length calendar access" },
  { value: "105", label: "15 weeks (105 days)", hint: "Premium-length calendar access" },
  {
    value: "quota_reset",
    label: "Reset plan quotas (no expiry date)",
    hint: "Basic / Standard / Premium class & assessment allowances",
  },
  { value: "custom", label: "Custom days", hint: "Enter any number of days from today" },
  {
    value: "waive",
    label: "Waive payment (active, no expiry)",
    hint: "Complimentary access until you change it",
  },
];

export function resolveReactivationDuration(
  preset: AccessDurationPreset,
  planTitle: string | null | undefined,
  customDays: number
): { mode: "days" | "quota" | "waive"; days: number | null } {
  if (preset === "waive") return { mode: "waive", days: null };
  if (preset === "quota_reset") return { mode: "quota", days: null };
  if (preset === "custom") {
    const d = Math.max(1, Math.floor(customDays || 1));
    return { mode: "days", days: d };
  }
  if (preset === "plan_default") {
    const { durationDays, quotas } = getPlanEntitlements(planTitle);
    if (quotas && !durationDays) return { mode: "quota", days: null };
    return { mode: "days", days: durationDays ?? 30 };
  }
  return { mode: "days", days: Number(preset) };
}

export function formatPlanExpiresAt(student: Pick<Student, "planExpiresAt">): string {
  const raw = student.planExpiresAt;
  if (!raw) return "—";
  const d =
    typeof (raw as { toDate?: () => Date }).toDate === "function"
      ? (raw as { toDate: () => Date }).toDate()
      : new Date(raw as unknown as string);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
