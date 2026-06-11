import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ResultCard from "../components/ResultCard";
import type { MatchResponse } from "../types";

export default function Results() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("sf-results");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600">No results yet.</p>
        <Link to="/find" className="mt-3 inline-block font-semibold text-emerald-600">
          Take the two-minute questionnaire →
        </Link>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="py-8">
      <div className="rounded-2xl bg-emerald-600 p-5 text-white sm:p-6">
        <h1 className="text-xl font-bold sm:text-2xl">
          {summary.eligible + summary.possibly_eligible} of {summary.total_schemes}{" "}
          schemes match your answers
        </h1>
        <p className="mt-1 text-sm text-emerald-50">
          {summary.eligible} confirmed eligible · {summary.possibly_eligible} possible
          (some criteria we couldn't verify) ·{" "}
          <Link to="/find" className="underline underline-offset-2">
            redo answers
          </Link>
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 sm:text-sm">
        These results come from a verified snapshot of scheme rules — not a live
        government feed. <strong>Always confirm on the official site before applying.</strong>
      </div>

      {data.eligible.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-sm text-emerald-700">
              ✓
            </span>
            Eligible — every criterion matches ({data.eligible.length})
          </h2>
          <div className="mt-3 space-y-3">
            {data.eligible.map((r) => (
              <ResultCard key={r.scheme_id} result={r} />
            ))}
          </div>
        </section>
      )}

      {data.possibly_eligible.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-sm text-amber-700">
              ?
            </span>
            Possibly eligible — check the open criteria (
            {data.possibly_eligible.length})
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Nothing you answered rules these out, but some conditions (marked{" "}
            <span className="font-semibold text-amber-700">?</span>) couldn't be
            verified from the questionnaire.
          </p>
          <div className="mt-3 space-y-3">
            {data.possibly_eligible.map((r) => (
              <ResultCard key={r.scheme_id} result={r} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <button
          onClick={() => setShowRejected((s) => !s)}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          {showRejected ? "▼" : "▶"} Not eligible ({data.not_eligible.length}) — see why
        </button>
        {showRejected && (
          <div className="mt-3 space-y-3">
            {data.not_eligible.map((r) => (
              <ResultCard key={r.scheme_id} result={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
