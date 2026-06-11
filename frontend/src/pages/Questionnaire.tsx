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
            className="font-medium text-slate-500 underline-offset-2 hover:underline"
            disabled={submitting}
          >
            Skip — I'd rather not say
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
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
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base focus:border-emerald-500 focus:outline-none"
            value={profile.state ?? ""}
            onChange={(e) => answer("state", e.target.value || undefined)}
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
        <p className="mt-4 text-sm text-slate-500">Checking 50 schemes…</p>
      )}

      {stepIndex > 0 && !submitting && (
        <button
          onClick={() => setStepIndex((i) => i - 1)}
          className="mt-8 text-sm font-medium text-slate-500 hover:text-slate-700"
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
      className={`rounded-xl border p-3.5 text-left transition ${
        props.selected
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40"
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
        onChange={(e) => props.setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid && parsed !== undefined) props.onSubmit(parsed);
        }}
        className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base focus:border-emerald-500 focus:outline-none"
        autoFocus
      />
      {props.step.quickPicks && (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.step.quickPicks.map((q) => (
            <button
              key={q.label}
              onClick={() => props.setDraft(String(q.value))}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => props.onSubmit(parsed)}
        disabled={!valid || parsed === undefined}
        className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40"
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
            className={`rounded-xl border p-3 text-left text-sm transition ${
              props.picks.includes(o.value)
                ? "border-emerald-500 bg-emerald-50 font-medium"
                : "border-slate-300 bg-white hover:border-emerald-400"
            }`}
          >
            {o.label}
            {o.hint && <span className="block text-[11px] text-slate-500">{o.hint}</span>}
          </button>
        ))}
      </div>
      <button
        onClick={props.onDone}
        className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700"
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
            className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
              flags[f.field]
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-300 bg-white hover:border-emerald-400"
            }`}
          >
            <span>
              <span className="font-medium">{f.label}</span>
              {f.hint && <span className="block text-xs text-slate-500">{f.hint}</span>}
            </span>
            <span
              className={`grid h-5 w-5 place-items-center rounded border text-xs text-white ${
                flags[f.field] ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
              }`}
            >
              {flags[f.field] ? "✓" : ""}
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
        className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {props.submitting ? "Checking…" : "See my schemes →"}
      </button>
    </div>
  );
}
