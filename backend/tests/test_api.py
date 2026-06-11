"""API integration tests.

Run against a throwaway SQLite database seeded with the real YAML dataset,
so they exercise the same data users see — without needing Postgres.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import create_app
from app.models import SchemeRow
from scripts.validate_data import load_schemes


@pytest.fixture(scope="module")
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    with TestSession() as db:
        for scheme in load_schemes():
            db.add(SchemeRow.from_domain(scheme))
        db.commit()

    app = create_app()

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


class TestHealthAndMeta:
    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["schemes"] >= 40

    def test_meta_vocabularies(self, client):
        r = client.get("/api/meta")
        assert r.status_code == 200
        body = r.json()
        assert "karnataka" in body["states"]
        assert "karnataka" in body["states_with_schemes"]
        assert "scholarship" in body["categories"]
        assert body["disclaimer"]


class TestBrowse:
    def test_list_all(self, client):
        r = client.get("/api/schemes")
        assert r.status_code == 200
        body = r.json()
        assert body["count"] >= 40
        card = body["schemes"][0]
        assert {"id", "name", "category", "description", "benefits"} <= card.keys()

    def test_filter_by_category(self, client):
        r = client.get("/api/schemes", params={"category": "scholarship"})
        assert r.status_code == 200
        assert all(s["category"] == "scholarship" for s in r.json()["schemes"])
        assert r.json()["count"] > 0

    def test_filter_by_state_includes_central(self, client):
        r = client.get("/api/schemes", params={"state": "karnataka"})
        levels = {s["level"] for s in r.json()["schemes"]}
        assert levels == {"central", "state"}
        # another state must not see Karnataka schemes
        r2 = client.get("/api/schemes", params={"state": "bihar"})
        assert all(s["state"] in (None, "bihar") for s in r2.json()["schemes"])

    def test_search(self, client):
        r = client.get("/api/schemes", params={"q": "kisan"})
        ids = [s["id"] for s in r.json()["schemes"]]
        assert "pm-kisan" in ids

    def test_invalid_category_rejected_with_envelope(self, client):
        r = client.get("/api/schemes", params={"category": "nonsense"})
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "validation_error"

    def test_invalid_state_rejected(self, client):
        r = client.get("/api/schemes", params={"state": "atlantis"})
        assert r.status_code == 422
        assert "error" in r.json()

    def test_get_scheme_detail(self, client):
        r = client.get("/api/schemes/pm-kisan")
        assert r.status_code == 200
        body = r.json()
        assert body["name"].startswith("PM-KISAN")
        assert body["eligibility"]["rules"]
        assert body["source_urls"]

    def test_unknown_scheme_404_envelope(self, client):
        r = client.get("/api/schemes/does-not-exist")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "not_found"


class TestMatch:
    def test_empty_profile_everything_possible(self, client):
        r = client.post("/api/match", json={"profile": {}})
        assert r.status_code == 200
        body = r.json()
        assert body["summary"]["eligible"] == 0
        assert body["summary"]["not_eligible"] == 0
        assert body["summary"]["possibly_eligible"] == body["summary"]["total_schemes"]

    def test_sc_student_profile(self, client):
        profile = {
            "age": 19, "state": "karnataka", "gender": "male", "category": "sc",
            "annual_income": 200000, "is_student": True,
            "education_level": "undergraduate",
        }
        r = client.post("/api/match", json={"profile": profile})
        assert r.status_code == 200
        body = r.json()
        matched = {
            m["scheme_id"] for m in body["eligible"] + body["possibly_eligible"]
        }
        assert "nsp-post-matric-sc" in matched
        rejected = {m["scheme_id"] for m in body["not_eligible"]}
        assert "nsp-post-matric-st" in rejected

    def test_match_result_carries_why_traces(self, client):
        profile = {"age": 70, "is_bpl": True}
        r = client.post("/api/match", json={"profile": profile})
        results = {
            m["scheme_id"]: m
            for m in r.json()["eligible"] + r.json()["possibly_eligible"]
        }
        assert "ignoaps" in results
        traces = results["ignoaps"]["criteria"]
        assert all(t["status"] == "pass" for t in traces)
        assert results["ignoaps"]["scheme"]["application_url"].startswith("https://")

    def test_results_ranked_within_bucket(self, client):
        r = client.post("/api/match", json={"profile": {"age": 30}})
        possible = r.json()["possibly_eligible"]
        scores = [m["score"] for m in possible]
        assert scores == sorted(scores, reverse=True)

    def test_invalid_profile_value_rejected(self, client):
        r = client.post("/api/match", json={"profile": {"age": -3}})
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "validation_error"

    def test_unknown_state_rejected(self, client):
        r = client.post("/api/match", json={"profile": {"state": "atlantis"}})
        assert r.status_code == 422

    def test_income_boundary_via_api(self, client):
        profile = {
            "age": 19, "category": "sc", "annual_income": 250000,
            "is_student": True, "education_level": "undergraduate",
        }
        r = client.post("/api/match", json={"profile": profile})
        matched = {
            m["scheme_id"]
            for m in r.json()["eligible"] + r.json()["possibly_eligible"]
        }
        assert "nsp-post-matric-sc" in matched

        profile["annual_income"] = 250001
        r = client.post("/api/match", json={"profile": profile})
        rejected = {m["scheme_id"] for m in r.json()["not_eligible"]}
        assert "nsp-post-matric-sc" in rejected
