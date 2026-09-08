import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminAuthOk } from "@/lib/requireAdmin";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  createAndMaybeSendParentMessage,
  flushDueScheduledParentMessages,
} from "@/lib/parentMessageDelivery";

export async function GET(request: NextRequest) {
  try {
    const adminAuthResult = await requireAdmin(request);
    if (!isAdminAuthOk(adminAuthResult)) return adminAuthResult;

    // Deliver any due scheduled messages when history is loaded
    try {
      await flushDueScheduledParentMessages();
    } catch (flushErr) {
      console.error("flush scheduled parent messages:", flushErr);
    }

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
        scheduledAt:
          data.scheduledAt?.toDate?.()?.toISOString?.() ?? data.scheduledAt ?? null,
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
      scheduledAt,
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

    const result = await createAndMaybeSendParentMessage({
      title,
      body: messageBody,
      recipientType,
      recipientIds,
      recipientGrades,
      sendVia,
      createdBy: createdBy ?? adminAuthResult.uid,
      attachmentUrl,
      attachmentName,
      scheduledAt,
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      scheduled: result.scheduled,
      emailSentCount: result.emailSentCount,
      smsSentCount: result.smsSentCount,
      message: result.message,
    });
  } catch (error) {
    console.error("Error sending parent message:", error);
    const msg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
