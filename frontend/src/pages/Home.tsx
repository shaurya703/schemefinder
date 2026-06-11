import { Link } from "react-router-dom";

const CATEGORIES = [
  { emoji: "🎓", label: "Scholarships" },
  { emoji: "🌾", label: "Farming" },
  { emoji: "💼", label: "Business loans" },
  { emoji: "🏠", label: "Housing" },
  { emoji: "🏥", label: "Health cover" },
  { emoji: "👵", label: "Pensions" },
];

export default function Home() {
  return (
    <div className="py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          Government schemes you qualify for,{" "}
          <span className="text-emerald-600">in two minutes.</span>
        </h1>
        <p className="mt-5 text-base text-slate-600 sm:text-lg">
          India runs hundreds of scholarships, subsidies, pensions and loan
          schemes — but the rules are scattered across dozens of portals, so
          eligible people never find them. Answer a few quick questions and
          see what you can actually claim, with the exact reasons why.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/find"
            className="w-full rounded-xl bg-emerald-600 px-8 py-3.5 text-center font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:w-auto"
          >
            Find my schemes →
          </Link>
          <Link
            to="/browse"
            className="w-full rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            Browse all schemes
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          No login. No personal data stored — answers never leave your browser
          except to compute matches, and are not saved.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <span className="text-2xl">{c.emoji}</span>
            <span className="text-sm font-medium text-slate-700">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Before you apply:</strong> scheme rules and amounts change.
        Every scheme here links to its official portal and shows when we last
        verified it — always confirm there before applying.
      </div>
    </div>
  );
}
