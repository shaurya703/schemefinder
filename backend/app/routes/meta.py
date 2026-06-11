from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import DISCLAIMER
from ..db import get_db
from ..models import SchemeRow
from ..schemas import (
    INDIAN_STATES,
    Area,
    EducationLevel,
    Gender,
    Occupation,
    SchemeCategory,
    SocialCategory,
)

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(SchemeRow))
    return {"status": "ok", "schemes": count}


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    """Vocabularies the frontend needs to render filters and questions."""
    states_with_schemes = sorted(
        s for (s,) in db.execute(
            select(SchemeRow.state).where(SchemeRow.state.is_not(None)).distinct()
        )
    )
    return {
        "disclaimer": DISCLAIMER,
        "categories": [c.value for c in SchemeCategory],
        "states": INDIAN_STATES,
        "states_with_schemes": states_with_schemes,
        "genders": [g.value for g in Gender],
        "social_categories": [c.value for c in SocialCategory],
        "occupations": [o.value for o in Occupation],
        "education_levels": [e.value for e in EducationLevel],
        "areas": [a.value for a in Area],
    }
