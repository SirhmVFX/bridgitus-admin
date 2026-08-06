"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/auth";
import {
  getAllAdmins, updateAdmin,
  ADMIN_SECTIONS,
  type AdminUser, type AdminSection,
} from "@/lib/firestore";
import {
  MdShield, MdCheckBox, MdCheckBoxOutlineBlank,
  MdSave, MdCheckCircle, MdInfo,
} from "react-icons/md";

const SECTION_LABELS: Record<AdminSection, string> = {
  dashboard: "Dashboard", students: "Students", materials: "Learning Materials",
  tests: "Tests & Exams", assignments: "Assignments", announcements: "Announcements",
  website: "Website Content", messages: "Contact Messages",
  account: "My Account", permissions: "Admin Permissions",
};
const SECTION_DESCRIPTIONS: Record<AdminSection, string> = {
  dashboard: "View overview stats and pending reviews",
  students: "View, edit and manage student records",
  materials: "Upload and manage learning materials",
  tests: "Create tests/exams, review submissions",
  assignments: "Create and assign tasks",
  announcements: "Publish grade-targeted notices",
  website: "Edit all public website content",
  messages: "View contact form enquiries",
  account: "Manage own profile and password",
  permissions: "Manage admin accounts and access (super only)",
};

export default function PermissionsPage() {
  const { adminUser: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  // Local edits: adminId → set of sections
  const [edits, setEdits] = useState<Record<string, Set<AdminSection>>>({});

  async function load() {
    const all = await getAllAdmins();
    setAdmins(all);
    // Init edits from current permissions
    const init: Record<string, Set<AdminSection>> = {};
    for (const a of all) {
      init[a.id!] = new Set(a.permissions ?? []);
    }
    setEdits(init);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggle(adminId: string, section: AdminSection) {
    setEdits((prev) => {
      const next = new Set(prev[adminId] ?? []);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return { ...prev, [adminId]: next };
    });
  }

  function selectAll(adminId: string) {
    setEdits((prev) => ({ ...prev, [adminId]: new Set(ADMIN_SECTIONS) }));
  }

  function selectNone(adminId: string) {
    setEdits((prev) => ({ ...prev, [adminId]: new Set() }));
  }

  async function handleSave(admin: AdminUser) {
    if (!admin.id) return;
    setSaving(admin.id);
    try {
      const permissions = Array.from(edits[admin.id] ?? []) as AdminSection[];
      await updateAdmin(admin.id, { permissions });
      setSaved(admin.id);
      setTimeout(() => setSaved(null), 2500);
      await load();
    } finally {
      setSaving(null);
    }
  }

  // Only super admins can access this page
  if (currentAdmin?.role !== "super") {
    return (
      <AdminLayout>
        <div className="max-w-xl mx-auto mt-16 text-center">
          <MdShield size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2 text-sm">Only Super Admins can manage permissions.</p>
        </div>
      </AdminLayout>
    );
  }

  // Filter to non-super admins only (super admins always have full access)
  const manageable = admins.filter((a) => a.role !== "super");
  const superAdmins = admins.filter((a) => a.role === "super");

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Permissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Control which sections each admin can access. Super admins always have full access.
          </p>
        </div>

        {/* Info notice */}
        <div className="bg-blue-50 border border-blue-200 px-5 py-3 flex items-start gap-3">
          <MdInfo size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Permissions apply to <strong>Admin</strong> role accounts only. Super admins have unrestricted
            access to all sections and are listed below for reference only.
          </p>
        </div>

        {/* Super admins (read-only display) */}
        {superAdmins.length > 0 && (
          <div className="admin-card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MdShield size={16} className="text-[#00c1ff]" />
              Super Admins — Full Access
            </h2>
            <div className="divide-y divide-gray-100 -mx-6">
              {superAdmins.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#00369b] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {a.displayName?.[0] ?? "A"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.displayName}</p>
                      <p className="text-xs text-gray-400">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ADMIN_SECTIONS.map((s) => (
                      <span key={s} className="badge badge-blue text-[10px]">{SECTION_LABELS[s]}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin permission editors */}
        {loading ? (
          <div className="admin-card text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : manageable.length === 0 ? (
          <div className="admin-card text-center py-12">
            <MdShield size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No admin-role accounts yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Create admin accounts from the{" "}
              <a href="/admin/account" className="text-[#00369b] hover:underline">Account page</a>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {manageable.map((admin) => {
              const adminEdits = edits[admin.id!] ?? new Set<AdminSection>();
              const allSelected = ADMIN_SECTIONS.every((s) => adminEdits.has(s));
              const noneSelected = ADMIN_SECTIONS.every((s) => !adminEdits.has(s));
              const isSaving = saving === admin.id;
              const isSaved = saved === admin.id;

              return (
                <div key={admin.id} className="admin-card">
                  {/* Admin header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00369b]/10 flex items-center justify-center text-[#00369b] font-bold text-sm shrink-0">
                        {admin.displayName?.[0] ?? "A"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{admin.displayName}</p>
                        <p className="text-xs text-gray-400">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge badge-gray capitalize">{admin.role}</span>
                      {/* Select all / none */}
                      <button
                        onClick={() => allSelected ? selectNone(admin.id!) : selectAll(admin.id!)}
                        className="text-xs text-[#00369b] font-medium hover:underline"
                      >
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                      <button
                        onClick={() => handleSave(admin)}
                        disabled={isSaving}
                        className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {isSaving ? (
                          "Saving…"
                        ) : isSaved ? (
                          <><MdCheckCircle size={14} /> Saved</>
                        ) : (
                          <><MdSave size={14} /> Save</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Section checkboxes */}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ADMIN_SECTIONS.map((section) => {
                      const checked = adminEdits.has(section);
                      return (
                        <label
                          key={section}
                          onClick={() => toggle(admin.id!, section)}
                          className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors select-none ${checked
                            ? "border-[#00369b] bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <div className={`mt-0.5 shrink-0 ${checked ? "text-[#00369b]" : "text-gray-300"}`}>
                            {checked
                              ? <MdCheckBox size={18} />
                              : <MdCheckBoxOutlineBlank size={18} />}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${checked ? "text-[#00369b]" : "text-gray-700"}`}>
                              {SECTION_LABELS[section]}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                              {SECTION_DESCRIPTIONS[section]}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium">Current access:</span>
                    {adminEdits.size === 0 ? (
                      <span className="text-xs text-gray-400 italic">No sections assigned</span>
                    ) : (
                      Array.from(adminEdits).map((s) => (
                        <span key={s} className="badge badge-blue text-[10px]">{SECTION_LABELS[s]}</span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
