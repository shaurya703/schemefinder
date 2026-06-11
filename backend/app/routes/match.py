from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..engine import match_schemes
from ..models import SchemeRow
from ..schemas import SchemeResult, UserProfile
from .schemes import scheme_card

router = APIRouter(prefix="/api", tags=["match"])


class MatchRequest(BaseModel):
    profile: UserProfile


def enriched(result: SchemeResult, scheme) -> dict:
    """A match result joined with the scheme card and application info."""
    return {
        **result.model_dump(mode="json"),
        "scheme": {
            **scheme_card(scheme),
            "required_documents": scheme.required_documents,
            "application_url": str(scheme.application_url),
            "source_urls": [str(u) for u in scheme.source_urls],
            "ministry": scheme.ministry,
            "last_verified": scheme.last_verified.isoformat(),
        },
    }


@router.post("/match")
def match(req: MatchRequest, db: Session = Depends(get_db)):
    """Evaluate the profile against every scheme. Nothing is stored."""
    rows = db.scalars(select(SchemeRow)).all()
    schemes = [r.to_domain() for r in rows]
    by_id = {s.id: s for s in schemes}

    buckets = match_schemes(req.profile, schemes)
    answered = {
        k for k, v in req.profile.model_dump().items() if v is not None
    }
    return {
        "summary": {
            "total_schemes": len(schemes),
            "eligible": len(buckets["eligible"]),
            "possibly_eligible": len(buckets["possibly_eligible"]),
            "not_eligible": len(buckets["not_eligible"]),
            "fields_answered": sorted(answered),
        },
        "eligible": [enriched(r, by_id[r.scheme_id]) for r in buckets["eligible"]],
        "possibly_eligible": [
            enriched(r, by_id[r.scheme_id]) for r in buckets["possibly_eligible"]
        ],
        "not_eligible": [
            enriched(r, by_id[r.scheme_id]) for r in buckets["not_eligible"]
        ],
    }
