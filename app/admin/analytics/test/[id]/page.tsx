"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { getTestById, getAttemptsByTest, getAllStudents, type Test, type TestAttempt, type Student } from "@/lib/firestore";
import { MdArrowBack, MdCheckCircle, MdCancel, MdPending, MdQuiz } from "react-icons/md";

export default function TestAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getTestById(id), getAttemptsByTest(id), getAllStudents()]).then(([t, a, s]) => {
      setTest(t); setAttempts(a); setStudents(s); setLoading(false);
    });
  }, [id]);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
  const approved = attempts.filter((a) => a.status === "approved");
  const passed = approved.filter((a) => a.passed);
  const avgScore = approved.length > 0 ? Math.round(approved.reduce((s, a) => s + a.percentage, 0) / approved.length) : 0;
  const passRate = approved.length > 0 ? Math.round((passed.length / approved.length) * 100) : 0;
  // Group by student
  const byStudent: Record<string, TestAttempt[]> = {};
  attempts.forEach((a) => { (byStudent[a.studentId] ??= []).push(a); });

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <Link href="/admin/tests" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"><MdArrowBack size={16}/>Back to Tests</Link>
        {loading ? <div className="text-center py-20 text-gray-400">Loading…</div> : !test ? (
          <div className="text-center py-20"><p className="text-gray-500">Test not found.</p></div>
        ) : (
          <>
            <div className="admin-card">
              <div className="flex items-center gap-3 mb-4">
                <MdQuiz size={24} className={test.type === "exam" ? "text-red-500" : "text-[#00369b]"}/>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
                  <p className="text-gray-500 text-sm">{test.subject} · Grade {test.grade} · {test.type} · Pass mark: {test.passMark}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label:"Total Attempts", value:attempts.length, color:"text-gray-900" },
                  { label:"Students Taken", value:Object.keys(byStudent).length, color:"text-[#00369b]" },
                  { label:"Avg Score",       value:`${avgScore}%`,   color:"text-blue-600" },
                  { label:"Pass Rate",       value:`${passRate}%`,   color:passRate>=50?"text-emerald-600":"text-red-500" },
                ].map((s)=>(
                  <div key={s.label} className="text-center p-4 bg-gray-50 border border-gray-200">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-4">Student Results ({Object.keys(byStudent).length} students)</h2>
              {Object.keys(byStudent).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No submissions yet.</p>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Student</th><th>Attempts</th><th>Best Score</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {Object.entries(byStudent).map(([studentId, atts]) => {
                      const s = studentMap[studentId];
                      const approved = atts.filter((a) => a.status === "approved");
                      const best = approved.length > 0 ? Math.max(...approved.map((a) => a.percentage)) : null;
                      const hasPassed = approved.some((a) => a.passed);
                      const hasPending = atts.some((a) => a.status === "pending_review");
                      return (
                        <tr key={studentId}>
                          <td>
                            <p className="font-medium text-gray-800">{s ? `${s.firstName} ${s.lastName}` : studentId}</p>
                            <p className="text-xs text-gray-400">{s?.studentId ?? ""}</p>
                          </td>
                          <td className="text-gray-600">{atts.length}</td>
                          <td>{best !== null ? <span className={`font-bold ${best >= test.passMark ? "text-emerald-600" : "text-red-500"}`}>{best}%</span> : <span className="text-gray-400">—</span>}</td>
                          <td>
                            {hasPassed ? <span className="badge badge-green flex items-center gap-1"><MdCheckCircle size={11}/>Passed</span>
                              : hasPending ? <span className="badge badge-yellow flex items-center gap-1"><MdPending size={11}/>Pending</span>
                              : approved.length > 0 ? <span className="badge badge-red flex items-center gap-1"><MdCancel size={11}/>Failed</span>
                              : <span className="badge badge-gray">No Results</span>}
                          </td>
                          <td>{s && <Link href={`/admin/students/${s.id}`} className="text-xs text-[#00369b] hover:underline">View →</Link>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
