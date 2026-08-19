import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | null = null;

/** True when FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY are set (same as seed script). */
export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY &&
      (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  );
}

export function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local (from a Firebase service account JSON)."
    );
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n").trim();
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY looks invalid. Paste the private_key value from the Firebase service account JSON (keep the \\n characters)."
    );
  }

  try {
    app = initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Firebase Admin failed to start: ${msg}. Re-download the service account JSON and copy client_email + private_key again.`
    );
  }
  return app;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export function generateStudentPassword(length = 10): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function authEmailForStudentId(studentId: string): string {
  return `${studentId.toLowerCase()}@students.bridgitus.local`;
}

export async function nextStudentIdCounterAdmin(): Promise<{ year: number; next: number }> {
  const year = new Date().getFullYear();
  const prefix = `BRG-${year}-`;
  const snap = await adminDb()
    .collection("students")
    .where("studentId", ">=", prefix)
    .where("studentId", "<", `BRG-${year + 1}-`)
    .get();
  let max = 0;
  snap.docs.forEach((d) => {
    const id = (d.data().studentId as string) || "";
    const n = parseInt(id.slice(-4), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return { year, next: max + 1 };
}

export function formatStudentId(year: number, n: number): string {
  return `BRG-${year}-${String(n).padStart(4, "0")}`;
}
