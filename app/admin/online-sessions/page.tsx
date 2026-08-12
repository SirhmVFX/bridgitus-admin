"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  getAllOnlineSessions, deleteOnlineSession, isOnlineSessionLive,
  type OnlineSession,
} from "@/lib/firestore";
import {
  MdVideocam, MdAdd, MdDelete, MdOpenInNew, MdCheckCircle, MdSchedule,
} from "react-icons/md";

const GRADES = ["Foundation", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function OnlineSessionsPage() {
  const [sessions, setSessions] = useState<OnlineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [title, setTitle] = useState("Online Tutoring Class");
  const [teamsUrl, setTeamsUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);

  async function load() {
    setSessions(await getAllOnlineSessions());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openModal() {
    const soon = new Date(Date.now() + 15 * 60_000);
    const local = new Date(soon.getTime() - soon.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    setTitle("Online Tutoring Class");
    setTeamsUrl("");
    setStartsAt(local);
    setDurationMinutes(60);
    setTargetGrades([]);
    setNotify(true);
    setMessage(null);
    setModal(true);
  }

  function toggleGrade(g: string) {
    setTargetGrades((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/online-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          teamsUrl,
          startsAt: new Date(startsAt).toISOString(),
          durationMinutes,
          targetGrades,
          notify,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessage({ type: "ok", text: data.message });
      setModal(false);
      await load();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create session" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this online session?")) return;
    await deleteOnlineSession(id);
    await load();
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MdVideocam size={22} className="text-[#5B5FC7]" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Online Sessions</h1>
              <p className="text-gray-500 text-sm">
                Post a Microsoft Teams link — students get a live Join button on their dashboard
              </p>
            </div>
          </div>
          <button onClick={openModal} className="btn-primary flex items-center gap-2 text-sm">
            <MdAdd size={16} /> New Teams Session
          </button>
        </div>

        {message && (
          <div className={`border px-4 py-3 text-sm ${message.type === "ok"
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        <div className="admin-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <MdVideocam size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No online sessions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((s) => {
                const live = isOnlineSessionLive(s);
                const ended = new Date(s.endsAt).getTime() < Date.now();
                return (
                  <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{s.title}</p>
                        {live && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500 text-white px-2 py-0.5 animate-pulse">
                            Live now
                          </span>
                        )}
                        {!live && !ended && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5">
                            Upcoming
                          </span>
                        )}
                        {ended && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5">
                            Ended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MdSchedule size={12} />
                        {new Date(s.startsAt).toLocaleString("en-AU", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {" · "}{s.durationMinutes} min
                        {" · "}{s.targetGrades?.length ? `Grades ${s.targetGrades.join(", ")}` : "All grades"}
                      </p>
                      <a href={s.teamsUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#5B5FC7] hover:underline inline-flex items-center gap-1 mt-1 break-all">
                        <MdOpenInNew size={12} /> {s.teamsUrl}
                      </a>
                      {s.notified && (
                        <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                          <MdCheckCircle size={12} /> Students emailed
                        </p>
                      )}
                    </div>
                    <button onClick={() => s.id && handleDelete(s.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 shrink-0">
                      <MdDelete size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900">New Microsoft Teams Session</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="admin-label">Session title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className="admin-input w-full" />
              </div>
              <div>
                <label className="admin-label">Microsoft Teams meeting link</label>
                <input value={teamsUrl} onChange={(e) => setTeamsUrl(e.target.value)} required
                  placeholder="https://teams.microsoft.com/l/meetup-join/…"
                  className="admin-input w-full" type="url" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Starts at</label>
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                    required className="admin-input w-full" />
                </div>
                <div>
                  <label className="admin-label">Duration (minutes)</label>
                  <input type="number" min={5} max={480} value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    required className="admin-input w-full" />
                </div>
              </div>
              <div>
                <label className="admin-label">Target grades (leave empty = all)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GRADES.map((g) => (
                    <button key={g} type="button" onClick={() => toggleGrade(g)}
                      className={`text-xs px-2.5 py-1 border font-medium ${targetGrades.includes(g)
                        ? "border-[#00369b] bg-[#00369b]/10 text-[#00369b]"
                        : "border-gray-200 text-gray-600"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                Email students & parents when created
              </label>
              {message?.type === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{message.text}</p>
              )}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? "Creating…" : "Create & notify"}
                </button>
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
