"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/auth";
import {
  getAllAdmins, createAdmin, updateAdmin, deleteAdmin,
  type AdminUser,
} from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  MdPerson, MdLock, MdAdd, MdEdit, MdDelete, MdClose,
  MdCheckCircle, MdSave, MdVisibility, MdVisibilityOff,
} from "react-icons/md";

export default function AccountPage() {
  const { user, adminUser, changePassword, changeEmail } = useAuth();

  // Profile
  const [displayName, setDisplayName] = useState(adminUser?.displayName ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileOk, setProfileOk] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailOk, setEmailOk] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  // Admin management
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPw, setNewAdminPw] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "super">("admin");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (adminUser) setDisplayName(adminUser.displayName ?? "");
    getAllAdmins().then((a) => { setAdmins(a); setAdminsLoading(false); });
  }, [adminUser]);

  async function handleSaveProfile() {
    if (!adminUser?.id) return;
    setProfileSaving(true);
    try {
      await updateAdmin(adminUser.id, { displayName });
      setProfileOk(true);
      setTimeout(() => setProfileOk(false), 3000);
    } finally { setProfileSaving(false); }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault(); setPwError("");
    if (newPw.length < 8) { setPwError("Min 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwOk(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwOk(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) setPwError("Current password is incorrect.");
      else setPwError(msg);
    } finally { setPwSaving(false); }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault(); setEmailError("");
    setPwSaving(true);
    try {
      await changeEmail(emailPw, newEmail);
      if (adminUser?.id) await updateAdmin(adminUser.id, { email: newEmail });
      setEmailOk(true); setNewEmail(""); setEmailPw("");
      setTimeout(() => setEmailOk(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) setEmailError("Current password is incorrect.");
      else setEmailError(msg);
    } finally { setEmailSaving(false); }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault(); setCreateError(""); setCreateSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, newAdminEmail, newAdminPw);
      await createAdmin({
        uid: cred.user.uid,
        email: newAdminEmail,
        displayName: newAdminName,
        role: newAdminRole,
      });
      const updated = await getAllAdmins();
      setAdmins(updated);
      setCreateModal(false);
      setNewAdminEmail(""); setNewAdminName(""); setNewAdminPw(""); setNewAdminRole("admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create admin";
      if (msg.includes("email-already-in-use")) setCreateError("Email already registered.");
      else setCreateError(msg);
    } finally { setCreateSaving(false); }
  }

  async function handleDeleteAdmin(id: string, uid: string) {
    if (uid === user?.uid) { alert("Cannot delete your own account."); return; }
    if (!confirm("Delete this admin account?")) return;
    await deleteAdmin(id);
    setAdmins((a) => a.filter((x) => x.id !== id));
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your profile, security, and admin team</p>
        </div>

        {/* Profile */}
        <div className="admin-card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MdPerson size={18} className="text-primary" />Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shrink-0">
              {adminUser?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div>
              <p className="font-bold text-gray-900">{adminUser?.displayName ?? "Admin"}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <span className="badge badge-blue capitalize mt-1">{adminUser?.role ?? "admin"}</span>
            </div>
          </div>
          <div>
            <label className="admin-label">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="admin-input" placeholder="Your name" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveProfile} disabled={profileSaving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <MdSave size={16} />{profileSaving ? "Saving…" : "Save"}
            </button>
            {profileOk && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={16} />Saved</span>}
          </div>
        </div>

        {/* Change Password */}
        <div className="admin-card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MdLock size={18} className="text-primary" />Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { label: "Current Password", val: currentPw, set: setCurrentPw, ph: "••••••••" },
              { label: "New Password", val: newPw, set: setNewPw, ph: "Min 8 characters" },
              { label: "Confirm New Password", val: confirmPw, set: setConfirmPw, ph: "Repeat new password" },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="admin-label">{label}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={val}
                    onChange={(e) => set(e.target.value)} required className="admin-input pr-10" placeholder={ph} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                  </button>
                </div>
              </div>
            ))}
            {pwError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
            {pwOk && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-2"><MdCheckCircle size={16} />Password updated!</p>}
            <button type="submit" disabled={pwSaving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <MdLock size={16} />{pwSaving ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        {/* Change Email */}
        <div className="admin-card space-y-4">
          <h2 className="font-semibold text-gray-900">Change Email</h2>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="admin-label">New Email Address</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="admin-input" placeholder="new@bridgitus.com" />
            </div>
            <div>
              <label className="admin-label">Current Password (to verify)</label>
              <input type="password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} required className="admin-input" placeholder="••••••••" />
            </div>
            {emailError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{emailError}</p>}
            {emailOk && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-2"><MdCheckCircle size={16} />Email updated!</p>}
            <button type="submit" disabled={emailSaving} className="btn-primary disabled:opacity-60">{emailSaving ? "Updating…" : "Update Email"}</button>
          </form>
        </div>

        {/* Admin team */}
        {adminUser?.role === "super" && (
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Admin Team</h2>
              <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm py-1.5">
                <MdAdd size={16} />Add Admin
              </button>
            </div>
            {adminsLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
              <div className="divide-y divide-gray-100 -mx-6">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {a.displayName?.[0] ?? "A"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.displayName}</p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${a.role === "super" ? "badge-blue" : "badge-gray"} capitalize`}>{a.role}</span>
                      {a.uid !== user?.uid && (
                        <button onClick={() => handleDeleteAdmin(a.id!, a.uid)}
                          className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={16} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create admin modal */}
      {createModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCreateModal(false)}>
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">Create Admin Account</h2>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="admin-label">Display Name *</label>
                <input required value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="admin-input" placeholder="Full name" />
              </div>
              <div>
                <label className="admin-label">Email *</label>
                <input type="email" required value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="admin-input" placeholder="admin@bridgitus.com" />
              </div>
              <div>
                <label className="admin-label">Temporary Password *</label>
                <input type="password" required minLength={8} value={newAdminPw} onChange={(e) => setNewAdminPw(e.target.value)} className="admin-input" placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="admin-label">Role</label>
                <select value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value as "admin" | "super")} className="admin-input">
                  <option value="admin">Admin</option>
                  <option value="super">Super Admin</option>
                </select>
              </div>
              {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={createSaving} className="btn-primary disabled:opacity-60">{createSaving ? "Creating…" : "Create Admin"}</button>
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
