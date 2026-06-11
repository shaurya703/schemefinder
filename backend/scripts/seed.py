"""Validate the dataset and load it into the database (idempotent upsert).

Run from backend/:  python -m scripts.seed

Waits for the database to accept connections (compose starts Postgres in
parallel), validates every YAML file, then upserts. Refuses to seed
anything if even one file is invalid.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import SchemeRow  # noqa: E402
from scripts.validate_data import load_schemes  # noqa: E402


def wait_for_db(retries: int = 30, delay: float = 1.0) -> None:
    for attempt in range(retries):
        try:
            with engine.connect():
                return
        except OperationalError:
            if attempt == retries - 1:
                raise
            time.sleep(delay)


def seed() -> int:
    schemes = load_schemes()  # raises if any file is invalid
    wait_for_db()
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        existing = {row.id for row in db.scalars(select(SchemeRow))}
        inserted = updated = 0
        for scheme in schemes:
            row = SchemeRow.from_domain(scheme)
            if scheme.id in existing:
                db.merge(row)
                updated += 1
            else:
                db.add(row)
                inserted += 1
        # drop rows for schemes removed from the dataset
        removed = existing - {s.id for s in schemes}
        for scheme_id in removed:
            db.delete(db.get(SchemeRow, scheme_id))
        db.commit()

    print(f"seeded: {inserted} inserted, {updated} updated, {len(removed)} removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(seed())
