import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin, isAdminAuthOk } from "@/lib/requireAdmin";
import { sendEmailToMany, brandedEmail, isSesConfigured } from "@/lib/email";
import { Twilio } from "twilio";

type StudentRow = {
  id: string;
  grade?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentFirstName?: string;
  parentLastName?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
};

async function loadStudents(): Promise<StudentRow[]> {
  const snap = await adminDb().collection("students").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudentRow, "id">) }));
}

export async function GET(request: NextRequest) {
  try {
    const adminAuthResult = await requireAdmin(request);
    if (!isAdminAuthOk(adminAuthResult)) return adminAuthResult;

    const snap = await adminDb()
      .collection("parentMessages")
      .orderBy("createdAt", "desc")
      .get();

    const messages = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? null,
        sentAt: data.sentAt?.toDate?.()?.toISOString?.() ?? data.sentAt ?? null,
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error listing parent messages:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuthResult = await requireAdmin(request);
    if (!isAdminAuthOk(adminAuthResult)) return adminAuthResult;

    const body = await request.json();
    const {
      title,
      body: messageBody,
      recipientType,
      recipientIds,
      recipientGrades,
      sendVia,
      createdBy,
      attachmentUrl,
      attachmentName,
    } = body;

    if (!title || !messageBody || !recipientType || !sendVia) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (
      (recipientType === "specific" || recipientType === "single") &&
      !(recipientIds?.length > 0) &&
      !(recipientGrades?.length > 0)
    ) {
      return NextResponse.json(
        {
          error:
            recipientType === "single"
              ? "Select one student whose parent/guardian should receive this message."
              : "Select at least one student or grade for specific recipients.",
        },
        { status: 400 },
      );
    }

    if (recipientType === "single" && (recipientIds?.length ?? 0) !== 1) {
      return NextResponse.json(
        { error: "Single-parent mode requires exactly one student." },
        { status: 400 },
      );
    }

    const allStudents = await loadStudents();
    let targetStudents = allStudents;

    if (recipientType === "single" || recipientType === "specific") {
      if (recipientIds?.length > 0) {
        const idSet = new Set(recipientIds as string[]);
        targetStudents = allStudents.filter((s) => idSet.has(s.id));
      } else if (recipientGrades?.length > 0) {
        const gradeSet = new Set(recipientGrades as string[]);
        targetStudents = allStudents.filter((s) => s.grade && gradeSet.has(s.grade));
      }
    }

    const recipientLabels = targetStudents.map((s) => {
      const parent =
        [s.parentFirstName, s.parentLastName].filter(Boolean).join(" ").trim() ||
        s.parentEmail?.trim() ||
        "Parent / Guardian";
      const student =
        [s.firstName, s.lastName].filter(Boolean).join(" ").trim() ||
        (s.studentId ? `Student ${s.studentId}` : "Student (name unavailable)");
      return `${student} — ${parent}`;
    });

    const parentEmails = [
      ...new Set(
        targetStudents
          .map((s) => s.parentEmail?.trim())
          .filter((e): e is string => Boolean(e)),
      ),
    ];
    const parentPhones = [
      ...new Set(
        targetStudents
          .map((s) => s.parentPhone?.trim())
          .filter((p): p is string => Boolean(p)),
      ),
    ];

    if (
      (sendVia === "email" || sendVia === "both") &&
      parentEmails.length === 0 &&
      (sendVia === "sms" || sendVia === "both") &&
      parentPhones.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No parent email or phone numbers found for the selected recipients. Add parent contact details on student profiles.",
        },
        { status: 400 },
      );
    }

    const safeAttachmentUrl =
      typeof attachmentUrl === "string" && attachmentUrl.trim()
        ? attachmentUrl.trim()
        : undefined;
    const safeAttachmentName =
      typeof attachmentName === "string" && attachmentName.trim()
        ? attachmentName.trim()
        : undefined;

    const ref = await adminDb().collection("parentMessages").add({
      title,
      body: messageBody,
      recipientType,
      recipientIds: recipientIds ?? [],
      recipientGrades: recipientGrades ?? [],
      recipientLabels,
      sendVia,
      ...(safeAttachmentUrl
        ? {
            attachmentUrl: safeAttachmentUrl,
            attachmentName: safeAttachmentName || "Attachment",
          }
        : {}),
      sentByEmail: false,
      sentBySms: false,
      emailCount: parentEmails.length,
      smsCount: parentPhones.length,
      createdBy: createdBy ?? adminAuthResult.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const twilioClient =
      twilioAccountSid && twilioAuthToken
        ? new Twilio(twilioAccountSid, twilioAuthToken)
        : null;

    let emailSent = false;
    let smsSent = false;
    let emailSentCount = 0;
    let smsSentCount = 0;
    const emailErrors: string[] = [];
    const smsErrors: string[] = [];

    const attachmentHtml = safeAttachmentUrl
      ? `<p style="margin-top:16px;"><a href="${safeAttachmentUrl.replace(/"/g, "&quot;")}" style="color:#00369b;font-weight:600;">Download attachment${safeAttachmentName ? `: ${String(safeAttachmentName).replace(/</g, "&lt;")}` : ""}</a></p>`
      : "";
    const attachmentText = safeAttachmentUrl
      ? `\n\nAttachment: ${safeAttachmentName || "file"}\n${safeAttachmentUrl}`
      : "";

    if ((sendVia === "email" || sendVia === "both") && parentEmails.length > 0) {
      if (!isSesConfigured()) {
        emailErrors.push(
          "Email is not configured (set SENDGRID_API_KEY and EMAIL_ENABLED=true).",
        );
      } else {
        try {
          const result = await sendEmailToMany(parentEmails, {
            subject: title,
            text: `${messageBody}${attachmentText}`,
            html: brandedEmail(
              title,
              `<p>${String(messageBody).replace(/\n/g, "<br>")}</p>
               ${attachmentHtml}
               <p style="margin-top:20px;font-size:13px;color:#64748b;">This message was sent by Bridgitus Learning to parents/guardians.</p>`,
            ),
          });
          emailSentCount = result.sent;
          emailSent = result.sent > 0;
          if (result.failed > 0) {
            emailErrors.push(...result.errors.slice(0, 5));
          }
        } catch (error) {
          console.error("Email parent-message error:", error);
          emailErrors.push(
            error instanceof Error ? error.message : "Unknown email error",
          );
        }
      }
    } else if (sendVia === "email" || sendVia === "both") {
      emailErrors.push("No parent email addresses on the selected student profiles.");
    }

    if (sendVia === "sms" || sendVia === "both") {
      if (!twilioClient || !twilioPhoneNumber) {
        if (parentPhones.length > 0) {
          smsErrors.push(
            "SMS is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).",
          );
        }
      } else if (parentPhones.length === 0) {
        smsErrors.push("No parent phone numbers on the selected student profiles.");
      } else {
        const smsBody = safeAttachmentUrl
          ? `${title}\n\n${messageBody}\n\nAttachment: ${safeAttachmentUrl}`
          : `${title}\n\n${messageBody}`;
        const results = await Promise.allSettled(
          parentPhones.map((phone) =>
            twilioClient!.messages.create({
              body: smsBody,
              from: twilioPhoneNumber!,
              to: phone,
            }),
          ),
        );
        smsSentCount = results.filter((r) => r.status === "fulfilled").length;
        smsSent = smsSentCount > 0;
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            const reason =
              r.reason instanceof Error ? r.reason.message : String(r.reason);
            smsErrors.push(`${parentPhones[i]}: ${reason}`);
          }
        });
      }
    }

    const delivered = emailSent || smsSent;
    await ref.update({
      sentByEmail: emailSent,
      sentBySms: smsSent,
      emailCount: emailSentCount || parentEmails.length,
      smsCount: smsSentCount || parentPhones.length,
      emailSentCount,
      smsSentCount,
      ...(delivered ? { sentAt: FieldValue.serverTimestamp() } : {}),
      deliveryErrors: [...emailErrors, ...smsErrors].slice(0, 10),
    });

    return NextResponse.json({
      success: delivered,
      messageId: ref.id,
      emailRecipients: parentEmails.length,
      smsRecipients: parentPhones.length,
      emailSent,
      smsSent,
      emailSentCount,
      smsSentCount,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      smsErrors: smsErrors.length > 0 ? smsErrors : undefined,
      message: delivered
        ? `Delivered: ${emailSentCount} email(s), ${smsSentCount} SMS.`
        : `Message saved but not delivered. ${[...emailErrors, ...smsErrors].join(" ")}`,
    });
  } catch (error) {
    console.error("Error sending parent message:", error);
    const msg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
