import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";

export type AdminAuthOk = { uid: string; email?: string };

/**
 * Verify Firebase ID token + that the user is an admin.
 * Clients must send: Authorization: Bearer <idToken>
 */
export async function requireAdmin(
  request: Request
): Promise<AdminAuthOk | NextResponse> {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    return NextResponse.json(
      { error: "Unauthorized. Sign in as an admin and retry." },
      { status: 401 }
    );
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin is not configured on the server (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).",
      },
      { status: 503 }
    );
  }

  try {
    const decoded = await adminAuth().verifyIdToken(match[1].trim());
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();

    const adminSnap = await adminDb()
      .collection("admins")
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (!adminSnap.empty) {
      return { uid, email: email || undefined };
    }

    // Fallback: env ADMIN_EMAIL (bootstrap / single-owner installs)
    const envAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (envAdmin && email && email === envAdmin) {
      return { uid, email };
    }

    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  } catch (err) {
    console.error("requireAdmin failed:", err);
    return NextResponse.json(
      { error: "Unauthorized. Invalid or expired session." },
      { status: 401 }
    );
  }
}

export function isAdminAuthOk(
  value: AdminAuthOk | NextResponse
): value is AdminAuthOk {
  return !(value instanceof NextResponse);
}
