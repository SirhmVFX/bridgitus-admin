import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb,
  generateStudentPassword,
  isFirebaseAdminConfigured,
} from "@/lib/firebaseAdmin";
import { sendEmail, brandedEmail, isSesConfigured } from "@/lib/email";

/**
 * POST /api/students/reset-password
 * Body: { studentId: string } // Firestore doc id
 * Generates a new password, updates Firebase Auth, stores issuedPassword, optionally emails parent.
 */
export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Password reset requires Firebase Admin credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) in .env.local.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const studentDocId = body.studentId as string | undefined;
    const emailParent = body.emailParent !== false;
    if (!studentDocId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const snap = await adminDb().collection("students").doc(studentDocId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const student = snap.data()!;
    const uid = student.uid as string | undefined;
    const studentIdCode = (student.studentId as string) || "";
    const parentEmail = ((student.parentEmail as string) || (student.email as string) || "").trim();
    const firstName = (student.firstName as string) || "Student";
    const lastName = (student.lastName as string) || "";
    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL || "https://bridgitus.com/portal/login";

    if (!uid) {
      return NextResponse.json({ error: "Student has no Auth uid" }, { status: 400 });
    }

    const password = generateStudentPassword();
    await adminAuth().updateUser(uid, { password });
    await adminDb().collection("students").doc(studentDocId).update({
      issuedPassword: password,
      passwordResetAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    let emailed = false;
    if (emailParent && parentEmail && isSesConfigured()) {
      try {
        await sendEmail({
          to: parentEmail,
          subject: `Bridgitus Learning — password reset for ${firstName}`,
          html: brandedEmail(
            "Password Reset",
            `<p>Hi,</p>
             <p>The portal password for <strong>${firstName} ${lastName}</strong> has been reset.</p>
             <div style="background:#f0f7ff;border:2px solid #00369b;padding:20px;margin:20px 0;">
               <p style="margin:0 0 8px;"><strong>Student ID:</strong> <span style="font-family:monospace;color:#00369b;font-size:16px;">${studentIdCode}</span></p>
               <p style="margin:0;"><strong>New password:</strong> <span style="font-family:monospace;color:#00369b;font-size:16px;letter-spacing:0.05em;">${password}</span></p>
             </div>
             <p>Log in at <a href="${portalUrl}">${portalUrl}</a> with Student ID + password (not email).</p>`
          ),
        });
        emailed = true;
      } catch (err) {
        console.error("Password reset email failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      password,
      studentId: studentIdCode,
      parentEmail,
      emailed,
    });
  } catch (err: unknown) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 }
    );
  }
}
