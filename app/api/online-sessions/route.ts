import { NextResponse } from "next/server";
import {
  createOnlineSession,
  updateOnlineSession,
  getAllStudents,
  type OnlineSession,
} from "@/lib/firestore";
import { sendEmailToMany, brandedEmail, isSesConfigured } from "@/lib/email";

/**
 * POST /api/online-sessions
 * Creates a Teams online session and emails matching students + parents.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      teamsUrl,
      startsAt,
      durationMinutes,
      targetGrades = [],
      createdBy,
      notify = true,
    } = body as {
      title: string;
      teamsUrl: string;
      startsAt: string;
      durationMinutes: number;
      targetGrades?: string[];
      createdBy?: string;
      notify?: boolean;
    };

    if (!title || !teamsUrl || !startsAt || !durationMinutes || durationMinutes <= 0) {
      return NextResponse.json(
        { error: "Title, Teams URL, start time and duration are required." },
        { status: 400 }
      );
    }

    const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60_000).toISOString();

    const id = await createOnlineSession({
      title,
      teamsUrl,
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes: Number(durationMinutes),
      endsAt,
      targetGrades: targetGrades ?? [],
      createdBy,
      notified: false,
    });

    let emailResult = { sent: 0, failed: 0 };
    if (notify && isSesConfigured()) {
      const students = await getAllStudents();
      const targets = students.filter((s) => {
        if (s.status === "inactive" || s.status === "suspended") return false;
        if (!targetGrades?.length) return true;
        return targetGrades.includes(s.grade);
      });
      const recipients = [
        ...targets.map((s) => s.email).filter(Boolean),
        ...targets.map((s) => s.parentEmail).filter(Boolean),
      ];

      const startLabel = new Date(startsAt).toLocaleString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (recipients.length > 0) {
        emailResult = await sendEmailToMany(recipients, {
          subject: `Online class starting soon: ${title}`,
          html: brandedEmail(
            "Microsoft Teams Online Class",
            `<p>An online class has been scheduled on the Bridgitus Learning Portal.</p>
             <div style="background:#f0f7ff;border:1px solid #bfdbfe;padding:16px 20px;margin:20px 0;">
               <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#00369b;">${title}</p>
               <p style="margin:0;color:#64748b;font-size:14px;">Starts: ${startLabel}</p>
               <p style="margin:4px 0 0;color:#64748b;font-size:14px;">Duration: ${durationMinutes} minutes</p>
             </div>
             <p>When the session is live, a glowing <strong>Join Teams Class</strong> button appears on your student dashboard.</p>
             <div style="text-align:center;margin:28px 0;">
               <a href="${teamsUrl}" style="display:inline-block;background:#5B5FC7;color:#fff;text-decoration:none;padding:12px 28px;font-weight:600;">
                 Open Microsoft Teams →
               </a>
             </div>`
          ),
        });
        await updateOnlineSession(id, { notified: true });
      }
    }

    return NextResponse.json({
      ok: true,
      id,
      endsAt,
      emailsSent: emailResult.sent,
      message: `Session created${emailResult.sent ? ` · ${emailResult.sent} email(s) sent` : ""}.`,
    });
  } catch (error: unknown) {
    console.error("online-sessions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 500 }
    );
  }
}
