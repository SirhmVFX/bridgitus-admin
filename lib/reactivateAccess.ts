import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  type UpdateData,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Student } from "@/lib/firestore";
import {
  ACCESS_DURATION_OPTIONS,
  buildQuotaState,
  isFamilyPlanTitle,
  resolveReactivationDuration,
  type AccessDurationPreset,
} from "@/lib/planEntitlements";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findHouseholdStudentIds(
  parentEmail: string,
  includeDocId?: string
): Promise<string[]> {
  const email = normalizeEmail(parentEmail);
  if (!email) return includeDocId ? [includeDocId] : [];

  const ids = new Set<string>();
  if (includeDocId) ids.add(includeDocId);

  const [byParent, byEmail] = await Promise.all([
    getDocs(query(collection(db, "students"), where("parentEmail", "==", email))),
    getDocs(query(collection(db, "students"), where("email", "==", email))),
  ]);

  for (const snap of [byParent, byEmail]) {
    for (const d of snap.docs) ids.add(d.id);
  }

  return [...ids];
}

export type ReactivateAccessInput = {
  studentId: string;
  preset: AccessDurationPreset;
  customDays?: number;
  /** Apply to siblings on Family plan (default true when Family). */
  applyToHousehold?: boolean;
  note?: string;
};

export type ReactivateAccessResult = {
  updatedIds: string[];
  family: boolean;
  expiresAt: Date | null;
  mode: "days" | "quota" | "waive";
  days: number | null;
};

/**
 * Reactivate a suspended/expired student (or extend a paid one).
 * Sets status=active, paymentStatus=paid|waived, and either a new planExpiresAt
 * or fresh planQuota — so portal access and payment cron won't immediately re-lock them.
 */
export async function reactivateStudentAccess(
  input: ReactivateAccessInput
): Promise<ReactivateAccessResult> {
  const primaryRef = doc(db, "students", input.studentId);
  const primarySnap = await getDoc(primaryRef);
  if (!primarySnap.exists()) {
    throw new Error("Student not found");
  }

  const student = { id: primarySnap.id, ...(primarySnap.data() as Student) };
  const planTitle = student.planTitle || "";
  const resolved = resolveReactivationDuration(
    input.preset,
    planTitle,
    input.customDays ?? 30
  );

  const now = new Date();
  const note =
    input.note?.trim() ||
    `admin-reactivate:${input.preset}:${now.toISOString().slice(0, 10)}`;

  const patch: UpdateData<DocumentData> = {
    status: "active",
    paymentStatus: resolved.mode === "waive" ? "waived" : "paid",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    paymentReference: note,
  };

  let expiresAt: Date | null = null;

  if (resolved.mode === "days" && resolved.days) {
    expiresAt = new Date(now.getTime() + resolved.days * 24 * 60 * 60 * 1000);
    patch.planExpiresAt = Timestamp.fromDate(expiresAt);
    patch.planQuota = deleteField();
  } else if (resolved.mode === "quota") {
    const quota = buildQuotaState(planTitle);
    if (quota) {
      patch.planQuota = quota;
      patch.planExpiresAt = deleteField();
    } else {
      // No quota definition — fall back to 30 calendar days
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      patch.planExpiresAt = Timestamp.fromDate(expiresAt);
    }
  } else {
    // waive — clear expiry so cron won't suspend
    patch.planExpiresAt = deleteField();
  }

  const family = isFamilyPlanTitle(planTitle);
  const applyHousehold = input.applyToHousehold ?? family;

  let targetIds = [input.studentId];
  if (applyHousehold && family) {
    const parentEmail = student.parentEmail || student.email || "";
    const ids = await findHouseholdStudentIds(parentEmail, input.studentId);
    targetIds = ids.slice(0, 3);
  }

  await Promise.all(
    targetIds.map((id) => updateDoc(doc(db, "students", id), patch))
  );

  return {
    updatedIds: targetIds,
    family: family && targetIds.length > 1,
    expiresAt,
    mode: resolved.mode,
    days: resolved.days,
  };
}

export { ACCESS_DURATION_OPTIONS };
