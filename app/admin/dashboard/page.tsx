"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  getDashboardStats,
  getAllPendingAttempts,
  getAllStudents,
  getAllAnnouncements,
  getAdminAlerts,
  markAlertRead,
  markAllAlertsRead,
  deleteAlert,
  type TestAttempt,
  type Student,
  type Announcement,
  type AdminAlert,
} from "@/lib/firestore";
import FirebaseStatus from "@/components/FirebaseStatus";
import { adminFetch } from "@/lib/adminFetch";
import {
  MdPeople,
  MdMenuBook,
  MdQuiz,
  MdPending,
  MdArrowForward,
  MdCheckCircle,
  MdTrendingUp,
  MdCampaign,
  MdPushPin,
  MdWarning,
  MdPayment,
  MdClose,
  MdDoneAll,
  MdOndemandVideo,
} from "react-icons/md";

const YOUTUBE_URL = "https://youtube.com/@BridgitusLearning";

interface Stats {
  students: number;
  materials: number;
  tests: number;
  pendingReviews: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<TestAttempt[]>([]);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, p, students, ann, al] = await Promise.all([
          getDashboardStats(),
          getAllPendingAttempts(),
          getAllStudents(),
          getAllAnnouncements(),
          getAdminAlerts(true),
        ]);
        setStats(s);
        setPending(p.slice(0, 5));
        setRecentStudents(students.slice(0, 5));
        setAnnouncements(ann.filter((a) => a.published).slice(0, 3));
        setAlerts(al.slice(0, 10));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleMarkAlertRead(id: string) {
    await markAlertRead(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleMarkAllRead() {
    await markAllAlertsRead();
    setAlerts([]);
  }

  async function handleDeleteAlert(id: string) {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleRunPaymentCheck() {
    try {
      const res = await adminFetch("/api/check-payments", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const al = await getAdminAlerts(true);
        setAlerts(al.slice(0, 10));
        alert(
          `Payment check complete. ${data.alertsCreated} new alert(s) created.`,
        );
      }
    } catch {
      /* silent */
    }
  }

  const statCards = stats
    ? [
        {
          label: "Total Students",
          value: stats.students,
          sub: "Enrolled learners",
          icon: MdPeople,
          iconBg: "bg-[#00369b]/10 text-[#00369b]",
          href: "/admin/students",
        },
        {
          label: "Materials",
          value: stats.materials,
          sub: "Learning content",
          icon: MdMenuBook,
          iconBg: "bg-emerald-50 text-emerald-600",
          href: "/admin/materials",
        },
        {
          label: "Assessments",
          value: stats.tests,
          sub: "Tests & exams",
          icon: MdQuiz,
          iconBg: "bg-sky-50 text-[#00c1ff]",
          href: "/admin/tests",
        },
        {
          label: "Pending Reviews",
          value: stats.pendingReviews,
          sub: "Needs attention",
          icon: MdPending,
          iconBg: "bg-amber-50 text-amber-600",
          href: "/admin/tests",
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
              Overview
            </p>
            <h1 className="text-2xl lg:text-[1.75rem] font-extrabold text-[#001233] tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Bridgitus learning management at a glance
            </p>
          </div>
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 transition-all hover:-translate-y-0.5 border border-red-700"
          >
            <MdOndemandVideo size={16} /> YouTube Channel
          </a>
        </div>

        <FirebaseStatus />

        {!loading && alerts.length > 0 && (
          <div className="admin-card border-amber-200/80 bg-amber-50/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                <MdWarning size={18} className="text-amber-600" />
                Payment Alerts
                <span className="badge badge-yellow">{alerts.length}</span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunPaymentCheck}
                  className="text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <MdPayment size={13} /> Run Check
                </button>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <MdDoneAll size={13} /> Mark All Read
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
                    alert.type === "payment_expired"
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MdPayment
                      size={15}
                      className={`shrink-0 mt-0.5 ${
                        alert.type === "payment_expired"
                          ? "text-red-500"
                          : "text-amber-600"
                      }`}
                    />
                    <div>
                      <p
                        className={`font-medium text-sm ${
                          alert.type === "payment_expired"
                            ? "text-red-800"
                            : "text-amber-800"
                        }`}
                      >
                        {alert.message}
                      </p>
                      <Link
                        href="/admin/students"
                        className="text-xs text-[#00369b] hover:underline mt-0.5 inline-block"
                      >
                        View student →
                      </Link>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleMarkAlertRead(alert.id!)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Mark read"
                    >
                      <MdCheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id!)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Dismiss"
                    >
                      <MdClose size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card h-28 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((c) => (
              <Link key={c.label} href={c.href} className="stat-card hover-lift block">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    {c.label}
                  </p>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}
                  >
                    <c.icon size={18} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-[#001233] mt-3 tracking-tight">
                  {c.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {!loading && announcements.length > 0 && (
              <div className="admin-card">
                <div className="section-header">
                  <h2 className="font-semibold text-[#001233] flex items-center gap-2">
                    <MdCampaign size={16} className="text-[#00369b]" /> Active
                    Announcements
                  </h2>
                  <Link
                    href="/admin/announcements"
                    className="text-xs text-[#00369b] hover:underline font-semibold flex items-center gap-1"
                  >
                    Manage <MdArrowForward size={12} />
                  </Link>
                </div>
                <div className="space-y-2 pt-3">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-colors ${
                        a.pinned
                          ? "bg-amber-50 border-amber-200"
                          : "bg-slate-50/80 border-slate-100"
                      }`}
                    >
                      {a.pinned ? (
                        <MdPushPin
                          size={14}
                          className="text-amber-500 shrink-0 mt-0.5"
                        />
                      ) : (
                        <MdCampaign
                          size={14}
                          className="text-slate-400 shrink-0 mt-0.5"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {a.targetGrades.length === 0
                            ? "All Grades"
                            : `Grade${a.targetGrades.length > 1 ? "s" : ""} ${a.targetGrades.join(", ")}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="admin-card">
              <div className="section-header">
                <h2 className="font-semibold text-[#001233] flex items-center gap-2">
                  <MdPending size={16} className="text-amber-500" /> Pending Test
                  Reviews
                </h2>
                <Link
                  href="/admin/tests"
                  className="text-xs text-[#00369b] hover:underline font-semibold flex items-center gap-1"
                >
                  View all <MdArrowForward size={12} />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3 pt-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-10">
                  <MdCheckCircle
                    size={32}
                    className="mx-auto text-emerald-400 mb-2"
                  />
                  <p className="text-sm text-slate-500">
                    All caught up! No pending reviews.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 pt-1">
                  {pending.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between py-3.5 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {a.testTitle ?? "Test"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {a.studentName ?? a.studentId} · Attempt #{a.attemptNumber}
                        </p>
                      </div>
                      <span className="badge badge-yellow">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="admin-card">
              <div className="section-header">
                <h2 className="font-semibold text-[#001233]">Needs attention</h2>
                <Link
                  href="/admin/students"
                  className="text-xs text-[#00369b] hover:underline font-semibold"
                >
                  View log
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3 pt-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentStudents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No students enrolled yet.
                </p>
              ) : (
                <div className="space-y-2 pt-3">
                  {recentStudents.map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/students/${s.id}`}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-[#00c1ff]/40 hover:bg-white transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#00369b] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {s.firstName?.[0]}
                        {s.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          Grade {s.grade} · {s.studentId}
                        </p>
                      </div>
                      <span
                        className={`badge shrink-0 ${
                          s.paymentStatus === "paid" || s.paymentStatus === "waived"
                            ? "badge-green"
                            : s.paymentStatus === "expired"
                              ? "badge-red"
                              : "badge-yellow"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.paymentStatus === "paid" || s.paymentStatus === "waived"
                              ? "bg-emerald-500"
                              : s.paymentStatus === "expired"
                                ? "bg-red-500"
                                : "bg-amber-500"
                          }`}
                        />
                        {s.paymentStatus === "paid"
                          ? "Paid"
                          : s.paymentStatus === "waived"
                            ? "Waived"
                            : s.paymentStatus === "expired"
                              ? "Expired"
                              : "Unpaid"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-card">
              <h2 className="font-semibold text-[#001233] mb-4 flex items-center gap-2">
                <MdTrendingUp size={16} className="text-[#00369b]" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    href: "/admin/materials",
                    label: "Add Material",
                    icon: MdMenuBook,
                    color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
                  },
                  {
                    href: "/admin/tests",
                    label: "Create Test",
                    icon: MdQuiz,
                    color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
                  },
                  {
                    href: "/admin/students",
                    label: "Students",
                    icon: MdPeople,
                    color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  },
                  {
                    href: "/admin/announcements",
                    label: "Announce",
                    icon: MdCampaign,
                    color: "bg-sky-50 text-[#00369b] hover:bg-sky-100",
                  },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl transition-all font-semibold text-sm hover:-translate-y-0.5 ${a.color}`}
                  >
                    <a.icon size={16} /> {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
