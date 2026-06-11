"""Three-state eligibility engine.

Pure functions, no I/O: a user profile is evaluated against a scheme's
structured criteria. Every criterion resolves to pass / fail / unknown, and
the combination never overclaims:

  any fail                  -> not_eligible
  no fail, any unknown      -> possibly_eligible
  no fail, all pass         -> eligible

Self-check criteria (facts the questionnaire cannot verify) always count as
unknown, so a scheme that has them can at best be possibly_eligible.

All numeric comparisons are inclusive: an income exactly at a ceiling passes
an `lte` rule, an age exactly at a floor passes a `gte` rule.
"""

from __future__ import annotations

from typing import Any, Optional

from .schemas import (
    AnyOfGroup,
    Criterion,
    CriterionStatus,
    CriterionTrace,
    MatchStatus,
    Rule,
    RuleOp,
    Scheme,
    SchemeResult,
    UserProfile,
)

FIELD_LABELS = {
    "age": "Age",
    "state": "State",
    "gender": "Gender",
    "category": "Social category",
    "annual_income": "Annual family income",
    "occupation": "Occupation",
    "education_level": "Education level",
    "area": "Area of residence",
    "land_holding_acres": "Agricultural land holding",
    "is_student": "Currently studying",
    "is_farmer": "Farmer",
    "is_entrepreneur": "Running or starting a business",
    "has_disability": "Person with disability",
    "is_bpl": "Below poverty line / priority ration card",
    "is_minority": "Notified minority community",
}


def _fmt_value(field: str, value: Any) -> str:
    if field == "annual_income":
        return f"₹{value:,.0f}".replace(".0", "")
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, str):
        return value.replace("_", " ").title()
    return str(value)


def describe_rule(rule: Rule) -> str:
    """Human-readable sentence for a rule, used when no label is authored."""
    if rule.label:
        return rule.label
    name = FIELD_LABELS.get(rule.field, rule.field)
    op, v = rule.op, rule.value
    if op is RuleOp.eq:
        return f"{name}: {_fmt_value(rule.field, v)}"
    if op is RuleOp.ne:
        return f"{name}: not {_fmt_value(rule.field, v)}"
    if op is RuleOp.in_:
        opts = ", ".join(_fmt_value(rule.field, x) for x in v)
        return f"{name}: one of {opts}"
    if op is RuleOp.lte:
        return f"{name}: at most {_fmt_value(rule.field, v)}"
    if op is RuleOp.gte:
        return f"{name}: at least {_fmt_value(rule.field, v)}"
    if op is RuleOp.between:
        lo, hi = v
        return (
            f"{name}: between {_fmt_value(rule.field, lo)} "
            f"and {_fmt_value(rule.field, hi)} (inclusive)"
        )
    raise ValueError(f"unhandled op {op!r}")  # pragma: no cover


def evaluate_rule(profile: UserProfile, rule: Rule) -> CriterionStatus:
    """Evaluate one rule. Missing profile value -> unknown, never a guess."""
    actual = getattr(profile, rule.field)
    if actual is None:
        return CriterionStatus.unknown
    if hasattr(actual, "value"):  # unwrap enums to raw strings
        actual = actual.value

    op, expected = rule.op, rule.value
    if op is RuleOp.eq:
        ok = actual == expected
    elif op is RuleOp.ne:
        ok = actual != expected
    elif op is RuleOp.in_:
        ok = actual in expected
    elif op is RuleOp.lte:
        ok = actual <= expected
    elif op is RuleOp.gte:
        ok = actual >= expected
    elif op is RuleOp.between:
        ok = expected[0] <= actual <= expected[1]
    else:  # pragma: no cover
        raise ValueError(f"unhandled op {op!r}")
    return CriterionStatus.passed if ok else CriterionStatus.failed


def evaluate_criterion(profile: UserProfile, criterion: Criterion) -> CriterionTrace:
    if isinstance(criterion, Rule):
        return CriterionTrace(
            label=describe_rule(criterion),
            status=evaluate_rule(profile, criterion),
            field=criterion.field,
        )

    # any_of group: pass if any branch passes; fail only if every branch
    # fails; a mix of fail and unknown stays unknown (a branch might pass).
    assert isinstance(criterion, AnyOfGroup)
    statuses = [evaluate_rule(profile, r) for r in criterion.any_of]
    if CriterionStatus.passed in statuses:
        status = CriterionStatus.passed
    elif all(s is CriterionStatus.failed for s in statuses):
        status = CriterionStatus.failed
    else:
        status = CriterionStatus.unknown
    label = criterion.label or " OR ".join(describe_rule(r) for r in criterion.any_of)
    return CriterionTrace(label=label, status=status, field=None)


def evaluate_scheme(profile: UserProfile, scheme: Scheme) -> SchemeResult:
    traces = [evaluate_criterion(profile, c) for c in scheme.eligibility.rules]
    traces += [
        CriterionTrace(label=item, status=CriterionStatus.unknown, field=None)
        for item in scheme.eligibility.self_check
    ]

    statuses = [t.status for t in traces]
    if CriterionStatus.failed in statuses:
        status = MatchStatus.not_eligible
    elif CriterionStatus.unknown in statuses:
        status = MatchStatus.possibly_eligible
    else:
        status = MatchStatus.eligible

    passed = sum(1 for s in statuses if s is CriterionStatus.passed)
    score = passed / len(statuses) if statuses else 0.0
    return SchemeResult(
        scheme_id=scheme.id, status=status, score=round(score, 4), criteria=traces
    )


def _benefit_amount(scheme: Scheme) -> int:
    return max((b.amount_max or 0) for b in scheme.benefits)


def match_schemes(
    profile: UserProfile, schemes: list[Scheme]
) -> dict[str, list[SchemeResult]]:
    """Evaluate all schemes and return ranked eligible / possibly buckets.

    Ranking: eligible before possibly_eligible; within a bucket, higher
    confirmed-criteria fraction first, then larger benefit amount, then name
    for a stable order. Not-eligible schemes are returned separately so the
    UI can say why without presenting them as matches.
    """
    by_id = {s.id: s for s in schemes}
    results = [evaluate_scheme(profile, s) for s in schemes]

    def sort_key(r: SchemeResult):
        s = by_id[r.scheme_id]
        return (-r.score, -_benefit_amount(s), s.name)

    buckets: dict[str, list[SchemeResult]] = {
        MatchStatus.eligible.value: [],
        MatchStatus.possibly_eligible.value: [],
        MatchStatus.not_eligible.value: [],
    }
    for r in results:
        buckets[r.status.value].append(r)
    for bucket in buckets.values():
        bucket.sort(key=sort_key)
    return buckets
