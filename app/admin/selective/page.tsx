"use client";

import PracticePapersAdmin from "@/components/PracticePapersAdmin";

const YEARS = ["8", "9"];
const SUBJECTS = [
  "Mathematical Reasoning",
  "Reading Comprehension",
  "Writing",
  "General Ability — Verbal",
  "General Ability — Quantitative",
  "General Ability — Abstract",
];

export default function SelectiveAdminPage() {
  return (
    <PracticePapersAdmin
      program="selective"
      title="Selective Entry"
      subtitle="Create and manage Selective Entry practice papers for Years 8–9"
      yearOptions={YEARS}
      subjects={SUBJECTS}
    />
  );
}
