import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://schemefinder:schemefinder@localhost:5432/schemefinder",
)

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    if o.strip()
]

DISCLAIMER = (
    "SchemeFinder is an independent discovery tool, not a government service. "
    "Scheme rules and amounts change; this dataset is a verified snapshot, not "
    "a live feed. Always confirm eligibility and apply only on the official "
    "site linked with each scheme."
)
