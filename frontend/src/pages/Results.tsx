import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  TriangleAlert,
} from "lucide-react";
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
        <p className="text-slate-700">No results yet.</p>
        <Link
          to="/find"
          className="mt-3 inline-block rounded font-semibold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Take the two-minute questionnaire →
        </Link>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="py-8">
      <div className="rounded-2xl bg-ink p-5 text-white sm:p-6">
        <h1 className="text-xl font-bold sm:text-2xl">
          {summary.eligible + summary.possibly_eligible} of {summary.total_schemes}{" "}
          schemes match your answers
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          {summary.eligible} confirmed eligible · {summary.possibly_eligible} possible
          (some criteria we couldn't verify) ·{" "}
          <Link
            to="/find"
            className="rounded text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            redo answers
          </Link>
        </p>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          These results come from a verified snapshot of scheme rules — not a
          live government feed.{" "}
          <strong>Always confirm on the official site before applying.</strong>
        </p>
      </div>

      {data.eligible.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CircleCheck className="h-6 w-6 text-emerald-700" aria-hidden="true" />
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
            <CircleHelp className="h-6 w-6 text-amber-700" aria-hidden="true" />
            Possibly eligible — check the open criteria (
            {data.possibly_eligible.length})
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Nothing you answered rules these out, but the conditions marked
            with a question mark couldn't be verified from the questionnaire.
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
          aria-expanded={showRejected}
          className="inline-flex items-center gap-1 rounded text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {showRejected ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
          Not eligible ({data.not_eligible.length}) — see why
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
