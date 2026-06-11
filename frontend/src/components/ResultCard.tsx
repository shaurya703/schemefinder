import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ExternalLink,
  Square,
  X,
} from "lucide-react";
import { useState } from "react";
import type { CriterionStatus, MatchResult } from "../types";

const STATUS_META: Record<
  CriterionStatus,
  { Icon: typeof Check; cls: string; text: string }
> = {
  pass: {
    Icon: Check,
    cls: "bg-emerald-100 text-emerald-800",
    text: "confirmed from your answers",
  },
  unknown: {
    Icon: CircleHelp,
    cls: "bg-amber-100 text-amber-800",
    text: "not verified — check yourself",
  },
  fail: {
    Icon: X,
    cls: "bg-rose-100 text-rose-800",
    text: "does not match your answers",
  },
};

const prettyCategory = (c: string) => c.replace(/_/g, " & ");

export default function ResultCard({ result }: { result: MatchResult }) {
  const [open, setOpen] = useState(false);
  const s = result.scheme;
  const passed = result.criteria.filter((c) => c.status === "pass").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full p-4 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary motion-reduce:transition-none sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            {prettyCategory(s.category)}
          </span>
          {s.level === "state" && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
              {s.state?.replace(/_/g, " ")}
            </span>
          )}
          <span className="ml-auto text-xs font-medium text-slate-500">
            {passed}/{result.criteria.length} criteria confirmed
          </span>
        </div>
        <h3 className="mt-2 font-bold leading-snug">{s.name}</h3>
        <p className="mt-1 text-sm font-semibold text-primary-dark">
          {s.benefits[0]?.summary}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-700">{s.description}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          {open ? (
            <>
              Hide details <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              Why am I matched? Documents &amp; how to apply{" "}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Why you're matched
          </h4>
          <ul className="mt-2 space-y-1.5">
            {result.criteria.map((c, i) => {
              const meta = STATUS_META[c.status];
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${meta.cls}`}
                  >
                    <meta.Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>
                    {c.label}{" "}
                    <span className="text-xs text-slate-500">— {meta.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          {s.benefits.length > 1 && (
            <>
              <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-600">
                All benefits
              </h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                {s.benefits.map((b, i) => (
                  <li key={i}>{b.summary}</li>
                ))}
              </ul>
            </>
          )}

          <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-600">
            Documents you'll need
          </h4>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {s.required_documents.map((d) => (
              <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                <Square className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href={s.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Apply on official site
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <span className="text-xs text-slate-600">
              {s.ministry} · verified {s.last_verified} ·{" "}
              <a
                href={s.source_urls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-primary"
              >
                source
              </a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
