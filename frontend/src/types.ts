// Mirrors the backend's API shapes (app/schemas.py and route responses).

export interface Benefit {
  type: string;
  summary: string;
  amount_max: number | null;
}

export interface SchemeCard {
  id: string;
  name: string;
  category: string;
  level: "central" | "state";
  state: string | null;
  description: string;
  benefits: Benefit[];
  tags: string[];
}

export interface SchemeDetail extends SchemeCard {
  ministry: string;
  required_documents: string[];
  application_url: string;
  source_urls: string[];
  last_verified: string;
  eligibility: {
    rules: unknown[];
    self_check: string[];
  };
}

export type CriterionStatus = "pass" | "fail" | "unknown";

export interface CriterionTrace {
  label: string;
  status: CriterionStatus;
  field: string | null;
}

export interface MatchResult {
  scheme_id: string;
  status: "eligible" | "possibly_eligible" | "not_eligible";
  score: number;
  criteria: CriterionTrace[];
  scheme: SchemeCard & {
    required_documents: string[];
    application_url: string;
    source_urls: string[];
    ministry: string;
    last_verified: string;
  };
}

export interface MatchResponse {
  summary: {
    total_schemes: number;
    eligible: number;
    possibly_eligible: number;
    not_eligible: number;
    fields_answered: string[];
  };
  eligible: MatchResult[];
  possibly_eligible: MatchResult[];
  not_eligible: MatchResult[];
}

export interface Meta {
  disclaimer: string;
  categories: string[];
  states: string[];
  states_with_schemes: string[];
  genders: string[];
  social_categories: string[];
  occupations: string[];
  education_levels: string[];
  areas: string[];
}

export interface Profile {
  age?: number;
  state?: string;
  gender?: string;
  category?: string;
  annual_income?: number;
  occupation?: string;
  education_level?: string;
  area?: string;
  land_holding_acres?: number;
  is_student?: boolean;
  is_farmer?: boolean;
  is_entrepreneur?: boolean;
  has_disability?: boolean;
  is_bpl?: boolean;
  is_minority?: boolean;
}
