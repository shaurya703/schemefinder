"""Validate every scheme YAML file against the schema.

Run from backend/:  python -m scripts.validate_data

Exits non-zero if any file fails, so it can gate CI and the seed script.
Checks, per file: schema conformance (field vocabulary, operator/value
types, enum membership, URL shape, state consistency) plus dataset-wide
unique ids. Prints a summary of categories and rule fields used.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

import yaml
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.schemas import AnyOfGroup, Rule, Scheme  # noqa: E402

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "schemes"


def load_schemes(data_dir: Path = DATA_DIR) -> list[Scheme]:
    """Parse and validate all scheme files; raises on the first bad file."""
    schemes = []
    for path in sorted(data_dir.glob("*.yaml")):
        with open(path) as f:
            raw = yaml.safe_load(f)
        schemes.append(Scheme.model_validate(raw))
    return schemes


def main() -> int:
    files = sorted(DATA_DIR.glob("*.yaml"))
    if not files:
        print(f"no scheme files found in {DATA_DIR}")
        return 1

    errors: list[tuple[str, str]] = []
    schemes: list[Scheme] = []
    for path in files:
        try:
            with open(path) as f:
                raw = yaml.safe_load(f)
            scheme = Scheme.model_validate(raw)
        except (yaml.YAMLError, ValidationError) as exc:
            errors.append((path.name, str(exc)))
            continue
        if scheme.id != path.stem:
            errors.append((path.name, f"id {scheme.id!r} must match filename stem"))
            continue
        schemes.append(scheme)

    dupes = [i for i, n in Counter(s.id for s in schemes).items() if n > 1]
    if dupes:
        errors.append(("<dataset>", f"duplicate ids: {dupes}"))

    if errors:
        for name, msg in errors:
            print(f"FAIL {name}\n{msg}\n")
        print(f"{len(errors)} file(s) failed, {len(schemes)} passed")
        return 1

    cats = Counter(s.category.value for s in schemes)
    fields: Counter[str] = Counter()
    for s in schemes:
        for c in s.eligibility.rules:
            if isinstance(c, Rule):
                fields[c.field] += 1
            elif isinstance(c, AnyOfGroup):
                for r in c.any_of:
                    fields[r.field] += 1

    print(f"OK: {len(schemes)} schemes valid")
    print(f"  central: {sum(1 for s in schemes if s.level == 'central')}, "
          f"state: {sum(1 for s in schemes if s.level == 'state')}")
    print("  categories:", dict(sorted(cats.items())))
    print("  rule fields used:", dict(fields.most_common()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
