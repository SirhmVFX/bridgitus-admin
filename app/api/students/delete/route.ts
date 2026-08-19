import { NextResponse } from "next/server";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isFirebaseAdminConfigured, adminAuth, getAdminApp } from "@/lib/firebaseAdmin";

/**
 * POST /api/students/delete
 * Body: { studentId: string } // Firestore document id
 *
 * Always deletes the Firestore student doc.
 * Also deletes Firebase Auth when Admin SDK credentials are valid.
 */
export async function POST(request: Request) {
  try {
    let body: { studentId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const studentDocId = body.studentId;
    if (!studentDocId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    // Read via client SDK (works with existing web Firebase config)
    const snap = await getDoc(doc(db, "students", studentDocId));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const data = snap.data();
    const uid = (data.uid as string | undefined) || undefined;
    const authEmail = (data.authEmail as string | undefined) || undefined;
    const studentIdCode = (data.studentId as string) || "";

    let authDeleted = false;
    let authWarning = "";

    if (isFirebaseAdminConfigured()) {
      try {
        // Validate Admin init before Auth calls
        getAdminApp();

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

        if (uid) {
          authDeleted = await tryDeleteUid(uid);
        } else if (authEmail) {
          const user = await adminAuth().getUserByEmail(authEmail);
          authDeleted = await tryDeleteUid(user.uid);
        } else {
          authWarning = "No Auth uid on student record — login may still exist in Firebase Authentication.";
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        authWarning =
          `Could not delete Firebase Auth login (${msg}). Student record was still removed. ` +
          "Check FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY are from a Service Account JSON, then delete the user under Firebase Console → Authentication if needed.";
        console.error("Admin Auth delete failed:", err);
      }
    } else {
      authWarning =
        "Firebase Admin not configured — student record deleted, but login may still exist in Authentication.";
    }

    // Always remove Firestore record
    await deleteDoc(doc(db, "students", studentDocId));

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
