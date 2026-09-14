import { Timestamp } from "firebase/firestore";

/** Free trial length for new registrations (calendar days). Keep in sync with bridgitus-learning. */
export const TRIAL_DAYS = 7;

export type TrialStudentFields = {
  trialStartedAt?: Timestamp | { toDate?: () => Date } | string | null;
  trialEndsAt?: Timestamp | { toDate?: () => Date } | string | null;
  trialUsed?: boolean;
  paymentStatus?: string;
  status?: string;
};

export function getTrialEndDate(student: TrialStudentFields): Date | null {
  if (!student.trialEndsAt) return null;
  const raw = student.trialEndsAt;
  if (raw instanceof Timestamp) return raw.toDate();
  if (
    typeof raw === "object" &&
    raw !== null &&
    typeof (raw as { toDate?: () => Date }).toDate === "function"
  ) {
    return (raw as { toDate: () => Date }).toDate();
  }
  const d = new Date(raw as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeTrialEndsAt(from = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function isOnActiveTrial(student: TrialStudentFields): boolean {
  if (student.status === "suspended" || student.status === "inactive") return false;
  if (student.paymentStatus === "paid" || student.paymentStatus === "waived") {
    return false;
  }
  const end = getTrialEndDate(student);
  if (!end) return false;
  return end.getTime() > Date.now();
}

export function hasTrialEnded(student: TrialStudentFields): boolean {
  if (student.paymentStatus === "paid" || student.paymentStatus === "waived") {
    return false;
  }
  const end = getTrialEndDate(student);
  if (!end) return false;
  return end.getTime() <= Date.now();
}

export function getTrialDaysRemaining(student: TrialStudentFields): number | null {
  if (!isOnActiveTrial(student)) return null;
  const end = getTrialEndDate(student);
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function formatTrialEndsLabel(student: TrialStudentFields): string | null {
  const end = getTrialEndDate(student);
  if (!end) return null;
  return end.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function buildNewTrialFields(from = new Date()) {
  const ends = computeTrialEndsAt(from);
  return {
    trialStartedAt: Timestamp.fromDate(from),
    trialEndsAt: Timestamp.fromDate(ends),
    trialUsed: true,
  };
}
