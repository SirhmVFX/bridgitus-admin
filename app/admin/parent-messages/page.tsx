"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import Pagination from "@/components/Pagination";
import { paginate } from "@/lib/pagination";
import {
  getAllStudents,
  deleteParentMessage,
  type ParentMessage,
  type Student,
} from "@/lib/firestore";
import { adminFetch } from "@/lib/adminFetch";
import { useAuth } from "@/lib/auth";
import {
  MdSend, MdEmail, MdSms, MdClose, MdDelete, MdVisibility,
} from "react-icons/md";

const GRADES = ["Pre-K","K","1","2","3","4","5","6","7","8","9","10","11","12"];

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

export default function ParentMessagesPage() {
  const { adminUser } = useAuth();
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
  const [recipientType, setRecipientType] = useState<"all" | "specific">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [sendVia, setSendVia] = useState<"email" | "sms" | "both">("email");
  const [studentSearch, setStudentSearch] = useState("");
  const [page, setPage] = useState(1);

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

  function toggleStudentId(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleGrade(grade: string) {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((x) => x !== grade) : [...prev, grade]
    );
  }

  function getRecipientCount() {
    if (recipientType === "all") return students.length;
    if (selectedStudentIds.length > 0) return selectedStudentIds.length;
    if (selectedGrades.length > 0) {
      return students.filter((s) => selectedGrades.includes(s.grade)).length;
    }
    return 0;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
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

    try {
      const response = await adminFetch("/api/parent-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          recipientType,
          recipientIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
          recipientGrades: selectedGrades.length > 0 ? selectedGrades : undefined,
          sendVia,
          createdBy: adminUser?.email ?? adminUser?.displayName ?? "admin",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSendResult({
          success: true,
          message: data.message || `Sent: ${data.emailSentCount ?? 0} email(s), ${data.smsSentCount ?? 0} SMS.`,
        });
        setTitle("");
        setBody("");
        setSelectedStudentIds([]);
        setSelectedGrades([]);
        setRecipientType("all");
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

  const filteredStudents = students.filter((s) => {
    const search = studentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      (s.parentEmail ?? "").toLowerCase().includes(search) ||
      s.studentId.toLowerCase().includes(search)
    );
  });

  const pageSlice = paginate(messageHistory, page);

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
              Email or SMS parents directly (not shown in the student portal)
            </p>
          </div>
          <button onClick={() => { setSendResult(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
            <MdSend size={18} /> New Message
          </button>
        </div>

        {loadError && (
          <div className="admin-card border-amber-200 bg-amber-50 text-amber-800 text-sm">
            {loadError}
          </div>
        )}

        <div className="admin-card !p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : messageHistory.length === 0 ? (
            <div className="p-12 text-center">
              <MdSend size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No messages yet. Send one to notify parents by email or SMS.</p>
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
                        </p>
                      </td>
                      <td>
                        {msg.recipientType === "all" ? (
                          <span className="badge badge-blue">All Parents</span>
                        ) : msg.recipientGrades && msg.recipientGrades.length > 0 ? (
                          <span className="text-xs text-gray-600">
                            Grades: {msg.recipientGrades.join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">
                            {msg.recipientIds?.length || 0} selected
                          </span>
                        )}
                      </td>
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
                <p className="admin-label">Body</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap border border-slate-200 rounded-xl p-4 bg-slate-50">
                  {viewing.body}
                </p>
              </div>
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
      )}

      {modalOpen && (
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
                    onClick={() => setRecipientType("all")}
                    className={`filter-pill${recipientType === "all" ? " active" : ""}`}
                  >
                    All parents ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType("specific")}
                    className={`filter-pill${recipientType === "specific" ? " active" : ""}`}
                  >
                    Specific
                  </button>
                </div>

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
                              {s.firstName} {s.lastName}
                              <span className="text-xs text-slate-400 ml-1">
                                · {s.parentEmail || "no parent email"}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  ~{getRecipientCount()} student profile(s) selected
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
                <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2">
                  <MdSend size={16} />
                  {sending ? "Sending…" : "Send to parents"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
