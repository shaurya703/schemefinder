import { ArrowRight, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMeta, matchProfile } from "../api";
import {
  DESCRIBE_OPTIONS,
  FLAG_OPTIONS,
  applyDescribePicks,
  visibleSteps,
  type Step,
} from "../questions";
import type { Meta, Profile } from "../types";

const prettyState = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Questionnaire() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [picks, setPicks] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [numberDraft, setNumberDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMeta().then(setMeta).catch(() => setError("Could not reach the server."));
  }, []);

  const steps = useMemo(() => visibleSteps(profile, picks), [profile, picks]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  function goNext(updated: Profile) {
    setNumberDraft("");
    if (isLast) {
      void submit(updated);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  async function submit(finalProfile: Profile) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await matchProfile(finalProfile);
      sessionStorage.setItem("sf-results", JSON.stringify(res));
      sessionStorage.setItem("sf-profile", JSON.stringify(finalProfile));
      navigate("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  function answer(field: keyof Profile, value: Profile[keyof Profile] | undefined) {
    const updated = { ...profile };
    if (value === undefined) {
      delete updated[field];
    } else {
      (updated as Record<string, unknown>)[field] = value;
    }
    setProfile(updated);
    goNext(updated);
  }

  if (error && !meta) {
    return <p className="py-20 text-center text-rose-600">{error}</p>;
  }
  if (!meta || !step) {
    return <p className="py-20 text-center text-slate-500">Loading…</p>;
  }

  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>
            Question {stepIndex + 1} of {steps.length}
          </span>
          <button
            onClick={() => goNext(profile)}
            className="rounded font-medium text-slate-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            disabled={submitting}
          >
            Skip — I'd rather not say
          </button>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Questionnaire progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold">{step.title}</h2>
      {"sub" in step && step.sub && (
        <p className="mt-1.5 text-sm text-slate-600">{step.sub}</p>
      )}

      <div className="mt-6">
        {step.kind === "number" && (
          <NumberStep
            key={step.id}
            step={step}
            draft={numberDraft}
            setDraft={setNumberDraft}
            onSubmit={(v) => answer(step.field, v)}
          />
        )}

        {step.kind === "choice" && (
          <div className="grid gap-2">
            {step.options.map((o) => (
              <ChoiceButton
                key={o.value}
                label={o.label}
                hint={o.hint}
                selected={profile[step.field] === o.value}
                onClick={() => answer(step.field, o.value)}
              />
            ))}
          </div>
        )}

        {step.kind === "state" && (
          <select
            className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3.5 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={profile.state ?? ""}
            onChange={(e) => answer("state", e.target.value || undefined)}
            aria-label={step.title}
          >
            <option value="">Choose your state…</option>
            {meta.states.map((s) => (
              <option key={s} value={s}>
                {prettyState(s)}
              </option>
            ))}
          </select>
        )}

        {step.kind === "describe" && (
          <MultiPick
            options={DESCRIBE_OPTIONS}
            picks={picks}
            setPicks={setPicks}
            onDone={() => {
              const updated = applyDescribePicks(profile, picks);
              setProfile(updated);
              goNext(updated);
            }}
          />
        )}

        {step.kind === "flags" && (
          <FlagsStep
            profile={profile}
            onDone={(updated) => {
              setProfile(updated);
              goNext(updated);
            }}
            submitting={submitting}
          />
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {submitting && (
        <p className="mt-4 text-sm text-slate-500">Checking every scheme…</p>
      )}

      {stepIndex > 0 && !submitting && (
        <button
          onClick={() => setStepIndex((i) => i - 1)}
          className="mt-8 rounded text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

function ChoiceButton(props: {
  label: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`rounded-xl border p-3.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none ${
        props.selected
          ? "border-primary bg-primary-soft"
          : "border-slate-300 bg-white hover:border-primary/60 hover:bg-primary-soft/40"
      }`}
    >
      <span className="font-medium">{props.label}</span>
      {props.hint && <span className="block text-xs text-slate-500">{props.hint}</span>}
    </button>
  );
}

function NumberStep(props: {
  step: Extract<Step, { kind: "number" }>;
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: (v: number | undefined) => void;
}) {
  const parsed = props.draft === "" ? undefined : Number(props.draft);
  const valid = parsed === undefined || (!Number.isNaN(parsed) && parsed >= 0);
  return (
    <div>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={props.draft}
        placeholder={props.step.placeholder}
        aria-label={props.step.title}
        onChange={(e) => props.setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid && parsed !== undefined) props.onSubmit(parsed);
        }}
        className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        autoFocus
      />
      {props.step.quickPicks && (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.step.quickPicks.map((q) => (
            <button
              key={q.label}
              onClick={() => props.setDraft(String(q.value))}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => props.onSubmit(parsed)}
        disabled={!valid || parsed === undefined}
        className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-white transition-colors duration-200 enabled:hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
      >
        Next
      </button>
    </div>
  );
}

function MultiPick(props: {
  options: { value: string; label: string; hint?: string }[];
  picks: string[];
  setPicks: (p: string[]) => void;
  onDone: () => void;
}) {
  const toggle = (v: string) =>
    props.setPicks(
      props.picks.includes(v)
        ? props.picks.filter((x) => x !== v)
        : [...props.picks, v],
    );
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {props.options.map((o) => (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            aria-pressed={props.picks.includes(o.value)}
            className={`rounded-xl border p-3 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none ${
              props.picks.includes(o.value)
                ? "border-primary bg-primary-soft font-medium"
                : "border-slate-300 bg-white hover:border-primary/60"
            }`}
          >
            {o.label}
            {o.hint && <span className="block text-[11px] text-slate-500">{o.hint}</span>}
          </button>
        ))}
      </div>
      <button
        onClick={props.onDone}
        className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        Next
      </button>
    </div>
  );
}

function FlagsStep(props: {
  profile: Profile;
  onDone: (p: Profile) => void;
  submitting: boolean;
}) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  return (
    <div>
      <div className="grid gap-2">
        {FLAG_OPTIONS.map((f) => (
          <button
            key={f.field}
            onClick={() => setFlags((prev) => ({ ...prev, [f.field]: !prev[f.field] }))}
            aria-pressed={!!flags[f.field]}
            className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none ${
              flags[f.field]
                ? "border-primary bg-primary-soft"
                : "border-slate-300 bg-white hover:border-primary/60"
            }`}
          >
            <span>
              <span className="font-medium">{f.label}</span>
              {f.hint && <span className="block text-xs text-slate-500">{f.hint}</span>}
            </span>
            <span
              className={`grid h-5 w-5 place-items-center rounded border text-white ${
                flags[f.field] ? "border-primary bg-primary" : "border-slate-300"
              }`}
            >
              {flags[f.field] && (
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              )}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          const updated = { ...props.profile };
          for (const f of FLAG_OPTIONS) {
            // only ticked boxes are asserted; unticked stays unknown so the
            // engine never wrongly rules a scheme out
            if (flags[f.field]) (updated as Record<string, unknown>)[f.field] = true;
          }
          props.onDone(updated);
        }}
        disabled={props.submitting}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
      >
        {props.submitting ? "Checking…" : "See my schemes"}
        {!props.submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
