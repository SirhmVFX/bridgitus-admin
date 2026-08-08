"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllStudents, getAllParentMessages, deleteParentMessage,
  type ParentMessage, type Student,
} from "@/lib/firestore";
import {
  MdSend, MdEmail, MdSms, MdClose, MdPerson, MdFilterList,
  MdDelete, MdCheckCircle, MdSchedule, MdPeople,
} from "react-icons/md";

const GRADES = ["Pre-K","K","1","2","3","4","5","6","7","8","9","10","11","12"];

export default function ParentMessagesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [messageHistory, setMessageHistory] = useState<ParentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "specific">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [sendVia, setSendVia] = useState<"email" | "sms" | "both">("both");
  const [studentSearch, setStudentSearch] = useState("");

  async function loadData() {
    const [studentsData, messagesData] = await Promise.all([
      getAllStudents(),
      getAllParentMessages(),
    ]);
    setStudents(studentsData);
    setMessageHistory(messagesData);
    setLoading(false);
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
    if (recipientType === "all") {
      return students.length;
    } else if (selectedStudentIds.length > 0) {
      return selectedStudentIds.length;
    } else if (selectedGrades.length > 0) {
      return students.filter((s) => selectedGrades.includes(s.grade)).length;
    }
    return 0;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch("/api/parent-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          recipientType,
          recipientIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
          recipientGrades: selectedGrades.length > 0 ? selectedGrades : undefined,
          sendVia,
          createdBy: "admin", // TODO: Get from auth
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({
          success: true,
          message: `Message sent successfully! ${data.emailRecipients} emails, ${data.smsRecipients} SMS.`,
        });
        setTitle("");
        setBody("");
        setSelectedStudentIds([]);
        setSelectedGrades([]);
        setRecipientType("all");
        await loadData();
      } else {
        setSendResult({
          success: false,
          message: data.error || "Failed to send message",
        });
      }
    } catch (error) {
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
    await deleteParentMessage(id);
    await loadData();
  }

  const filteredStudents = students.filter((s) => {
    const search = studentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      s.parentEmail.toLowerCase().includes(search) ||
      s.studentId.toLowerCase().includes(search)
    );
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Parent Messages</h1>
            <p className="text-gray-500 text-sm mt-0.5">Send announcements to parents and guardians</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <MdSend size={18} /> New Message
          </button>
        </div>

        {/* Message History */}
        <div className="admin-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : messageHistory.length === 0 ? (
            <div className="p-12 text-center">
              <MdSend size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No messages sent yet. Create one to notify parents.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Recipients</th>
                  <th>Method</th>
                  <th>Emails</th>
                  <th>SMS</th>
                  <th>Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messageHistory.map((msg) => (
                  <tr key={msg.id}>
                    <td>
                      <p className="font-medium text-gray-800">{msg.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {msg.body.slice(0, 60)}...
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
                        {msg.sendVia === "email" || msg.sendVia === "both" ? (
                          <MdEmail size={16} className="text-blue-600" />
                        ) : null}
                        {msg.sendVia === "sms" || msg.sendVia === "both" ? (
                          <MdSms size={16} className="text-green-600" />
                        ) : null}
                      </div>
                    </td>
                    <td>{msg.emailCount || 0}</td>
                    <td>{msg.smsCount || 0}</td>
                    <td>
                      {msg.sentAt ? (
                        <span className="badge badge-green">Sent</span>
                      ) : (
                        <span className="badge badge-yellow">Draft</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(msg.id!)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <MdDelete size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Message Modal */}
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
                  rows={6}
                  className="admin-input resize-none"
                  placeholder="Write your message to parents..."
                />
              </div>

              <div>
                <label className="admin-label">Recipients</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setRecipientType("all")}
                    className={`px-4 py-2 text-sm font-semibold border transition-all ${
                      recipientType === "all"
                        ? "bg-[#00369b] text-white border-[#00369b]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                    }`}
                  >
                    All Parents
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType("specific")}
                    className={`px-4 py-2 text-sm font-semibold border transition-all ${
                      recipientType === "specific"
                        ? "bg-[#00369b] text-white border-[#00369b]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                    }`}
                  >
                    Specific Parents
                  </button>
                </div>
              </div>

              {recipientType === "specific" && (
                <>
                  <div>
                    <label className="admin-label">Filter by Grade</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {GRADES.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGrade(g)}
                          className={`px-3 py-1 text-xs font-semibold border transition-all ${
                            selectedGrades.includes(g)
                              ? "bg-[#00369b] text-white border-[#00369b]"
                              : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                          }`}
                        >
                          Grade {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="admin-label">Select Individual Students</label>
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students..."
                      className="admin-input mb-2"
                    />
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No students found</div>
                      ) : (
                        filteredStudents.slice(0, 20).map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(s.id!)}
                              onChange={() => toggleStudentId(s.id!)}
                              className="w-4 h-4 text-[#00369b] rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-xs text-gray-400">
                                {s.parentEmail} · {s.parentPhone}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">Grade {s.grade}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="admin-label">Send Via</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setSendVia("email")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border transition-all ${
                      sendVia === "email"
                        ? "bg-[#00369b] text-white border-[#00369b]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                    }`}
                  >
                    <MdEmail size={16} /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendVia("sms")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border transition-all ${
                      sendVia === "sms"
                        ? "bg-[#00369b] text-white border-[#00369b]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                    }`}
                  >
                    <MdSms size={16} /> SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendVia("both")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border transition-all ${
                      sendVia === "both"
                        ? "bg-[#00369b] text-white border-[#00369b]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-[#00369b]"
                    }`}
                  >
                    <MdEmail size={16} /> <MdSms size={16} /> Both
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm">
                  <MdPeople className="text-[#00369b]" size={18} />
                  <span className="font-medium text-gray-700">
                    This will reach approximately <strong>{getRecipientCount()}</strong> parent(s)
                  </span>
                </div>
              </div>

              {sendResult && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-2 ${
                    sendResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                  }`}
                >
                  {sendResult.success ? <MdCheckCircle size={18} /> : <MdDelete size={18} />}
                  <span className="text-sm">{sendResult.message}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={sending} className="btn-primary disabled:opacity-60">
                  {sending ? "Sending…" : "Send Message"}
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
