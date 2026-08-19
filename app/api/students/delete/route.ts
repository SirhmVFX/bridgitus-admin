import { NextResponse } from "next/server";
import {
  isFirebaseAdminConfigured,
  adminAuth,
  adminDb,
  getAdminApp,
} from "@/lib/firebaseAdmin";

/**
 * POST /api/students/delete
 * Body: { studentId: string } // Firestore document id
 *
 * Uses Firebase Admin SDK (bypasses security rules) to delete:
 * 1) Firebase Auth user
 * 2) Firestore students/{id} document
 */
export async function POST(request: Request) {
  try {
    let body: { studentId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const studentDocId = body.studentId?.trim();
    if (!studentDocId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error: "ADMIN_NOT_CONFIGURED",
          message:
            "Firebase Admin is not configured. Student can still be removed from the admin UI via client fallback, but the login may remain in Authentication.",
        },
        { status: 503 }
      );
    }

    try {
      getAdminApp();
    } catch (err: unknown) {
      return NextResponse.json(
        {
          error: "ADMIN_INIT_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Firebase Admin failed to start. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
        },
        { status: 503 }
      );
    }

    const docRef = adminDb().collection("students").doc(studentDocId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const data = docSnap.data()!;
    const uid = (data.uid as string | undefined) || undefined;
    const authEmail = (data.authEmail as string | undefined) || undefined;
    const studentIdCode = (data.studentId as string) || "";

    let authDeleted = false;
    let authWarning = "";

    async function tryDeleteUid(id: string) {
      try {
        await adminAuth().deleteUser(id);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("user-not-found") || msg.includes("USER_NOT_FOUND")) return true;
        throw err;
      }
    }

    try {
      if (uid) {
        authDeleted = await tryDeleteUid(uid);
      } else if (authEmail) {
        const user = await adminAuth().getUserByEmail(authEmail);
        authDeleted = await tryDeleteUid(user.uid);
      } else {
        authWarning = "No Auth uid on student record.";
      }
    } catch (err: unknown) {
      authWarning = err instanceof Error ? err.message : "Could not delete Auth user";
      console.error("Auth delete failed:", err);
    }

    await docRef.delete();

    return NextResponse.json({
      success: true,
      studentId: studentIdCode,
      authDeleted,
      warning: authWarning || undefined,
    });
  } catch (err: unknown) {
    console.error("delete student error:", err);
    return NextResponse.json(
      {
        error: "DELETE_FAILED",
        message: err instanceof Error ? err.message : "Delete failed",
      },
      { status: 500 }
    );
  }
}
