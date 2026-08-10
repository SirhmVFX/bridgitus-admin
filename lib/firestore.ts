import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp, getCountFromServer, limit,
} from "firebase/firestore";
import { db } from "./firebase";
// All addressable admin sections
export const ADMIN_SECTIONS = [
  "dashboard", "students", "materials", "tests",
  "assignments", "announcements", "website", "messages",
  "parent-messages", "account", "permissions",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export interface AdminUser {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: "super" | "admin";
  /** Sections this admin can access. Ignored for super admins (they get everything). */
  permissions?: AdminSection[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface Student {
  id?: string;
  uid: string;
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  school: string;
  grade: string;
  subjects: string[];
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  postcode: string;
  enrolledAt?: Timestamp;
  status: "active" | "inactive" | "suspended";
  avatar?: string;
  bio?: string;
  credentialsSent?: boolean;
  // Payment
  paymentStatus: "pending" | "paid" | "failed" | "waived" | "expired";
  paymentReference?: string;
  paymentAmount?: number;
  paidAt?: Timestamp;
  planId?: string;
  planTitle?: string;
  planExpiresAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
}

export interface LearningMaterial {
  id?: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  type: "text" | "document" | "pdf" | "image" | "video" | "link" | "mixed";
  content?: string;
  fileUrl?: string;
  fileName?: string;
  linkUrl?: string;
  linkLabel?: string;
  thumbnailUrl?: string;
  published: boolean;
  order: number;
  estimatedMinutes?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Test {
  id?: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  type: "test" | "exam";
  questions: Question[];
  totalPoints: number;
  passMark: number;
  maxAttempts: number;
  timeLimit?: number;
  linkedMaterialId?: string;
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TestAttempt {
  id?: string;
  testId: string;
  testTitle?: string;
  studentId: string;
  studentUid: string;
  studentName?: string;
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  status: "pending_review" | "approved" | "rejected";
  adminComment?: string;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
}

export interface Assignment {
  id?: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  type: "ixl" | "deltamath" | "custom" | "document" | "quiz";
  platformUrl?: string;
  platform?: "ixl" | "deltamath" | "other";
  content?: string;
  fileUrl?: string;
  fileName?: string;
  dueDate?: string;
  maxScore?: number;
  linkedMaterialId?: string;
  questions?: Question[];
  totalPoints?: number;
  passMark?: number;
  timeLimit?: number;
  maxAttempts?: number;
  targetGrades: string[];
  targetStudentIds?: string[];
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AssignmentSubmission {
  id?: string;
  assignmentId: string;
  studentId: string;
  studentUid: string;
  studentName?: string;
  status: "not_started" | "in_progress" | "submitted" | "graded";
  answers?: Record<string, string>;
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
  attemptNumber?: number;
  feedback?: string;
  submittedAt?: Timestamp;
  gradedAt?: Timestamp;
}

export interface AdminAlert {
  id?: string;
  type: "payment_expired" | "payment_expiring";
  studentId: string;
  studentName: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface StudentProgress {
  id?: string;
  studentId: string;
  grade: string;
  subject: string;
  overallScore: number;
  testsCompleted: number;
  testsPassed: number;
  assignmentsCompleted: number;
  materialsCompleted: number;
  lastActivity?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MaterialCompletion {
  id?: string;
  studentId: string;
  materialId: string;
  grade: string;
  subject: string;
  completedAt?: Timestamp;
}

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  targetGrades: string[];
  pinned: boolean;
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ─────────────────────────────────────────────────────────────
// ADMIN USERS
// ─────────────────────────────────────────────────────────────

export async function getAdminByUid(uid: string): Promise<AdminUser | null> {
  const q = query(collection(db, "admins"), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as AdminUser) };
}

export async function getAllAdmins(): Promise<AdminUser[]> {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as AdminUser) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

function sanitizeFirestoreData<T extends unknown>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreData(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .reduce((acc, [key, v]) => ({
        ...acc,
        [key]: sanitizeFirestoreData(v),
      }), {} as Record<string, unknown>) as T;
  }
  return value;
}

export async function createAdmin(
  data: Omit<AdminUser, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "admins"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAdmin(
  id: string,
  data: Partial<AdminUser>
): Promise<void> {
  await updateDoc(doc(db, "admins", id), {
    ...sanitizeFirestoreData(data as AdminUser),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAdmin(id: string): Promise<void> {
  await deleteDoc(doc(db, "admins", id));
}

// ─────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────

export async function getAllStudents(): Promise<Student[]> {
  // No orderBy — sort client-side to avoid needing createdAt index
  const snap = await getDocs(collection(db, "students"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Student) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getStudentsByGrade(grade: string): Promise<Student[]> {
  const snap = await getDocs(query(collection(db, "students"), where("grade", "==", grade)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Student) }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export async function getStudentById(id: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, "students", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Student) };
}

export async function updateStudent(
  id: string,
  data: Partial<Student>
): Promise<void> {
  await updateDoc(doc(db, "students", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, "students", id));
}

export async function getStudentCount(): Promise<number> {
  const snap = await getCountFromServer(collection(db, "students"));
  return snap.data().count;
}

// ─────────────────────────────────────────────────────────────
// LEARNING MATERIALS
// ─────────────────────────────────────────────────────────────

export async function getAllMaterials(): Promise<LearningMaterial[]> {
  const snap = await getDocs(collection(db, "learningMaterials"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as LearningMaterial) }))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.order - b.order);
}

export async function getMaterialsByGrade(grade: string): Promise<LearningMaterial[]> {
  const snap = await getDocs(query(collection(db, "learningMaterials"), where("grade", "==", grade)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as LearningMaterial) }))
    .sort((a, b) => a.order - b.order);
}

export async function getMaterialById(
  id: string
): Promise<LearningMaterial | null> {
  const snap = await getDoc(doc(db, "learningMaterials", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as LearningMaterial) };
}

export async function createMaterial(
  data: Omit<LearningMaterial, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "learningMaterials"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMaterial(
  id: string,
  data: Partial<LearningMaterial>
): Promise<void> {
  await updateDoc(doc(db, "learningMaterials", id), {
    ...sanitizeFirestoreData(data as LearningMaterial),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMaterial(id: string): Promise<void> {
  await deleteDoc(doc(db, "learningMaterials", id));
}

export async function getMaterialCount(): Promise<number> {
  const snap = await getCountFromServer(collection(db, "learningMaterials"));
  return snap.data().count;
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

export async function getAllTests(): Promise<Test[]> {
  const snap = await getDocs(collection(db, "tests"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Test) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getTestsByGrade(grade: string): Promise<Test[]> {
  const snap = await getDocs(query(collection(db, "tests"), where("grade", "==", grade)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Test) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getTestById(id: string): Promise<Test | null> {
  const snap = await getDoc(doc(db, "tests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Test) };
}

export async function createTest(data: Omit<Test, "id">): Promise<string> {
  const payload = sanitizeFirestoreData(data) as Omit<Test, "id">;
  const ref = await addDoc(collection(db, "tests"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTest(
  id: string,
  data: Partial<Test>
): Promise<void> {
  const payload = sanitizeFirestoreData(data) as Partial<Test>;
  await updateDoc(doc(db, "tests", id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTest(id: string): Promise<void> {
  await deleteDoc(doc(db, "tests", id));
}

// ─────────────────────────────────────────────────────────────
// TEST ATTEMPTS
// ─────────────────────────────────────────────────────────────

export async function getAllPendingAttempts(): Promise<TestAttempt[]> {
  const snap = await getDocs(query(collection(db, "testAttempts"), where("status", "==", "pending_review")));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }))
    .sort((a, b) => (b.submittedAt as Timestamp)?.toMillis() - (a.submittedAt as Timestamp)?.toMillis() || 0);
}

export async function getAllAttempts(): Promise<TestAttempt[]> {
  const snap = await getDocs(collection(db, "testAttempts"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }))
    .sort((a, b) => (b.submittedAt as Timestamp)?.toMillis() - (a.submittedAt as Timestamp)?.toMillis() || 0);
}

export async function getAttemptsByTest(testId: string): Promise<TestAttempt[]> {
  const snap = await getDocs(query(collection(db, "testAttempts"), where("testId", "==", testId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }))
    .sort((a, b) => (b.submittedAt as Timestamp)?.toMillis() - (a.submittedAt as Timestamp)?.toMillis() || 0);
}

export async function getAttemptsByStudent(studentId: string): Promise<TestAttempt[]> {
  const snap = await getDocs(query(collection(db, "testAttempts"), where("studentId", "==", studentId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }))
    .sort((a, b) => (b.submittedAt as Timestamp)?.toMillis() - (a.submittedAt as Timestamp)?.toMillis() || 0);
}

export async function reviewAttempt(
  id: string,
  status: "approved" | "rejected",
  adminComment?: string
): Promise<void> {
  await updateDoc(doc(db, "testAttempts", id), {
    status,
    adminComment: adminComment ?? "",
    reviewedAt: serverTimestamp(),
  });

  // When approving, run learning-gap detection
  if (status === "approved") {
    try {
      const attemptSnap = await getDoc(doc(db, "testAttempts", id));
      if (!attemptSnap.exists()) return;
      const attempt = { id: attemptSnap.id, ...(attemptSnap.data() as TestAttempt) };

      const test = await getTestById(attempt.testId);
      if (!test) return;

      // Group questions by topic (fall back to test.subject when no topic field)
      const topicGroups: Record<string, { correct: number; total: number }> = {};
      for (const q of test.questions) {
        const topic = (q as Question & { topic?: string }).topic ?? test.subject;
        if (!topicGroups[topic]) topicGroups[topic] = { correct: 0, total: 0 };
        topicGroups[topic].total += 1;
        const given = (attempt.answers[q.id] ?? "").trim().toLowerCase();
        const correct = q.correctAnswer.trim().toLowerCase();
        const isCorrect =
          q.type === "short_answer" ? given.includes(correct) : given === correct;
        if (isCorrect) topicGroups[topic].correct += 1;
      }

      // Write a LearningGap for every topic below 60 % accuracy; resolve above 80 %
      await Promise.all(
        Object.entries(topicGroups).map(([topic, { correct, total }]) => {
          const accuracy = Math.round((correct / total) * 100);
          return upsertLearningGap(attempt.studentId, {
            studentId: attempt.studentId,
            subject: test.subject,
            topic,
            accuracy,
            attemptCount: 1,
            resolved: accuracy >= 80,
          });
        })
      );
    } catch {
      // Gap detection is best-effort — never fail the review itself
    }
  }
}

export async function getPendingAttemptCount(): Promise<number> {
  const q = query(
    collection(db, "testAttempts"),
    where("status", "==", "pending_review")
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────

export async function getAllAssignments(): Promise<Assignment[]> {
  const snap = await getDocs(collection(db, "assignments"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Assignment) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getAssignmentById(
  id: string
): Promise<Assignment | null> {
  const snap = await getDoc(doc(db, "assignments", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Assignment) };
}

export async function createAssignment(
  data: Omit<Assignment, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "assignments"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssignment(
  id: string,
  data: Partial<Assignment>
): Promise<void> {
  await updateDoc(doc(db, "assignments", id), {
    ...sanitizeFirestoreData(data as Assignment),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, "assignments", id));
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT SUBMISSIONS
// ─────────────────────────────────────────────────────────────

export async function getSubmissionsByAssignment(assignmentId: string): Promise<AssignmentSubmission[]> {
  const snap = await getDocs(query(collection(db, "assignmentSubmissions"), where("assignmentId", "==", assignmentId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as AssignmentSubmission) }))
    .sort((a, b) => (b.submittedAt as Timestamp)?.toMillis() - (a.submittedAt as Timestamp)?.toMillis() || 0);
}

export async function gradeSubmission(
  id: string,
  score: number,
  feedback: string
): Promise<void> {
  await updateDoc(doc(db, "assignmentSubmissions", id), {
    status: "graded",
    score,
    feedback,
    gradedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────
// STUDENT PROGRESS
// ─────────────────────────────────────────────────────────────

export async function getProgressByStudent(
  studentId: string
): Promise<StudentProgress[]> {
  const q = query(
    collection(db, "studentProgress"),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as StudentProgress),
  }));
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [students, materials, tests, pending] = await Promise.all([
    getStudentCount(),
    getMaterialCount(),
    getCountFromServer(collection(db, "tests")).then((s) => s.data().count),
    getPendingAttemptCount(),
  ]);
  return { students, materials, tests, pendingReviews: pending };
}

// ─────────────────────────────────────────────────────────────
// MATERIAL COMPLETIONS (admin read)
// ─────────────────────────────────────────────────────────────

export async function getCompletionsByStudent(
  studentId: string
): Promise<MaterialCompletion[]> {
  const q = query(
    collection(db, "materialCompletions"),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MaterialCompletion) }));
}

export async function getCompletionsByMaterial(
  materialId: string
): Promise<MaterialCompletion[]> {
  const q = query(
    collection(db, "materialCompletions"),
    where("materialId", "==", materialId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MaterialCompletion) }));
}

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(collection(db, "announcements"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Announcement) }))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0;
    });
}

export async function createAnnouncement(
  data: Omit<Announcement, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "announcements"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Announcement>
): Promise<void> {
  await updateDoc(doc(db, "announcements", id), {
    ...sanitizeFirestoreData(data as Announcement),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, "announcements", id));
}

// ─────────────────────────────────────────────────────────────
// SITE CONTENT CMS
// ─────────────────────────────────────────────────────────────

export interface SiteContent {
  id?: string;
  section: string;
  data: Record<string, unknown>;
  updatedAt?: Timestamp;
}

export interface SiteTestimonial {
  id?: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  avatar?: string;
  published: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SitePricingPlan {
  id?: string;
  title: string;
  tagline: string;
  price: string;
  per: string;
  badge?: string;
  description?: string;
  icon?: string;
  ctaLabel?: string;
  ctaHref?: string;
  perks: Array<{ desc: string }>;
  freePerks: string[];
  features?: Array<{ icon: string; title: string; desc: string }>;
  bottomNote1?: string;
  bottomNote2?: string;
  highlighted: boolean;
  order: number;
  published: boolean;
  amountKobo?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SiteFaq {
  id?: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface ParentMessage {
  id?: string;
  title: string;
  body: string;
  recipientType: "all" | "specific";
  recipientIds?: string[];
  recipientGrades?: string[];
  sendVia: "email" | "sms" | "both";
  sentAt?: Timestamp;
  sentByEmail?: boolean;
  sentBySms?: boolean;
  emailCount?: number;
  smsCount?: number;
  createdAt?: Timestamp;
  createdBy?: string;
}

// ── CMS helpers ─────────────────────────────────────────────

export async function getSiteContent(section: string): Promise<SiteContent | null> {
  const q = query(collection(db, "siteContent"), where("section", "==", section), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as SiteContent) };
}

export async function upsertSiteContent(section: string, data: Record<string, unknown>): Promise<void> {
  const q = query(collection(db, "siteContent"), where("section", "==", section), limit(1));
  const snap = await getDocs(q);
  const cleanData = sanitizeFirestoreData(data as Record<string, unknown>);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { data: cleanData, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, "siteContent"), { section, data: cleanData, updatedAt: serverTimestamp() });
  }
}

// Testimonials
export async function getAllTestimonials(): Promise<SiteTestimonial[]> {
  const snap = await getDocs(collection(db, "siteTestimonials"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteTestimonial) })).sort((a, b) => a.order - b.order);
}
export async function createTestimonial(data: Omit<SiteTestimonial, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteTestimonials"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updateTestimonial(id: string, data: Partial<SiteTestimonial>): Promise<void> {
  await updateDoc(doc(db, "siteTestimonials", id), {
    ...sanitizeFirestoreData(data as SiteTestimonial),
    updatedAt: serverTimestamp(),
  });
}
export async function deleteTestimonial(id: string): Promise<void> {
  await deleteDoc(doc(db, "siteTestimonials", id));
}

// Pricing
export async function getAllPricingPlans(): Promise<SitePricingPlan[]> {
  const snap = await getDocs(collection(db, "sitePricingPlans"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SitePricingPlan) })).sort((a, b) => a.order - b.order);
}
export async function createPricingPlan(data: Omit<SitePricingPlan, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "sitePricingPlans"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updatePricingPlan(id: string, data: Partial<SitePricingPlan>): Promise<void> {
  await updateDoc(doc(db, "sitePricingPlans", id), {
    ...sanitizeFirestoreData(data as SitePricingPlan),
    updatedAt: serverTimestamp(),
  });
}
export async function deletePricingPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, "sitePricingPlans", id));
}

// FAQs
export async function getAllFaqs(): Promise<SiteFaq[]> {
  const snap = await getDocs(collection(db, "siteFaqs"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteFaq) })).sort((a, b) => a.order - b.order);
}
export async function createFaq(data: Omit<SiteFaq, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteFaqs"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updateFaq(id: string, data: Partial<SiteFaq>): Promise<void> {
  await updateDoc(doc(db, "siteFaqs", id), {
    ...sanitizeFirestoreData(data as SiteFaq),
    updatedAt: serverTimestamp(),
  });
}
export async function deleteFaq(id: string): Promise<void> {
  await deleteDoc(doc(db, "siteFaqs", id));
}

// Contact Messages
export async function getAllContactMessages(): Promise<ContactMessage[]> {
  const snap = await getDocs(collection(db, "contactMessages"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ContactMessage) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}
export async function markMessageRead(id: string): Promise<void> {
  await updateDoc(doc(db, "contactMessages", id), { read: true });
}
export async function deleteContactMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, "contactMessages", id));
}
export async function getUnreadMessageCount(): Promise<number> {
  const q = query(collection(db, "contactMessages"), where("read", "==", false));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

// ─────────────────────────────────────────────────────────────
// SITE CLASSES
// ─────────────────────────────────────────────────────────────

export interface SiteClass {
  id?: string;
  title: string;
  grades: string;         // e.g. "K–6" or "7–10"
  description: string;
  subjects: string[];     // array of subject names
  type: "one-on-one" | "group" | "online";
  image?: string;
  published: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function getAllClasses(): Promise<SiteClass[]> {
  const snap = await getDocs(collection(db, "siteClasses"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteClass) })).sort((a, b) => a.order - b.order);
}
export async function createClass(data: Omit<SiteClass, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteClasses"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updateClass(id: string, data: Partial<SiteClass>): Promise<void> {
  await updateDoc(doc(db, "siteClasses", id), {
    ...sanitizeFirestoreData(data as SiteClass),
    updatedAt: serverTimestamp(),
  });
}
export async function deleteClass(id: string): Promise<void> {
  await deleteDoc(doc(db, "siteClasses", id));
}

// ─────────────────────────────────────────────────────────────
// SITE SERVICES / FEATURES (Offer/Why cards)
// ─────────────────────────────────────────────────────────────

export interface SiteService {
  id?: string;
  title: string;
  description: string;
  icon?: string;           // emoji or image URL
  bullets?: string[];      // list items
  image?: string;
  section: "offer" | "why" | "exam_prep";
  published: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function getAllServices(): Promise<SiteService[]> {
  const snap = await getDocs(collection(db, "siteServices"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteService) })).sort((a, b) => a.order - b.order);
}
export async function createService(data: Omit<SiteService, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteServices"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updateService(id: string, data: Partial<SiteService>): Promise<void> {
  await updateDoc(doc(db, "siteServices", id), {
    ...sanitizeFirestoreData(data as SiteService),
    updatedAt: serverTimestamp(),
  });
}
export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, "siteServices", id));
}

// ─────────────────────────────────────────────────────────────
// SITE PARTNERS
// ─────────────────────────────────────────────────────────────

export interface SitePartner {
  id?: string;
  name: string;
  logo: string;            // Cloudinary URL
  url?: string;            // optional link
  published: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function getAllPartners(): Promise<SitePartner[]> {
  const snap = await getDocs(collection(db, "sitePartners"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SitePartner) })).sort((a, b) => a.order - b.order);
}
export async function createPartner(data: Omit<SitePartner, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "sitePartners"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updatePartner(id: string, data: Partial<SitePartner>): Promise<void> {
  await updateDoc(doc(db, "sitePartners", id), {
    ...sanitizeFirestoreData(data as SitePartner),
    updatedAt: serverTimestamp(),
  });
}
export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, "sitePartners", id));
}

// ─────────────────────────────────────────────────────────────
// PARENT MESSAGES
// ─────────────────────────────────────────────────────────────

export async function getAllParentMessages(): Promise<ParentMessage[]> {
  const snap = await getDocs(collection(db, "parentMessages"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ParentMessage) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getParentMessageById(id: string): Promise<ParentMessage | null> {
  const snap = await getDoc(doc(db, "parentMessages", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as ParentMessage) };
}

export async function createParentMessage(
  data: Omit<ParentMessage, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "parentMessages"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateParentMessage(
  id: string,
  data: Partial<ParentMessage>
): Promise<void> {
  await updateDoc(doc(db, "parentMessages", id), sanitizeFirestoreData(data as { [key: string]: unknown }));
}

export async function deleteParentMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, "parentMessages", id));
}

// ─────────────────────────────────────────────────────────────
// AI QUESTION SETS
// ─────────────────────────────────────────────────────────────

export interface AIQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "extended_response";
  text: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
  workedSolution?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: string;
}

export interface QuestionSet {
  id?: string;
  title: string;
  curriculum: string;
  subject: string;
  subjectFolder?: string;   // explicit folder/subject grouping
  year: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
  format: string;
  context: string;
  questionCount: number;
  questions: AIQuestion[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LearningGap {
  id?: string;
  studentId: string;
  subject: string;
  topic: string;
  subtopic?: string;
  accuracy: number;
  attemptCount: number;
  lastAttemptAt?: Timestamp;
  resolved: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PracticeAttempt {
  id?: string;
  studentId: string;
  studentUid: string;
  questionSetId?: string;
  questions: AIQuestion[];
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  percentage: number;
  subject: string;
  topic: string;
  difficulty: string;
  submittedAt?: Timestamp;
}

// ── Question Sets ────────────────────────────────────────────────────────

export async function getAllQuestionSets(): Promise<QuestionSet[]> {
  const snap = await getDocs(collection(db, "questionSets"));
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as QuestionSet) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getQuestionSetById(id: string): Promise<QuestionSet | null> {
  const snap = await getDoc(doc(db, "questionSets", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as QuestionSet) };
}

export async function createQuestionSet(data: Omit<QuestionSet, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "questionSets"), {
    ...sanitizeFirestoreData(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateQuestionSet(id: string, data: Partial<QuestionSet>): Promise<void> {
  await updateDoc(doc(db, "questionSets", id), {
    ...sanitizeFirestoreData(data as QuestionSet),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuestionSet(id: string): Promise<void> {
  await deleteDoc(doc(db, "questionSets", id));
}

// ── Learning Gaps (admin read) ───────────────────────────────────────────

export async function getAllLearningGaps(): Promise<LearningGap[]> {
  const snap = await getDocs(collection(db, "learningGaps"));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as LearningGap) }));
}

export async function getLearningGapsByStudent(studentId: string): Promise<LearningGap[]> {
  const snap = await getDocs(query(collection(db, "learningGaps"), where("studentId", "==", studentId)));
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as LearningGap) }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Upsert a learning gap record for a student+subject+topic. Used by reviewAttempt. */
export async function upsertLearningGap(
  studentId: string,
  data: Omit<LearningGap, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const q = query(
    collection(db, "learningGaps"),
    where("studentId", "==", studentId),
    where("subject", "==", data.subject),
    where("topic", "==", data.topic),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, "learningGaps"), {
      ...sanitizeFirestoreData(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const existing = snap.docs[0];
    const prev = existing.data() as LearningGap;
    const newCount = (prev.attemptCount ?? 0) + data.attemptCount;
    // Rolling average accuracy
    const newAccuracy = Math.round(
      ((prev.accuracy ?? 0) * (prev.attemptCount ?? 0) + data.accuracy * data.attemptCount) / newCount
    );
    await updateDoc(doc(db, "learningGaps", existing.id), {
      accuracy: newAccuracy,
      attemptCount: newCount,
      resolved: newAccuracy >= 80,
      lastAttemptAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ── Practice Attempts (admin read) ───────────────────────────────────────

export async function getPracticeAttemptsByStudent(studentId: string): Promise<PracticeAttempt[]> {
  const snap = await getDocs(query(collection(db, "practiceAttempts"), where("studentId", "==", studentId)));
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as PracticeAttempt) }))
    .sort((a, b) => (b.submittedAt as Timestamp)?.toMillis() - (a.submittedAt as Timestamp)?.toMillis() || 0);
}

// ─────────────────────────────────────────────────────────────
// ADMIN ALERTS (payment notifications)
// ─────────────────────────────────────────────────────────────

export async function getAdminAlerts(unreadOnly = false): Promise<AdminAlert[]> {
  const q = unreadOnly
    ? query(collection(db, "adminAlerts"), where("read", "==", false))
    : query(collection(db, "adminAlerts"));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as AdminAlert) }))
    .sort((a, b) => (b.createdAt as Timestamp)?.toMillis() - (a.createdAt as Timestamp)?.toMillis() || 0);
}

export async function getUnreadAlertCount(): Promise<number> {
  const q = query(collection(db, "adminAlerts"), where("read", "==", false));
  const snap = await getDocs(q);
  return snap.size;
}

export async function markAlertRead(id: string): Promise<void> {
  await updateDoc(doc(db, "adminAlerts", id), { read: true });
}

export async function markAllAlertsRead(): Promise<void> {
  const snap = await getDocs(query(collection(db, "adminAlerts"), where("read", "==", false)));
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

export async function deleteAlert(id: string): Promise<void> {
  await deleteDoc(doc(db, "adminAlerts", id));
}

/** Creates a payment alert if one doesn't already exist for this student + type combo this week */
export async function createPaymentAlert(
  type: AdminAlert["type"],
  studentId: string,
  studentName: string,
  message: string
): Promise<void> {
  // Avoid duplicate alerts — check if we created one in the last 7 days
  const weekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const q = query(
    collection(db, "adminAlerts"),
    where("type", "==", type),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  const recent = snap.docs.find(d => {
    const ts = (d.data() as AdminAlert).createdAt as Timestamp;
    return ts && ts.toMillis() > weekAgo.toMillis();
  });
  if (recent) return; // Already alerted recently

  await addDoc(collection(db, "adminAlerts"), {
    type, studentId, studentName, message,
    read: false, createdAt: serverTimestamp(),
  });
}

/**
 * Run this server-side (e.g. from a cron route) to check all students
 * and fire payment expiry / expiring-soon alerts.
 */
export async function checkAndCreatePaymentAlerts(): Promise<number> {
  const snap = await getDocs(collection(db, "students"));
  const students = snap.docs.map(d => ({ id: d.id, ...(d.data() as Student) }));
  const now = Date.now();
  const soon = now + 7 * 24 * 60 * 60 * 1000; // 7 days from now
  let created = 0;

  for (const s of students) {
    if (!s.planExpiresAt) continue;
    const name = `${s.firstName} ${s.lastName}`;
    const expiresMs = (s.planExpiresAt as Timestamp).toMillis();

    if (expiresMs <= now && s.paymentStatus !== "expired") {
      // Mark student as expired
      await updateDoc(doc(db, "students", s.id!), {
        paymentStatus: "expired",
        status: "suspended",
        updatedAt: serverTimestamp(),
      });
      await createPaymentAlert(
        "payment_expired", s.id!, name,
        `${name}'s ${s.planTitle ?? "plan"} expired. Account has been suspended.`
      );
      created++;
    } else if (expiresMs > now && expiresMs <= soon) {
      const daysLeft = Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000));
      await createPaymentAlert(
        "payment_expiring", s.id!, name,
        `${name}'s ${s.planTitle ?? "plan"} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Renewal needed soon.`
      );
      created++;
    }
  }
  return created;
}
