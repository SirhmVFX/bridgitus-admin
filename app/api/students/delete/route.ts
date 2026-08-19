import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured, adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/students/delete
 * Body: { studentId: string } // Firestore document id
 *
 * Deletes the Firestore student doc AND the Firebase Auth user (so re-registration works).
 */
export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Deleting a student (including their login) requires Firebase Admin credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) in .env.local.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const studentDocId = body.studentId as string | undefined;
    if (!studentDocId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const docSnap = await adminDb().collection("students").doc(studentDocId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const data = docSnap.data()!;
    const uid = data.uid as string | undefined;
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
        authWarning = "No Auth uid/email on student record — Firestore only deleted.";
      }
    } catch (err: unknown) {
      // Fallback: look up by authEmail if uid delete failed
      if (authEmail) {
        try {
          const user = await adminAuth().getUserByEmail(authEmail);
          authDeleted = await tryDeleteUid(user.uid);
        } catch (err2: unknown) {
          authWarning = err2 instanceof Error ? err2.message : "Could not delete Auth user";
        }
      } else {
        authWarning = err instanceof Error ? err.message : "Could not delete Auth user";
      }
    }

    await adminDb().collection("students").doc(studentDocId).delete();

    return NextResponse.json({
      success: true,
      studentId: studentIdCode,
      authDeleted,
      warning: authWarning || undefined,
    });
  } catch (err: unknown) {
    console.error("delete student error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
