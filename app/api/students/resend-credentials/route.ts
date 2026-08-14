import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { sendEmail, brandedEmail, isSesConfigured } from "@/lib/email";

/**
 * POST /api/students/resend-credentials
 * Body: { studentId: string }  // Firestore document id
 *
 * Resends onboarding details (Student ID + login email + portal link) via SES when possible,
 * and always triggers Firebase's password-reset email so the family can set a working password
 * even while SES is in sandbox / awaiting production access.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const studentDocId = body.studentId as string | undefined;
    if (!studentDocId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const snap = await getDoc(doc(db, "students", studentDocId));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const student = snap.data();
    const email = (student.email as string) || "";
    const parentEmail = (student.parentEmail as string) || "";
    const studentIdCode = (student.studentId as string) || "";
    const firstName = (student.firstName as string) || "Student";
    const lastName = (student.lastName as string) || "";
    const grade = (student.grade as string) || "";
    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL || "https://bridgitus.com/portal/login";

    if (!email) {
      return NextResponse.json({ error: "Student has no login email on file" }, { status: 400 });
    }

    // Firebase Auth password reset (uses Firebase's own mailer — works without SES production)
    let passwordResetSent = false;
    let passwordResetError: string | null = null;
    try {
      await sendPasswordResetEmail(auth, email);
      passwordResetSent = true;
    } catch (err: unknown) {
      passwordResetError = err instanceof Error ? err.message : String(err);
      console.error("Password reset email failed:", err);
    }

    const onboardingHtml = brandedEmail(
      "Your Bridgitus Learning Portal Access",
      `<p>Hi <strong>${firstName} ${lastName}</strong>,</p>
       <p>Here are your Bridgitus Learning Portal login details:</p>
       <div style="background:#f0f7ff;border:2px solid #00369b;padding:20px;margin:20px 0;">
         <p style="margin:0 0 8px;"><strong>Student ID:</strong> <span style="font-family:monospace;color:#00369b;font-size:16px;">${studentIdCode}</span></p>
         <p style="margin:0 0 8px;"><strong>Login email:</strong> ${email}</p>
         <p style="margin:0;"><strong>Grade:</strong> ${grade}</p>
       </div>
       <p>For security, use the <strong>password reset email</strong> from Firebase (check inbox/spam) to set a new password, then sign in here:</p>
       <div style="text-align:center;margin:28px 0;">
         <a href="${portalUrl}" style="display:inline-block;background:#00369b;color:#fff;text-decoration:none;padding:12px 28px;font-weight:600;">
           Open Learning Portal →
         </a>
       </div>
       <p style="font-size:13px;color:#64748b;">If you already know your password, you can log in with your Student ID or email without resetting.</p>`
    );

    let sesSent = false;
    let sesError: string | null = null;
    const recipients = [...new Set([email, parentEmail].filter(Boolean))];

    if (isSesConfigured()) {
      try {
        for (const to of recipients) {
          await sendEmail({
            to,
            subject: `Bridgitus Learning — login details for ${firstName}`,
            html: onboardingHtml,
          });
        }
        sesSent = true;
        await updateDoc(doc(db, "students", studentDocId), {
          credentialsSent: true,
          credentialsResentAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err: unknown) {
        sesError = err instanceof Error ? err.message : String(err);
        console.error("SES onboarding resend failed:", err);
      }
    } else {
      sesError = "SES is not configured or email is disabled";
    }

    if (!sesSent && !passwordResetSent) {
      return NextResponse.json(
        {
          error: "Could not send email",
          sesError,
          passwordResetError,
          studentId: studentIdCode,
          email,
          parentEmail,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      sesSent,
      passwordResetSent,
      sesError,
      passwordResetError,
      studentId: studentIdCode,
      email,
      parentEmail,
      message: sesSent
        ? `Onboarding email sent to ${recipients.join(", ")}${passwordResetSent ? " · password reset also sent" : ""}`
        : `SES email could not send (${sesError}). ${passwordResetSent ? "A Firebase password-reset email was sent instead — share Student ID with the family." : ""}`,
    });
  } catch (error: unknown) {
    console.error("resend-credentials error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resend credentials" },
      { status: 500 }
    );
  }
}
