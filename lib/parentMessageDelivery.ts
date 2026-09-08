import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendEmailToMany, brandedEmail, isSesConfigured } from "@/lib/email";
import { Twilio } from "twilio";

export type StudentRow = {
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

export type ParentMessagePayload = {
  title: string;
  body: string;
  recipientType: "all" | "single" | "specific";
  recipientIds?: string[];
  recipientGrades?: string[];
  sendVia: "email" | "sms" | "both";
  createdBy?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  /** ISO datetime — if in the future, message is saved as scheduled */
  scheduledAt?: string | null;
};

export async function loadStudents(): Promise<StudentRow[]> {
  const snap = await adminDb().collection("students").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudentRow, "id">) }));
}

function resolveTargets(
  allStudents: StudentRow[],
  payload: Pick<ParentMessagePayload, "recipientType" | "recipientIds" | "recipientGrades">,
) {
  let targetStudents = allStudents;
  if (payload.recipientType === "single" || payload.recipientType === "specific") {
    if ((payload.recipientIds?.length ?? 0) > 0) {
      const idSet = new Set(payload.recipientIds);
      targetStudents = allStudents.filter((s) => idSet.has(s.id));
    } else if ((payload.recipientGrades?.length ?? 0) > 0) {
      const gradeSet = new Set(payload.recipientGrades);
      targetStudents = allStudents.filter((s) => s.grade && gradeSet.has(s.grade));
    }
  }
  return targetStudents;
}

function recipientLabelsFor(students: StudentRow[]) {
  return students.map((s) => {
    const parent =
      [s.parentFirstName, s.parentLastName].filter(Boolean).join(" ").trim() ||
      s.parentEmail?.trim() ||
      "Parent / Guardian";
    const student =
      [s.firstName, s.lastName].filter(Boolean).join(" ").trim() ||
      (s.studentId ? `Student ${s.studentId}` : "Student (name unavailable)");
    return `${student} — ${parent}`;
  });
}

/** Deliver email/SMS for an existing parentMessages document. */
export async function deliverParentMessageDoc(messageId: string): Promise<{
  success: boolean;
  message: string;
  emailSentCount: number;
  smsSentCount: number;
}> {
  const ref = adminDb().collection("parentMessages").doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { success: false, message: "Message not found", emailSentCount: 0, smsSentCount: 0 };
  }
  const data = snap.data()!;
  if (data.status === "sent" || data.sentAt) {
    return {
      success: true,
      message: "Already sent",
      emailSentCount: data.emailSentCount ?? 0,
      smsSentCount: data.smsSentCount ?? 0,
    };
  }

  const allStudents = await loadStudents();
  const targetStudents = resolveTargets(allStudents, {
    recipientType: data.recipientType,
    recipientIds: data.recipientIds,
    recipientGrades: data.recipientGrades,
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

  const title = String(data.title ?? "");
  const messageBody = String(data.body ?? "");
  const sendVia = data.sendVia as "email" | "sms" | "both";
  const safeAttachmentUrl =
    typeof data.attachmentUrl === "string" ? data.attachmentUrl : undefined;
  const safeAttachmentName =
    typeof data.attachmentName === "string" ? data.attachmentName : undefined;

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
        if (result.failed > 0) emailErrors.push(...result.errors.slice(0, 5));
      } catch (error) {
        console.error("Email parent-message error:", error);
        emailErrors.push(error instanceof Error ? error.message : "Unknown email error");
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
    status: delivered ? "sent" : "failed",
    sentByEmail: emailSent,
    sentBySms: smsSent,
    emailCount: emailSentCount || parentEmails.length,
    smsCount: smsSentCount || parentPhones.length,
    emailSentCount,
    smsSentCount,
    ...(delivered ? { sentAt: FieldValue.serverTimestamp() } : {}),
    deliveryErrors: [...emailErrors, ...smsErrors].slice(0, 10),
  });

  return {
    success: delivered,
    emailSentCount,
    smsSentCount,
    message: delivered
      ? `Delivered: ${emailSentCount} email(s), ${smsSentCount} SMS.`
      : `Message saved but not delivered. ${[...emailErrors, ...smsErrors].join(" ")}`,
  };
}

/** Create + optionally schedule or immediately deliver a parent message. */
export async function createAndMaybeSendParentMessage(
  payload: ParentMessagePayload,
): Promise<{
  success: boolean;
  messageId: string;
  scheduled: boolean;
  message: string;
  emailSentCount?: number;
  smsSentCount?: number;
}> {
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
    scheduledAt,
  } = payload;

  const allStudents = await loadStudents();
  const targetStudents = resolveTargets(allStudents, {
    recipientType,
    recipientIds,
    recipientGrades,
  });
  const labels = recipientLabelsFor(targetStudents);

  const safeAttachmentUrl =
    typeof attachmentUrl === "string" && attachmentUrl.trim()
      ? attachmentUrl.trim()
      : undefined;
  const safeAttachmentName =
    typeof attachmentName === "string" && attachmentName.trim()
      ? attachmentName.trim()
      : undefined;

  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isFuture =
    scheduleDate &&
    !Number.isNaN(scheduleDate.getTime()) &&
    scheduleDate.getTime() > Date.now() + 30_000;

  const ref = await adminDb().collection("parentMessages").add({
    title,
    body: messageBody,
    recipientType,
    recipientIds: recipientIds ?? [],
    recipientGrades: recipientGrades ?? [],
    recipientLabels: labels,
    sendVia,
    ...(safeAttachmentUrl
      ? {
          attachmentUrl: safeAttachmentUrl,
          attachmentName: safeAttachmentName || "Attachment",
        }
      : {}),
    status: isFuture ? "scheduled" : "pending",
    ...(isFuture ? { scheduledAt: scheduleDate!.toISOString() } : {}),
    sentByEmail: false,
    sentBySms: false,
    emailCount: 0,
    smsCount: 0,
    createdBy: createdBy ?? "",
    createdAt: FieldValue.serverTimestamp(),
  });

  if (isFuture) {
    return {
      success: true,
      messageId: ref.id,
      scheduled: true,
      message: `Message scheduled for ${scheduleDate!.toLocaleString("en-AU")}.`,
    };
  }

  const result = await deliverParentMessageDoc(ref.id);
  return {
    success: result.success,
    messageId: ref.id,
    scheduled: false,
    message: result.message,
    emailSentCount: result.emailSentCount,
    smsSentCount: result.smsSentCount,
  };
}

/** Send any scheduled messages that are due. */
export async function flushDueScheduledParentMessages(): Promise<{
  processed: number;
  sent: number;
}> {
  const now = Date.now();
  // Avoid composite index: load scheduled docs and filter in memory
  const snap = await adminDb()
    .collection("parentMessages")
    .where("status", "==", "scheduled")
    .limit(50)
    .get();

  let processed = 0;
  let sent = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const raw = data.scheduledAt;
    const when =
      typeof raw === "string"
        ? new Date(raw).getTime()
        : raw?.toDate?.()?.getTime?.() ?? 0;
    if (!when || when > now) continue;
    processed++;
    const result = await deliverParentMessageDoc(doc.id);
    if (result.success) sent++;
  }
  return { processed, sent };
}
