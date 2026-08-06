"use client";

import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import WysiwygEditor from "@/components/WysiwygEditor";
import ImageUpload from "@/components/ImageUpload";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  getAllMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type LearningMaterial,
} from "@/lib/firestore";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdVisibility,
  MdVisibilityOff,
  MdMenuBook,
  MdUpload,
  MdLink,
  MdSearch,
  MdFilterList,
} from "react-icons/md";

const GRADES = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const TYPES: LearningMaterial["type"][] = ["text", "document", "pdf", "image", "video", "link", "mixed"];

const EMPTY: Omit<LearningMaterial, "id"> = {
  title: "",
  description: "",
  grade: "1",
  subject: "",
  type: "text",
  content: "",
  fileUrl: "",
  fileName: "",
  linkUrl: "",
  linkLabel: "",
  thumbnailUrl: "",
  published: false,
  order: 0,
  estimatedMinutes: 15,
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningMaterial | null>(null);
  const [form, setForm] = useState<Omit<LearningMaterial, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const mats = await getAllMaterials();
    setMaterials(mats);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(m: LearningMaterial) {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description,
      grade: m.grade,
      subject: m.subject,
      type: m.type,
      content: m.content ?? "",
      fileUrl: m.fileUrl ?? "",
      fileName: m.fileName ?? "",
      linkUrl: m.linkUrl ?? "",
      linkLabel: m.linkLabel ?? "",
      thumbnailUrl: m.thumbnailUrl ?? "",
      published: m.published,
      order: m.order,
      estimatedMinutes: m.estimatedMinutes ?? 15,
    });
    setModalOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/materials");
      setForm((f) => ({ ...f, fileUrl: url, fileName: file.name }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setFileUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing?.id) {
        await updateMaterial(editing.id, form);
      } else {
        await createMaterial(form);
      }
      await load();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this material? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteMaterial(id);
      await load();
    } finally {
      setDeleting(null);
    }
  }

  async function togglePublish(m: LearningMaterial) {
    await updateMaterial(m.id!, { published: !m.published });
    await load();
  }

  const filtered = materials.filter((m) => {
    const gMatch = gradeFilter === "all" || m.grade === gradeFilter;
    const tMatch = typeFilter === "all" || m.type === typeFilter;
    const sMatch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase());
    return gMatch && tMatch && sMatch;
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Learning Materials</h1>
            <p className="text-gray-500 text-sm mt-0.5">Upload and manage resources for each grade</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> Add Material
          </button>
        </div>

        {/* Filters */}
        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials…"
              className="admin-input pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <MdFilterList size={16} className="text-gray-400" />
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="admin-input w-auto">
              <option value="all">All Grades</option>
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="admin-input w-auto">
              <option value="all">All Types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="admin-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MdMenuBook size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No materials found. Add one to get started.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Grade</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Est. Time</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <p className="font-medium text-gray-800">{m.title}</p>
                    </td>
                    <td><span className="badge badge-blue">Grade {m.grade}</span></td>
                    <td className="text-gray-600">{m.subject}</td>
                    <td>
                      <span className="badge badge-gray capitalize">{m.type}</span>
                    </td>
                    <td className="text-gray-500 text-xs">{m.estimatedMinutes ? `${m.estimatedMinutes} min` : "—"}</td>
                    <td className="text-gray-500">{m.order}</td>
                    <td>
                      <span className={`badge ${m.published ? "badge-green" : "badge-yellow"}`}>
                        {m.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublish(m)}
                          title={m.published ? "Unpublish" : "Publish"}
                          className="p-1.5 text-gray-400 hover:text-[#00369b] transition-colors"
                        >
                          {m.published ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 text-gray-400 hover:text-[#00369b] transition-colors"
                        >
                          <MdEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id!)}
                          disabled={deleting === m.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
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
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">
                {editing ? "Edit Material" : "Add Learning Material"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Basic */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="admin-label">Title *</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" placeholder="Material title" />
                </div>
                <div>
                  <label className="admin-label">Grade *</label>
                  <select required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="admin-input">
                    {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Subject *</label>
                  <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="admin-input" placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label className="admin-label">Type *</label>
                  <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LearningMaterial["type"] })} className="admin-input">
                    {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Display Order</label>
                  <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">Estimated Read/View Time (minutes)</label>
                  <input type="number" min={1} value={form.estimatedMinutes ?? 15} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} className="admin-input" placeholder="15" />
                  <p className="text-xs text-gray-400 mt-1">Shown to students as progress guide</p>
                </div>
              </div>

              {/* Description (WYSIWYG) */}
              <div>
                <label className="admin-label">Description / Summary</label>
                <WysiwygEditor
                  content={form.description}
                  onChange={(html) => setForm({ ...form, description: html })}
                  placeholder="Brief description of this material…"
                />
              </div>

              {/* Rich content (text/mixed types) */}
              {(form.type === "text" || form.type === "mixed") && (
                <div>
                  <label className="admin-label">Full Content (Rich Text)</label>
                  <WysiwygEditor
                    content={form.content ?? ""}
                    onChange={(html) => setForm({ ...form, content: html })}
                    placeholder="Full lesson content, notes, instructions…"
                  />
                </div>
              )}

              {/* File upload for docs / PDF / image / video */}
              {(["document", "pdf", "image", "video", "mixed"] as LearningMaterial["type"][]).includes(form.type) && (
                <div>
                  <label className="admin-label">
                    {form.type === "image" ? "Image File" : form.type === "video" ? "Video File" : "Document / PDF File"}
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={fileUploading}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <MdUpload size={16} />
                      {fileUploading ? "Uploading…" : "Upload File"}
                    </button>
                    {form.fileUrl && (
                      <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00369b] hover:underline truncate max-w-xs">
                        {form.fileName || "Uploaded file"}
                      </a>
                    )}
                  </div>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
                  <p className="text-xs text-gray-400 mt-1">
                    Or paste URL:
                  </p>
                  <input
                    type="url"
                    value={form.fileUrl ?? ""}
                    onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                    className="admin-input mt-1"
                    placeholder="https://…"
                  />
                  {form.fileUrl && (
                    <div className="mt-1">
                      <label className="admin-label">File Name (display)</label>
                      <input value={form.fileName ?? ""} onChange={(e) => setForm({ ...form, fileName: e.target.value })} className="admin-input" placeholder="e.g. Chapter 1.pdf" />
                    </div>
                  )}
                </div>
              )}

              {/* Link */}
              {(form.type === "link" || form.type === "mixed") && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Resource / Video Link URL</label>
                    <input
                      type="url"
                      value={form.linkUrl ?? ""}
                      onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                      className="admin-input"
                      placeholder="https://youtube.com/…"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Link Button Label</label>
                    <input
                      value={form.linkLabel ?? ""}
                      onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                      className="admin-input"
                      placeholder="e.g. Watch Video"
                    />
                  </div>
                </div>
              )}

              {/* Thumbnail */}
              <ImageUpload
                label="Thumbnail Image (optional)"
                value={form.thumbnailUrl ?? ""}
                onChange={(url) => setForm({ ...form, thumbnailUrl: url })}
                folder="bridgitus/thumbnails"
              />

              {/* Publish */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, published: !form.published })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${form.published ? "bg-[#00369b]" : "bg-gray-300"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${form.published ? "left-5" : "left-0.5"}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {form.published ? "Published" : "Save as Draft"}
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Material"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
