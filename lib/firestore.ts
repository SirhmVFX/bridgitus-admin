import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  getCountFromServer,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
// All addressable admin sections
export const ADMIN_SECTIONS = [
  "dashboard", "students", "materials", "tests",
  "assignments", "announcements", "website", "messages",
  "account", "permissions",
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
  paymentStatus: "pending" | "paid" | "failed" | "waived";
  paymentReference?: string;
  paymentAmount?: number;
  paidAt?: Timestamp;
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
  type: "ixl" | "deltamath" | "custom" | "document";
  platformUrl?: string;
  platform?: "ixl" | "deltamath" | "other";
  content?: string;
  fileUrl?: string;
  fileName?: string;
  dueDate?: string;
  maxScore?: number;
  linkedMaterialId?: string;
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
  score?: number;
  feedback?: string;
  submittedAt?: Timestamp;
  gradedAt?: Timestamp;
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
  const q = query(collection(db, "admins"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminUser) }));
}

export async function createAdmin(
  data: Omit<AdminUser, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "admins"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAdmin(
  id: string,
  data: Partial<AdminUser>
): Promise<void> {
  await updateDoc(doc(db, "admins", id), {
    ...data,
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
  const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }));
}

export async function getStudentsByGrade(grade: string): Promise<Student[]> {
  const q = query(
    collection(db, "students"),
    where("grade", "==", grade),
    orderBy("firstName", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }));
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
  const q = query(
    collection(db, "learningMaterials"),
    orderBy("grade", "asc"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as LearningMaterial),
  }));
}

export async function getMaterialsByGrade(
  grade: string
): Promise<LearningMaterial[]> {
  const q = query(
    collection(db, "learningMaterials"),
    where("grade", "==", grade),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as LearningMaterial),
  }));
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
    ...data,
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
    ...data,
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
  const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Test) }));
}

export async function getTestsByGrade(grade: string): Promise<Test[]> {
  const q = query(
    collection(db, "tests"),
    where("grade", "==", grade),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Test) }));
}

export async function getTestById(id: string): Promise<Test | null> {
  const snap = await getDoc(doc(db, "tests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Test) };
}

export async function createTest(data: Omit<Test, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "tests"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTest(
  id: string,
  data: Partial<Test>
): Promise<void> {
  await updateDoc(doc(db, "tests", id), {
    ...data,
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
  const q = query(
    collection(db, "testAttempts"),
    where("status", "==", "pending_review"),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }));
}

export async function getAllAttempts(): Promise<TestAttempt[]> {
  const q = query(
    collection(db, "testAttempts"),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }));
}

export async function getAttemptsByTest(testId: string): Promise<TestAttempt[]> {
  const q = query(
    collection(db, "testAttempts"),
    where("testId", "==", testId),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }));
}

export async function getAttemptsByStudent(
  studentId: string
): Promise<TestAttempt[]> {
  const q = query(
    collection(db, "testAttempts"),
    where("studentId", "==", studentId),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TestAttempt) }));
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
  const q = query(
    collection(db, "assignments"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Assignment) }));
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
    ...data,
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
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, "assignments", id));
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT SUBMISSIONS
// ─────────────────────────────────────────────────────────────

export async function getSubmissionsByAssignment(
  assignmentId: string
): Promise<AssignmentSubmission[]> {
  const q = query(
    collection(db, "assignmentSubmissions"),
    where("assignmentId", "==", assignmentId),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as AssignmentSubmission),
  }));
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
  const q = query(
    collection(db, "announcements"),
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Announcement) }));
}

export async function createAnnouncement(
  data: Omit<Announcement, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "announcements"), {
    ...data,
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
    ...data,
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
  perks: Array<{ desc: string }>;
  freePerks: string[];
  highlighted: boolean;
  order: number;
  published: boolean;
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
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { data, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, "siteContent"), { section, data, updatedAt: serverTimestamp() });
  }
}

// Testimonials
export async function getAllTestimonials(): Promise<SiteTestimonial[]> {
  const q = query(collection(db, "siteTestimonials"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteTestimonial) }));
}
export async function createTestimonial(data: Omit<SiteTestimonial, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteTestimonials"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateTestimonial(id: string, data: Partial<SiteTestimonial>): Promise<void> {
  await updateDoc(doc(db, "siteTestimonials", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTestimonial(id: string): Promise<void> {
  await deleteDoc(doc(db, "siteTestimonials", id));
}

// Pricing
export async function getAllPricingPlans(): Promise<SitePricingPlan[]> {
  const q = query(collection(db, "sitePricingPlans"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SitePricingPlan) }));
}
export async function createPricingPlan(data: Omit<SitePricingPlan, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "sitePricingPlans"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updatePricingPlan(id: string, data: Partial<SitePricingPlan>): Promise<void> {
  await updateDoc(doc(db, "sitePricingPlans", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deletePricingPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, "sitePricingPlans", id));
}

// FAQs
export async function getAllFaqs(): Promise<SiteFaq[]> {
  const q = query(collection(db, "siteFaqs"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteFaq) }));
}
export async function createFaq(data: Omit<SiteFaq, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteFaqs"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateFaq(id: string, data: Partial<SiteFaq>): Promise<void> {
  await updateDoc(doc(db, "siteFaqs", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteFaq(id: string): Promise<void> {
  await deleteDoc(doc(db, "siteFaqs", id));
}

// Contact Messages
export async function getAllContactMessages(): Promise<ContactMessage[]> {
  const q = query(collection(db, "contactMessages"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ContactMessage) }));
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
  const q = query(collection(db, "siteClasses"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteClass) }));
}
export async function createClass(data: Omit<SiteClass, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteClasses"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateClass(id: string, data: Partial<SiteClass>): Promise<void> {
  await updateDoc(doc(db, "siteClasses", id), { ...data, updatedAt: serverTimestamp() });
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
  const q = query(collection(db, "siteServices"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteService) }));
}
export async function createService(data: Omit<SiteService, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "siteServices"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateService(id: string, data: Partial<SiteService>): Promise<void> {
  await updateDoc(doc(db, "siteServices", id), { ...data, updatedAt: serverTimestamp() });
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
  const q = query(collection(db, "sitePartners"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SitePartner) }));
}
export async function createPartner(data: Omit<SitePartner, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "sitePartners"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updatePartner(id: string, data: Partial<SitePartner>): Promise<void> {
  await updateDoc(doc(db, "sitePartners", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, "sitePartners", id));
}
