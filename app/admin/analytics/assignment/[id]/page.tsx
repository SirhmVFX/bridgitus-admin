"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  getAssignmentById,
  getSubmissionsByAssignment,
  getAllStudents,
  type Assignment,
  type AssignmentSubmission,
  type Student,
} from "@/lib/firestore";
import { MdArrowBack, MdAssignment, MdBarChart } from "react-icons/md";
import SubmittedFileButton from "@/components/SubmittedFileButton";
import StudentResultsModal from "@/components/StudentResultsModal";
import { useBreadcrumbLabel } from "@/lib/breadcrumb";
import { formatGradeLabel } from "@/lib/grades";

export default function AssignmentAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { setDetailLabel } = useBreadcrumbLabel();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [resultModal, setResultModal] = useState<{
    studentName: string;
    submission: AssignmentSubmission;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAssignmentById(id),
      getSubmissionsByAssignment(id),
      getAllStudents(),
    ]).then(([a, s, st]) => {
      setAssignment(a);
      setSubmissions(s);
      setStudents(st);
      setLoading(false);
      setDetailLabel(a?.title || null);
    });
    return () => setDetailLabel(null);
  }, [id, setDetailLabel]);

  const eligibleStudents = assignment
    ? students.filter(
      (s) =>
        assignment.targetGrades.includes(s.grade) &&
        (!assignment.targetStudentIds?.length ||
          assignment.targetStudentIds.includes(s.id!))
    )
    : [];

  const gradedSubs = submissions.filter((s) => s.status === "graded");
  const avgScore =
    gradedSubs.length > 0 && assignment?.maxScore
      ? Math.round(
        gradedSubs.reduce((t, s) => t + (s.score ?? 0), 0) / gradedSubs.length
      )
      : null;

  const STATUS_COLOR: Record<string, string> = {
    not_started: "badge-gray",
    in_progress: "badge-yellow",
    submitted: "badge-blue",
    graded: "badge-green",
  };

  const isQuiz =
    assignment?.type === "quiz" && (assignment.questions?.length ?? 0) > 0;

  return (
    <AdminLayout>
      <div className="w-full space-y-5">
        <Link
          href="/admin/assignments"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <MdArrowBack size={16} />
          Back to Assignments
        </Link>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : !assignment ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Assignment not found.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="admin-card">
              <div className="flex items-center gap-3 mb-4">
                <MdAssignment size={24} className="text-amber-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
                  <p className="text-gray-500 text-sm">
                    {assignment.subject} · {assignment.type} ·{" "}
                    {assignment.targetGrades.map(formatGradeLabel).join(", ")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Assigned To", value: eligibleStudents.length, color: "text-gray-900" },
                  {
                    label: "Submitted",
                    value: submissions.filter(
                      (s) => s.status === "submitted" || s.status === "graded"
                    ).length,
                    color: "text-blue-600",
                  },
                  { label: "Graded", value: gradedSubs.length, color: "text-emerald-600" },
                  {
                    label: "Avg Score",
                    value: avgScore !== null ? `${avgScore}/${assignment.maxScore}` : "—",
                    color: "text-[#00369b]",
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center p-4 bg-gray-50 border border-gray-200">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Student table */}
            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-4">
                Student Status ({eligibleStudents.length} students)
              </h2>
              {eligibleStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No students assigned yet.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Grade</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Submitted file</th>
                      <th>Feedback</th>
                      {isQuiz && <th>Results</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleStudents.map((s) => {
                      const sub = submissions.find((sub) => sub.studentId === s.id);
                      const status = sub?.status ?? "not_started";
                      const canViewResults =
                        isQuiz &&
                        sub &&
                        (sub.status === "graded" || sub.status === "submitted") &&
                        sub.answers &&
                        Object.keys(sub.answers).length > 0;

                      return (
                        <tr key={s.id}>
                          <td>
                            <p className="font-medium text-gray-800">
                              {s.firstName} {s.lastName}
                            </p>
                          </td>
                          <td>
                            <span className="badge badge-blue">{formatGradeLabel(s.grade)}</span>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_COLOR[status]}`}>
                              {status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="font-medium text-gray-800">
                            {sub?.score !== undefined
                              ? `${sub.score}/${assignment.maxScore}`
                              : "—"}
                          </td>
                          <td>
                            <SubmittedFileButton
                              url={sub?.attachmentUrl}
                              name={sub?.attachmentName}
                            />
                          </td>
                          <td className="text-xs text-gray-500 max-w-[150px] truncate">
                            {sub?.feedback ?? "—"}
                          </td>
                          {isQuiz && (
                            <td>
                              {canViewResults ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setResultModal({
                                      studentName: `${s.firstName} ${s.lastName}`,
                                      submission: sub!,
                                    })
                                  }
                                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                >
                                  <MdBarChart size={13} /> View Results
                                </button>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          )}
                          <td>
                            <Link
                              href={`/admin/students/${s.id}`}
                              className="text-xs text-primary hover:underline whitespace-nowrap"
                            >
                              View →
                            </Link>
                          </td>
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

      {/* Results modal */}
      {resultModal && assignment && (
        <StudentResultsModal
          studentName={resultModal.studentName}
          title={assignment.title}
          questions={assignment.questions ?? []}
          answers={resultModal.submission.answers ?? {}}
          score={resultModal.submission.score}
          totalPoints={resultModal.submission.totalPoints}
          percentage={resultModal.submission.percentage}
          passed={resultModal.submission.passed}
          passMark={assignment.passMark}
          onClose={() => setResultModal(null)}
        />
      )}
    </AdminLayout>
  );
}
