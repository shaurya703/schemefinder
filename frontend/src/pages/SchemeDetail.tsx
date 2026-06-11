import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getScheme } from "../api";
import type { SchemeDetail as Detail } from "../types";

interface Ruleish {
  field?: string;
  op?: string;
  value?: unknown;
  label?: string | null;
  any_of?: Ruleish[];
}

const pretty = (s: string) => s.replace(/_/g, " ");

function ruleText(r: Ruleish): string {
  if (r.label) return r.label;
  if (r.any_of) return r.any_of.map(ruleText).join(" — OR — ");
  const field = pretty(r.field ?? "");
  const value = Array.isArray(r.value)
    ? (r.value as unknown[]).map((v) => pretty(String(v))).join(", ")
    : pretty(String(r.value));
  switch (r.op) {
    case "lte":
      return `${field}: at most ${value}`;
    case "gte":
      return `${field}: at least ${value}`;
    case "between":
      return `${field}: ${(r.value as number[])[0]}–${(r.value as number[])[1]}`;
    case "in":
      return `${field}: one of ${value}`;
    case "ne":
      return `${field}: not ${value}`;
    default:
      return `${field}: ${value}`;
  }
}

export default function SchemeDetail() {
  const { id } = useParams();
  const [scheme, setScheme] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) getScheme(id).then(setScheme).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-600">{error}</p>
        <Link to="/browse" className="mt-3 inline-block font-semibold text-emerald-600">
          ← Back to all schemes
        </Link>
      </div>
    );
  }
  if (!scheme) return <p className="py-20 text-center text-slate-500">Loading…</p>;

  const rules = scheme.eligibility.rules as Ruleish[];

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Link to="/browse" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        ← All schemes
      </Link>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          {pretty(scheme.category)}
        </span>
        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
          {scheme.level === "central" ? "Central government" : pretty(scheme.state ?? "")}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold leading-tight">{scheme.name}</h1>
      <p className="mt-1 text-sm text-slate-500">{scheme.ministry}</p>
      <p className="mt-4 text-slate-700">{scheme.description}</p>

      <Section title="Benefits">
        <ul className="space-y-2">
          {scheme.benefits.map((b, i) => (
            <li key={i} className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
              {b.summary}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Who is eligible">
        <ul className="list-inside space-y-1.5 text-sm text-slate-700">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-emerald-600">•</span>
              <span className="capitalize">{ruleText(r)}</span>
            </li>
          ))}
          {scheme.eligibility.self_check.map((s, i) => (
            <li key={`sc-${i}`} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>
                {s} <span className="text-xs text-slate-400">(verify yourself)</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Documents needed">
        <ul className="grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
          {scheme.required_documents.map((d) => (
            <li key={d} className="flex items-center gap-2">
              <span className="text-slate-400">▢</span> {d}
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
        <a
          href={scheme.application_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-emerald-600 px-6 py-3 text-center font-semibold text-white hover:bg-emerald-700"
        >
          Apply on official site ↗
        </a>
        <span className="text-xs text-slate-500">
          Verified {scheme.last_verified} ·{" "}
          <a
            href={scheme.source_urls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            official source
          </a>
        </span>
      </div>

      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
        Rules and amounts change — this entry is a verified snapshot. Confirm
        the latest criteria on the official site before applying.
      </p>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {props.title}
      </h2>
      <div className="mt-2">{props.children}</div>
    </section>
  );
}
