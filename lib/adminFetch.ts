"use client";

import { auth } from "@/lib/firebase";

/** Authenticated fetch for admin API routes (sends Firebase ID token). */
export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in. Refresh and sign in again.");
  }
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
