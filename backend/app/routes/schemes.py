from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import SchemeRow
from ..schemas import INDIAN_STATES, Scheme, SchemeCategory

router = APIRouter(prefix="/api/schemes", tags=["schemes"])


def scheme_card(s: Scheme) -> dict:
    """Compact representation used in lists; detail view returns the lot."""
    return {
        "id": s.id,
        "name": s.name,
        "category": s.category.value,
        "level": s.level,
        "state": s.state,
        "description": s.description.strip(),
        "benefits": [b.model_dump() for b in s.benefits],
        "tags": s.tags,
    }


@router.get("")
def list_schemes(
    db: Session = Depends(get_db),
    category: Optional[SchemeCategory] = None,
    state: Optional[str] = Query(
        default=None,
        description="Return central schemes plus this state's schemes",
    ),
    q: Optional[str] = Query(default=None, max_length=100),
    tag: Optional[str] = None,
):
    if state is not None and state not in INDIAN_STATES:
        raise HTTPException(status_code=422, detail=f"unknown state {state!r}")

    rows = db.scalars(select(SchemeRow).order_by(SchemeRow.name)).all()
    schemes = [r.to_domain() for r in rows]

    if category is not None:
        schemes = [s for s in schemes if s.category == category]
    if state is not None:
        schemes = [s for s in schemes if s.level == "central" or s.state == state]
    if tag is not None:
        schemes = [s for s in schemes if tag in s.tags]
    if q:
        needle = q.lower()
        schemes = [
            s for s in schemes
            if needle in s.name.lower()
            or needle in s.description.lower()
            or any(needle in t for t in s.tags)
        ]

    return {"count": len(schemes), "schemes": [scheme_card(s) for s in schemes]}


@router.get("/{scheme_id}")
def get_scheme(scheme_id: str, db: Session = Depends(get_db)):
    row = db.get(SchemeRow, scheme_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"scheme {scheme_id!r} not found")
    return row.to_domain().model_dump(mode="json")
