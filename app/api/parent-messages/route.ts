import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, createParentMessage, updateParentMessage, type ParentMessage } from "@/lib/firestore";
import { sendEmailToMany, brandedEmail, isSesConfigured } from "@/lib/email";
import { Twilio } from "twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, recipientType, recipientIds, recipientGrades, sendVia, createdBy } = body;

    if (!title || !messageBody || !recipientType || !sendVia) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const allStudents = await getAllStudents();
    let targetStudents = allStudents;

    if (recipientType === "specific") {
      if (recipientIds && recipientIds.length > 0) {
        targetStudents = allStudents.filter((s) => recipientIds!.includes(s.id!));
      } else if (recipientGrades && recipientGrades.length > 0) {
        targetStudents = allStudents.filter((s) => recipientGrades!.includes(s.grade));
      }
    }

    const parentEmails = [...new Set(targetStudents.map((s) => s.parentEmail).filter(Boolean))];
    const parentPhones = [...new Set(targetStudents.map((s) => s.parentPhone).filter(Boolean))];

    const parentMessageData: Omit<ParentMessage, "id"> = {
      title,
      body: messageBody,
      recipientType,
      recipientIds,
      recipientGrades,
      sendVia,
      sentByEmail: false,
      sentBySms: false,
      emailCount: parentEmails.length,
      smsCount: parentPhones.length,
      createdBy,
    };

    const messageId = await createParentMessage(parentMessageData);

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const twilioClient = twilioAccountSid && twilioAuthToken
      ? new Twilio(twilioAccountSid, twilioAuthToken)
      : null;

    let emailSent = false;
    let smsSent = false;
    const emailErrors: string[] = [];
    const smsErrors: string[] = [];

    // Send emails via Amazon SES
    if ((sendVia === "email" || sendVia === "both") && parentEmails.length > 0) {
      if (!isSesConfigured()) {
        emailErrors.push("Email is not configured (set SENDGRID_API_KEY + EMAIL_ENABLED=true).");
      } else {
        try {
          const result = await sendEmailToMany(parentEmails, {
            subject: title,
            text: messageBody,
            html: brandedEmail(
              title,
              `<p>${String(messageBody).replace(/\n/g, "<br>")}</p>
               <p style="margin-top:20px;font-size:13px;color:#64748b;">This message was sent by Bridgitus Learning to parents/guardians.</p>`
            ),
          });
          emailSent = result.sent > 0;
          if (result.failed > 0) {
            emailErrors.push(...result.errors.slice(0, 5));
          }
        } catch (error) {
          console.error("Email parent-message error:", error);
          emailErrors.push(error instanceof Error ? error.message : "Unknown email error");
        }
      }
    }

    // SMS via Twilio (unchanged)
    if ((sendVia === "sms" || sendVia === "both") && twilioClient && twilioPhoneNumber && parentPhones.length > 0) {
      try {
        const smsPromises = parentPhones.map((phone) =>
          twilioClient!.messages.create({
            body: `${title}\n\n${messageBody}`,
            from: twilioPhoneNumber!,
            to: phone,
          })
        );
        await Promise.allSettled(smsPromises);
        smsSent = true;
      } catch (error) {
        console.error("Twilio error:", error);
        smsErrors.push(error instanceof Error ? error.message : "Unknown error");
      }
    }

    await updateParentMessage(messageId, {
      sentByEmail: emailSent,
      sentBySms: smsSent,
    });

    return NextResponse.json({
      success: true,
      messageId,
      emailRecipients: parentEmails.length,
      smsRecipients: parentPhones.length,
      emailSent,
      smsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      smsErrors: smsErrors.length > 0 ? smsErrors : undefined,
      message: `Message ${emailSent || smsSent ? "sent successfully" : "created"}${emailErrors.length > 0 ? " (some emails failed)" : ""}${smsErrors.length > 0 ? " (some SMS failed)" : ""}`,
    });
  } catch (error) {
    console.error("Error sending parent message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "GET not implemented" }, { status: 405 });
}
