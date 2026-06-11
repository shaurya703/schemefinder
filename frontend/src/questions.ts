// The progressive questionnaire: a flat list of steps, each with a
// `relevant` predicate so we only ask what the answers so far make useful.
// Every step is skippable — a skipped field stays unknown and the engine
// reports "possibly eligible" instead of guessing.

import type { Profile } from "./types";

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

export type Step =
  | { kind: "number"; id: string; title: string; sub?: string; field: keyof Profile; placeholder?: string; quickPicks?: { label: string; value: number }[]; relevant?: (p: Profile, picks: string[]) => boolean }
  | { kind: "choice"; id: string; title: string; sub?: string; field: keyof Profile; options: Option[]; relevant?: (p: Profile, picks: string[]) => boolean }
  | { kind: "state"; id: string; title: string; sub?: string }
  | { kind: "describe"; id: string; title: string; sub?: string }
  | { kind: "flags"; id: string; title: string; sub?: string };

export const DESCRIBE_OPTIONS: Option[] = [
  { value: "student", label: "Student", hint: "Studying in school or college" },
  { value: "farmer", label: "Farmer", hint: "Cultivate your own or leased land" },
  { value: "business", label: "Business / starting one", hint: "Self-employed, shop, startup" },
  { value: "salaried_private", label: "Private job" },
  { value: "salaried_government", label: "Government job" },
  { value: "agricultural_labourer", label: "Farm labourer" },
  { value: "construction_worker", label: "Construction worker" },
  { value: "street_vendor", label: "Street vendor" },
  { value: "artisan", label: "Artisan / craftsperson", hint: "Carpenter, tailor, potter, weaver…" },
  { value: "unemployed", label: "Unemployed" },
  { value: "homemaker", label: "Homemaker" },
  { value: "retired", label: "Retired" },
];

// Occupation is single-valued in the profile; when several describe-chips
// are picked, the most scheme-specific one wins.
const OCCUPATION_PRIORITY = [
  "street_vendor", "artisan", "construction_worker", "agricultural_labourer",
  "farmer", "business", "salaried_government", "salaried_private",
  "unemployed", "homemaker", "retired", "student",
];

export function applyDescribePicks(profile: Profile, picks: string[]): Profile {
  const p: Profile = { ...profile };
  delete p.occupation;
  delete p.is_student;
  delete p.is_farmer;
  delete p.is_entrepreneur;
  if (picks.length === 0) return p;

  p.is_student = picks.includes("student");
  p.is_farmer = picks.includes("farmer") || picks.includes("agricultural_labourer");
  p.is_entrepreneur = picks.includes("business");
  const top = OCCUPATION_PRIORITY.find((o) => picks.includes(o));
  if (top) p.occupation = top === "business" ? "self_employed" : top;
  return p;
}

export const STEPS: Step[] = [
  {
    kind: "number",
    id: "age",
    field: "age",
    title: "How old are you?",
    sub: "For schemes aimed at children, answer for the child instead.",
    placeholder: "Age in years",
  },
  { kind: "state", id: "state", title: "Which state do you live in?" },
  {
    kind: "choice",
    id: "gender",
    field: "gender",
    title: "Gender",
    options: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
      { value: "other", label: "Other / transgender" },
    ],
  },
  {
    kind: "choice",
    id: "category",
    field: "category",
    title: "Social category",
    sub: "Several scholarships and loans are reserved by category.",
    options: [
      { value: "general", label: "General" },
      { value: "obc", label: "OBC" },
      { value: "sc", label: "SC" },
      { value: "st", label: "ST" },
      { value: "ews", label: "EWS" },
    ],
  },
  {
    kind: "number",
    id: "income",
    field: "annual_income",
    title: "Your family's yearly income, roughly?",
    sub: "Many schemes have an income ceiling. A rough figure in rupees per year is enough.",
    placeholder: "e.g. 250000",
    quickPicks: [
      { label: "₹1 lakh", value: 100000 },
      { label: "₹2.5 lakh", value: 250000 },
      { label: "₹5 lakh", value: 500000 },
      { label: "₹8 lakh", value: 800000 },
    ],
  },
  { kind: "describe", id: "describe", title: "Which of these describe you?", sub: "Pick all that apply." },
  {
    kind: "choice",
    id: "education",
    field: "education_level",
    title: "What are you studying?",
    relevant: (_p, picks) => picks.includes("student"),
    options: [
      { value: "primary", label: "Classes 1–5" },
      { value: "middle", label: "Classes 6–8" },
      { value: "secondary", label: "Classes 9–10" },
      { value: "higher_secondary", label: "Classes 11–12" },
      { value: "diploma_iti", label: "Diploma / ITI" },
      { value: "undergraduate", label: "Bachelor's degree" },
      { value: "postgraduate", label: "Master's degree" },
      { value: "doctorate", label: "PhD" },
    ],
  },
  {
    kind: "choice",
    id: "qualification",
    field: "education_level",
    title: "Your highest completed qualification?",
    sub: "Some allowances (like Karnataka's Yuva Nidhi) depend on it.",
    relevant: (_p, picks) => picks.includes("unemployed") && !picks.includes("student"),
    options: [
      { value: "secondary", label: "Class 10" },
      { value: "higher_secondary", label: "Class 12" },
      { value: "diploma_iti", label: "Diploma / ITI" },
      { value: "undergraduate", label: "Bachelor's degree" },
      { value: "postgraduate", label: "Master's degree" },
    ],
  },
  {
    kind: "number",
    id: "land",
    field: "land_holding_acres",
    title: "How much land does your family cultivate?",
    sub: "In acres. 1 hectare is about 2.5 acres.",
    placeholder: "e.g. 3",
    relevant: (_p, picks) => picks.includes("farmer"),
    quickPicks: [
      { label: "1 acre", value: 1 },
      { label: "2.5 acres", value: 2.5 },
      { label: "5 acres", value: 5 },
      { label: "10 acres", value: 10 },
    ],
  },
  {
    kind: "choice",
    id: "area",
    field: "area",
    title: "Do you live in a village or a city?",
    options: [
      { value: "rural", label: "Village / rural" },
      { value: "urban", label: "Town / city" },
    ],
  },
  {
    kind: "flags",
    id: "flags",
    title: "Lastly — do any of these apply?",
    sub: "Tick what applies, leave the rest. You can skip this entirely.",
  },
];

export const FLAG_OPTIONS: { field: keyof Profile; label: string; hint?: string }[] = [
  { field: "is_bpl", label: "BPL / priority ration card", hint: "Antyodaya or priority household card" },
  { field: "has_disability", label: "Person with disability", hint: "Any benchmark disability" },
  { field: "is_minority", label: "Minority community", hint: "Muslim, Christian, Sikh, Buddhist, Jain or Parsi" },
];

export function visibleSteps(profile: Profile, picks: string[]): Step[] {
  return STEPS.filter((s) => !("relevant" in s) || !s.relevant || s.relevant(profile, picks));
}
