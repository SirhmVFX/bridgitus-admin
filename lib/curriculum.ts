// ── Curriculum data shared by admin and student portal ────────────────────
// Single source of truth for: curricula → subjects → years → topics → subtopics

export interface CurriculumTopic {
  name: string;
  subtopics?: string[];
}

export interface CurriculumYear {
  year: string;            // e.g. "Year 7", "Year 10", "Stage 4"
  topics: CurriculumTopic[];
}

export interface CurriculumSubject {
  name: string;
  years: CurriculumYear[];
}

export interface Curriculum {
  id: string;
  label: string;
  subjects: CurriculumSubject[];
}

// ──────────────────────────────────────────────────────────────────────────
// DATA
// ──────────────────────────────────────────────────────────────────────────

export const CURRICULA: Curriculum[] = [
  // ── Victorian Curriculum 2.0 ──────────────────────────────────────────
  {
    id: "vic2",
    label: "Victorian Curriculum 2.0",
    subjects: [
      {
        name: "Mathematics",
        years: [
          {
            year: "Year 7",
            topics: [
              { name: "Integers", subtopics: ["Adding & subtracting integers", "Multiplying & dividing integers", "Order of operations"] },
              { name: "Fractions, decimals and percentages", subtopics: ["Equivalent fractions", "Adding & subtracting fractions", "Converting fractions, decimals & percentages"] },
              { name: "Ratios and rates", subtopics: ["Simplifying ratios", "Solving ratio problems", "Speed, distance & time"] },
              { name: "Algebra", subtopics: ["Writing algebraic expressions", "Substitution", "Simplifying expressions"] },
              { name: "Linear relationships", subtopics: ["Graphing linear equations", "Finding the rule", "Gradient & y-intercept"] },
              { name: "Angles", subtopics: ["Angles at a point", "Parallel lines", "Angle relationships"] },
              { name: "Polygons", subtopics: ["Properties of triangles", "Properties of quadrilaterals", "Interior & exterior angles"] },
              { name: "Transformations", subtopics: ["Reflection", "Rotation", "Translation"] },
              { name: "Measurement", subtopics: ["Perimeter", "Area of rectangles & triangles", "Volume of rectangular prisms"] },
              { name: "Statistics and probability", subtopics: ["Collecting data", "Mean, median & mode", "Simple probability"] },
            ],
          },
          {
            year: "Year 8",
            topics: [
              { name: "Number", subtopics: ["Index notation", "Scientific notation", "Square & cube roots"] },
              { name: "Financial mathematics", subtopics: ["Percentages & discounts", "Profit & loss", "Simple interest"] },
              { name: "Algebra", subtopics: ["Expanding brackets", "Factorising", "Linear equations"] },
              { name: "Geometry", subtopics: ["Congruent triangles", "Pythagoras theorem", "Circle properties"] },
              { name: "Measurement", subtopics: ["Area of composite shapes", "Surface area", "Volume of prisms & cylinders"] },
              { name: "Statistics", subtopics: ["Stem-and-leaf plots", "Box plots", "Scatter plots"] },
              { name: "Probability", subtopics: ["Theoretical vs experimental", "Venn diagrams", "Two-step experiments"] },
            ],
          },
          {
            year: "Year 9",
            topics: [
              { name: "Number and algebra", subtopics: ["Surds", "Index laws", "Factorising quadratics"] },
              { name: "Linear and non-linear relationships", subtopics: ["Simultaneous equations", "Quadratic graphs", "Circles & hyperbolas"] },
              { name: "Trigonometry", subtopics: ["SOHCAHTOA", "Finding angles", "Applications"] },
              { name: "Measurement & geometry", subtopics: ["Similar figures", "Surface area of spheres & cones", "Volume of composite solids"] },
              { name: "Statistics", subtopics: ["Bivariate data", "Lines of best fit", "Standard deviation"] },
            ],
          },
          {
            year: "Year 10",
            topics: [
              { name: "Algebra", subtopics: ["Quadratic equations", "Completing the square", "Discriminant"] },
              { name: "Functions", subtopics: ["Domain & range", "Function notation", "Inverse functions"] },
              { name: "Trigonometry", subtopics: ["Sine & cosine rules", "Bearings", "Exact values"] },
              { name: "Statistics & probability", subtopics: ["Conditional probability", "Combinations & permutations", "Normal distribution"] },
              { name: "Financial mathematics", subtopics: ["Compound interest", "Depreciation", "Annuities"] },
            ],
          },
        ],
      },
      {
        name: "Science",
        years: [
          {
            year: "Year 7",
            topics: [
              { name: "Cells and living things", subtopics: ["Cell structure", "Plant vs animal cells", "Specialised cells"] },
              { name: "Mixtures and substances", subtopics: ["Pure substances & mixtures", "Separation techniques", "Physical & chemical changes"] },
              { name: "Forces and energy", subtopics: ["Contact & non-contact forces", "Gravity", "Energy forms & transfers"] },
              { name: "Earth and space", subtopics: ["Solar system", "Moon phases", "Rock cycle"] },
            ],
          },
          {
            year: "Year 8",
            topics: [
              { name: "Body systems", subtopics: ["Digestive system", "Circulatory system", "Nervous system"] },
              { name: "Chemical reactions", subtopics: ["Atoms & elements", "Compounds & molecules", "Chemical equations"] },
              { name: "Motion and waves", subtopics: ["Speed & acceleration", "Sound waves", "Light & reflection"] },
              { name: "Ecosystems", subtopics: ["Food webs", "Biotic & abiotic factors", "Human impact"] },
            ],
          },
          {
            year: "Year 9",
            topics: [
              { name: "Genetics", subtopics: ["DNA & chromosomes", "Inheritance patterns", "Mutations"] },
              { name: "Chemistry", subtopics: ["Periodic table", "Chemical bonding", "Acids & bases"] },
              { name: "Electricity", subtopics: ["Circuits", "Ohm's law", "Electromagnetic induction"] },
              { name: "Space science", subtopics: ["Stars & stellar evolution", "Galaxies", "Big Bang theory"] },
            ],
          },
          {
            year: "Year 10",
            topics: [
              { name: "Evolution", subtopics: ["Natural selection", "Evidence for evolution", "Speciation"] },
              { name: "Atomic theory", subtopics: ["Atomic models", "Radioactivity", "Nuclear reactions"] },
              { name: "Global systems", subtopics: ["Climate science", "Carbon cycle", "Human impact on Earth"] },
            ],
          },
        ],
      },
      {
        name: "English",
        years: [
          {
            year: "Year 7",
            topics: [
              { name: "Reading & comprehension", subtopics: ["Main idea & supporting details", "Inference & prediction", "Vocabulary in context"] },
              { name: "Grammar & language", subtopics: ["Nouns, verbs & adjectives", "Sentence types", "Punctuation"] },
              { name: "Writing", subtopics: ["Narrative writing", "Persuasive writing", "Informative writing"] },
              { name: "Literature analysis", subtopics: ["Character analysis", "Theme identification", "Author's purpose"] },
            ],
          },
          {
            year: "Year 8",
            topics: [
              { name: "Comprehension", subtopics: ["Skimming & scanning", "Identifying bias", "Comparing texts"] },
              { name: "Grammar", subtopics: ["Clauses & phrases", "Tense consistency", "Active & passive voice"] },
              { name: "Writing", subtopics: ["Analytical writing", "Descriptive writing", "Editing & proofreading"] },
              { name: "Media & multimodal texts", subtopics: ["Visual literacy", "Film techniques", "Advertising language"] },
            ],
          },
          {
            year: "Year 9",
            topics: [
              { name: "Close reading", subtopics: ["Connotation & denotation", "Figurative language", "Tone & mood"] },
              { name: "Writing", subtopics: ["Argumentative essays", "Feature articles", "Speeches"] },
              { name: "Literature", subtopics: ["Shakespearean language", "Novel study techniques", "Poetic devices"] },
            ],
          },
          {
            year: "Year 10",
            topics: [
              { name: "Critical analysis", subtopics: ["Discourse analysis", "Ideological perspectives", "Intertextuality"] },
              { name: "Extended writing", subtopics: ["Formal essays", "Creative writing portfolio", "Research reports"] },
              { name: "Oral communication", subtopics: ["Debate skills", "Formal presentation", "Listening strategies"] },
            ],
          },
        ],
      },
    ],
  },

  // ── Australian Curriculum ─────────────────────────────────────────────
  {
    id: "australian",
    label: "Australian Curriculum",
    subjects: [
      {
        name: "Mathematics",
        years: [
          { year: "Year 7", topics: [{ name: "Number", subtopics: ["Integers", "Fractions & decimals", "Percentages"] }, { name: "Algebra", subtopics: ["Variables", "Linear equations"] }, { name: "Measurement & geometry", subtopics: ["Area & perimeter", "Volume", "Angles"] }, { name: "Statistics & probability", subtopics: ["Data representation", "Probability"] }] },
          { year: "Year 8", topics: [{ name: "Number & algebra", subtopics: ["Financial maths", "Index notation", "Linear equations"] }, { name: "Measurement & geometry", subtopics: ["Pythagoras", "Congruence", "Circles"] }, { name: "Statistics & probability", subtopics: ["Data analysis", "Probability models"] }] },
          { year: "Year 9", topics: [{ name: "Number & algebra", subtopics: ["Surds", "Factorisation", "Quadratics"] }, { name: "Measurement & geometry", subtopics: ["Trigonometry", "Similarity"] }, { name: "Statistics & probability", subtopics: ["Bivariate data", "Sample spaces"] }] },
          { year: "Year 10", topics: [{ name: "Number & algebra", subtopics: ["Functions", "Polynomials"] }, { name: "Measurement & geometry", subtopics: ["Coordinate geometry", "Circle theorems"] }, { name: "Statistics & probability", subtopics: ["Normal distribution", "Conditional probability"] }] },
        ],
      },
      {
        name: "Science",
        years: [
          { year: "Year 7", topics: [{ name: "Biological sciences", subtopics: ["Classification of organisms", "Ecosystems"] }, { name: "Chemical sciences", subtopics: ["Matter & materials", "Mixtures"] }, { name: "Physical sciences", subtopics: ["Energy types", "Forces"] }, { name: "Earth & space sciences", subtopics: ["Earth's surface", "Solar system"] }] },
          { year: "Year 8", topics: [{ name: "Biological sciences", subtopics: ["Body systems", "Cells"] }, { name: "Chemical sciences", subtopics: ["Atoms & elements", "Chemical reactions"] }, { name: "Physical sciences", subtopics: ["Motion", "Heat"] }] },
          { year: "Year 9", topics: [{ name: "Biological sciences", subtopics: ["Genetics", "Evolution"] }, { name: "Chemical sciences", subtopics: ["Chemical equations", "Acids & bases"] }, { name: "Physical sciences", subtopics: ["Electricity", "Waves"] }] },
          { year: "Year 10", topics: [{ name: "Biological sciences", subtopics: ["DNA & inheritance"] }, { name: "Chemical sciences", subtopics: ["Organic chemistry"] }, { name: "Physical sciences", subtopics: ["Energy & forces"] }, { name: "Earth & space sciences", subtopics: ["Climate change", "Universe"] }] },
        ],
      },
      {
        name: "English",
        years: [
          { year: "Year 7", topics: [{ name: "Language", subtopics: ["Grammar", "Vocabulary"] }, { name: "Literature", subtopics: ["Narrative", "Poetry"] }, { name: "Literacy", subtopics: ["Reading comprehension", "Writing genres"] }] },
          { year: "Year 8", topics: [{ name: "Language", subtopics: ["Text cohesion", "Language for persuasion"] }, { name: "Literature", subtopics: ["Character & theme", "Visual texts"] }, { name: "Literacy", subtopics: ["Research", "Multimodal texts"] }] },
          { year: "Year 9", topics: [{ name: "Language", subtopics: ["Syntax", "Discourse"] }, { name: "Literature", subtopics: ["Literary analysis", "Comparing texts"] }, { name: "Literacy", subtopics: ["Argument", "Digital texts"] }] },
          { year: "Year 10", topics: [{ name: "Language", subtopics: ["Language evolution", "Register & style"] }, { name: "Literature", subtopics: ["Critical theory", "Australian literature"] }, { name: "Literacy", subtopics: ["Extended writing", "Oral presentation"] }] },
        ],
      },
    ],
  },

  // ── NAPLAN ────────────────────────────────────────────────────────────
  {
    id: "naplan",
    label: "NAPLAN",
    subjects: [
      {
        name: "Numeracy",
        years: [
          { year: "Year 3", topics: [{ name: "Number & algebra", subtopics: ["Place value", "Addition & subtraction", "Multiplication & division"] }, { name: "Measurement & geometry", subtopics: ["Length", "Area", "Time"] }, { name: "Statistics & probability", subtopics: ["Graphs & tables", "Chance"] }] },
          { year: "Year 5", topics: [{ name: "Number", subtopics: ["Fractions", "Decimals", "Patterns"] }, { name: "Measurement & geometry", subtopics: ["2D shapes", "3D objects", "Angles"] }, { name: "Statistics", subtopics: ["Data display", "Interpreting graphs"] }] },
          { year: "Year 7", topics: [{ name: "Number & algebra", subtopics: ["Integers", "Fractions & percentages", "Equations"] }, { name: "Measurement & geometry", subtopics: ["Perimeter & area", "Volume", "Transformations"] }, { name: "Statistics & probability", subtopics: ["Data analysis", "Probability"] }] },
          { year: "Year 9", topics: [{ name: "Number", subtopics: ["Rates & ratios", "Financial maths"] }, { name: "Algebra", subtopics: ["Linear equations", "Graphing"] }, { name: "Measurement", subtopics: ["Pythagoras", "Surface area & volume"] }, { name: "Statistics", subtopics: ["Quartiles", "Scatter plots"] }] },
        ],
      },
      {
        name: "Reading",
        years: [
          { year: "Year 3", topics: [{ name: "Comprehension", subtopics: ["Literal comprehension", "Inferential comprehension"] }, { name: "Vocabulary", subtopics: ["Word meaning", "Context clues"] }] },
          { year: "Year 5", topics: [{ name: "Comprehension", subtopics: ["Main idea", "Author's purpose"] }, { name: "Text analysis", subtopics: ["Text structure", "Language features"] }] },
          { year: "Year 7", topics: [{ name: "Comprehension", subtopics: ["Analysis", "Evaluation"] }, { name: "Language", subtopics: ["Figurative language", "Tone"] }] },
          { year: "Year 9", topics: [{ name: "Critical reading", subtopics: ["Argument structure", "Bias & perspective"] }, { name: "Vocabulary", subtopics: ["Academic vocabulary", "Word roots"] }] },
        ],
      },
      {
        name: "Writing",
        years: [
          { year: "Year 3", topics: [{ name: "Narrative writing", subtopics: ["Story structure", "Character & setting"] }, { name: "Persuasive writing", subtopics: ["Opinion statements", "Supporting reasons"] }] },
          { year: "Year 5", topics: [{ name: "Narrative writing", subtopics: ["Plot development", "Descriptive language"] }, { name: "Persuasive writing", subtopics: ["Argument structure", "Persuasive devices"] }] },
          { year: "Year 7", topics: [{ name: "Narrative", subtopics: ["Voice & style", "Suspense techniques"] }, { name: "Persuasive", subtopics: ["Logical argument", "Counter-arguments"] }] },
          { year: "Year 9", topics: [{ name: "Narrative", subtopics: ["Complex narrative structure", "Figurative writing"] }, { name: "Persuasive", subtopics: ["Sophisticated argument", "Rhetorical techniques"] }] },
        ],
      },
      {
        name: "Language Conventions",
        years: [
          { year: "Year 3", topics: [{ name: "Spelling", subtopics: ["Common words", "Phonics patterns"] }, { name: "Grammar & punctuation", subtopics: ["Sentences", "Basic punctuation"] }] },
          { year: "Year 5", topics: [{ name: "Spelling", subtopics: ["Word families", "Prefixes & suffixes"] }, { name: "Grammar", subtopics: ["Tense", "Parts of speech"] }] },
          { year: "Year 7", topics: [{ name: "Spelling", subtopics: ["Complex words", "Homophones"] }, { name: "Grammar", subtopics: ["Clauses", "Pronoun agreement"] }] },
          { year: "Year 9", topics: [{ name: "Spelling", subtopics: ["Sophisticated vocabulary", "Word origins"] }, { name: "Grammar", subtopics: ["Complex sentences", "Style & register"] }] },
        ],
      },
    ],
  },

  // ── VCE ──────────────────────────────────────────────────────────────
  {
    id: "vce",
    label: "VCE",
    subjects: [
      {
        name: "Mathematics",
        years: [
          {
            year: "Further Mathematics",
            topics: [
              { name: "Data analysis", subtopics: ["Univariate data", "Bivariate data", "Time series"] },
              { name: "Recursion & financial modelling", subtopics: ["Arithmetic sequences", "Geometric sequences", "Loans & annuities"] },
              { name: "Geometry & measurement", subtopics: ["Pythagoras & trigonometry", "Surface area & volume", "Similarity"] },
              { name: "Graphs & relations", subtopics: ["Sketching graphs", "Interpreting graphs", "Relations & inequalities"] },
            ],
          },
          {
            year: "Mathematical Methods",
            topics: [
              { name: "Functions & graphs", subtopics: ["Polynomial functions", "Exponential & logarithmic", "Trigonometric functions"] },
              { name: "Calculus", subtopics: ["Differentiation", "Integration", "Applications of calculus"] },
              { name: "Probability & statistics", subtopics: ["Discrete distributions", "Continuous distributions", "Inference"] },
              { name: "Algebra", subtopics: ["Transformations", "Inverse functions", "Composition of functions"] },
            ],
          },
          {
            year: "Specialist Mathematics",
            topics: [
              { name: "Complex numbers", subtopics: ["Argand diagram", "Polar form", "De Moivre's theorem"] },
              { name: "Vectors", subtopics: ["Vector operations", "Scalar & vector products", "Applications"] },
              { name: "Mechanics", subtopics: ["Forces & Newton's laws", "Projectile motion", "Work & energy"] },
              { name: "Advanced calculus", subtopics: ["Differential equations", "Integration techniques", "Series"] },
            ],
          },
        ],
      },
      {
        name: "Science",
        years: [
          {
            year: "Chemistry",
            topics: [
              { name: "Atomic theory & periodicity", subtopics: ["Electron configuration", "Periodic trends", "Chemical bonding"] },
              { name: "Chemical reactions", subtopics: ["Stoichiometry", "Equilibrium", "Redox reactions"] },
              { name: "Carbon chemistry", subtopics: ["Functional groups", "Polymers", "Fuels"] },
            ],
          },
          {
            year: "Biology",
            topics: [
              { name: "Cells", subtopics: ["Cell theory", "Cellular respiration", "Photosynthesis"] },
              { name: "Genetics", subtopics: ["Mendelian genetics", "DNA & protein synthesis", "Biotechnology"] },
              { name: "Evolution", subtopics: ["Natural selection", "Phylogeny", "Human evolution"] },
            ],
          },
          {
            year: "Physics",
            topics: [
              { name: "Motion & forces", subtopics: ["Kinematics", "Newton's laws", "Momentum"] },
              { name: "Electricity & magnetism", subtopics: ["Electric fields", "Magnetic fields", "Electromagnetic induction"] },
              { name: "Waves", subtopics: ["Wave properties", "Light", "Quantum physics"] },
            ],
          },
        ],
      },
      {
        name: "English",
        years: [
          { year: "Units 1 & 2", topics: [{ name: "Reading & responding", subtopics: ["Text analysis", "Comparative analysis", "Writing about texts"] }, { name: "Creating & presenting", subtopics: ["Writing for audiences", "Oral presentation"] }] },
          { year: "Units 3 & 4", topics: [{ name: "Reading & comparing texts", subtopics: ["Close analysis", "Comparative essay techniques"] }, { name: "Creating & presenting", subtopics: ["Persuasive language", "Argument analysis"] }, { name: "Oral presentation", subtopics: ["Structuring a speech", "Persuasive techniques"] }] },
        ],
      },
    ],
  },

  // ── General ───────────────────────────────────────────────────────────
  {
    id: "general",
    label: "General",
    subjects: [
      {
        name: "Mathematics",
        years: [
          { year: "Primary (K–6)", topics: [{ name: "Number", subtopics: ["Counting", "Addition & subtraction", "Multiplication & division", "Fractions"] }, { name: "Measurement", subtopics: ["Length", "Mass", "Time", "Area"] }, { name: "Geometry", subtopics: ["2D shapes", "3D objects", "Symmetry"] }] },
          { year: "Junior Secondary (7–8)", topics: [{ name: "Number & algebra", subtopics: ["Integers", "Equations", "Patterns"] }, { name: "Geometry & measurement", subtopics: ["Area & perimeter", "Volume", "Angles"] }, { name: "Statistics", subtopics: ["Data", "Averages", "Probability"] }] },
          { year: "Senior Secondary (9–10)", topics: [{ name: "Algebra", subtopics: ["Quadratics", "Functions", "Indices"] }, { name: "Trigonometry", subtopics: ["Right-angle trig", "Sine & cosine rules"] }, { name: "Statistics", subtopics: ["Data analysis", "Distributions"] }] },
        ],
      },
      {
        name: "Science",
        years: [
          { year: "Primary (K–6)", topics: [{ name: "Living things", subtopics: ["Plants & animals", "Life cycles", "Habitats"] }, { name: "Physical world", subtopics: ["Forces & motion", "Light & sound"] }, { name: "Earth & beyond", subtopics: ["Weather", "Day & night"] }] },
          { year: "Junior Secondary (7–8)", topics: [{ name: "Biology", subtopics: ["Cells", "Body systems", "Ecosystems"] }, { name: "Chemistry", subtopics: ["Atoms", "Mixtures", "Reactions"] }, { name: "Physics", subtopics: ["Energy", "Motion", "Waves"] }] },
          { year: "Senior Secondary (9–10)", topics: [{ name: "Biology", subtopics: ["Genetics", "Evolution"] }, { name: "Chemistry", subtopics: ["Bonding", "Acids & bases"] }, { name: "Physics", subtopics: ["Electricity", "Forces"] }] },
        ],
      },
      {
        name: "English",
        years: [
          { year: "Primary (K–6)", topics: [{ name: "Reading", subtopics: ["Phonics", "Comprehension", "Vocabulary"] }, { name: "Writing", subtopics: ["Sentences", "Stories", "Basic essays"] }, { name: "Grammar", subtopics: ["Parts of speech", "Punctuation"] }] },
          { year: "Junior Secondary (7–8)", topics: [{ name: "Comprehension", subtopics: ["Inferential reading", "Evaluating texts"] }, { name: "Writing", subtopics: ["Narrative", "Persuasive", "Analytical"] }, { name: "Grammar", subtopics: ["Clauses", "Tense", "Voice"] }] },
          { year: "Senior Secondary (9–10)", topics: [{ name: "Critical analysis", subtopics: ["Language analysis", "Literary devices"] }, { name: "Extended writing", subtopics: ["Essay structure", "Research writing"] }, { name: "Oral", subtopics: ["Presentation skills", "Debate"] }] },
        ],
      },
    ],
  },
];

// ── Helper functions ───────────────────────────────────────────────────────

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find(c => c.id === id);
}

export function getSubjects(curriculumId: string): string[] {
  return getCurriculum(curriculumId)?.subjects.map(s => s.name) ?? [];
}

export function getYears(curriculumId: string, subject: string): string[] {
  return getCurriculum(curriculumId)?.subjects
    .find(s => s.name === subject)?.years
    .map(y => y.year) ?? [];
}

export function getTopics(curriculumId: string, subject: string, year: string): CurriculumTopic[] {
  const subjectData = getCurriculum(curriculumId)?.subjects.find(s => s.name === subject);
  if (!subjectData) return [];

  const yearTopics = subjectData.years.find(y => y.year === year)?.topics;
  if (yearTopics && yearTopics.length > 0) {
    return yearTopics;
  }

  // If the selected year isn't defined for this subject, fall back to all topics across the subject.
  const allTopics = subjectData.years.flatMap(y => y.topics);
  const uniqueTopics: CurriculumTopic[] = [];
  const seen = new Set<string>();

  allTopics.forEach((topic) => {
    if (!seen.has(topic.name)) {
      seen.add(topic.name);
      uniqueTopics.push(topic);
    }
  });

  return uniqueTopics;
}

export function getSubtopics(curriculumId: string, subject: string, year: string, topic: string): string[] {
  const topics = getTopics(curriculumId, subject, year);
  return topics.find(t => t.name === topic)?.subtopics ?? [];
}

// All Australian school year levels — used by the AI generator dropdown
export const ALL_YEARS = [
  // Early childhood / Foundation
  "Kindergarten / Pre-K",
  "Foundation (Prep)",
  // Primary
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  // Junior Secondary
  "Year 7", "Year 8", "Year 9", "Year 10",
  // Senior Secondary
  "Year 11", "Year 12",
  // VCE units
  "VCE Unit 1/2", "VCE Unit 3/4",
  // VCE subjects
  "Further Mathematics", "Mathematical Methods", "Specialist Mathematics",
  "VCE Chemistry", "VCE Biology", "VCE Physics",
  "VCE English", "VCE English Language",
  // NAPLAN
  "NAPLAN Year 3", "NAPLAN Year 5", "NAPLAN Year 7", "NAPLAN Year 9",
  // International / other
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
] as const;

export const DIFFICULTY_LEVELS = ["Support", "Core", "Extension"] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

export const QUESTION_FORMATS = ["Mixed", "Multiple Choice", "Short Answer", "Extended Response", "True/False"] as const;
export type QuestionFormat = typeof QUESTION_FORMATS[number];

export const CONTEXTS = ["Real-life", "Abstract", "Exam-style", "Problem-solving", "Worded problems"] as const;
export type QuestionContext = typeof CONTEXTS[number];

export const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50] as const;
