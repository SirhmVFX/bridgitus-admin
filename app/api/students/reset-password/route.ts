import { NextResponse } from "next/server";
import { sendEmail, brandedEmail, isEmailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * POST /api/students/reset-password
 * Body: { studentId: string } // Firestore doc id
 * Generates a new password, updates Firebase Auth, stores issuedPassword, optionally emails parent.
 */
export async function POST(request: Request) {
  try {
    let body: { studentId?: string; emailParent?: boolean };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }

    const studentDocId = body.studentId?.trim();
    const emailParent = body.emailParent !== false;
    if (!studentDocId) {
      return json({ error: "studentId is required" }, 400);
    }

    let adminAuth: typeof import("@/lib/firebaseAdmin").adminAuth;
    let adminDb: typeof import("@/lib/firebaseAdmin").adminDb;
    let generateStudentPassword: typeof import("@/lib/firebaseAdmin").generateStudentPassword;
    let isFirebaseAdminConfigured: typeof import("@/lib/firebaseAdmin").isFirebaseAdminConfigured;
    let getAdminApp: typeof import("@/lib/firebaseAdmin").getAdminApp;
    let FieldValue: typeof import("firebase-admin/firestore").FieldValue;

    try {
      const admin = await import("@/lib/firebaseAdmin");
      const fs = await import("firebase-admin/firestore");
      adminAuth = admin.adminAuth;
      adminDb = admin.adminDb;
      generateStudentPassword = admin.generateStudentPassword;
      isFirebaseAdminConfigured = admin.isFirebaseAdminConfigured;
      getAdminApp = admin.getAdminApp;
      FieldValue = fs.FieldValue;
    } catch (loadErr: unknown) {
      console.error("Firebase Admin load failed:", loadErr);
      const detail = loadErr instanceof Error ? loadErr.message : String(loadErr);
      return json(
        {
          error: `Firebase Admin could not load: ${detail}. After adding FIREBASE_* env vars, redeploy. Check FIREBASE_PRIVATE_KEY uses \\n for newlines.`,
        },
        503
      );
    }

    if (!isFirebaseAdminConfigured()) {
      return json(
        {
          error:
            "Password reset requires FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY on the server (production env), then redeploy.",
        },
        503
      );
    }

    try {
      getAdminApp();
    } catch (initErr: unknown) {
      console.error("Firebase Admin init failed:", initErr);
      return json(
        {
          error:
            initErr instanceof Error
              ? `Firebase Admin init failed: ${initErr.message}`
              : "Firebase Admin failed to start. Check FIREBASE_PRIVATE_KEY formatting on the host.",
        },
        503
      );
    }

    const snap = await adminDb().collection("students").doc(studentDocId).get();
    if (!snap.exists) {
      return json({ error: "Student not found" }, 404);
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
      return json({ error: "Student has no Auth uid — cannot reset login." }, 400);
    }

    const password = generateStudentPassword();
    await adminAuth().updateUser(uid, { password });
    await adminDb().collection("students").doc(studentDocId).update({
      issuedPassword: password,
      passwordResetAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    let emailed = false;
    let emailError: string | null = null;
    if (!emailParent) {
      emailError = "Email skipped (emailParent=false).";
    } else if (!parentEmail) {
      emailError = "No parent email on this student record.";
    } else if (!isEmailConfigured()) {
      emailError = "Email not configured (set SENDGRID_API_KEY + EMAIL_FROM).";
    } else {
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
        emailError = err instanceof Error ? err.message : "Email send failed";
      }
    }

    return json({
      success: true,
      password,
      studentId: studentIdCode,
      parentEmail,
      emailed,
      emailError,
    });
  } catch (err: unknown) {
    console.error("reset-password error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      500
    );
  }
}
