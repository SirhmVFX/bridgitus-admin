"use client";

import PracticePapersAdmin from "@/components/PracticePapersAdmin";

const YEARS = ["2", "3", "4", "5", "6", "7", "8", "9"];
const SUBJECTS = [
  "Numeracy",
  "Reading",
  "Writing",
  "Language Conventions",
  "General Ability",
];

export default function NaplanAdminPage() {
  return (
    <PracticePapersAdmin
      program="naplan"
      title="NAPLAN Practice"
      subtitle="Create and manage NAPLAN practice papers for Years 2–9"
      yearOptions={YEARS}
      subjects={SUBJECTS}
    />
  );
}
