"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { getMaterialById, getCompletionsByMaterial, getAllStudents, type LearningMaterial, type MaterialCompletion, type Student } from "@/lib/firestore";
import { MdArrowBack, MdCheckCircle, MdRadioButtonUnchecked, MdMenuBook } from "react-icons/md";

export default function MaterialAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [material, setMaterial] = useState<LearningMaterial | null>(null);
  const [completions, setCompletions] = useState<MaterialCompletion[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getMaterialById(id), getCompletionsByMaterial(id), getAllStudents()]).then(([m, c, s]) => {
      setMaterial(m); setCompletions(c); setStudents(s); setLoading(false);
    });
  }, [id]);

  const completedStudentIds = new Set(completions.map((c) => c.studentId));
  const gradeStudents = material ? students.filter((s) => s.grade === material.grade) : [];
  const completedStudents = gradeStudents.filter((s) => completedStudentIds.has(s.id!));
  const notCompletedStudents = gradeStudents.filter((s) => !completedStudentIds.has(s.id!));
  const completionRate = gradeStudents.length > 0 ? Math.round((completedStudents.length / gradeStudents.length) * 100) : 0;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <Link href="/admin/materials" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"><MdArrowBack size={16} />Back to Materials</Link>
        {loading ? <div className="text-center py-20 text-gray-400">Loading…</div> : !material ? (
          <div className="text-center py-20"><p className="text-gray-500">Material not found.</p></div>
        ) : (
          <>
            <div className="admin-card">
              <div className="flex items-center gap-3 mb-4">
                <MdMenuBook size={24} className="text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{material.title}</h1>
                  <p className="text-gray-500 text-sm">{material.subject} · Grade {material.grade} · {material.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center p-4 bg-gray-50 border border-gray-200">
                  <p className="text-3xl font-black text-[#00369b]">{completedStudents.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Completed</p>
                </div>
                <div className="text-center p-4 bg-gray-50 border border-gray-200">
                  <p className="text-3xl font-black text-gray-500">{notCompletedStudents.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Not Started</p>
                </div>
                <div className="text-center p-4 bg-gray-50 border border-gray-200">
                  <p className="text-3xl font-black text-emerald-600">{completionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
                </div>
              </div>
              <div className="h-3 bg-gray-100 mb-1">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completionRate}%` }} />
              </div>
              <p className="text-xs text-gray-400">{completedStudents.length} of {gradeStudents.length} students in Grade {material.grade}</p>
            </div>

            {/* Completed */}
            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MdCheckCircle size={16} className="text-emerald-500" />Completed ({completedStudents.length})</h2>
              {completedStudents.length === 0 ? <p className="text-sm text-gray-400">No students have completed this material yet.</p> : (
                <div className="space-y-2">
                  {completedStudents.map((s) => {
                    const comp = completions.find((c) => c.studentId === s.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-[#00369b] flex items-center justify-center text-white text-xs font-bold">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                          <div><p className="text-sm font-medium text-gray-800">{s.firstName} {s.lastName}</p><p className="text-xs text-gray-400">{s.studentId}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          {comp?.completedAt && <p className="text-xs text-gray-400">{(comp.completedAt as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>}
                          <Link href={`/admin/students/${s.id}`} className="text-xs text-[#00369b] hover:underline">View →</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Not completed */}
            <div className="admin-card">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MdRadioButtonUnchecked size={16} className="text-gray-400" />Not Completed ({notCompletedStudents.length})</h2>
              {notCompletedStudents.length === 0 ? <p className="text-sm text-emerald-600 font-medium">All enrolled students have completed this material! 🎉</p> : (
                <div className="space-y-2">
                  {notCompletedStudents.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gray-300 flex items-center justify-center text-white text-xs font-bold">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                        <div><p className="text-sm font-medium text-gray-700">{s.firstName} {s.lastName}</p><p className="text-xs text-gray-400">{s.studentId}</p></div>
                      </div>
                      <Link href={`/admin/students/${s.id}`} className="text-xs text-[#00369b] hover:underline">View →</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
