"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  getDashboardStats, getAllPendingAttempts, getAllStudents, getAllAnnouncements,
  type TestAttempt, type Student, type Announcement,
} from "@/lib/firestore";
import {
  MdPeople, MdMenuBook, MdQuiz, MdPending, MdArrowForward,
  MdCheckCircle, MdTrendingUp, MdCampaign, MdPushPin,
} from "react-icons/md";

interface Stats { students: number; materials: number; tests: number; pendingReviews: number; }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<TestAttempt[]>([]);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, p, students, ann] = await Promise.all([
        getDashboardStats(),
        getAllPendingAttempts(),
        getAllStudents(),
        getAllAnnouncements(),
      ]);
      setStats(s);
      setPending(p.slice(0, 5));
      setRecentStudents(students.slice(0, 5));
      setAnnouncements(ann.filter((a) => a.published).slice(0, 3));
      setLoading(false);
    }
    load();
  }, []);

  const statCards = stats ? [
    { label: "Total Students", value: stats.students, icon: MdPeople, color: "bg-[#00369b]", href: "/admin/students" },
    { label: "Learning Materials", value: stats.materials, icon: MdMenuBook, color: "bg-emerald-600", href: "/admin/materials" },
    { label: "Tests & Exams", value: stats.tests, icon: MdQuiz, color: "bg-amber-500", href: "/admin/tests" },
    { label: "Pending Reviews", value: stats.pendingReviews, icon: MdPending, color: "bg-red-500", href: "/admin/tests" },
  ] : [];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Bridgitus Learning Management Overview</p>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="stat-card h-24 animate-pulse bg-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((c) => (
              <Link key={c.label} href={c.href} className="stat-card hover:opacity-90 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${c.color}`}>
                    <c.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                    <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Announcements (published) */}
        {!loading && announcements.length > 0 && (
          <div className="admin-card">
            <div className="section-header -mx-6 -mt-5 mb-4 px-6 py-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MdCampaign size={16} className="text-[#00369b]" /> Active Announcements
              </h2>
              <Link href="/admin/announcements" className="text-xs text-[#00369b] hover:underline font-medium flex items-center gap-1">
                Manage <MdArrowForward size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className={`flex items-start gap-3 px-4 py-3 border text-sm ${a.pinned ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                  {a.pinned ? <MdPushPin size={14} className="text-amber-500 shrink-0 mt-0.5" /> : <MdCampaign size={14} className="text-gray-400 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.targetGrades.length === 0 ? "All Grades" : `Grade${a.targetGrades.length > 1 ? "s" : ""} ${a.targetGrades.join(", ")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Pending reviews */}
          <div className="admin-card">
            <div className="section-header -mx-6 -mt-5 mb-4 px-6 py-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MdPending size={16} className="text-red-500" /> Pending Test Reviews
              </h2>
              <Link href="/admin/tests" className="text-xs text-[#00369b] hover:underline font-medium flex items-center gap-1">
                View all <MdArrowForward size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse" />)}</div>
            ) : pending.length === 0 ? (
              <div className="text-center py-8">
                <MdCheckCircle size={30} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-gray-500">All caught up! No pending reviews.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 -mx-6">
                {pending.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.testTitle ?? "Test"}</p>
                      <p className="text-xs text-gray-400">Student: {a.studentName ?? a.studentId} · Attempt #{a.attemptNumber}</p>
                    </div>
                    <span className="badge badge-yellow">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent students */}
          <div className="admin-card">
            <div className="section-header -mx-6 -mt-5 mb-4 px-6 py-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MdPeople size={16} className="text-[#00369b]" /> Recent Students
              </h2>
              <Link href="/admin/students" className="text-xs text-[#00369b] hover:underline font-medium flex items-center gap-1">
                Manage <MdArrowForward size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse" />)}</div>
            ) : recentStudents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No students enrolled yet.</p>
            ) : (
              <div className="divide-y divide-gray-50 -mx-6">
                {recentStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#00369b]/10 flex items-center justify-center text-[#00369b] text-xs font-bold shrink-0">
                        {s.firstName?.[0]}{s.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-gray-400">{s.studentId} · Grade {s.grade}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${s.paymentStatus === "paid" || s.paymentStatus === "waived" ? "badge-green" : "badge-yellow"}`}>
                        {s.paymentStatus === "paid" ? "Paid" : s.paymentStatus === "waived" ? "Waived" : "Unpaid"}
                      </span>
                      <span className={`badge ${s.status === "active" ? "badge-blue" : "badge-gray"}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="admin-card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MdTrendingUp size={16} className="text-[#00369b]" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/admin/materials", label: "Add Material", icon: MdMenuBook, color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
              { href: "/admin/tests", label: "Create Test", icon: MdQuiz, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
              { href: "/admin/students", label: "View Students", icon: MdPeople, color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
              { href: "/admin/announcements", label: "New Announcement", icon: MdCampaign, color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className={`flex items-center gap-3 p-4 transition-colors font-medium text-sm ${a.color}`}>
                <a.icon size={18} /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
