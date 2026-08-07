"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { MdCheckCircle, MdError, MdInfo } from "react-icons/md";

type Status = "checking" | "ok" | "rules_error" | "config_error" | "not_admin";

export default function FirebaseStatus() {
  const { user, adminUser, loading } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (loading) return;

    async function check() {
      // 1. Check if user is logged in
      if (!user) {
        setStatus("config_error");
        setDetail("Not authenticated — please log in.");
        return;
      }

      // 2. Check if admin record exists
      if (!adminUser) {
        setStatus("not_admin");
        setDetail(`User ${user.email} is logged in but has no record in the Firestore /admins collection. Add a document with uid="${user.uid}" to /admins.`);
        return;
      }

      // 3. Try a test Firestore read
      try {
        await getDocs(query(collection(db, "students"), limit(1)));
        setStatus("ok");
        setDetail(`Connected · Logged in as ${adminUser.displayName || user.email} (${adminUser.role})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
          setStatus("rules_error");
          setDetail(`Firestore security rules are blocking reads. Deploy the rules from firestore.rules: run "firebase deploy --only firestore:rules" in the bridgitus-admin folder, or copy the rules into Firebase Console → Firestore → Rules.`);
        } else {
          setStatus("config_error");
          setDetail(`Firestore connection error: ${msg}`);
        }
      }
    }

    check();
  }, [user, adminUser, loading]);

  if (status === "ok" || status === "checking") return null;

  const colors: Record<Status, string> = {
    checking:     "bg-gray-50 border-gray-200 text-gray-600",
    ok:           "bg-emerald-50 border-emerald-200 text-emerald-700",
    rules_error:  "bg-red-50 border-red-300 text-red-800",
    config_error: "bg-orange-50 border-orange-300 text-orange-800",
    not_admin:    "bg-amber-50 border-amber-300 text-amber-800",
  };
  const icons: Record<Status, React.ReactNode> = {
    checking:     <MdInfo size={18} className="shrink-0 mt-0.5"/>,
    ok:           <MdCheckCircle size={18} className="shrink-0 mt-0.5"/>,
    rules_error:  <MdError size={18} className="shrink-0 mt-0.5"/>,
    config_error: <MdError size={18} className="shrink-0 mt-0.5"/>,
    not_admin:    <MdError size={18} className="shrink-0 mt-0.5"/>,
  };
  const titles: Record<Status, string> = {
    checking:     "Checking connection…",
    ok:           "Connected",
    rules_error:  "Firestore Security Rules Error",
    config_error: "Firebase Configuration Error",
    not_admin:    "Admin Record Missing",
  };

  return (
    <div className={`border px-4 py-3 flex items-start gap-3 text-sm ${colors[status]}`}>
      {icons[status]}
      <div>
        <p className="font-semibold">{titles[status]}</p>
        <p className="mt-0.5 text-xs leading-relaxed">{detail}</p>
        {status === "rules_error" && (
          <div className="mt-2 p-3 bg-white/60 text-xs font-mono border border-red-200">
            <p className="font-semibold text-red-700 mb-1">Quick fix — paste these rules in Firebase Console:</p>
            <p>Firebase Console → Firestore Database → Rules → paste contents of <code>firestore.rules</code> → Publish</p>
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-red-600 underline mt-1 inline-block">Open Firebase Console →</a>
          </div>
        )}
        {status === "not_admin" && (
          <div className="mt-2 p-3 bg-white/60 text-xs border border-amber-200">
            <p className="font-semibold text-amber-700 mb-1">Fix: Create admin record in Firestore</p>
            <p>Firebase Console → Firestore → <code>admins</code> collection → Add document with fields:</p>
            <pre className="mt-1 bg-amber-50 p-2 text-xs">{`uid: "${user?.uid}"\nemail: "${user?.email}"\ndisplayName: "Your Name"\nrole: "super"`}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
