import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb,
  authEmailForStudentId,
  formatStudentId,
  generateStudentPassword,
  isFirebaseAdminConfigured,
  nextStudentIdCounterAdmin,
} from "@/lib/firebaseAdmin";
import { sendEmail, brandedEmail, isSesConfigured } from "@/lib/email";

/**
 * POST /api/students/add-family-sibling
 * Body: {
 *   sourceStudentId: string, // existing family student Firestore id
 *   firstName, lastName, dateOfBirth, gender, school, grade, subjects?: string[]
 * }
 * Copies parent + Family plan fields onto a new sibling (max 3 under parent email).
 */
export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Adding a sibling requires Firebase Admin credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) in .env.local.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const sourceStudentId = body.sourceStudentId as string | undefined;
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const dateOfBirth = String(body.dateOfBirth || body.age || "").trim();
    const gender = String(body.gender || "").trim();
    const school = String(body.school || "").trim();
    const grade = String(body.grade || "").trim();
    const subjects: string[] = Array.isArray(body.subjects)
      ? body.subjects.map(String)
      : typeof body.subjects === "string"
        ? body.subjects.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    if (!sourceStudentId || !firstName || !lastName || !grade || !school) {
      return NextResponse.json(
        { error: "sourceStudentId, firstName, lastName, school, and grade are required" },
        { status: 400 }
      );
    }

    const sourceSnap = await adminDb().collection("students").doc(sourceStudentId).get();
    if (!sourceSnap.exists) {
      return NextResponse.json({ error: "Source student not found" }, { status: 404 });
    }
    const source = sourceSnap.data()!;
    const planTitle = String(source.planTitle || "");
    const isFamily = /family/i.test(planTitle);
    if (!isFamily) {
      return NextResponse.json(
        {
          error:
            "This student is not on the Family Plan. Change their plan to Family Plan first, or ask the parent to re-register under Family Plan.",
        },
        { status: 400 }
      );
    }

    const parentEmail = String(source.parentEmail || source.email || "")
      .trim()
      .toLowerCase();
    if (!parentEmail) {
      return NextResponse.json({ error: "Source student has no parent email" }, { status: 400 });
    }

    const siblings = await adminDb()
      .collection("students")
      .where("parentEmail", "==", parentEmail)
      .get();
    if (siblings.size >= 3) {
      return NextResponse.json(
        { error: "Family Plan already has 3 students under this parent email." },
        { status: 400 }
      );
    }

    const { year, next } = await nextStudentIdCounterAdmin();
    const studentId = formatStudentId(year, next);
    const password = generateStudentPassword();
    const authEmail = authEmailForStudentId(studentId);

    const user = await adminAuth().createUser({
      email: authEmail,
      password,
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    });

    const docRef = await adminDb().collection("students").add({
      uid: user.uid,
      studentId,
      email: parentEmail,
      authEmail,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      school,
      grade,
      subjects,
      parentFirstName: source.parentFirstName || "",
      parentLastName: source.parentLastName || "",
      parentEmail,
      parentPhone: source.parentPhone || "",
      postcode: source.postcode || "",
      planId: source.planId || "",
      planTitle: source.planTitle || "Family Plan",
      issuedPassword: password,
      status: "active",
      paymentStatus: source.paymentStatus || "pending",
      credentialsSent: false,
      enrolledAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL || "https://bridgitus.com/portal/login";
    let emailed = false;
    if (isSesConfigured()) {
      try {
        await sendEmail({
          to: parentEmail,
          subject: `Bridgitus Learning — new sibling account for ${firstName}`,
          html: brandedEmail(
            "New Student Added to Family Plan",
            `<p>Hi ${(source.parentFirstName as string) || "there"},</p>
             <p>A new student has been added under your Family Plan:</p>
             <div style="background:#f0f7ff;border:2px solid #00369b;padding:20px;margin:20px 0;">
               <p style="margin:0 0 8px;"><strong>Name:</strong> ${firstName} ${lastName}</p>
               <p style="margin:0 0 8px;"><strong>Student ID:</strong> <span style="font-family:monospace;color:#00369b;">${studentId}</span></p>
               <p style="margin:0 0 8px;"><strong>Password:</strong> <span style="font-family:monospace;color:#00369b;">${password}</span></p>
               <p style="margin:0;"><strong>Grade:</strong> ${grade}</p>
             </div>
             <p><a href="${portalUrl}">Open Learning Portal →</a></p>`
          ),
        });
        emailed = true;
        await docRef.update({ credentialsSent: true });
      } catch (err) {
        console.error("Sibling credentials email failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      studentId,
      password,
      parentEmail,
      emailed,
      siblingCount: siblings.size + 1,
    });
  } catch (err: unknown) {
    console.error("add-family-sibling error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add sibling" },
      { status: 500 }
    );
  }
}
