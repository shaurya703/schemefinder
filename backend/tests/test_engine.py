"""Unit tests for the eligibility engine.

Boundary values are tested explicitly for every operator: the engine's
contract is that all numeric comparisons are inclusive.
"""

import datetime

import pytest

from app.engine import (
    describe_rule,
    evaluate_criterion,
    evaluate_rule,
    evaluate_scheme,
    match_schemes,
)
from app.schemas import (
    AnyOfGroup,
    CriterionStatus,
    Eligibility,
    MatchStatus,
    Rule,
    Scheme,
    UserProfile,
)


def make_scheme(rules=None, self_check=None, **overrides) -> Scheme:
    base = dict(
        id="test-scheme",
        name="Test Scheme",
        category="scholarship",
        level="central",
        state=None,
        ministry="Test Ministry",
        description="A scheme used only inside unit tests, long enough for the schema.",
        benefits=[{"type": "financial", "summary": "Test benefit", "amount_max": 1000}],
        eligibility=Eligibility(
            rules=rules or [],
            self_check=self_check if self_check is not None else ["x"],
        ),
        required_documents=["Aadhaar card"],
        application_url="https://example.gov.in/",
        source_urls=["https://example.gov.in/"],
        last_verified=datetime.date(2026, 6, 11),
        tags=[],
    )
    base.update(overrides)
    return Scheme.model_validate(base)


def rule(field, op, value, label=None) -> Rule:
    return Rule(field=field, op=op, value=value, label=label)


# ---------------------------------------------------------------------------
# Operators, including exact boundaries
# ---------------------------------------------------------------------------


class TestOperators:
    @pytest.mark.parametrize(
        "age,expected",
        [
            (17, CriterionStatus.failed),
            (18, CriterionStatus.passed),   # exactly at the floor
            (19, CriterionStatus.passed),
            (None, CriterionStatus.unknown),
        ],
    )
    def test_gte_boundary(self, age, expected):
        assert evaluate_rule(UserProfile(age=age), rule("age", "gte", 18)) == expected

    @pytest.mark.parametrize(
        "income,expected",
        [
            (249999, CriterionStatus.passed),
            (250000, CriterionStatus.passed),  # exactly at the ceiling passes
            (250001, CriterionStatus.failed),
            (0, CriterionStatus.passed),
            (None, CriterionStatus.unknown),
        ],
    )
    def test_lte_boundary(self, income, expected):
        r = rule("annual_income", "lte", 250000)
        assert evaluate_rule(UserProfile(annual_income=income), r) == expected

    @pytest.mark.parametrize(
        "age,expected",
        [
            (17, CriterionStatus.failed),
            (18, CriterionStatus.passed),   # inclusive low end
            (29, CriterionStatus.passed),
            (40, CriterionStatus.passed),   # inclusive high end
            (41, CriterionStatus.failed),
            (None, CriterionStatus.unknown),
        ],
    )
    def test_between_boundaries(self, age, expected):
        r = rule("age", "between", [18, 40])
        assert evaluate_rule(UserProfile(age=age), r) == expected

    def test_eq_string_and_bool(self):
        r = rule("state", "eq", "karnataka")
        assert evaluate_rule(UserProfile(state="karnataka"), r) == CriterionStatus.passed
        assert evaluate_rule(UserProfile(state="kerala"), r) == CriterionStatus.failed
        assert evaluate_rule(UserProfile(), r) == CriterionStatus.unknown

        rb = rule("is_farmer", "eq", True)
        assert evaluate_rule(UserProfile(is_farmer=True), rb) == CriterionStatus.passed
        assert evaluate_rule(UserProfile(is_farmer=False), rb) == CriterionStatus.failed

    def test_eq_unwraps_profile_enums(self):
        r = rule("gender", "eq", "female")
        assert evaluate_rule(UserProfile(gender="female"), r) == CriterionStatus.passed
        assert evaluate_rule(UserProfile(gender="male"), r) == CriterionStatus.failed

    def test_ne(self):
        r = rule("occupation", "ne", "salaried_government")
        p = UserProfile(occupation="farmer")
        assert evaluate_rule(p, r) == CriterionStatus.passed
        p = UserProfile(occupation="salaried_government")
        assert evaluate_rule(p, r) == CriterionStatus.failed

    def test_in(self):
        r = rule("category", "in", ["sc", "st"])
        assert evaluate_rule(UserProfile(category="sc"), r) == CriterionStatus.passed
        assert evaluate_rule(UserProfile(category="st"), r) == CriterionStatus.passed
        assert evaluate_rule(UserProfile(category="obc"), r) == CriterionStatus.failed
        assert evaluate_rule(UserProfile(), r) == CriterionStatus.unknown

    def test_land_holding_float_boundary(self):
        r = rule("land_holding_acres", "lte", 5)
        assert evaluate_rule(UserProfile(land_holding_acres=5.0), r) == CriterionStatus.passed
        assert evaluate_rule(UserProfile(land_holding_acres=5.01), r) == CriterionStatus.failed

    def test_age_zero_is_a_value_not_unknown(self):
        # age 0 (newborn, answering for a child) must not be treated as missing
        r = rule("age", "lte", 1)
        assert evaluate_rule(UserProfile(age=0), r) == CriterionStatus.passed


# ---------------------------------------------------------------------------
# any_of groups
# ---------------------------------------------------------------------------


class TestAnyOf:
    GROUP = AnyOfGroup(
        any_of=[
            Rule(field="category", op="in", value=["sc", "st"]),
            Rule(field="gender", op="eq", value="female"),
        ]
    )

    def test_one_pass_is_pass(self):
        p = UserProfile(category="general", gender="female")
        assert evaluate_criterion(p, self.GROUP).status == CriterionStatus.passed

    def test_pass_beats_unknown(self):
        p = UserProfile(gender="female")  # category unknown
        assert evaluate_criterion(p, self.GROUP).status == CriterionStatus.passed

    def test_all_fail_is_fail(self):
        p = UserProfile(category="general", gender="male")
        assert evaluate_criterion(p, self.GROUP).status == CriterionStatus.failed

    def test_fail_plus_unknown_is_unknown(self):
        # the unknown branch might still pass, so the group must not fail
        p = UserProfile(gender="male")  # category unknown
        assert evaluate_criterion(p, self.GROUP).status == CriterionStatus.unknown

    def test_all_unknown_is_unknown(self):
        assert evaluate_criterion(UserProfile(), self.GROUP).status == CriterionStatus.unknown


# ---------------------------------------------------------------------------
# Scheme-level combination: never overclaim
# ---------------------------------------------------------------------------


class TestSchemeEvaluation:
    def test_all_pass_is_eligible(self):
        s = make_scheme(
            rules=[rule("age", "gte", 18), rule("is_farmer", "eq", True)],
            self_check=[],
        )
        result = evaluate_scheme(UserProfile(age=30, is_farmer=True), s)
        assert result.status == MatchStatus.eligible
        assert result.score == 1.0

    def test_any_fail_is_not_eligible_even_with_unknowns(self):
        s = make_scheme(
            rules=[rule("age", "gte", 18), rule("annual_income", "lte", 100000)],
            self_check=[],
        )
        # income unknown but age fails -> not eligible, not "possibly"
        result = evaluate_scheme(UserProfile(age=10), s)
        assert result.status == MatchStatus.not_eligible

    def test_unknown_without_fail_is_possibly(self):
        s = make_scheme(
            rules=[rule("age", "gte", 18), rule("annual_income", "lte", 100000)],
            self_check=[],
        )
        result = evaluate_scheme(UserProfile(age=30), s)
        assert result.status == MatchStatus.possibly_eligible

    def test_empty_profile_never_fails_anything(self):
        s = make_scheme(
            rules=[rule("age", "between", [18, 40]), rule("category", "eq", "sc")],
            self_check=[],
        )
        result = evaluate_scheme(UserProfile(), s)
        assert result.status == MatchStatus.possibly_eligible
        assert all(c.status == CriterionStatus.unknown for c in result.criteria)
        assert result.score == 0.0

    def test_self_check_caps_at_possibly_eligible(self):
        s = make_scheme(rules=[rule("age", "gte", 18)], self_check=["Owns land"])
        result = evaluate_scheme(UserProfile(age=30), s)
        assert result.status == MatchStatus.possibly_eligible
        labels = [c.label for c in result.criteria]
        assert "Owns land" in labels

    def test_self_check_only_scheme(self):
        s = make_scheme(rules=[], self_check=["Owns a roof"])
        result = evaluate_scheme(UserProfile(age=30), s)
        assert result.status == MatchStatus.possibly_eligible

    def test_trace_has_one_entry_per_criterion(self):
        s = make_scheme(
            rules=[rule("age", "gte", 18), rule("state", "eq", "karnataka")],
            self_check=["extra check"],
        )
        result = evaluate_scheme(UserProfile(age=20, state="kerala"), s)
        assert len(result.criteria) == 3
        by_field = {c.field: c.status for c in result.criteria if c.field}
        assert by_field["age"] == CriterionStatus.passed
        assert by_field["state"] == CriterionStatus.failed

    def test_score_is_fraction_passed(self):
        s = make_scheme(
            rules=[rule("age", "gte", 18), rule("gender", "eq", "female")],
            self_check=["check"],  # 3 criteria total, 2 confirmable
        )
        result = evaluate_scheme(UserProfile(age=30, gender="female"), s)
        assert result.score == pytest.approx(2 / 3, abs=1e-3)


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------


class TestRanking:
    def test_buckets_and_order(self):
        eligible_big = make_scheme(
            id="big", name="Big", rules=[rule("age", "gte", 18)], self_check=[],
            benefits=[{"type": "financial", "summary": "Large benefit", "amount_max": 50000}],
        )
        eligible_small = make_scheme(
            id="small", name="Small", rules=[rule("age", "gte", 18)], self_check=[],
            benefits=[{"type": "financial", "summary": "Small benefit", "amount_max": 1000}],
        )
        possibly = make_scheme(
            id="maybe", name="Maybe",
            rules=[rule("age", "gte", 18), rule("annual_income", "lte", 100000)],
            self_check=[],
        )
        failing = make_scheme(
            id="nope", name="Nope", rules=[rule("age", "lte", 10)], self_check=[],
        )

        buckets = match_schemes(
            UserProfile(age=30), [failing, possibly, eligible_small, eligible_big]
        )
        assert [r.scheme_id for r in buckets["eligible"]] == ["big", "small"]
        assert [r.scheme_id for r in buckets["possibly_eligible"]] == ["maybe"]
        assert [r.scheme_id for r in buckets["not_eligible"]] == ["nope"]

    def test_possibly_ranked_by_confirmed_fraction(self):
        mostly_confirmed = make_scheme(
            id="mostly", name="Mostly",
            rules=[rule("age", "gte", 18), rule("gender", "eq", "female"),
                   rule("annual_income", "lte", 100000)],
            self_check=[],
        )
        barely_confirmed = make_scheme(
            id="barely", name="Barely",
            rules=[rule("annual_income", "lte", 100000), rule("category", "eq", "sc"),
                   rule("is_bpl", "eq", True)],
            self_check=[],
        )
        buckets = match_schemes(
            UserProfile(age=30, gender="female"), [barely_confirmed, mostly_confirmed]
        )
        assert [r.scheme_id for r in buckets["possibly_eligible"]] == ["mostly", "barely"]


# ---------------------------------------------------------------------------
# Rule descriptions (the "why" shown to users)
# ---------------------------------------------------------------------------


class TestDescriptions:
    def test_authored_label_wins(self):
        r = rule("age", "lte", 9, label="Girl child below 10 years")
        assert describe_rule(r) == "Girl child below 10 years"

    def test_generated_labels(self):
        assert describe_rule(rule("age", "between", [18, 40])) == \
            "Age: between 18 and 40 (inclusive)"
        assert "₹2,50,000" in describe_rule(
            rule("annual_income", "lte", 250000)
        ) or "₹250,000" in describe_rule(rule("annual_income", "lte", 250000))
        assert describe_rule(rule("is_farmer", "eq", True)) == "Farmer: yes"
        assert describe_rule(rule("category", "in", ["sc", "st"])) == \
            "Social category: one of Sc, St"


# ---------------------------------------------------------------------------
# The real dataset evaluated end to end
# ---------------------------------------------------------------------------


class TestRealDataset:
    @pytest.fixture(scope="class")
    def schemes(self):
        from scripts.validate_data import load_schemes
        return load_schemes()

    def test_dataset_loads(self, schemes):
        assert len(schemes) >= 40

    def test_sc_student_matches_post_matric(self, schemes):
        profile = UserProfile(
            age=19, state="karnataka", gender="male", category="sc",
            annual_income=200000, is_student=True, education_level="undergraduate",
        )
        buckets = match_schemes(profile, schemes)
        matched = {r.scheme_id for r in buckets["eligible"] + buckets["possibly_eligible"]}
        assert "nsp-post-matric-sc" in matched
        not_eligible = {r.scheme_id for r in buckets["not_eligible"]}
        assert "nsp-post-matric-st" in not_eligible  # SC, not ST

    def test_income_at_exact_ceiling_still_matches(self, schemes):
        profile = UserProfile(
            age=19, category="sc", annual_income=250000,  # exactly the ceiling
            is_student=True, education_level="undergraduate",
        )
        buckets = match_schemes(profile, schemes)
        matched = {r.scheme_id for r in buckets["eligible"] + buckets["possibly_eligible"]}
        assert "nsp-post-matric-sc" in matched

    def test_woman_in_karnataka_gets_state_schemes(self, schemes):
        profile = UserProfile(state="karnataka", gender="female", age=35)
        buckets = match_schemes(profile, schemes)
        matched = {r.scheme_id for r in buckets["eligible"] + buckets["possibly_eligible"]}
        assert {"ka-gruha-lakshmi", "ka-shakti"} <= matched

    def test_woman_outside_karnataka_excluded_from_state_schemes(self, schemes):
        profile = UserProfile(state="bihar", gender="female", age=35)
        buckets = match_schemes(profile, schemes)
        not_eligible = {r.scheme_id for r in buckets["not_eligible"]}
        assert "ka-gruha-lakshmi" in not_eligible

    def test_no_scheme_with_self_check_is_ever_fully_eligible(self, schemes):
        # fully-specified profile: anything still listed "eligible" must have
        # zero self-check criteria, by construction of the engine
        profile = UserProfile(
            age=30, state="karnataka", gender="female", category="sc",
            annual_income=100000, occupation="farmer", education_level="undergraduate",
            area="rural", land_holding_acres=2, is_student=False, is_farmer=True,
            is_entrepreneur=True, has_disability=False, is_bpl=True, is_minority=False,
        )
        by_id = {s.id: s for s in schemes}
        buckets = match_schemes(profile, schemes)
        for r in buckets["eligible"]:
            assert not by_id[r.scheme_id].eligibility.self_check
