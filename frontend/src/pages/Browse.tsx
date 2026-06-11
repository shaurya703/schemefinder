import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMeta, listSchemes } from "../api";
import type { Meta, SchemeCard } from "../types";

const pretty = (s: string) => s.replace(/_/g, " ");

export default function Browse() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [schemes, setSchemes] = useState<SchemeCard[]>([]);
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      listSchemes({ category: category || undefined, state: state || undefined, q: q || undefined })
        .then((res) => {
          setSchemes(res.schemes);
          setError(null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, q ? 250 : 0); // debounce typing only
    return () => clearTimeout(t);
  }, [category, state, q]);

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">All schemes</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every scheme in the dataset, with official links. Use{" "}
        <Link to="/find" className="font-semibold text-emerald-600">
          Find my schemes
        </Link>{" "}
        to filter by your own eligibility.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, keyword…"
          className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-emerald-500 focus:outline-none sm:max-w-xs"
        />
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white p-3 text-sm"
        >
          <option value="">All states (central only + state)</option>
          {meta?.states.map((s) => (
            <option key={s} value={s}>
              Available in {pretty(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FilterChip label="All" active={category === ""} onClick={() => setCategory("")} />
        {meta?.categories.map((c) => (
          <FilterChip
            key={c}
            label={pretty(c)}
            active={category === c}
            onClick={() => setCategory(category === c ? "" : c)}
          />
        ))}
      </div>

      {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}
      {loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

      {!loading && (
        <>
          <p className="mt-5 text-xs text-slate-500">{schemes.length} schemes</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {schemes.map((s) => (
              <Link
                key={s.id}
                to={`/schemes/${s.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400"
              >
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {pretty(s.category)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      s.level === "central"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {s.level === "central" ? "Central" : pretty(s.state ?? "")}
                  </span>
                </div>
                <h3 className="mt-2 font-bold leading-snug">{s.name}</h3>
                <p className="mt-1 text-sm font-medium text-emerald-700">
                  {s.benefits[0]?.summary}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
        props.active
          ? "bg-emerald-600 text-white"
          : "border border-slate-300 bg-white text-slate-600 hover:border-emerald-400"
      }`}
    >
      {props.label}
    </button>
  );
}
