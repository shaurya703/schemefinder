"""SQLAlchemy table for schemes.

Structured parts (benefits, eligibility, documents, urls, tags) live in
JSON columns: the engine consumes them as validated Pydantic models, the
filterable scalars (category, level, state) are real columns.
"""

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .schemas import Scheme


class SchemeRow(Base):
    __tablename__ = "schemes"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    level: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    state: Mapped[str | None] = mapped_column(String(60), index=True, nullable=True)
    ministry: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    benefits: Mapped[list] = mapped_column(JSON, nullable=False)
    eligibility: Mapped[dict] = mapped_column(JSON, nullable=False)
    required_documents: Mapped[list] = mapped_column(JSON, nullable=False)
    application_url: Mapped[str] = mapped_column(String(500), nullable=False)
    source_urls: Mapped[list] = mapped_column(JSON, nullable=False)
    last_verified: Mapped[str] = mapped_column(String(10), nullable=False)
    tags: Mapped[list] = mapped_column(JSON, nullable=False)

    @classmethod
    def from_domain(cls, s: Scheme) -> "SchemeRow":
        d = s.model_dump(mode="json")
        return cls(**d)

    def to_domain(self) -> Scheme:
        return Scheme.model_validate(
            {c.name: getattr(self, c.name) for c in self.__table__.columns}
        )
