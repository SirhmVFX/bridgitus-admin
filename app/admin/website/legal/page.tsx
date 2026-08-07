"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import WysiwygEditor from "@/components/WysiwygEditor";
import { getSiteContent, upsertSiteContent } from "@/lib/firestore";
import { MdSave, MdCheckCircle, MdGavel } from "react-icons/md";

type LegalSection = "terms" | "privacy_policy" | "privacy_data" | "code_of_conduct";
const LEGAL_SECTIONS: { key: LegalSection; label: string; description: string }[] = [
  { key: "terms", label: "Terms & Conditions", description: "Terms of service for using Bridgitus" },
  { key: "privacy_policy", label: "Privacy Policy", description: "How we handle personal data" },
  { key: "privacy_data", label: "Privacy & Data Protection", description: "GDPR and data protection details" },
  { key: "code_of_conduct", label: "Code of Conduct", description: "Student and staff behaviour guidelines" },
];

function LegalEditor({ sectionKey, label }: { sectionKey: LegalSection; label: string }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    getSiteContent(sectionKey).then((d) => {
      if (d) {
        const raw = d as unknown as Record<string, unknown>;
        if (typeof raw.content === "string") {
          setContent(raw.content);
        } else if (d.data && typeof (d.data as Record<string, unknown>).content === "string") {
          setContent((d.data as Record<string, unknown>).content as string);
        }
      }
    });
  }, [sectionKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await upsertSiteContent(sectionKey, { content });
    setSaving(false);
    setOk(true);
    setTimeout(() => setOk(false), 3000);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 px-3 py-2">
        This content is displayed on the <strong>/{sectionKey.replace("_", "-")}</strong> page. Use the editor below to update it.
      </p>
      <WysiwygEditor content={content} onChange={setContent} placeholder={`Enter ${label} content…`} />
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <MdSave size={15} />{saving ? "Saving…" : `Save ${label}`}
        </button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

export default function LegalPage() {
  const [section, setSection] = useState<LegalSection>("terms");
  const current = LEGAL_SECTIONS.find((s) => s.key === section)!;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <MdGavel size={22} className="text-[#00369b]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Legal Pages</h1>
            <p className="text-gray-500 text-sm">Edit Terms, Privacy Policy, Data Protection and Code of Conduct</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 bg-gray-100 p-1">
          {LEGAL_SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${section === s.key ? "bg-white text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="admin-card">
          <div className="mb-4 pb-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{current.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{current.description}</p>
          </div>
          <LegalEditor sectionKey={section} label={current.label} />
        </div>
      </div>
    </AdminLayout>
  );
}
