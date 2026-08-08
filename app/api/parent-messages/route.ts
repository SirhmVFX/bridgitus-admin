import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, createParentMessage, updateParentMessage, type ParentMessage } from "@/lib/firestore";
import { serverTimestamp } from "firebase/firestore";
import sgMail from "@sendgrid/mail";
import { Twilio } from "twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, recipientType, recipientIds, recipientGrades, sendVia, createdBy } = body;

    // Validate required fields
    if (!title || !messageBody || !recipientType || !sendVia) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get all students to determine recipients
    const allStudents = await getAllStudents();
    let targetStudents = allStudents;

    if (recipientType === "specific") {
      if (recipientIds && recipientIds.length > 0) {
        // Filter by specific student IDs
        targetStudents = allStudents.filter((s) => recipientIds!.includes(s.id!));
      } else if (recipientGrades && recipientGrades.length > 0) {
        // Filter by grades
        targetStudents = allStudents.filter((s) => recipientGrades!.includes(s.grade));
      }
    }

    // Extract unique parent emails and phone numbers
    const parentEmails = [...new Set(targetStudents.map((s) => s.parentEmail).filter(Boolean))];
    const parentPhones = [...new Set(targetStudents.map((s) => s.parentPhone).filter(Boolean))];

    // Create the parent message record
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

    // Initialize SendGrid
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (sendGridApiKey) {
      sgMail.setApiKey(sendGridApiKey);
    }

    // Initialize Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const twilioClient = twilioAccountSid && twilioAuthToken 
      ? new Twilio(twilioAccountSid, twilioAuthToken) 
      : null;

    let emailSent = false;
    let smsSent = false;
    let emailErrors: string[] = [];
    let smsErrors: string[] = [];

    // Send emails if requested
    if ((sendVia === "email" || sendVia === "both") && sendGridApiKey && parentEmails.length > 0) {
      try {
        const emailPromises = parentEmails.map((email) =>
          sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL || "noreply@bridgitus.com",
            subject: title,
            text: messageBody,
            html: `<p>${messageBody.replace(/\n/g, "<br>")}</p>`,
          })
        );
        await Promise.allSettled(emailPromises);
        emailSent = true;
      } catch (error) {
        console.error("SendGrid error:", error);
        emailErrors.push(error instanceof Error ? error.message : "Unknown error");
      }
    }

    // Send SMS if requested
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

    // Update the message record with send status
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
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // This could be used to fetch message history if needed
    return NextResponse.json({ message: "GET not implemented" }, { status: 405 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
