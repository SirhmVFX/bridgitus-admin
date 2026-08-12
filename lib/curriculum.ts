// ── Curriculum data shared by admin and student portal ────────────────────
// Structure: curriculum → year level → subjects → topics → subtopics
// Sources: Victorian Curriculum F–10 v2.0 (victoriancurriculum.vcaa.vic.edu.au)
//          Australian Curriculum v9 (australiancurriculum.edu.au)
// Subjects covered: Mathematics, English, Science (F–10), Biology & Chemistry (Years 11–12)

export interface CurriculumTopic {
  name: string;
  subtopics?: string[];
}

export interface CurriculumSubjectEntry {
  name: string;
  topics: CurriculumTopic[];
}

export interface CurriculumYearLevel {
  year: string;            // e.g. "Foundation", "Year 7", "Year 11"
  subjects: CurriculumSubjectEntry[];
}

export interface Curriculum {
  id: string;
  label: string;
  yearLevels: CurriculumYearLevel[];
}

// ──────────────────────────────────────────────────────────────────────────
// F–10 TOPIC DATA (shared between Victorian Curriculum 2.0 and Australian
// Curriculum v9 — VC 2.0 is closely aligned with AC v9 content descriptions)
// ──────────────────────────────────────────────────────────────────────────

const MATHS_F10: Record<string, CurriculumTopic[]> = {
  "Foundation": [
    { name: "Number names and counting", subtopics: ["Counting to 20 and beyond", "Subitising small collections", "Connecting number names, numerals and quantities"] },
    { name: "Comparing and ordering numbers", subtopics: ["More, less and the same", "Ordering collections", "First, second, third (ordinal numbers)"] },
    { name: "Partitioning and combining", subtopics: ["Making groups", "Sharing collections equally", "Simple addition stories"] },
    { name: "Patterns", subtopics: ["Copying and continuing patterns", "Creating repeating patterns", "Describing patterns"] },
    { name: "Measurement comparisons", subtopics: ["Longer & shorter", "Heavier & lighter", "Holds more & holds less"] },
    { name: "Time and days", subtopics: ["Days of the week", "Sequencing daily events", "Duration — longer or shorter"] },
    { name: "Shapes and objects", subtopics: ["Familiar 2D shapes", "Familiar 3D objects", "Sorting shapes by features"] },
    { name: "Position and location", subtopics: ["Above, below, next to", "Inside and outside", "Following directions"] },
  ],
  "Year 1": [
    { name: "Place value to 120", subtopics: ["Counting forwards & backwards", "Tens and ones", "Reading & writing two-digit numbers"] },
    { name: "Addition and subtraction", subtopics: ["Combining and separating collections", "Counting on strategies", "Number bonds to 10 and 20"] },
    { name: "Sharing and grouping", subtopics: ["Equal groups", "Sharing collections equally", "Skip counting by 2s, 5s and 10s"] },
    { name: "Halves", subtopics: ["Half of a shape", "Half of a collection", "Fair shares"] },
    { name: "Money", subtopics: ["Australian coins", "Ordering coins by value"] },
    { name: "Measurement with informal units", subtopics: ["Measuring length", "Measuring mass", "Measuring capacity"] },
    { name: "Time", subtopics: ["O'clock and half-past", "Months and seasons", "Duration of events"] },
    { name: "Shapes and objects", subtopics: ["Describing 2D shapes", "Describing 3D objects", "Making shapes and objects"] },
    { name: "Position and giving directions", subtopics: ["Left and right", "Describing position", "Following and giving directions"] },
    { name: "Data", subtopics: ["Collecting data by asking questions", "Simple picture displays", "Answering questions from data"] },
  ],
  "Year 2": [
    { name: "Place value to 1000", subtopics: ["Hundreds, tens and ones", "Comparing & ordering three-digit numbers", "Counting by 10s and 100s"] },
    { name: "Addition and subtraction strategies", subtopics: ["Partitioning numbers", "Fact families", "Adding and subtracting two-digit numbers"] },
    { name: "Multiplication and division concepts", subtopics: ["Equal groups and arrays", "Repeated addition", "Sharing and grouping problems"] },
    { name: "Fractions", subtopics: ["Halves, quarters and eighths", "Fractions of shapes", "Fractions of collections"] },
    { name: "Money", subtopics: ["Counting collections of coins", "Notes and their values", "Simple purchases"] },
    { name: "Measurement with uniform units", subtopics: ["Length in centimetres and metres", "Mass comparisons", "Capacity with informal units"] },
    { name: "Time", subtopics: ["Quarter past and quarter to", "Reading calendars", "Duration in hours and minutes"] },
    { name: "Shapes and transformations", subtopics: ["Features of 2D shapes", "Features of 3D objects", "Flips, slides and turns"] },
    { name: "Data and chance", subtopics: ["Collecting and recording data", "Picture graphs and tally marks", "Likely, unlikely, certain, impossible"] },
  ],
  "Year 3": [
    { name: "Place value to 10 000", subtopics: ["Reading & writing four-digit numbers", "Comparing and ordering", "Rounding to the nearest 10 and 100"] },
    { name: "Addition and subtraction", subtopics: ["Mental strategies", "Written algorithms", "Estimation and checking"] },
    { name: "Multiplication and division", subtopics: ["Facts for 2, 3, 4, 5 and 10", "Multiplication and division as inverse operations", "Word problems"] },
    { name: "Fractions", subtopics: ["Unit fractions (½, ⅓, ¼, ⅕, ⅒)", "Fractions on a number line", "Comparing unit fractions"] },
    { name: "Money and financial mathematics", subtopics: ["Making amounts with notes and coins", "Calculating change", "Simple budgets"] },
    { name: "Measurement", subtopics: ["Length in metres, cm and mm", "Mass in kilograms and grams", "Capacity in litres and millilitres"] },
    { name: "Time", subtopics: ["Telling time to the minute", "am and pm", "Converting between units of time"] },
    { name: "Angles and shapes", subtopics: ["Angles as measures of turn", "Comparing angles with right angles", "2D shapes and 3D objects"] },
    { name: "Data and chance", subtopics: ["Surveys and data collection", "Column graphs and picture graphs", "Describing chance events"] },
  ],
  "Year 4": [
    { name: "Place value and number", subtopics: ["Numbers beyond 10 000", "Odd and even numbers", "Rounding and estimating"] },
    { name: "Addition and subtraction", subtopics: ["Efficient mental strategies", "Written algorithms with larger numbers", "Solving multi-step problems"] },
    { name: "Multiplication and division", subtopics: ["Times tables to 10 × 10", "Multiplying by tens", "Division with remainders"] },
    { name: "Fractions and decimals", subtopics: ["Equivalent fractions", "Counting by fractions", "Decimals to hundredths and connection to fractions"] },
    { name: "Money and financial mathematics", subtopics: ["Purchases and change", "Comparing costs", "Planning simple budgets"] },
    { name: "Measurement", subtopics: ["Perimeter of rectangles", "Area with square units", "Volume and capacity"] },
    { name: "Time", subtopics: ["Converting units of time", "am/pm and 24-hour time introduction", "Timetables"] },
    { name: "Angles, shapes and symmetry", subtopics: ["Comparing angle sizes", "Properties of shapes", "Line and rotational symmetry"] },
    { name: "Data and chance", subtopics: ["Many-to-one data displays", "Interpreting graphs", "Ordering chance events"] },
  ],
  "Year 5": [
    { name: "Place value and number", subtopics: ["Numbers to millions", "Factors and multiples", "Estimation and rounding strategies"] },
    { name: "Operations with whole numbers", subtopics: ["Multiplying large numbers", "Division strategies", "Order of operations introduction"] },
    { name: "Fractions", subtopics: ["Comparing and ordering fractions", "Adding & subtracting fractions with the same denominator", "Fractions of quantities"] },
    { name: "Decimals and percentages", subtopics: ["Decimals to thousandths", "Multiplying & dividing decimals by powers of 10", "Connecting fractions, decimals and percentages"] },
    { name: "Financial mathematics", subtopics: ["Creating financial plans", "Budgeting", "Best buys"] },
    { name: "Measurement", subtopics: ["Perimeter and area of rectangles", "Choosing appropriate units", "12- and 24-hour time"] },
    { name: "Shape and transformations", subtopics: ["Nets of 3D objects", "Translations, reflections and rotations", "Enlargements"] },
    { name: "Location", subtopics: ["Grid references", "Describing routes and directions", "Using simple maps and scales"] },
    { name: "Data and probability", subtopics: ["Line graphs and dot plots", "Comparing data displays", "Probabilities from 0 to 1"] },
  ],
  "Year 6": [
    { name: "Integers", subtopics: ["Positive and negative numbers in context", "Ordering integers", "Integers on a number line"] },
    { name: "Prime, composite and square numbers", subtopics: ["Prime and composite numbers", "Square and triangular numbers", "Factor trees"] },
    { name: "Fractions", subtopics: ["Adding & subtracting fractions with related denominators", "Fractions of quantities", "Multiplying fractions by whole numbers"] },
    { name: "Decimals and percentages", subtopics: ["All four operations with decimals", "Percentage discounts", "Connecting fractions, decimals and percentages"] },
    { name: "Financial mathematics", subtopics: ["Percentage discounts and sales", "Comparing purchases", "Simple financial decisions"] },
    { name: "Measurement", subtopics: ["Converting metric units", "Area of rectangles and triangles", "Volume of rectangular prisms"] },
    { name: "Angles and geometry", subtopics: ["Angles on a straight line", "Vertically opposite angles", "Finding unknown angles"] },
    { name: "The Cartesian plane", subtopics: ["Plotting points in four quadrants", "Reading coordinates", "Simple transformations on the plane"] },
    { name: "Data and probability", subtopics: ["Interpreting secondary data", "Side-by-side column graphs", "Probability with frequencies and expected outcomes"] },
  ],
  "Year 7": [
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
  "Year 8": [
    { name: "Number", subtopics: ["Index notation", "Scientific notation", "Square & cube roots"] },
    { name: "Financial mathematics", subtopics: ["Percentages & discounts", "Profit & loss", "Simple interest"] },
    { name: "Algebra", subtopics: ["Expanding brackets", "Factorising", "Linear equations"] },
    { name: "Geometry", subtopics: ["Congruent triangles", "Pythagoras theorem", "Circle properties"] },
    { name: "Measurement", subtopics: ["Area of composite shapes", "Surface area", "Volume of prisms & cylinders"] },
    { name: "Statistics", subtopics: ["Stem-and-leaf plots", "Box plots", "Scatter plots"] },
    { name: "Probability", subtopics: ["Theoretical vs experimental", "Venn diagrams", "Two-step experiments"] },
  ],
  "Year 9": [
    { name: "Number and algebra", subtopics: ["Surds", "Index laws", "Factorising quadratics"] },
    { name: "Linear and non-linear relationships", subtopics: ["Simultaneous equations", "Quadratic graphs", "Circles & hyperbolas"] },
    { name: "Trigonometry", subtopics: ["SOHCAHTOA", "Finding angles", "Applications"] },
    { name: "Measurement and geometry", subtopics: ["Similar figures", "Surface area of spheres & cones", "Volume of composite solids"] },
    { name: "Statistics", subtopics: ["Bivariate data", "Lines of best fit", "Standard deviation"] },
  ],
  "Year 10": [
    { name: "Algebra", subtopics: ["Quadratic equations", "Completing the square", "Discriminant"] },
    { name: "Functions", subtopics: ["Domain & range", "Function notation", "Inverse functions"] },
    { name: "Trigonometry", subtopics: ["Sine & cosine rules", "Bearings", "Exact values"] },
    { name: "Statistics and probability", subtopics: ["Conditional probability", "Combinations & permutations", "Normal distribution"] },
    { name: "Financial mathematics", subtopics: ["Compound interest", "Depreciation", "Annuities"] },
  ],
};

const ENGLISH_F10: Record<string, CurriculumTopic[]> = {
  "Foundation": [
    { name: "Phonics and word knowledge", subtopics: ["Letter–sound relationships", "Blending sounds to read words", "High-frequency words"] },
    { name: "Concepts of print", subtopics: ["Reading left to right", "Words, spaces and sentences", "Book features (cover, title, author)"] },
    { name: "Listening and speaking", subtopics: ["Listening to stories", "Sharing ideas in a group", "Asking and answering questions"] },
    { name: "Responding to literature", subtopics: ["Retelling familiar stories", "Favourite characters and events", "Rhymes and songs"] },
    { name: "Early writing", subtopics: ["Forming letters", "Writing own name and simple words", "Drawing and labelling"] },
  ],
  "Year 1": [
    { name: "Phonics and spelling", subtopics: ["Digraphs and blends", "Short and long vowel sounds", "Spelling common words"] },
    { name: "Sentence structure", subtopics: ["Capital letters and full stops", "Simple sentences", "Joining ideas with 'and'"] },
    { name: "Reading fluency and comprehension", subtopics: ["Reading with expression", "Recalling key events", "Making predictions"] },
    { name: "Writing simple texts", subtopics: ["Recounts of events", "Simple narratives", "Labels and captions"] },
    { name: "Responding to literature", subtopics: ["Characters and settings", "Expressing preferences", "Comparing stories"] },
  ],
  "Year 2": [
    { name: "Spelling patterns", subtopics: ["Vowel teams", "Common suffixes (-ing, -ed, -s)", "Compound words"] },
    { name: "Grammar", subtopics: ["Nouns, verbs and adjectives", "Question marks and exclamation marks", "Past and present tense"] },
    { name: "Reading comprehension", subtopics: ["Literal and inferred meaning", "Sequencing events", "Main idea of a text"] },
    { name: "Writing", subtopics: ["Narratives with beginning, middle and end", "Informative texts", "Editing simple sentences"] },
    { name: "Literature", subtopics: ["Features of stories and poems", "Rhythm and rhyme", "Discussing authors' choices"] },
  ],
  "Year 3": [
    { name: "Spelling and vocabulary", subtopics: ["Spelling rules and generalisations", "Prefixes and suffixes", "Word families"] },
    { name: "Grammar", subtopics: ["Simple and compound sentences", "Paragraphing", "Tense consistency"] },
    { name: "Reading comprehension", subtopics: ["Main idea and supporting details", "Making inferences", "Text features (headings, diagrams)"] },
    { name: "Writing", subtopics: ["Narrative structure", "Persuasive texts with reasons", "Informative reports"] },
    { name: "Literature", subtopics: ["Character feelings and motives", "Comparing texts", "Language devices in poetry"] },
  ],
  "Year 4": [
    { name: "Vocabulary and spelling", subtopics: ["Homophones", "Word origins", "Spelling strategies for longer words"] },
    { name: "Grammar", subtopics: ["Complex sentences with conjunctions", "Quoted and reported speech", "Adverbial phrases"] },
    { name: "Reading comprehension", subtopics: ["Summarising", "Author's purpose", "Comparing information across texts"] },
    { name: "Writing", subtopics: ["Narratives with dialogue", "Persuasive arguments", "Procedural texts"] },
    { name: "Literature and poetry", subtopics: ["Similes and metaphors", "Imagery", "Responding to novels"] },
  ],
  "Year 5": [
    { name: "Language devices", subtopics: ["Figurative language", "Emotive language", "Modality (must, might, should)"] },
    { name: "Grammar and cohesion", subtopics: ["Clauses and phrases", "Cohesive devices", "Punctuation for effect"] },
    { name: "Reading and analysis", subtopics: ["Analysing characters and themes", "Fact vs opinion", "Point of view"] },
    { name: "Writing", subtopics: ["Structured essays", "Information reports", "Narrative voice and description"] },
    { name: "Media and multimodal texts", subtopics: ["Interpreting images and layout", "Advertising techniques", "Digital texts"] },
  ],
  "Year 6": [
    { name: "Text structure and cohesion", subtopics: ["Paragraph organisation", "Topic sentences", "Connectives and text flow"] },
    { name: "Reading and evaluation", subtopics: ["Evaluating arguments and evidence", "Identifying bias", "Synthesising information from several texts"] },
    { name: "Writing", subtopics: ["Persuasive essays", "Informative and explanatory texts", "Editing and refining writing"] },
    { name: "Literature", subtopics: ["Themes and messages", "Comparing authors' styles", "Historical and cultural contexts of texts"] },
    { name: "Speaking and listening", subtopics: ["Planned oral presentations", "Debating basics", "Active listening and feedback"] },
  ],
  "Year 7": [
    { name: "Reading and comprehension", subtopics: ["Main idea & supporting details", "Inference & prediction", "Vocabulary in context"] },
    { name: "Grammar and language", subtopics: ["Nouns, verbs & adjectives", "Sentence types", "Punctuation"] },
    { name: "Writing", subtopics: ["Narrative writing", "Persuasive writing", "Informative writing"] },
    { name: "Literature analysis", subtopics: ["Character analysis", "Theme identification", "Author's purpose"] },
  ],
  "Year 8": [
    { name: "Comprehension", subtopics: ["Skimming & scanning", "Identifying bias", "Comparing texts"] },
    { name: "Grammar", subtopics: ["Clauses & phrases", "Tense consistency", "Active & passive voice"] },
    { name: "Writing", subtopics: ["Analytical writing", "Descriptive writing", "Editing & proofreading"] },
    { name: "Media and multimodal texts", subtopics: ["Visual literacy", "Film techniques", "Advertising language"] },
  ],
  "Year 9": [
    { name: "Close reading", subtopics: ["Connotation & denotation", "Figurative language", "Tone & mood"] },
    { name: "Writing", subtopics: ["Argumentative essays", "Feature articles", "Speeches"] },
    { name: "Literature", subtopics: ["Shakespearean language", "Novel study techniques", "Poetic devices"] },
  ],
  "Year 10": [
    { name: "Critical analysis", subtopics: ["Discourse analysis", "Ideological perspectives", "Intertextuality"] },
    { name: "Extended writing", subtopics: ["Formal essays", "Creative writing portfolio", "Research reports"] },
    { name: "Oral communication", subtopics: ["Debate skills", "Formal presentation", "Listening strategies"] },
  ],
};

const SCIENCE_F10: Record<string, CurriculumTopic[]> = {
  "Foundation": [
    { name: "Living things and their needs", subtopics: ["Needs of plants and animals", "Living vs non-living things", "Caring for living things"] },
    { name: "Materials and their properties", subtopics: ["Describing everyday materials", "Sorting objects by material", "Choosing materials for a purpose"] },
    { name: "Weather and daily changes", subtopics: ["Observing daily weather", "Seasons", "How weather affects us"] },
    { name: "Movement", subtopics: ["How objects move", "Pushing and pulling", "Movement of toys"] },
  ],
  "Year 1": [
    { name: "Living things and habitats", subtopics: ["External features of plants and animals", "Habitats and survival needs", "Grouping living things"] },
    { name: "Everyday materials", subtopics: ["Physical properties of materials", "Changing materials by bending, twisting and stretching", "Uses of different materials"] },
    { name: "Light and sound", subtopics: ["Sources of light", "Sources of sound", "How light and sound are sensed"] },
    { name: "Changes in the sky and landscape", subtopics: ["Day and night sky", "Changes in the landscape", "Observable changes over time"] },
  ],
  "Year 2": [
    { name: "Growth and life stages", subtopics: ["Life stages of animals", "Plants grow from seeds", "Growth and change in living things"] },
    { name: "Combining materials", subtopics: ["Mixing materials", "Combining materials for a purpose", "Changes when materials are combined"] },
    { name: "Pushes and pulls", subtopics: ["Forces on objects", "Making objects move faster or slower", "Friction in everyday life"] },
    { name: "Water and Earth's resources", subtopics: ["Where water comes from", "Uses of water", "Conserving Earth's resources"] },
  ],
  "Year 3": [
    { name: "Living and non-living things", subtopics: ["Characteristics of living things", "Classifying living and non-living", "Once-living things"] },
    { name: "Solids and liquids", subtopics: ["States of matter", "Melting and freezing", "Changing states by heating and cooling"] },
    { name: "Heat energy", subtopics: ["Sources of heat", "How heat moves", "Conductors and insulators"] },
    { name: "Earth's rotation", subtopics: ["Day and night", "The Sun, Earth and Moon", "Shadows and their movement"] },
  ],
  "Year 4": [
    { name: "Living things and their relationships", subtopics: ["Life cycles", "Food chains", "Living things depend on each other"] },
    { name: "Properties and uses of materials", subtopics: ["Natural and processed materials", "Testing material properties", "Choosing materials for products"] },
    { name: "Forces and friction", subtopics: ["Contact and non-contact forces", "Friction on different surfaces", "Forces in action"] },
    { name: "Earth's surface changes", subtopics: ["Weathering and erosion", "Soil formation", "Human impact on the landscape"] },
  ],
  "Year 5": [
    { name: "Adaptations", subtopics: ["Structural adaptations", "Behavioural adaptations", "Surviving in harsh environments"] },
    { name: "Solids, liquids and gases", subtopics: ["Properties of the three states", "Evaporation and condensation", "Particle model introduction"] },
    { name: "Light", subtopics: ["How light travels", "Reflection and refraction", "Shadows and transparency"] },
    { name: "The solar system", subtopics: ["Planets and their features", "Earth's place in the solar system", "Rotation and orbits"] },
  ],
  "Year 6": [
    { name: "Survival and the environment", subtopics: ["How environmental change affects living things", "Physical conditions for growth", "Interdependence in ecosystems"] },
    { name: "Reversible and irreversible changes", subtopics: ["Physical changes", "Chemical changes (burning, rusting)", "Identifying types of change"] },
    { name: "Electricity and energy", subtopics: ["Simple circuits", "Energy sources", "Conductors and insulators"] },
    { name: "Natural events and Earth changes", subtopics: ["Earthquakes and volcanoes", "Extreme weather", "Sudden geological changes"] },
  ],
  "Year 7": [
    { name: "Cells and living things", subtopics: ["Cell structure", "Plant vs animal cells", "Specialised cells"] },
    { name: "Classification of organisms", subtopics: ["Classification systems", "Using dichotomous keys", "Food chains & food webs"] },
    { name: "Mixtures and substances", subtopics: ["Pure substances & mixtures", "Separation techniques", "Physical & chemical changes"] },
    { name: "Forces and energy", subtopics: ["Contact & non-contact forces", "Gravity", "Energy forms & transfers"] },
    { name: "Earth and space", subtopics: ["Solar system", "Moon phases", "Rock cycle & water cycle"] },
  ],
  "Year 8": [
    { name: "Body systems", subtopics: ["Digestive system", "Circulatory system", "Nervous system"] },
    { name: "Chemical reactions", subtopics: ["Atoms & elements", "Compounds & molecules", "Chemical equations"] },
    { name: "Motion and waves", subtopics: ["Speed & acceleration", "Sound waves", "Light & reflection"] },
    { name: "Ecosystems", subtopics: ["Food webs", "Biotic & abiotic factors", "Human impact"] },
  ],
  "Year 9": [
    { name: "Genetics", subtopics: ["DNA & chromosomes", "Inheritance patterns", "Mutations"] },
    { name: "Chemical reactions and the periodic table", subtopics: ["Periodic table", "Chemical bonding", "Acids & bases"] },
    { name: "Electricity", subtopics: ["Circuits", "Ohm's law", "Electromagnetic induction"] },
    { name: "Body coordination", subtopics: ["Nervous and endocrine systems", "Homeostasis", "Responding to stimuli"] },
    { name: "Space science", subtopics: ["Stars & stellar evolution", "Galaxies", "Big Bang theory"] },
  ],
  "Year 10": [
    { name: "Evolution", subtopics: ["Natural selection", "Evidence for evolution", "Speciation"] },
    { name: "Genetics and DNA", subtopics: ["DNA structure", "Genes and inheritance", "Genetic technologies"] },
    { name: "Atomic theory and chemical reactions", subtopics: ["Atomic models", "Reaction rates", "Radioactivity & nuclear reactions"] },
    { name: "Motion and forces", subtopics: ["Newton's laws", "Motion graphs", "Energy transformations"] },
    { name: "Global systems", subtopics: ["Climate science", "Carbon cycle", "Human impact on Earth"] },
  ],
};

// ── Senior secondary (Years 11–12) ────────────────────────────────────────

const SENIOR_MATHS_11: CurriculumTopic[] = [
  { name: "Functions and graphs", subtopics: ["Polynomial functions", "Exponential & logarithmic functions", "Transformations of graphs"] },
  { name: "Algebra", subtopics: ["Indices and logarithm laws", "Solving equations", "Inverse functions"] },
  { name: "Trigonometric functions", subtopics: ["Radian measure", "Graphs of sin, cos and tan", "Solving trigonometric equations"] },
  { name: "Rates of change and calculus introduction", subtopics: ["Average and instantaneous rates of change", "The derivative", "Differentiation of polynomials"] },
  { name: "Probability and counting", subtopics: ["Combinatorics", "Conditional probability", "Discrete random variables introduction"] },
  { name: "Data analysis", subtopics: ["Univariate data", "Bivariate data & correlation", "Time series"] },
  { name: "Financial mathematics", subtopics: ["Arithmetic & geometric sequences", "Compound interest", "Loans, annuities & recurrence relations"] },
];

const SENIOR_MATHS_12: CurriculumTopic[] = [
  { name: "Differential calculus", subtopics: ["Differentiation rules (chain, product, quotient)", "Applications of differentiation", "Curve sketching and optimisation"] },
  { name: "Integral calculus", subtopics: ["Antidifferentiation", "The definite integral and areas", "Applications of integration"] },
  { name: "Functions and their composition", subtopics: ["Composite functions", "Inverse functions", "Modelling with functions"] },
  { name: "Probability and statistics", subtopics: ["Discrete distributions (binomial)", "Continuous distributions (normal)", "Statistical inference & confidence intervals"] },
  { name: "Data analysis and modelling", subtopics: ["Regression analysis", "Residuals & transformations", "Time series forecasting"] },
  { name: "Financial modelling", subtopics: ["Reducing balance loans", "Annuities & perpetuities", "Recurrence relations for finance"] },
];

const SENIOR_ENGLISH_11: CurriculumTopic[] = [
  { name: "Reading and exploring texts", subtopics: ["Personal responses to texts", "Character, setting and theme analysis", "Textual evidence in writing"] },
  { name: "Crafting texts", subtopics: ["Writing for different audiences and purposes", "Experimenting with vocabulary and style", "Drafting and refining"] },
  { name: "Analysing argument", subtopics: ["Identifying arguments and intention", "Persuasive language techniques", "Analysing visuals in persuasion"] },
  { name: "Oral communication", subtopics: ["Point of view presentations", "Structuring a speech", "Engaging an audience"] },
];

const SENIOR_ENGLISH_12: CurriculumTopic[] = [
  { name: "Reading and responding to texts", subtopics: ["Close textual analysis", "Views and values of authors", "Analytical essay writing"] },
  { name: "Comparing texts", subtopics: ["Comparing themes and ideas", "Comparative essay structure", "Meaningful connections between texts"] },
  { name: "Analysing argument and media", subtopics: ["Analysing persuasive texts", "Comparing arguments across texts", "Language and visual analysis"] },
  { name: "Constructing argument", subtopics: ["Developing a sustained point of view", "Oral presentation of argument", "Rebuttal and persuasive strategies"] },
];

const BIOLOGY_11: CurriculumTopic[] = [
  { name: "Cell structure and function", subtopics: ["Prokaryotic vs eukaryotic cells", "Organelles and their functions", "The plasma membrane and transport (diffusion, osmosis, active transport)"] },
  { name: "The cell cycle", subtopics: ["Binary fission and mitosis", "Stem cells and differentiation", "Apoptosis and cell cycle regulation"] },
  { name: "How organisms function", subtopics: ["Requirements of cells", "Digestive, circulatory and excretory systems", "Vascular systems in plants"] },
  { name: "Regulation of systems", subtopics: ["Homeostasis", "Feedback loops", "Temperature, water and glucose regulation"] },
  { name: "Reproduction", subtopics: ["Asexual vs sexual reproduction", "Meiosis", "Reproductive strategies and cloning"] },
  { name: "Inheritance", subtopics: ["DNA, genes and chromosomes", "Genotype and phenotype", "Pedigree analysis and inheritance patterns"] },
  { name: "Adaptations and diversity", subtopics: ["Structural, physiological and behavioural adaptations", "Survival through adaptation", "Biodiversity and classification"] },
  { name: "Ecosystem dynamics", subtopics: ["Relationships between organisms", "Population dynamics", "Keystone species and ecological interactions"] },
];

const BIOLOGY_12: CurriculumTopic[] = [
  { name: "Nucleic acids and proteins", subtopics: ["DNA and RNA structure", "Gene expression (transcription & translation)", "Gene regulation", "The proteome"] },
  { name: "DNA manipulation", subtopics: ["Enzymes for DNA manipulation (CRISPR-Cas9, restriction enzymes)", "Genetic transformation", "DNA profiling & PCR"] },
  { name: "Enzymes and biochemical pathways", subtopics: ["Enzyme structure and function", "Factors affecting enzyme activity", "Coenzymes and inhibitors"] },
  { name: "Photosynthesis and cellular respiration", subtopics: ["Light-dependent & light-independent reactions", "Glycolysis, Krebs cycle & electron transport", "Anaerobic fermentation", "Biotechnology applications"] },
  { name: "Immunity and disease", subtopics: ["Innate immune response", "Adaptive immune response", "Vaccination and immunotherapy", "Pathogens and antigens"] },
  { name: "Genetic change and evolution", subtopics: ["Mutations", "Natural selection and selection pressures", "Gene pools and allele frequencies", "Speciation"] },
  { name: "Evidence for evolution", subtopics: ["Fossil record", "Molecular homology", "Comparative anatomy", "Human evolution"] },
];

const CHEMISTRY_11: CurriculumTopic[] = [
  { name: "Atomic structure and the periodic table", subtopics: ["Atomic structure and isotopes", "Electron configuration", "Periodic trends", "Critical elements"] },
  { name: "Chemical bonding", subtopics: ["Ionic bonding", "Covalent bonding & molecular shapes", "Metallic bonding", "Intermolecular forces"] },
  { name: "Materials", subtopics: ["Properties of ionic compounds", "Covalent networks & layers", "Polymers", "Nanomaterials"] },
  { name: "Quantifying chemistry", subtopics: ["The mole concept", "Empirical & molecular formulas", "Concentration of solutions", "Stoichiometry"] },
  { name: "Water and solutions", subtopics: ["Properties of water", "Dissolving and solubility", "Precipitation reactions", "Water analysis"] },
  { name: "Acid–base reactions", subtopics: ["Acids and bases (Brønsted–Lowry)", "pH calculations", "Strong vs weak acids", "Neutralisation"] },
  { name: "Redox reactions", subtopics: ["Oxidation and reduction", "Oxidation numbers", "Half-equations", "Reactivity of metals"] },
];

const CHEMISTRY_12: CurriculumTopic[] = [
  { name: "Fuels and energy", subtopics: ["Fossil fuels & biofuels", "Thermochemical equations", "Energy from combustion", "Calorimetry"] },
  { name: "Rates of reaction", subtopics: ["Collision theory", "Factors affecting rate", "Catalysts", "Energy profile diagrams"] },
  { name: "Chemical equilibrium", subtopics: ["Dynamic equilibrium", "Le Chatelier's principle", "Equilibrium constants (Kc)", "Optimising yield"] },
  { name: "Electrochemistry", subtopics: ["Galvanic cells", "The electrochemical series", "Electrolytic cells", "Fuel cells and batteries"] },
  { name: "Organic chemistry", subtopics: ["Hydrocarbons and functional groups", "IUPAC naming", "Isomers", "Organic reaction pathways"] },
  { name: "Organic analysis", subtopics: ["Chromatography (HPLC)", "Spectroscopy (IR, NMR, mass spectrometry)", "Volumetric analysis", "Combining analytical techniques"] },
  { name: "Food chemistry", subtopics: ["Proteins, carbohydrates and fats", "Enzymes in digestion", "Energy content of food", "Vitamins and denaturation"] },
];

// ──────────────────────────────────────────────────────────────────────────
// NAPLAN (national assessment — Years 3, 5, 7 and 9)
// Domains: Numeracy, Reading, Writing, Language Conventions
// ──────────────────────────────────────────────────────────────────────────

const NAPLAN_NUMERACY: Record<string, CurriculumTopic[]> = {
  "Year 3": [
    { name: "Number and place value", subtopics: ["Reading and ordering numbers", "Addition and subtraction problems", "Multiplication and sharing", "Simple fractions"] },
    { name: "Measurement", subtopics: ["Length, mass and capacity", "Telling time", "Using a calendar", "Money and change"] },
    { name: "Geometry", subtopics: ["2D shapes and 3D objects", "Symmetry", "Position and maps"] },
    { name: "Statistics and probability", subtopics: ["Reading picture graphs and tables", "Chance events"] },
  ],
  "Year 5": [
    { name: "Number and place value", subtopics: ["Numbers to millions", "Multi-step addition and subtraction", "Multiplication and division", "Factors and multiples"] },
    { name: "Fractions and decimals", subtopics: ["Comparing fractions", "Decimals in context", "Fractions of quantities"] },
    { name: "Measurement", subtopics: ["Perimeter and area", "Converting units", "12- and 24-hour time", "Money problems"] },
    { name: "Geometry", subtopics: ["Angles", "Transformations", "Grid references and maps"] },
    { name: "Statistics and probability", subtopics: ["Column and line graphs", "Interpreting data", "Describing probability"] },
  ],
  "Year 7": [
    { name: "Number and algebra", subtopics: ["Integers", "Fractions, decimals and percentages", "Ratios and rates", "Algebraic expressions and simple equations"] },
    { name: "Measurement", subtopics: ["Perimeter, area and volume", "Time calculations", "Scales and maps"] },
    { name: "Geometry", subtopics: ["Angle relationships", "Properties of shapes", "The Cartesian plane"] },
    { name: "Statistics and probability", subtopics: ["Mean, median, mode and range", "Interpreting graphs", "Probability of events"] },
  ],
  "Year 9": [
    { name: "Number and algebra", subtopics: ["Index laws and scientific notation", "Percentages and financial maths", "Linear equations and graphs", "Simple non-linear relationships"] },
    { name: "Measurement", subtopics: ["Area and surface area", "Volume of prisms and cylinders", "Pythagoras' theorem", "Similar figures and scale"] },
    { name: "Geometry", subtopics: ["Congruence and similarity", "Angle reasoning", "Trigonometry basics"] },
    { name: "Statistics and probability", subtopics: ["Comparing data sets", "Box plots and histograms", "Two-step probability experiments"] },
  ],
};

const NAPLAN_READING: Record<string, CurriculumTopic[]> = {
  "Year 3": [
    { name: "Literal comprehension", subtopics: ["Finding directly stated information", "Sequencing events", "Identifying characters and settings"] },
    { name: "Inferential comprehension", subtopics: ["Making simple inferences", "Predicting outcomes", "Identifying feelings and motives"] },
    { name: "Text features", subtopics: ["Titles, headings and captions", "Pictures and diagrams", "Purpose of a text"] },
    { name: "Vocabulary in context", subtopics: ["Meaning of familiar words", "Using context clues"] },
  ],
  "Year 5": [
    { name: "Literal comprehension", subtopics: ["Locating facts and details", "Following instructions in texts", "Summarising main ideas"] },
    { name: "Inferential comprehension", subtopics: ["Inferring meaning", "Cause and effect", "Author's purpose and audience"] },
    { name: "Interpreting texts", subtopics: ["Comparing information across a text", "Narrative structure", "Persuasive techniques"] },
    { name: "Vocabulary in context", subtopics: ["Unfamiliar words from context", "Figurative language basics"] },
  ],
  "Year 7": [
    { name: "Comprehension and interpretation", subtopics: ["Main ideas and supporting detail", "Synthesising information", "Interpreting characters and themes"] },
    { name: "Analysing texts", subtopics: ["Author's purpose and point of view", "Persuasive devices", "Tone and mood"] },
    { name: "Text structures and features", subtopics: ["Narrative, informative and persuasive structures", "Cohesive devices", "Visual elements in texts"] },
    { name: "Vocabulary and language", subtopics: ["Word meaning in context", "Figurative language", "Connotation"] },
  ],
  "Year 9": [
    { name: "Comprehension and interpretation", subtopics: ["Complex inference", "Evaluating arguments and evidence", "Comparing perspectives across texts"] },
    { name: "Analysing texts", subtopics: ["Language techniques and their effect", "Bias and objectivity", "Themes and issues"] },
    { name: "Text structures and features", subtopics: ["Structural choices and their purpose", "Cohesion in complex texts", "Multimodal texts"] },
    { name: "Vocabulary and language", subtopics: ["Nuances of word choice", "Idiomatic and figurative language", "Technical vocabulary"] },
  ],
};

const NAPLAN_WRITING: Record<string, CurriculumTopic[]> = {
  "Year 3": [
    { name: "Narrative writing", subtopics: ["Orientation, complication and resolution", "Character and setting", "Simple and compound sentences"] },
    { name: "Persuasive writing", subtopics: ["Stating an opinion", "Giving reasons", "Persuasive words"] },
    { name: "Writing conventions", subtopics: ["Capital letters and full stops", "Paragraphs", "Handwriting and legibility"] },
  ],
  "Year 5": [
    { name: "Narrative writing", subtopics: ["Plot development", "Descriptive language", "Dialogue and punctuation"] },
    { name: "Persuasive writing", subtopics: ["Arguments and supporting evidence", "Persuasive devices", "Structuring an argument"] },
    { name: "Writing conventions", subtopics: ["Paragraphing", "Sentence variety", "Editing and proofreading"] },
  ],
  "Year 7": [
    { name: "Narrative writing", subtopics: ["Engaging openings", "Building tension", "Figurative language and imagery"] },
    { name: "Persuasive writing", subtopics: ["Thesis and line of argument", "Rhetorical devices", "Counter-arguments"] },
    { name: "Writing conventions", subtopics: ["Cohesion between paragraphs", "Complex sentences", "Precision in word choice"] },
  ],
  "Year 9": [
    { name: "Narrative writing", subtopics: ["Sophisticated structure and voice", "Characterisation techniques", "Symbolism and theme"] },
    { name: "Persuasive writing", subtopics: ["Sustained and logical argument", "Evidence and authority", "Audience positioning"] },
    { name: "Writing conventions", subtopics: ["Controlled sentence structures", "Advanced punctuation", "Editing for impact"] },
  ],
};

const NAPLAN_CONVENTIONS: Record<string, CurriculumTopic[]> = {
  "Year 3": [
    { name: "Spelling", subtopics: ["Common words", "Simple letter patterns", "Plurals"] },
    { name: "Grammar", subtopics: ["Nouns, verbs and adjectives", "Simple tenses", "Subject–verb agreement"] },
    { name: "Punctuation", subtopics: ["Capital letters", "Full stops and question marks", "Commas in lists"] },
  ],
  "Year 5": [
    { name: "Spelling", subtopics: ["Common misspellings", "Prefixes and suffixes", "Homophones"] },
    { name: "Grammar", subtopics: ["Clauses and phrases", "Tense consistency", "Pronouns and referencing"] },
    { name: "Punctuation", subtopics: ["Apostrophes", "Commas", "Speech marks"] },
  ],
  "Year 7": [
    { name: "Spelling", subtopics: ["Multi-syllable words", "Greek and Latin roots", "Frequently confused words"] },
    { name: "Grammar", subtopics: ["Complex sentences", "Active and passive voice", "Modality"] },
    { name: "Punctuation", subtopics: ["Apostrophes of possession", "Colons and semicolons", "Punctuating dialogue"] },
  ],
  "Year 9": [
    { name: "Spelling", subtopics: ["Technical and subject-specific words", "Unusual letter patterns", "Editing spelling errors"] },
    { name: "Grammar", subtopics: ["Nominalisation", "Embedded clauses", "Cohesive grammar choices"] },
    { name: "Punctuation", subtopics: ["Advanced comma usage", "Dashes and parentheses", "Punctuation for effect"] },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// VCE (VCAA — Units 1&2 in Year 11, Units 3&4 in Year 12)
// ──────────────────────────────────────────────────────────────────────────

const VCE_METHODS_12U: CurriculumTopic[] = [
  { name: "Functions and graphs", subtopics: ["Linear and quadratic functions", "Cubics and quartics", "Transformations of graphs", "Inverse functions"] },
  { name: "Polynomials and algebra", subtopics: ["Factorising polynomials", "Remainder and factor theorems", "Solving polynomial equations"] },
  { name: "Exponential and logarithmic functions", subtopics: ["Index laws", "Exponential growth and decay", "Logarithm laws and equations"] },
  { name: "Circular functions", subtopics: ["Radian measure", "Sine, cosine and tangent graphs", "Solving trigonometric equations"] },
  { name: "Rates of change and calculus introduction", subtopics: ["Average and instantaneous rates of change", "The derivative from first principles", "Differentiating polynomials", "Tangents and stationary points"] },
  { name: "Probability and counting", subtopics: ["Counting methods", "Conditional probability", "Discrete random variables introduction"] },
];

const VCE_METHODS_34U: CurriculumTopic[] = [
  { name: "Functions and transformations", subtopics: ["Composite and inverse functions", "Transformations of the plane", "Sums, differences and products of functions"] },
  { name: "Differential calculus", subtopics: ["Chain, product and quotient rules", "Derivatives of exponential, log and circular functions", "Stationary points and curve sketching", "Maximum and minimum problems"] },
  { name: "Integral calculus", subtopics: ["Antidifferentiation", "The definite integral and areas", "Applications of integration"] },
  { name: "Probability and statistics", subtopics: ["Discrete random variables and the binomial distribution", "Continuous random variables", "The normal distribution", "Sample proportions and confidence intervals"] },
];

const VCE_GENERAL_12U: CurriculumTopic[] = [
  { name: "Data analysis", subtopics: ["Types of data", "Displaying and describing distributions", "Summary statistics", "Introduction to correlation"] },
  { name: "Linear relations and equations", subtopics: ["Solving linear equations", "Simultaneous equations", "Linear graphs and modelling"] },
  { name: "Financial arithmetic", subtopics: ["Percentages and applications", "Simple and compound interest", "Wages, salaries and taxation"] },
  { name: "Matrices", subtopics: ["Matrix arithmetic", "Matrix multiplication", "Applications of matrices"] },
  { name: "Sequences", subtopics: ["Arithmetic sequences", "Geometric sequences", "First-order linear recurrence relations"] },
  { name: "Networks introduction", subtopics: ["Graphs and networks", "Walks, trails and paths", "Trees and connected graphs"] },
];

const VCE_GENERAL_34U: CurriculumTopic[] = [
  { name: "Data analysis", subtopics: ["Investigating associations", "Least squares regression", "Time series and seasonal adjustment"] },
  { name: "Recursion and financial modelling", subtopics: ["Depreciation", "Compound interest investments and loans", "Reducing balance loans", "Annuities and perpetuities"] },
  { name: "Matrices", subtopics: ["Matrices and their applications", "Transition matrices", "Dominance and communication matrices"] },
  { name: "Networks and decision mathematics", subtopics: ["Shortest path problems", "Minimum spanning trees", "Flow problems", "Project scheduling and critical paths"] },
];

const VCE_SPECIALIST_12U: CurriculumTopic[] = [
  { name: "Algebra, number and proof", subtopics: ["Proof techniques including induction", "Number systems", "Partial fractions"] },
  { name: "Combinatorics", subtopics: ["Permutations and combinations", "The pigeonhole principle", "Inclusion–exclusion"] },
  { name: "Geometry and trigonometry", subtopics: ["Circle geometry theorems", "Trigonometric identities", "Vectors in the plane"] },
  { name: "Matrices and transformations", subtopics: ["Matrix operations", "Linear transformations of the plane", "Applications"] },
  { name: "Kinematics", subtopics: ["Displacement, velocity and acceleration", "Constant acceleration formulas", "Motion graphs"] },
];

const VCE_SPECIALIST_34U: CurriculumTopic[] = [
  { name: "Complex numbers", subtopics: ["Cartesian and polar form", "De Moivre's theorem", "Roots of polynomials", "Regions in the complex plane"] },
  { name: "Vectors", subtopics: ["Vector algebra and geometry", "Scalar and vector products", "Vector proofs", "Vector calculus"] },
  { name: "Advanced calculus", subtopics: ["Techniques of antidifferentiation", "Applications of integration", "Differential equations", "Related rates"] },
  { name: "Mechanics", subtopics: ["Kinematics with calculus", "Newton's laws of motion", "Momentum and forces"] },
  { name: "Statistical inference", subtopics: ["Linear combinations of random variables", "Sample means", "Hypothesis testing"] },
];

// ──────────────────────────────────────────────────────────────────────────
// GENERAL (year-flexible practice — broad revision topics per subject)
// ──────────────────────────────────────────────────────────────────────────

const GENERAL_MATHS: CurriculumTopic[] = [
  { name: "Number and arithmetic", subtopics: ["Whole number operations", "Order of operations", "Estimation and rounding", "Mental maths strategies"] },
  { name: "Fractions, decimals and percentages", subtopics: ["Equivalence and conversions", "Operations with fractions and decimals", "Percentage problems"] },
  { name: "Algebra", subtopics: ["Expressions and substitution", "Solving equations", "Patterns and rules", "Graphing relationships"] },
  { name: "Geometry and measurement", subtopics: ["Perimeter, area and volume", "Angles and shapes", "Units and conversions", "Maps and scale"] },
  { name: "Statistics and probability", subtopics: ["Reading and drawing graphs", "Averages and spread", "Chance and probability"] },
  { name: "Problem solving", subtopics: ["Word problems", "Multi-step problems", "Logical reasoning", "Working backwards"] },
  { name: "Financial maths", subtopics: ["Money calculations", "Budgeting", "Interest and discounts"] },
];

const GENERAL_ENGLISH: CurriculumTopic[] = [
  { name: "Reading comprehension", subtopics: ["Literal understanding", "Inference", "Main ideas and summarising", "Comparing texts"] },
  { name: "Vocabulary", subtopics: ["Word meanings in context", "Synonyms and antonyms", "Prefixes, suffixes and roots"] },
  { name: "Spelling", subtopics: ["Common words", "Spelling rules and patterns", "Homophones and confused words"] },
  { name: "Grammar and punctuation", subtopics: ["Parts of speech", "Sentence structure", "Tenses and agreement", "Punctuation rules"] },
  { name: "Writing skills", subtopics: ["Narrative writing", "Persuasive writing", "Informative writing", "Planning and editing"] },
  { name: "Analysing texts", subtopics: ["Author's purpose", "Language techniques", "Persuasive devices", "Themes"] },
];

const GENERAL_SCIENCE: CurriculumTopic[] = [
  { name: "Scientific method", subtopics: ["Making observations and predictions", "Fair testing and variables", "Recording and interpreting results"] },
  { name: "Biological sciences", subtopics: ["Living things and their needs", "Body systems", "Ecosystems and food chains", "Cells and genetics basics"] },
  { name: "Chemical sciences", subtopics: ["States and properties of matter", "Mixtures and separation", "Chemical reactions basics", "Atoms and elements"] },
  { name: "Physical sciences", subtopics: ["Forces and motion", "Energy forms and transfer", "Light, sound and heat", "Electricity basics"] },
  { name: "Earth and space sciences", subtopics: ["Weather and seasons", "The Earth's resources", "The solar system", "Rocks and landforms"] },
  { name: "Everyday science", subtopics: ["Science in the home", "Health and nutrition", "Technology and science"] },
];

// ── NAPLAN / VCE / General year-level builders ─────────────────────────────

function buildNaplanYearLevels(): CurriculumYearLevel[] {
  return ["Year 3", "Year 5", "Year 7", "Year 9"].map((year) => ({
    year,
    subjects: [
      { name: "Numeracy", topics: NAPLAN_NUMERACY[year] ?? [] },
      { name: "Reading", topics: NAPLAN_READING[year] ?? [] },
      { name: "Writing", topics: NAPLAN_WRITING[year] ?? [] },
      { name: "Language Conventions", topics: NAPLAN_CONVENTIONS[year] ?? [] },
    ],
  }));
}

function buildVceYearLevels(): CurriculumYearLevel[] {
  return [
    {
      year: "Year 11 (Units 1 & 2)",
      subjects: [
        { name: "English", topics: SENIOR_ENGLISH_11 },
        { name: "Mathematical Methods", topics: VCE_METHODS_12U },
        { name: "General Mathematics", topics: VCE_GENERAL_12U },
        { name: "Specialist Mathematics", topics: VCE_SPECIALIST_12U },
        { name: "Biology", topics: BIOLOGY_11 },
        { name: "Chemistry", topics: CHEMISTRY_11 },
      ],
    },
    {
      year: "Year 12 (Units 3 & 4)",
      subjects: [
        { name: "English", topics: SENIOR_ENGLISH_12 },
        { name: "Mathematical Methods", topics: VCE_METHODS_34U },
        { name: "General Mathematics", topics: VCE_GENERAL_34U },
        { name: "Specialist Mathematics", topics: VCE_SPECIALIST_34U },
        { name: "Biology", topics: BIOLOGY_12 },
        { name: "Chemistry", topics: CHEMISTRY_12 },
      ],
    },
  ];
}

function buildGeneralYearLevels(): CurriculumYearLevel[] {
  const f10 = [
    "Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
    "Year 6", "Year 7", "Year 8", "Year 9", "Year 10",
  ].map((year) => ({
    year,
    subjects: [
      { name: "Mathematics", topics: GENERAL_MATHS },
      { name: "English", topics: GENERAL_ENGLISH },
      { name: "Science", topics: GENERAL_SCIENCE },
    ],
  }));
  const senior = ["Year 11", "Year 12"].map((year) => ({
    year,
    subjects: [
      { name: "Mathematics", topics: GENERAL_MATHS },
      { name: "English", topics: GENERAL_ENGLISH },
      { name: "Science", topics: GENERAL_SCIENCE },
      { name: "Biology", topics: year === "Year 11" ? BIOLOGY_11 : BIOLOGY_12 },
      { name: "Chemistry", topics: year === "Year 11" ? CHEMISTRY_11 : CHEMISTRY_12 },
    ],
  }));
  return [...f10, ...senior];
}

// ── Build year levels (shared builder for both curricula) ─────────────────

const F10_YEARS = [
  "Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10",
] as const;

function buildF10YearLevels(): CurriculumYearLevel[] {
  return F10_YEARS.map((year) => ({
    year,
    subjects: [
      { name: "Mathematics", topics: MATHS_F10[year] ?? [] },
      { name: "English", topics: ENGLISH_F10[year] ?? [] },
      { name: "Science", topics: SCIENCE_F10[year] ?? [] },
    ],
  }));
}

function buildSeniorYearLevels(): CurriculumYearLevel[] {
  return [
    {
      year: "Year 11",
      subjects: [
        { name: "Mathematics", topics: SENIOR_MATHS_11 },
        { name: "English", topics: SENIOR_ENGLISH_11 },
        { name: "Biology", topics: BIOLOGY_11 },
        { name: "Chemistry", topics: CHEMISTRY_11 },
      ],
    },
    {
      year: "Year 12",
      subjects: [
        { name: "Mathematics", topics: SENIOR_MATHS_12 },
        { name: "English", topics: SENIOR_ENGLISH_12 },
        { name: "Biology", topics: BIOLOGY_12 },
        { name: "Chemistry", topics: CHEMISTRY_12 },
      ],
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────
// CURRICULA
// ──────────────────────────────────────────────────────────────────────────

export const CURRICULA: Curriculum[] = [
  {
    id: "vic2",
    label: "Victorian Curriculum 2.0 (VCAA)",
    yearLevels: [...buildF10YearLevels(), ...buildSeniorYearLevels()],
  },
  {
    id: "australian",
    label: "Australian Curriculum (v9)",
    yearLevels: [...buildF10YearLevels(), ...buildSeniorYearLevels()],
  },
  {
    id: "naplan",
    label: "NAPLAN",
    yearLevels: buildNaplanYearLevels(),
  },
  {
    id: "vce",
    label: "VCE (VCAA)",
    yearLevels: buildVceYearLevels(),
  },
  {
    id: "general",
    label: "General",
    yearLevels: buildGeneralYearLevels(),
  },
];

// ── Helper functions (year level first, then subject) ─────────────────────

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find(c => c.id === id);
}

/** All year levels available in a curriculum. */
export function getYears(curriculumId: string): string[] {
  return getCurriculum(curriculumId)?.yearLevels.map(y => y.year) ?? [];
}

/** Subjects available for the given year level. */
export function getSubjects(curriculumId: string, year: string): string[] {
  return getCurriculum(curriculumId)?.yearLevels
    .find(y => y.year === year)?.subjects
    .map(s => s.name) ?? [];
}

/** Topics for a given curriculum → year level → subject. */
export function getTopics(curriculumId: string, year: string, subject: string): CurriculumTopic[] {
  return getCurriculum(curriculumId)?.yearLevels
    .find(y => y.year === year)?.subjects
    .find(s => s.name === subject)?.topics ?? [];
}

/** Subtopics for a given topic. */
export function getSubtopics(curriculumId: string, year: string, subject: string, topic: string): string[] {
  return getTopics(curriculumId, year, subject).find(t => t.name === topic)?.subtopics ?? [];
}

export const DIFFICULTY_LEVELS = ["Support", "Core", "Extension"] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

export const QUESTION_FORMATS = ["Mixed", "Multiple Choice", "Short Answer", "Extended Response", "True/False"] as const;
export type QuestionFormat = typeof QUESTION_FORMATS[number];

export const CONTEXTS = ["Real-life", "Abstract", "Exam-style", "Problem-solving", "Worded problems"] as const;
export type QuestionContext = typeof CONTEXTS[number];

export const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50] as const;
