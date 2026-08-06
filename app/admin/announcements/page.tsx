"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  type Announcement,
} from "@/lib/firestore";
import {
  MdAdd, MdEdit, MdDelete, MdClose, MdPushPin,
  MdCampaign, MdVisibility, MdVisibilityOff,
} from "react-icons/md";

const GRADES = ["Pre-K","K","1","2","3","4","5","6","7","8","9","10","11","12"];

const EMPTY: Omit<Announcement,"id"> = {
  title: "", body: "", targetGrades: [],
  pinned: false, published: false,
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Omit<Announcement,"id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const a = await getAllAnnouncements();
    setAnnouncements(a); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, body: a.body, targetGrades: a.targetGrades, pinned: a.pinned, published: a.published });
    setModalOpen(true);
  }

  function toggleGrade(g: string) {
    setForm((f) => ({
      ...f,
      targetGrades: f.targetGrades.includes(g)
        ? f.targetGrades.filter((x) => x !== g)
        : [...f.targetGrades, g],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (editing?.id) await updateAnnouncement(editing.id, form);
      else await createAnnouncement(form);
      await load(); setModalOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await deleteAnnouncement(id); await load();
  }

  async function togglePublish(a: Announcement) {
    await updateAnnouncement(a.id!, { published: !a.published });
    await load();
  }

  async function togglePin(a: Announcement) {
    await updateAnnouncement(a.id!, { pinned: !a.pinned });
    await load();
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-500 text-sm mt-0.5">Publish notices to students by grade</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> New Announcement
          </button>
        </div>

        <div className="admin-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center">
              <MdCampaign size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No announcements yet. Create one to notify students.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr>
                <th>Title</th><th>Grades</th><th>Pinned</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-800">{a.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.body.replace(/<[^>]+>/g, "").slice(0, 80)}</p>
                      </div>
                    </td>
                    <td>
                      {a.targetGrades.length === 0
                        ? <span className="badge badge-blue">All Grades</span>
                        : <span className="text-xs text-gray-600">{a.targetGrades.map((g) => `G${g}`).join(", ")}</span>}
                    </td>
                    <td>
                      <button onClick={() => togglePin(a)} title={a.pinned ? "Unpin" : "Pin"} className={`p-1.5 transition-colors ${a.pinned ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}>
                        <MdPushPin size={16} />
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${a.published ? "badge-green" : "badge-yellow"}`}>
                        {a.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => togglePublish(a)} title={a.published ? "Unpublish" : "Publish"} className="p-1.5 text-gray-400 hover:text-[#00369b] transition-colors">
                          {a.published ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                        </button>
                        <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-[#00369b] transition-colors">
                          <MdEdit size={16} />
                        </button>
                        <button onClick={() => handleDelete(a.id!)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <MdDelete size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">{editing ? "Edit Announcement" : "New Announcement"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="admin-label">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="admin-input" placeholder="Announcement title" />
              </div>
              <div>
                <label className="admin-label">Body *</label>
                <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={5} className="admin-input resize-none" placeholder="Write your announcement…" />
              </div>
              <div>
                <label className="admin-label">Target Grades (leave empty for all grades)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GRADES.map((g) => (
                    <button key={g} type="button" onClick={() => toggleGrade(g)}
                      className={`px-3 py-1 text-xs font-semibold border transition-all ${
                        form.targetGrades.includes(g)
                          ? "bg-[#00369b] text-white border-[#00369b]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                      }`}>
                      Grade {g}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {form.targetGrades.length === 0 ? "Showing to all grades." : `Grades: ${form.targetGrades.join(", ")}`}
                </p>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setForm({ ...form, pinned: !form.pinned })}
                    className={`w-11 h-6 relative transition-colors ${form.pinned ? "bg-amber-500" : "bg-gray-300"}`}>
                    <div className={`w-5 h-5 bg-white absolute top-0.5 transition-all ${form.pinned ? "left-5" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Pin to top</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setForm({ ...form, published: !form.published })}
                    className={`w-11 h-6 relative transition-colors ${form.published ? "bg-[#00369b]" : "bg-gray-300"}`}>
                    <div className={`w-5 h-5 bg-white absolute top-0.5 transition-all ${form.published ? "left-5" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{form.published ? "Published" : "Draft"}</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Publish"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
