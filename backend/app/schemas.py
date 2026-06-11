"""Domain models: the scheme schema, user profile, and match results.

The profile field vocabulary below is the single source of truth shared by
the dataset, the rules engine, the questionnaire, and the validator. A rule
that references a field outside this vocabulary fails data validation.
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

# ---------------------------------------------------------------------------
# Closed vocabularies
# ---------------------------------------------------------------------------

INDIAN_STATES = [
    "andhra_pradesh", "arunachal_pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal_pradesh", "jharkhand", "karnataka",
    "kerala", "madhya_pradesh", "maharashtra", "manipur", "meghalaya",
    "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim",
    "tamil_nadu", "telangana", "tripura", "uttar_pradesh", "uttarakhand",
    "west_bengal", "andaman_nicobar", "chandigarh", "dadra_nagar_haveli_daman_diu",
    "delhi", "jammu_kashmir", "ladakh", "lakshadweep", "puducherry",
]


class Gender(str, Enum):
    female = "female"
    male = "male"
    other = "other"


class SocialCategory(str, Enum):
    general = "general"
    obc = "obc"
    sc = "sc"
    st = "st"
    ews = "ews"


class Occupation(str, Enum):
    student = "student"
    farmer = "farmer"
    agricultural_labourer = "agricultural_labourer"
    construction_worker = "construction_worker"
    street_vendor = "street_vendor"
    artisan = "artisan"
    self_employed = "self_employed"
    salaried_private = "salaried_private"
    salaried_government = "salaried_government"
    unemployed = "unemployed"
    homemaker = "homemaker"
    retired = "retired"
    other = "other"


class EducationLevel(str, Enum):
    primary = "primary"            # classes 1-5
    middle = "middle"              # classes 6-8
    secondary = "secondary"        # classes 9-10
    higher_secondary = "higher_secondary"  # classes 11-12
    diploma_iti = "diploma_iti"
    undergraduate = "undergraduate"
    postgraduate = "postgraduate"
    doctorate = "doctorate"


class Area(str, Enum):
    rural = "rural"
    urban = "urban"


# field name -> (python type, allowed values or None)
PROFILE_FIELDS: dict[str, tuple[type, Optional[list[str]]]] = {
    "age": (int, None),
    "state": (str, INDIAN_STATES),
    "gender": (str, [g.value for g in Gender]),
    "category": (str, [c.value for c in SocialCategory]),
    "annual_income": (int, None),
    "occupation": (str, [o.value for o in Occupation]),
    "education_level": (str, [e.value for e in EducationLevel]),
    "area": (str, [a.value for a in Area]),
    "land_holding_acres": (float, None),
    "is_student": (bool, None),
    "is_farmer": (bool, None),
    "is_entrepreneur": (bool, None),
    "has_disability": (bool, None),
    "is_bpl": (bool, None),
    "is_minority": (bool, None),
}

NUMERIC_FIELDS = {"age", "annual_income", "land_holding_acres"}
BOOLEAN_FIELDS = {f for f, (t, _) in PROFILE_FIELDS.items() if t is bool}


class SchemeCategory(str, Enum):
    scholarship = "scholarship"
    education = "education"
    agriculture = "agriculture"
    business = "business"
    housing = "housing"
    health = "health"
    insurance = "insurance"
    pension = "pension"
    women_child = "women_child"
    employment = "employment"
    skills = "skills"
    social_welfare = "social_welfare"
    financial = "financial"


# ---------------------------------------------------------------------------
# Eligibility rules
# ---------------------------------------------------------------------------


class RuleOp(str, Enum):
    eq = "eq"
    ne = "ne"
    in_ = "in"
    lte = "lte"      # inclusive: value at the ceiling passes
    gte = "gte"      # inclusive: value at the floor passes
    between = "between"  # inclusive on both ends


class Rule(BaseModel):
    field: str
    op: RuleOp
    value: Any
    label: Optional[str] = None  # human-readable override for the UI

    @field_validator("field")
    @classmethod
    def field_in_vocabulary(cls, v: str) -> str:
        if v not in PROFILE_FIELDS:
            raise ValueError(
                f"unknown profile field {v!r}; allowed: {sorted(PROFILE_FIELDS)}"
            )
        return v

    @model_validator(mode="after")
    def value_matches_op_and_field(self) -> "Rule":
        ftype, allowed = PROFILE_FIELDS[self.field]
        if self.op in (RuleOp.lte, RuleOp.gte):
            if self.field not in NUMERIC_FIELDS:
                raise ValueError(f"{self.op.value} requires a numeric field, got {self.field!r}")
            if not isinstance(self.value, (int, float)) or isinstance(self.value, bool):
                raise ValueError(f"{self.op.value} needs a numeric value")
        elif self.op is RuleOp.between:
            if self.field not in NUMERIC_FIELDS:
                raise ValueError(f"between requires a numeric field, got {self.field!r}")
            ok = (
                isinstance(self.value, (list, tuple))
                and len(self.value) == 2
                and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in self.value)
                and self.value[0] <= self.value[1]
            )
            if not ok:
                raise ValueError("between needs a [low, high] pair with low <= high")
        elif self.op is RuleOp.in_:
            if not isinstance(self.value, list) or not self.value:
                raise ValueError("in needs a non-empty list")
            if allowed is not None:
                bad = [v for v in self.value if v not in allowed]
                if bad:
                    raise ValueError(f"values {bad} not allowed for field {self.field!r}")
        else:  # eq / ne
            if allowed is not None and self.value not in allowed:
                raise ValueError(f"value {self.value!r} not allowed for field {self.field!r}")
            if ftype is bool and not isinstance(self.value, bool):
                raise ValueError(f"field {self.field!r} needs a boolean value")
        return self


class AnyOfGroup(BaseModel):
    any_of: list[Rule] = Field(min_length=2)
    label: Optional[str] = None


Criterion = Union[Rule, AnyOfGroup]


class Eligibility(BaseModel):
    rules: list[Criterion] = Field(default_factory=list)
    # Criteria that cannot be captured by the questionnaire (e.g. "holds a
    # street-vending certificate"). Shown to the user as unverified items;
    # their presence caps the result at possibly_eligible — never eligible.
    self_check: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def not_empty(self) -> "Eligibility":
        if not self.rules and not self.self_check:
            raise ValueError("eligibility must have at least one rule or self_check item")
        return self


# ---------------------------------------------------------------------------
# Scheme
# ---------------------------------------------------------------------------


class BenefitType(str, Enum):
    financial = "financial"      # direct money transfer / scholarship / pension
    subsidy = "subsidy"
    credit = "credit"            # loans, credit guarantee
    insurance_cover = "insurance_cover"
    service = "service"          # training, free travel, free connection
    in_kind = "in_kind"          # rations, assets


class Benefit(BaseModel):
    type: BenefitType
    summary: str = Field(min_length=5)
    amount_max: Optional[int] = Field(default=None, ge=0)  # annual INR where meaningful


class Scheme(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    name: str = Field(min_length=3)
    category: SchemeCategory
    level: Literal["central", "state"]
    state: Optional[str] = None
    ministry: str
    description: str = Field(min_length=40)
    benefits: list[Benefit] = Field(min_length=1)
    eligibility: Eligibility
    required_documents: list[str] = Field(min_length=1)
    application_url: HttpUrl
    source_urls: list[HttpUrl] = Field(min_length=1)
    last_verified: datetime.date
    tags: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def state_consistency(self) -> "Scheme":
        if self.level == "state":
            if self.state not in INDIAN_STATES:
                raise ValueError("state-level scheme needs a valid `state`")
        elif self.state is not None:
            raise ValueError("central scheme must have state: null")
        return self


# ---------------------------------------------------------------------------
# User profile (everything optional — unknown is a first-class state)
# ---------------------------------------------------------------------------


class UserProfile(BaseModel):
    age: Optional[int] = Field(default=None, ge=0, le=120)
    state: Optional[str] = None
    gender: Optional[Gender] = None
    category: Optional[SocialCategory] = None
    annual_income: Optional[int] = Field(default=None, ge=0)
    occupation: Optional[Occupation] = None
    education_level: Optional[EducationLevel] = None
    area: Optional[Area] = None
    land_holding_acres: Optional[float] = Field(default=None, ge=0)
    is_student: Optional[bool] = None
    is_farmer: Optional[bool] = None
    is_entrepreneur: Optional[bool] = None
    has_disability: Optional[bool] = None
    is_bpl: Optional[bool] = None
    is_minority: Optional[bool] = None

    @field_validator("state")
    @classmethod
    def state_known(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in INDIAN_STATES:
            raise ValueError(f"unknown state {v!r}")
        return v


# ---------------------------------------------------------------------------
# Match results
# ---------------------------------------------------------------------------


class CriterionStatus(str, Enum):
    passed = "pass"
    failed = "fail"
    unknown = "unknown"


class CriterionTrace(BaseModel):
    label: str
    status: CriterionStatus
    field: Optional[str] = None  # None for self-check items


class MatchStatus(str, Enum):
    eligible = "eligible"
    possibly_eligible = "possibly_eligible"
    not_eligible = "not_eligible"


class SchemeResult(BaseModel):
    scheme_id: str
    status: MatchStatus
    score: float  # fraction of criteria confirmed passed, 0..1
    criteria: list[CriterionTrace]
