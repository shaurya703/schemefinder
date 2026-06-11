import { useState } from "react";
import type { CriterionStatus, MatchResult } from "../types";

const STATUS_ICON: Record<CriterionStatus, { icon: string; cls: string; text: string }> = {
  pass: { icon: "✓", cls: "bg-emerald-100 text-emerald-700", text: "confirmed from your answers" },
  unknown: { icon: "?", cls: "bg-amber-100 text-amber-700", text: "not verified — check yourself" },
  fail: { icon: "✗", cls: "bg-rose-100 text-rose-700", text: "does not match your answers" },
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
        className="block w-full p-4 text-left sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {prettyCategory(s.category)}
          </span>
          {s.level === "state" && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              {s.state?.replace(/_/g, " ")}
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {passed}/{result.criteria.length} criteria confirmed
          </span>
        </div>
        <h3 className="mt-2 font-bold leading-snug">{s.name}</h3>
        <p className="mt-1 text-sm font-medium text-emerald-700">
          {s.benefits[0]?.summary}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.description}</p>
        <span className="mt-2 inline-block text-xs font-semibold text-emerald-600">
          {open ? "Hide details ▲" : "Why am I matched? Documents & how to apply ▼"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Why you're matched
          </h4>
          <ul className="mt-2 space-y-1.5">
            {result.criteria.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${STATUS_ICON[c.status].cls}`}
                >
                  {STATUS_ICON[c.status].icon}
                </span>
                <span>
                  {c.label}{" "}
                  <span className="text-xs text-slate-400">
                    — {STATUS_ICON[c.status].text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {s.benefits.length > 1 && (
            <>
              <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                All benefits
              </h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                {s.benefits.map((b, i) => (
                  <li key={i}>{b.summary}</li>
                ))}
              </ul>
            </>
          )}

          <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Documents you'll need
          </h4>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {s.required_documents.map((d) => (
              <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="text-slate-400">▢</span> {d}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href={s.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Apply on official site ↗
            </a>
            <span className="text-xs text-slate-500">
              {s.ministry} · verified {s.last_verified} ·{" "}
              <a
                href={s.source_urls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
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
