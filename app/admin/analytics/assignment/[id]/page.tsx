"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { getAssignmentById, getSubmissionsByAssignment, getAllStudents, type Assignment, type AssignmentSubmission, type Student } from "@/lib/firestore";
import { MdArrowBack, MdAssignment, MdCheckCircle } from "react-icons/md";

export default function AssignmentAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getAssignmentById(id), getSubmissionsByAssignment(id), getAllStudents()]).then(([a, s, st]) => {
      setAssignment(a); setSubmissions(s); setStudents(st); setLoading(false);
    });
  }, [id]);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
  const eligibleStudents = assignment
    ? students.filter((s) => assignment.targetGrades.includes(s.grade) && (!assignment.targetStudentIds?.length || assignment.targetStudentIds.includes(s.id!)))
    : [];
  const submittedIds = new Set(submissions.map((s) => s.studentId));
  const gradedSubs = submissions.filter((s) => s.status === "graded");
  const avgScore = gradedSubs.length > 0 && assignment?.maxScore
    ? Math.round(gradedSubs.reduce((t, s) => t + (s.score ?? 0), 0) / gradedSubs.length) : null;

  const STATUS_COLOR: Record<string, string> = { not_started: "badge-gray", in_progress: "badge-yellow", submitted: "badge-blue", graded: "badge-green" };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <Link href="/admin/assignments" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"><MdArrowBack size={16} />Back to Assignments</Link>
        {loading ? <div className="text-center py-20 text-gray-400">Loading…</div> : !assignment ? (
          <div className="text-center py-20"><p className="text-gray-500">Assignment not found.</p></div>
        ) : (
          <>
            <div className="admin-card">
              <div className="flex items-center gap-3 mb-4">
                <MdAssignment size={24} className="text-amber-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
                  <p className="text-gray-500 text-sm">{assignment.subject} · {assignment.type} · Grades: {assignment.targetGrades.join(", ")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Assigned To", value: eligibleStudents.length, color: "text-gray-900" },
                  { label: "Submitted", value: submissions.filter(s => s.status === "submitted" || s.status === "graded").length, color: "text-blue-600" },
                  { label: "Graded", value: gradedSubs.length, color: "text-emerald-600" },
                  { label: "Avg Score", value: avgScore !== null ? `${avgScore}/${assignment.maxScore}` : "—", color: "text-[#00369b]" },
                ].map(s => (
                  <div key={s.label} className="text-center p-4 bg-gray-50 border border-gray-200">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-4">Student Status ({eligibleStudents.length} students)</h2>
              {eligibleStudents.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No students assigned yet.</p> : (
                <table className="admin-table">
                  <thead><tr><th>Student</th><th>Grade</th><th>Status</th><th>Score</th><th>Feedback</th><th></th></tr></thead>
                  <tbody>
                    {eligibleStudents.map((s) => {
                      const sub = submissions.find((sub) => sub.studentId === s.id);
                      const status = sub?.status ?? "not_started";
                      return (
                        <tr key={s.id}>
                          <td>
                            <p className="font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-gray-400">{s.studentId}</p>
                          </td>
                          <td><span className="badge badge-blue">Grade {s.grade}</span></td>
                          <td><span className={`badge ${STATUS_COLOR[status]}`}>{status.replace("_", " ")}</span></td>
                          <td className="font-medium text-gray-800">{sub?.score !== undefined ? `${sub.score}/${assignment.maxScore}` : "—"}</td>
                          <td className="text-xs text-gray-500 max-w-37.5 truncate">{sub?.feedback ?? "—"}</td>
                          <td><Link href={`/admin/students/${s.id}`} className="text-xs text-primary hover:underline">View →</Link></td>
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
