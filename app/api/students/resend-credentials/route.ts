import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendEmail, brandedEmail, isSesConfigured } from "@/lib/email";

/**
 * POST /api/students/resend-credentials
 * Body: { studentId: string }  // Firestore document id
 *
 * Emails Student ID + portal link to the parent contact email.
 * Login is Student ID + password (not email).
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
    const parentEmail = ((student.parentEmail as string) || (student.email as string) || "").trim();
    const studentIdCode = (student.studentId as string) || "";
    const firstName = (student.firstName as string) || "Student";
    const lastName = (student.lastName as string) || "";
    const grade = (student.grade as string) || "";
    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL || "https://bridgitus.com/portal/login";

    if (!parentEmail) {
      return NextResponse.json({ error: "Student has no parent/contact email on file" }, { status: 400 });
    }
    if (!studentIdCode) {
      return NextResponse.json({ error: "Student has no Student ID on file" }, { status: 400 });
    }

    const onboardingHtml = brandedEmail(
      "Your Bridgitus Learning Portal Access",
      `<p>Hi <strong>${firstName} ${lastName}</strong>,</p>
       <p>Here are your Bridgitus Learning Portal login details:</p>
       <div style="background:#f0f7ff;border:2px solid #00369b;padding:20px;margin:20px 0;">
         <p style="margin:0 0 8px;"><strong>Student ID:</strong> <span style="font-family:monospace;color:#00369b;font-size:16px;">${studentIdCode}</span></p>
         <p style="margin:0 0 8px;"><strong>Grade:</strong> ${grade}</p>
         <p style="margin:0;"><strong>Parent email (contact only):</strong> ${parentEmail}</p>
       </div>
       <p><strong>Log in with your Student ID and password</strong> — not with email.</p>
       <p>If you no longer have the password from registration, contact Bridgitus support to reset it.</p>
       <div style="text-align:center;margin:28px 0;">
         <a href="${portalUrl}" style="display:inline-block;background:#00369b;color:#fff;text-decoration:none;padding:12px 28px;font-weight:600;">
           Open Learning Portal →
         </a>
       </div>`
    );

    if (!isSesConfigured()) {
      return NextResponse.json(
        {
          error: "Email is temporarily disabled. Share this Student ID with the family manually.",
          studentId: studentIdCode,
          parentEmail,
        },
        { status: 503 }
      );
    }

    try {
      await sendEmail({
        to: parentEmail,
        subject: `Bridgitus Learning — login details for ${firstName}`,
        html: onboardingHtml,
      });
      await updateDoc(doc(db, "students", studentDocId), {
        credentialsSent: true,
        credentialsResentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err: unknown) {
      console.error("SES onboarding resend failed:", err);
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : "Failed to send email",
          studentId: studentIdCode,
          parentEmail,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      studentId: studentIdCode,
      parentEmail,
      message: `Onboarding email sent to ${parentEmail} · Student ID: ${studentIdCode}`,
    });
  } catch (error: unknown) {
    console.error("resend-credentials error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resend credentials" },
      { status: 500 }
    );
  }
}
