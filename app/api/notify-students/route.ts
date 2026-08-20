import { NextResponse } from "next/server";
import { getAllStudents } from "@/lib/firestore";
import { sendEmailToMany, brandedEmail, isSesConfigured } from "@/lib/email";

/**
 * POST /api/notify-students
 * Body: {
 *   type: "test" | "exam" | "assignment" | "quiz",
 *   title: string,
 *   subject?: string,
 *   description?: string,
 *   grades: string[],
 *   studentIds?: string[],   // optional: target specific students
 *   portalPath?: string,    // e.g. /portal/tests
 * }
 *
 * Emails each matching student (and their parent) that new work is available.
 */
export async function POST(request: Request) {
  try {
    if (!isSesConfigured()) {
      return NextResponse.json(
        { error: "Email is not configured. Set SENDGRID_API_KEY and EMAIL_FROM, then set EMAIL_ENABLED=true in lib/email.ts." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      type,
      title,
      subject,
      description,
      grades = [],
      studentIds,
      portalPath,
    } = body as {
      type: "test" | "exam" | "assignment" | "quiz";
      title: string;
      subject?: string;
      description?: string;
      grades?: string[];
      studentIds?: string[];
      portalPath?: string;
    };

    if (!type || !title) {
      return NextResponse.json({ error: "Missing type or title" }, { status: 400 });
    }

    const allStudents = await getAllStudents();
    let targets = allStudents.filter((s) => s.status === "active" || !s.status);

    if (studentIds && studentIds.length > 0) {
      targets = targets.filter((s) => studentIds.includes(s.id!));
    } else if (grades.length > 0) {
      targets = targets.filter((s) => grades.includes(s.grade));
    }

    const typeLabel =
      type === "exam" ? "Exam" :
      type === "quiz" ? "Quiz" :
      type === "assignment" ? "Assignment" : "Test";

    const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL || "https://bridgitus.com/portal/login";
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || "https://bridgitus.com";
    const linkPath = portalPath || (type === "assignment" || type === "quiz" ? "/portal/assignments" : "/portal/tests");
    const ctaUrl = linkPath.startsWith("http") ? linkPath : `${siteBase}${linkPath}`;

    const recipients = [
      ...targets.map((s) => s.email).filter(Boolean),
      ...targets.map((s) => s.parentEmail).filter(Boolean),
    ];

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No student/parent emails found for the selected grades." });
    }

    const html = brandedEmail(
      `New ${typeLabel}: ${title}`,
      `<p>Hi there,</p>
       <p>A new <strong>${typeLabel.toLowerCase()}</strong> has been published on the Bridgitus Learning Portal.</p>
       <div style="background:#f0f7ff;border:1px solid #bfdbfe;padding:16px 20px;margin:20px 0;">
         <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#00369b;">${title}</p>
         ${subject ? `<p style="margin:0;color:#64748b;font-size:14px;">Subject: ${subject}</p>` : ""}
         ${grades.length ? `<p style="margin:4px 0 0;color:#64748b;font-size:14px;">Grade${grades.length > 1 ? "s" : ""}: ${grades.join(", ")}</p>` : ""}
         ${description ? `<p style="margin:12px 0 0;font-size:14px;">${String(description).replace(/\n/g, "<br>")}</p>` : ""}
       </div>
       <p>Log in to your portal to view and complete it.</p>
       <div style="text-align:center;margin:28px 0;">
         <a href="${ctaUrl}" style="display:inline-block;background:#00369b;color:#fff;text-decoration:none;padding:12px 28px;font-weight:600;">
           Open Portal →
         </a>
       </div>
       <p style="font-size:13px;color:#94a3b8;">Portal login: <a href="${portalBase}">${portalBase}</a></p>`
    );

    const result = await sendEmailToMany(recipients, {
      subject: `New ${typeLabel} available: ${title}`,
      html,
    });

    return NextResponse.json({
      ok: true,
      type,
      title,
      recipients: recipients.length,
      ...result,
      message: `Notified ${result.sent} recipient(s)${result.failed ? ` (${result.failed} failed)` : ""}.`,
    });
  } catch (error: unknown) {
    console.error("notify-students error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notifications" },
      { status: 500 }
    );
  }
}
