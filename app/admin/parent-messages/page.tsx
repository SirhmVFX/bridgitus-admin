"use client";

import ModalPortal from "@/components/ModalPortal";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import Pagination from "@/components/Pagination";
import { paginate } from "@/lib/pagination";
import {
  getAllStudents,
  deleteParentMessage,
  updateParentMessage,
  type ParentMessage,
  type Student,
} from "@/lib/firestore";
import { adminFetch } from "@/lib/adminFetch";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useAuth } from "@/lib/auth";
import {
  MdSend, MdEmail, MdSms, MdClose, MdDelete, MdVisibility, MdAttachFile,
  MdPhone, MdEdit,
} from "react-icons/md";

const GRADES = ["Pre-K","K","1","2","3","4","5","6","7","8","9","10","11","12"];
const ATTACH_ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/*";

type RecipientMode = "all" | "single" | "specific";

function formatWhen(value: ParentMessage["sentAt"] | ParentMessage["createdAt"]) {
  if (!value) return "—";
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-AU");
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString("en-AU");
  }
  return "—";
}

function parentLabel(s: Student) {
  const name = [s.parentFirstName, s.parentLastName].filter(Boolean).join(" ").trim();
  return name || s.parentEmail || "Parent / Guardian";
}

function studentLabel(s: Student) {
  return `${s.firstName} ${s.lastName}`.trim() || s.studentId;
}

/** Admin-facing label: "Student Name — Parent / Guardian" */
function recipientPairLabel(s: Student) {
  return `${studentLabel(s)} — ${parentLabel(s)}`;
}

function ParentMessagesInner() {
  const { adminUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [messageHistory, setMessageHistory] = useState<ParentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<ParentMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientMode>("single");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [sendVia, setSendVia] = useState<"email" | "sms" | "both">("email");
  const [studentSearch, setStudentSearch] = useState("");
  const [page, setPage] = useState(1);
  const [historyGradeFilter, setHistoryGradeFilter] = useState("all");
  const [editingMsg, setEditingMsg] = useState<ParentMessage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const prefillHandled = useRef(false);

  async function loadData() {
    setLoadError(null);
    try {
      const [studentsData, messagesRes] = await Promise.all([
        getAllStudents(),
        adminFetch("/api/parent-messages"),
      ]);
      setStudents(studentsData);
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessageHistory((data.messages ?? []) as ParentMessage[]);
      } else {
        const err = await messagesRes.json().catch(() => ({}));
        setLoadError(err.error || "Could not load message history.");
        setMessageHistory([]);
      }
    } catch {
      setLoadError("Could not load messages. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Prefill from ?studentId=… (e.g. from student analytics “Message parent”)
  useEffect(() => {
    if (prefillHandled.current || loading || students.length === 0) return;
    const sid = searchParams.get("studentId");
    if (!sid) return;
    const match = students.find((s) => s.id === sid);
    if (!match) return;
    prefillHandled.current = true;
    setRecipientType("single");
    setSelectedStudentId(match.id!);
    setSelectedStudentIds([]);
    setSelectedGrades([]);
    setTitle(`Progress update — ${match.firstName} ${match.lastName}`);
    setBody(
      `Dear ${parentLabel(match)},\n\nPlease find an update on ${match.firstName}'s learning progress with Bridgitus.\n\nYou can review the attached report for full analytics.\n\nKind regards,\nBridgitus Learning`,
    );
    setSendResult(null);
    setModalOpen(true);
    router.replace("/admin/parent-messages", { scroll: false });
  }, [loading, students, searchParams, router]);

  function toggleStudentId(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleGrade(grade: string) {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((x) => x !== grade) : [...prev, grade],
    );
  }

  function getRecipientCount() {
    if (recipientType === "all") return students.length;
    if (recipientType === "single") return selectedStudentId ? 1 : 0;
    if (selectedStudentIds.length > 0) return selectedStudentIds.length;
    if (selectedGrades.length > 0) {
      return students.filter((s) => selectedGrades.includes(s.grade)).length;
    }
    return 0;
  }

  const selectedSingle = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId) ?? null
    : null;

  function resetCompose() {
    setTitle("");
    setBody("");
    setSelectedStudentId(null);
    setSelectedStudentIds([]);
    setSelectedGrades([]);
    setRecipientType("single");
    setStudentSearch("");
    setAttachmentUrl(null);
    setAttachmentName(null);
    if (attachRef.current) attachRef.current.value = "";
  }

  async function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    setSendResult(null);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/parent-messages");
      setAttachmentUrl(url);
      setAttachmentName(file.name);
    } catch (err) {
      setSendResult({
        success: false,
        message: err instanceof Error ? err.message : "Attachment upload failed.",
      });
    } finally {
      setUploadingAttachment(false);
      if (attachRef.current) attachRef.current.value = "";
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (recipientType === "single" && !selectedStudentId) {
      setSendResult({
        success: false,
        message: "Select one student’s parent/guardian to send to.",
      });
      return;
    }
    if (
      recipientType === "specific" &&
      selectedStudentIds.length === 0 &&
      selectedGrades.length === 0
    ) {
      setSendResult({
        success: false,
        message: "Select at least one student or grade.",
      });
      return;
    }

    setSending(true);
    setSendResult(null);

    const recipientIds =
      recipientType === "single" && selectedStudentId
        ? [selectedStudentId]
        : recipientType === "specific" && selectedStudentIds.length > 0
          ? selectedStudentIds
          : undefined;

    try {
      const response = await adminFetch("/api/parent-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          recipientType,
          recipientIds,
          recipientGrades:
            recipientType === "specific" && selectedGrades.length > 0
              ? selectedGrades
              : undefined,
          sendVia,
          createdBy: adminUser?.email ?? adminUser?.displayName ?? "admin",
          ...(attachmentUrl
            ? {
                attachmentUrl,
                attachmentName: attachmentName || "Attachment",
              }
            : {}),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSendResult({
          success: true,
          message: data.message || `Sent: ${data.emailSentCount ?? 0} email(s), ${data.smsSentCount ?? 0} SMS.`,
        });
        resetCompose();
        await loadData();
        setTimeout(() => {
          setModalOpen(false);
          setSendResult(null);
        }, 1800);
      } else {
        const extra = [
          ...(data.emailErrors ?? []),
          ...(data.smsErrors ?? []),
        ].filter(Boolean);
        setSendResult({
          success: false,
          message:
            data.message ||
            data.error ||
            "Failed to deliver message" +
              (extra.length ? `: ${extra.slice(0, 2).join("; ")}` : ""),
        });
        await loadData();
      }
    } catch {
      setSendResult({
        success: false,
        message: "Network error. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this message record?")) return;
    await deleteParentMessage(id).catch(() => {});
    await loadData();
  }

  function openEdit(msg: ParentMessage) {
    setEditingMsg(msg);
    setEditTitle(msg.title);
    setEditBody(msg.body);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMsg?.id) return;
    setEditSaving(true);
    try {
      await updateParentMessage(editingMsg.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      setEditingMsg(null);
      await loadData();
    } finally {
      setEditSaving(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    const search = studentSearch.toLowerCase();
    if (!search) return true;
    return (
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      (s.parentFirstName ?? "").toLowerCase().includes(search) ||
      (s.parentLastName ?? "").toLowerCase().includes(search) ||
      (s.parentEmail ?? "").toLowerCase().includes(search) ||
      s.studentId.toLowerCase().includes(search)
    );
  });

  const filteredHistory = messageHistory.filter((msg) => {
    if (historyGradeFilter === "all") return true;
    if (msg.recipientGrades?.includes(historyGradeFilter)) return true;
    if (msg.recipientIds?.length) {
      return msg.recipientIds.some((id) => {
        const s = students.find((st) => st.id === id);
        return s?.grade === historyGradeFilter;
      });
    }
    return false;
  });

  const pageSlice = paginate(filteredHistory, page);

  useEffect(() => {
    setPage(1);
  }, [historyGradeFilter]);

  function recipientSummary(msg: ParentMessage) {
    if (msg.recipientType === "all") {
      return <span className="badge badge-blue">All Parents</span>;
    }
    if (msg.recipientType === "single" || (msg.recipientIds?.length === 1 && !msg.recipientGrades?.length)) {
      const label = msg.recipientLabels?.[0];
      return (
        <span className="text-xs text-gray-700 font-medium">
          {label || "1 parent"}
        </span>
      );
    }
    if (msg.recipientLabels && msg.recipientLabels.length > 0 && msg.recipientLabels.length <= 3) {
      return (
        <span className="text-xs text-gray-600">
          {msg.recipientLabels.join("; ")}
        </span>
      );
    }
    if (msg.recipientGrades && msg.recipientGrades.length > 0) {
      return (
        <span className="text-xs text-gray-600">
          Grades: {msg.recipientGrades.join(", ")}
        </span>
      );
    }
    return (
      <span className="text-xs text-gray-600">
        {msg.recipientIds?.length || 0} selected
      </span>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
              Communication
            </p>
            <h1 className="text-2xl lg:text-[1.75rem] font-extrabold text-[#001233] tracking-tight">
              Parent Messages
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Email or SMS one parent, a group, or all parents (not shown in the student portal)
            </p>
          </div>
          <button
            onClick={() => {
              setSendResult(null);
              resetCompose();
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <MdSend size={18} /> New Message
          </button>
        </div>

        {loadError && (
          <div className="admin-card border-amber-200 bg-amber-50 text-amber-800 text-sm">
            {loadError}
          </div>
        )}

        <div className="admin-card !p-0 overflow-hidden">
          <div className="flex flex-wrap gap-3 items-center px-4 py-3 border-b border-gray-100">
            <select
              value={historyGradeFilter}
              onChange={(e) => setHistoryGradeFilter(e.target.value)}
              className="admin-input w-auto text-sm"
            >
              <option value="all">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">
              {filteredHistory.length} message{filteredHistory.length !== 1 ? "s" : ""}
            </span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
              <MdSend size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {messageHistory.length === 0
                  ? "No messages yet. Send one to a single parent or a group by email or SMS."
                  : "No messages match this grade filter."}
              </p>
            </div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Recipients</th>
                    <th>Method</th>
                    <th>Delivered</th>
                    <th>Status</th>
                    <th>When</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.items.map((msg) => (
                    <tr key={msg.id}>
                      <td>
                        <p className="font-medium text-gray-800">{msg.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {msg.body.slice(0, 80)}
                          {msg.attachmentUrl ? " · file" : ""}
                        </p>
                      </td>
                      <td>{recipientSummary(msg)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {(msg.sendVia === "email" || msg.sendVia === "both") && (
                            <MdEmail size={16} className="text-blue-600" />
                          )}
                          {(msg.sendVia === "sms" || msg.sendVia === "both") && (
                            <MdSms size={16} className="text-green-600" />
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-slate-600">
                        {msg.emailSentCount ?? (msg.sentByEmail ? msg.emailCount : 0)} email ·{" "}
                        {msg.smsSentCount ?? (msg.sentBySms ? msg.smsCount : 0)} SMS
                      </td>
                      <td>
                        {msg.sentAt || msg.sentByEmail || msg.sentBySms ? (
                          <span className="badge badge-green">Sent</span>
                        ) : (
                          <span className="badge badge-yellow">Not delivered</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-500">
                        {formatWhen(msg.sentAt ?? msg.createdAt)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewing(msg)}
                            className="p-1.5 text-gray-400 hover:text-[#00369b] transition-colors"
                            title="View message"
                          >
                            <MdVisibility size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(msg)}
                            className="p-1.5 text-gray-400 hover:text-[#00369b] transition-colors"
                            title="Edit message"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id!)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination slice={pageSlice} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {viewing && (
        <ModalPortal>
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
            <div className="modal-box max-w-lg">
              <div className="modal-header">
                <h2 className="font-semibold text-gray-900">Message details</h2>
                <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600">
                  <MdClose size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="admin-label">Title</p>
                  <p className="font-semibold text-[#001233]">{viewing.title}</p>
                </div>
                <div>
                  <p className="admin-label">Recipients</p>
                  <div className="text-sm text-slate-700 space-y-1">
                    {viewing.recipientType === "all" ? (
                      <p>All parents</p>
                    ) : viewing.recipientLabels?.length ? (
                      viewing.recipientLabels.map((l, i) => <p key={i}>{l}</p>)
                    ) : (
                      recipientSummary(viewing)
                    )}
                  </div>
                </div>
                <div>
                  <p className="admin-label">Body</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap border border-slate-200 rounded-xl p-4 bg-slate-50">
                    {viewing.body}
                  </p>
                </div>
                {viewing.attachmentUrl && (
                  <div>
                    <p className="admin-label">Attachment</p>
                    <a
                      href={viewing.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#00369b] hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <MdAttachFile size={16} />
                      {viewing.attachmentName || "Download attachment"}
                    </a>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="admin-label">Status</p>
                    <p>{viewing.sentAt || viewing.sentByEmail || viewing.sentBySms ? "Sent" : "Not delivered"}</p>
                  </div>
                  <div>
                    <p className="admin-label">When</p>
                    <p>{formatWhen(viewing.sentAt ?? viewing.createdAt)}</p>
                  </div>
                  <div>
                    <p className="admin-label">Email</p>
                    <p>{viewing.emailSentCount ?? 0} delivered / {viewing.emailCount ?? 0} targeted</p>
                  </div>
                  <div>
                    <p className="admin-label">SMS</p>
                    <p>{viewing.smsSentCount ?? 0} delivered / {viewing.smsCount ?? 0} targeted</p>
                  </div>
                </div>
                {viewing.deliveryErrors && viewing.deliveryErrors.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                    {viewing.deliveryErrors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {editingMsg && (
        <ModalPortal>
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingMsg(null)}>
            <div className="modal-box max-w-lg">
              <div className="modal-header">
                <h2 className="font-semibold text-gray-900">Edit message record</h2>
                <button onClick={() => setEditingMsg(null)} className="text-gray-400 hover:text-gray-600">
                  <MdClose size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <p className="text-xs text-gray-500">
                  Updates the stored message record. This does not re-send email or SMS.
                </p>
                <div>
                  <label className="admin-label">Title *</label>
                  <input
                    required
                    className="admin-input w-full"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label">Body *</label>
                  <textarea
                    required
                    className="admin-input w-full min-h-[140px]"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingMsg(null)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className="btn-primary text-sm">
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {modalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
            <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="modal-header">
                <h2 className="font-semibold text-gray-900">Send Message to Parents</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <MdClose size={20} />
                </button>
              </div>
              <form onSubmit={handleSend} className="p-6 space-y-5">
                <div>
                  <label className="admin-label">Title *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="admin-input"
                    placeholder="Message subject"
                  />
                </div>
                <div>
                  <label className="admin-label">Message *</label>
                  <textarea
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    className="admin-input resize-none"
                    placeholder="Write your message to parents…"
                  />
                </div>

                <div>
                  <label className="admin-label">Attachment (optional)</label>
                  <p className="text-xs text-slate-400 mb-2">
                    Ideal for analytics/PDF reports — PDF, DOC, or images
                  </p>
                  <input
                    ref={attachRef}
                    type="file"
                    accept={ATTACH_ACCEPT}
                    disabled={uploadingAttachment || sending}
                    onChange={handleAttachment}
                    className="admin-input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#00369b] file:text-white"
                  />
                  {uploadingAttachment && (
                    <p className="text-xs text-[#00369b] mt-2">Uploading attachment…</p>
                  )}
                  {attachmentUrl && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00369b] hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <MdAttachFile size={16} />
                        {attachmentName || "Attached file"}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentUrl(null);
                          setAttachmentName(null);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="admin-label">Send via *</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["email", "Email"],
                      ["sms", "SMS"],
                      ["both", "Email + SMS"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSendVia(value)}
                        className={`filter-pill${sendVia === value ? " active" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="admin-label">Recipients *</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientType("single");
                        setSelectedStudentIds([]);
                        setSelectedGrades([]);
                      }}
                      className={`filter-pill${recipientType === "single" ? " active" : ""}`}
                    >
                      Single parent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientType("specific");
                        setSelectedStudentId(null);
                      }}
                      className={`filter-pill${recipientType === "specific" ? " active" : ""}`}
                    >
                      Multiple / by grade
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientType("all");
                        setSelectedStudentId(null);
                        setSelectedStudentIds([]);
                        setSelectedGrades([]);
                      }}
                      className={`filter-pill${recipientType === "all" ? " active" : ""}`}
                    >
                      All parents ({students.length})
                    </button>
                  </div>

                  {recipientType === "single" && (
                    <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs text-slate-500">
                        Choose one student — the message goes to their parent/guardian contact only.
                      </p>
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="admin-input"
                        placeholder="Search by student, parent name, or email…"
                      />
                      <div className="max-h-56 overflow-y-auto space-y-1.5">
                        {filteredStudents.length === 0 ? (
                          <p className="text-sm text-slate-400 py-4 text-center">No students match.</p>
                        ) : (
                          filteredStudents.slice(0, 60).map((s) => {
                            const active = selectedStudentId === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedStudentId(s.id!)}
                                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                                  active
                                    ? "border-[#00369b] bg-[#00369b]/5"
                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                      active ? "border-[#00369b]" : "border-slate-300"
                                    }`}
                                  >
                                    {active && <span className="w-2 h-2 rounded-full bg-[#00369b]" />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-[#001233]">
                                      {studentLabel(s)} — {parentLabel(s)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Student · Grade {s.grade}
                                      <span className="mx-1.5 text-slate-300">|</span>
                                      Parent / Guardian
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                                      <span className="inline-flex items-center gap-1">
                                        <MdEmail size={12} />
                                        {s.parentEmail || "No parent email"}
                                      </span>
                                      {s.parentPhone && (
                                        <span className="inline-flex items-center gap-1">
                                          <MdPhone size={12} />
                                          {s.parentPhone}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                      {selectedSingle && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                          Sending to parent of{" "}
                          <strong>{recipientPairLabel(selectedSingle)}</strong>
                          {" "}({selectedSingle.parentEmail || "no email"}
                          {selectedSingle.parentPhone ? ` · ${selectedSingle.parentPhone}` : ""})
                        </div>
                      )}
                    </div>
                  )}

                  {recipientType === "specific" && (
                    <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">By grade</p>
                        <div className="flex flex-wrap gap-2">
                          {GRADES.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => toggleGrade(g)}
                              className={`filter-pill${selectedGrades.includes(g) ? " active" : ""}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">Or pick students</p>
                        <input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="admin-input mb-2"
                          placeholder="Search students…"
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {filteredStudents.slice(0, 40).map((s) => (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(s.id!)}
                                onChange={() => toggleStudentId(s.id!)}
                              />
                              <span>
                                <span className="font-medium text-[#001233]">
                                  {studentLabel(s)} — {parentLabel(s)}
                                </span>
                                <span className="text-xs text-slate-400 ml-1">
                                  · Grade {s.grade} · {s.parentEmail || "no email"}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2">
                    {recipientType === "single"
                      ? selectedSingle
                        ? `Selected: ${recipientPairLabel(selectedSingle)}`
                        : "No student / parent selected yet"
                      : `~${getRecipientCount()} parent contact(s) selected`}
                  </p>
                </div>

                {sendResult && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      sendResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {sendResult.message}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || uploadingAttachment}
                    className="btn-primary flex items-center gap-2"
                  >
                    <MdSend size={16} />
                    {sending
                      ? "Sending…"
                      : recipientType === "single"
                        ? "Send to this parent"
                        : "Send to parents"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
}

export default function ParentMessagesPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        </AdminLayout>
      }
    >
      <ParentMessagesInner />
    </Suspense>
  );
}
