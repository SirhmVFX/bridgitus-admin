/**
 * Bridgitus LMS — Firestore Seed Script
 *
 * Usage (after filling .env.local with your real Firebase credentials):
 *   npx ts-node -r tsconfig-paths/register scripts/seed.ts
 *
 * Or run with the helper npm script:
 *   npm run seed
 *
 * This seeds all public-facing CMS collections with realistic sample data.
 * It is SAFE to re-run — it uses upsert logic where possible and will skip
 * any document that already exists (by section key or by matching title).
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

// ── Helper: upsert siteContent by section ──────────────────────────────────
async function upsertSection(section: string, data: Record<string, unknown>) {
  const col = db.collection("siteContent");
  const snap = await col.where("section", "==", section).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({ data, updatedAt: FieldValue.serverTimestamp() });
    console.log(`  ✓ Updated siteContent/${section}`);
  } else {
    await col.add({ section, data, updatedAt: FieldValue.serverTimestamp() });
    console.log(`  ✓ Created siteContent/${section}`);
  }
}

// ── Helper: seed a collection if empty ─────────────────────────────────────
async function seedIfEmpty(collectionName: string, docs: Record<string, unknown>[]) {
  const snap = await db.collection(collectionName).limit(1).get();
  if (!snap.empty) {
    console.log(`  ⏭  ${collectionName} already has data — skipping`);
    return;
  }
  for (const doc of docs) {
    await db.collection(collectionName).add({ ...doc, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
  console.log(`  ✓ Seeded ${docs.length} docs into ${collectionName}`);
}

async function main() {
  console.log("🌱 Seeding Bridgitus Firestore…\n");

  // ── 1. Site Content Sections ─────────────────────────────────────────────
  console.log("📝 Site Content…");

  await upsertSection("header_info", {
    phone: "+61433600592",
    email: "info@bridgitus.com",
    abn: "16146552112",
    rating: "5 star rating from 5000+ verified reviews",
  });

  await upsertSection("contact_info", {
    email: "info@bridgitus.com",
    phone: "+61 433 600 592",
    altPhone: "",
    abn: "16146552112",
    facebook: "https://www.facebook.com/profile.php?id=61579279874406",
    instagram: "https://www.instagram.com/bridgitus/",
    linkedin: "https://www.linkedin.com/in/bridgitus-learning-538390383",
  });

  await upsertSection("hero", {
    heading: "Bridging Curiosity and Confidence —",
    headingHighlight: "One Student at a Time",
    subheading: "Personalized online tutoring designed to unlock every learner's potential.",
    image: "/assets/i6.jpg",
    bgPattern: "",
  });

  await upsertSection("brief", {
    heading: "Bridgitus",
    tagline: "Empowering Every Learner with a Path Made Just for Them",
    body: "<p>A leading online tuition platform committed to delivering personalized, high-quality education that empowers students to succeed. Founded by a team of dedicated educators, our mission is to close the gap between curiosity and understanding, guiding learners toward their academic goals from the comfort of their homes.</p>",
    quote: "Let your passion for learning be louder than your doubts, your dreams brighter than your fears, and your determination stronger than your excuses.",
    quoteAuthor: "Femi Olugbogi",
    quoteRole: "Founder, Bridgitus Learning",
    ctaLabel: "Bridge the gap",
  });

  await upsertSection("stats", {
    stat1Label: "100% Positive Feedback",
    stat1Sub: "Over 100+ positive feedback",
    stat2Label: "99% Success Rate",
    stat2Sub: "Students who stick with us succeed",
    stat3Label: "24/7 Expert Support",
    stat3Sub: "Always here when you need help",
  });

  await upsertSection("cta", {
    heading: "Every class is an opportunity to succeed.",
    subheading: "Ready to take the first step? Register today and start your learning journey.",
    buttonLabel: "Get Started",
    buttonHref: "/register",
  });

  await upsertSection("about_page", {
    heroHeading: "Where Every Learner's Journey is Uniquely Designed for Success.",
    heroImage: "/assets/i7.avif",
    vision: "To inspire and equip every learner to excel and thrive",
    mission: "To connect students to Knowledge, skills and confidence through engaging, personalized learning — bridging academic gaps and paving the way to excellence",
    directorName: "Femi Olugbogi",
    directorRole: "Founder, Bridgitus Learning",
    directorImage: "/assets/picc.jpg",
    directorBio: "Bridgitus Learning is more than just an educational platform; we are a dynamic bridge between potential and achievement.\n\nFounded on the belief that every learner deserves a clear and guided pathway to academic excellence, our mission is to empower students with the tools, strategies, and confidence they need to succeed in today's competitive environment.\n\nAt Bridgitus Learning, excellence is not a destination; it's a journey, and we're honoured to walk that path with every student we serve.",
    storyHeading: "Bridgitus Is More than an Institute. It's a Story",
    storyBody: "Bridgitus Learning is a premier online tuition platform dedicated to empowering students with personalized, high-quality education. Founded by a team of passionate educators, we aim to bridge the gap between curiosity and knowledge.",
    storyImage: "/assets/i8.jpg",
    storyQuote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today — Malcolm X",
    approachHeading: "Our Approach is Different — We're Here to Close Your Learning Gaps.",
    approachBody: "With our four-step process — assessing, personalizing, teaching, and tracking — we give students the fastest path to academic success.",
    approachImageDesktop: "/assets/process.svg",
    approachImageMobile: "/assets/proc2.svg",
    testimonialsHeading: "What Our Students Say About Us",
    faqHeading: "We know you have questions, We also have answers",
  });

  // ── 2. Testimonials ───────────────────────────────────────────────────────
  console.log("\n⭐ Testimonials…");
  await seedIfEmpty("siteTestimonials", [
    { name:"Sarah M.",  role:"Parent",  quote:"Bridgitus Learning has transformed my daughter's approach to math. The personalized sessions made complex concepts so much easier!", rating:5, published:true, order:0 },
    { name:"Emily R.",  role:"Student", quote:"Thanks to Bridgitus, I aced my AP English exam. The one-on-one attention really helped me improve my writing skills.", rating:5, published:true, order:1 },
    { name:"James L.", role:"Parent",  quote:"The tutors are incredibly engaging and patient. My son looks forward to his science lessons every week!", rating:5, published:true, order:2 },
    { name:"Priya K.", role:"Parent",  quote:"Highly recommend Bridgitus! My daughter's confidence has grown enormously since starting her sessions.", rating:5, published:true, order:3 },
    { name:"Marcus T.", role:"Student", quote:"I went from barely passing to top of my class in maths. Couldn't have done it without Bridgitus.", rating:5, published:true, order:4 },
  ]);

  // ── 3. Pricing Plans ─────────────────────────────────────────────────────
  console.log("\n💰 Pricing Plans…");
  await seedIfEmpty("sitePricingPlans", [
    { title:"Basic Plan", tagline:"Pay as you go", price:"$50", per:"/hour lesson", highlighted:false, order:0, published:true, perks:[{desc:"Flexible Scheduling"},{desc:"No long-term commitment"},{desc:"Perfect for trial lessons or casual learning"}], freePerks:["One-on-one personalized tutoring","Flexible scheduling options","Free initial consultation"] },
    { title:"Standard Plan", tagline:"Growth Plan", price:"$955", per:"20 classes at $47.75/hr", highlighted:true, order:1, published:true, perks:[{desc:"2 classes per week (10 weeks)"},{desc:"Structured learning with consistency"},{desc:"Progress tracking & Feedback"}], freePerks:["One-on-one personalized tutoring","Flexible scheduling options","Free initial consultation"] },
    { title:"Premium Plan", tagline:"Success Plan", price:"$1,365", per:"30 classes at $45.50/hr", highlighted:false, order:2, published:true, perks:[{desc:"2 classes per week (15 weeks)"},{desc:"Strong foundation & measurable improvements"},{desc:"Best value for long-term learning"}], freePerks:["One-on-one personalized tutoring","Flexible scheduling options","Free initial consultation"] },
  ]);

  // ── 4. FAQs ──────────────────────────────────────────────────────────────
  console.log("\n❓ FAQs…");
  await seedIfEmpty("siteFaqs", [
    { question:"What subjects do you offer tutoring in?", answer:"We offer comprehensive tutoring in Mathematics, English, Science, and Social Studies, plus preparation for HSC, VCE, NAPLAN, SAT, and ACT.", order:0, published:true },
    { question:"How do you match students with tutors?", answer:"We match students based on their learning style, academic needs, personality, and the tutor's subject expertise and teaching approach.", order:1, published:true },
    { question:"What technology do I need for online tutoring?", answer:"A stable internet connection, a computer or tablet with a webcam, and a quiet space. We use Zoom for our virtual classrooms.", order:2, published:true },
    { question:"How often should my child have sessions?", answer:"Most students benefit from 1–2 sessions per week. We recommend a schedule based on an initial assessment of your child's goals.", order:3, published:true },
    { question:"What makes your teaching approach different?", answer:"Our personalised approach focuses on each student's unique learning style, combining proven teaching methods with real-world applications and adaptive technology.", order:4, published:true },
    { question:"Is there a free trial?", answer:"Yes! We offer a free initial consultation and assessment so you can meet your tutor and understand the learning plan before committing.", order:5, published:true },
  ]);

  // ── 5. Classes ───────────────────────────────────────────────────────────
  console.log("\n🏫 Classes…");
  await seedIfEmpty("siteClasses", [
    { title:"Regular Tutoring",             grades:"All grades", description:"Ongoing weekly sessions covering all core subjects, aligned to the Australian curriculum.",       subjects:["Maths","English","Science","Social Studies"],   type:"one-on-one", published:true, order:0 },
    { title:"Special Math Class",           grades:"K–12",      description:"Intensive maths coaching from foundational arithmetic through to advanced calculus.",             subjects:["Maths","Statistics","Calculus","Algebra"],       type:"one-on-one", published:true, order:1 },
    { title:"Special Science Class",        grades:"7–12",      description:"Deep-dive science sessions covering Physics, Chemistry and Biology with lab-style experiments.",   subjects:["Physics","Chemistry","Biology","Earth Science"],  type:"one-on-one", published:true, order:2 },
    { title:"Special English Class",        grades:"K–12",      description:"Build reading, writing and comprehension skills with expert guidance tailored to each level.",     subjects:["English","Literature","Creative Writing"],        type:"one-on-one", published:true, order:3 },
    { title:"HSC Class",                    grades:"11–12",     description:"Targeted HSC preparation with past paper practice, essay technique and exam strategy.",           subjects:["All HSC subjects"],                               type:"group",      published:true, order:4 },
    { title:"VCE Class",                    grades:"11–12",     description:"Comprehensive VCE coaching covering all study areas with ATAR-focused revision programs.",         subjects:["All VCE subjects"],                               type:"group",      published:true, order:5 },
    { title:"Scholarship Preparatory",      grades:"K–10",      description:"Structured preparation for ACER, Edutest and other scholarship examinations.",                    subjects:["Maths","English","Reasoning","General Ability"], type:"group",      published:true, order:6 },
    { title:"College Preparatory Class",    grades:"9–12",      description:"University readiness — ATAR coaching, personal statement guidance and study skills development.",  subjects:["All subjects","Study Skills","University Prep"],  type:"one-on-one", published:true, order:7 },
  ]);

  // ── 6. Services / Features ────────────────────────────────────────────────
  console.log("\n🛠  Services…");
  await seedIfEmpty("siteServices", [
    // Offer section
    { title:"Fully Interactive Classes",  description:"Engage in real-time with shared whiteboards, live chat and screen sharing.", icon:"🖥️", section:"offer", bullets:[], published:true, order:0 },
    { title:"Real-time Feedback",         description:"Get instant, personalised feedback from expert tutors during every session.", icon:"💬", section:"offer", bullets:[], published:true, order:1 },
    { title:"100% Personalized",          description:"Every lesson plan is crafted around your child's unique learning style and needs.", icon:"🎯", section:"offer", bullets:[], published:true, order:2 },
    { title:"Progress Tracking",          description:"Monitor improvement with detailed progress reports and performance analytics.", icon:"📊", section:"offer", bullets:[], published:true, order:3 },
    { title:"Flexible Scheduling",        description:"Book sessions that fit your schedule — mornings, evenings or weekends.", icon:"📅", section:"offer", bullets:[], published:true, order:4 },
    { title:"Expert Tutors",              description:"All tutors are qualified educators with proven track records and subject expertise.", icon:"🏆", section:"offer", bullets:[], published:true, order:5 },
    // Why section
    { title:"One-on-One Tutoring",  description:"Personalised sessions tailored to each student's learning pace and style.", image:"/assets/i6.jpg", section:"why",   bullets:["Dedicated tutor for every student","Sessions aligned to school curriculum","Regular progress reports to parents"], published:true, order:0 },
    { title:"Group Learning",       description:"Collaborative sessions that build confidence and communication skills alongside peers.", image:"/assets/i8.jpg", section:"why", bullets:["Small groups of 3–5 students","Peer learning and discussion","More affordable than 1:1 tutoring"], published:true, order:1 },
    { title:"Exam Preparation",     description:"Structured programs for HSC, VCE, NAPLAN, selective school and scholarship exams.", image:"/assets/i9.jpg", section:"why", bullets:["Extensive past paper practice","Time management strategies","Proven exam technique coaching"], published:true, order:2 },
  ]);

  // ── 7. Partners ──────────────────────────────────────────────────────────
  console.log("\n🤝 Partners…");
  await seedIfEmpty("sitePartners", [
    { name:"DeltaMath",    logo:"/assets/dm.png",   url:"https://www.deltamath.com",  published:true, order:0 },
    { name:"Education",    logo:"/assets/edu.png",  url:"",                           published:true, order:1 },
    { name:"IXL",          logo:"/assets/ixl.webp", url:"https://www.ixl.com",        published:true, order:2 },
    { name:"Khan Academy", logo:"/assets/kah.png",  url:"https://www.khanacademy.org",published:true, order:3 },
    { name:"Khan",         logo:"/assets/kh.png",   url:"",                           published:true, order:4 },
    { name:"Quizlet",      logo:"/assets/qz.png",   url:"https://quizlet.com",        published:true, order:5 },
    { name:"Slader",       logo:"/assets/sl.jpg",   url:"",                           published:true, order:6 },
  ]);

  // ── 8. Learning Materials (sample) ───────────────────────────────────────
  console.log("\n📚 Learning Materials…");
  await seedIfEmpty("learningMaterials", [
    { title:"Introduction to Algebra", description:"<p>A beginner-friendly introduction to algebraic thinking, variables and equations.</p>", grade:"7", subject:"Maths", type:"text", content:"<h2>What is Algebra?</h2><p>Algebra is the branch of mathematics dealing with symbols and the rules for manipulating those symbols. In elementary algebra, those symbols represent quantities without fixed values, known as variables.</p><h2>Key Concepts</h2><ul><li>Variables and constants</li><li>Expressions vs equations</li><li>Solving for x</li></ul>", published:true, order:0, estimatedMinutes:20 },
    { title:"Grammar Fundamentals", description:"<p>Core grammar rules every student needs — from sentence structure to punctuation.</p>", grade:"7", subject:"English", type:"text", content:"<h2>Parts of Speech</h2><p>Understanding parts of speech is the foundation of good writing. There are eight main parts of speech: nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, and interjections.</p>", published:true, order:1, estimatedMinutes:15 },
    { title:"Forces and Motion", description:"<p>Explore Newton's Laws of Motion and how they apply to everyday life.</p>", grade:"9", subject:"Physics", type:"text", content:"<h2>Newton's First Law</h2><p>An object at rest stays at rest, and an object in motion stays in motion with the same speed and direction unless acted upon by an unbalanced force.</p>", published:true, order:0, estimatedMinutes:25 },
  ]);

  // ── 9. Sample Announcement ───────────────────────────────────────────────
  console.log("\n📢 Announcements…");
  await seedIfEmpty("announcements", [
    { title:"Welcome to Bridgitus Learning Portal!", body:"We're excited to welcome you to your new learning portal. Explore your materials, take quizzes, and track your progress. If you need help, contact us at info@bridgitus.com.", targetGrades:[], pinned:true, published:true },
    { title:"New Materials Added for Grade 7", body:"We've just uploaded new Maths and English materials for Grade 7 students. Log in and check the Learning Materials section!", targetGrades:["7"], pinned:false, published:true },
  ]);

  console.log("\n✅ Seed complete!\n");
  process.exit(0);
}

main().catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); });
