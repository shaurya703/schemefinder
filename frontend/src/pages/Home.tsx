import {
  ArrowRight,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Sprout,
  Store,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { icon: GraduationCap, label: "Scholarships" },
  { icon: Sprout, label: "Farming" },
  { icon: Store, label: "Business loans" },
  { icon: House, label: "Housing" },
  { icon: HeartPulse, label: "Health cover" },
  { icon: HandCoins, label: "Pensions" },
];

export default function Home() {
  return (
    <div className="py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          Government schemes you qualify for,{" "}
          <span className="text-primary">in two minutes.</span>
        </h1>
        <p className="mt-5 text-base text-slate-700 sm:text-lg">
          India runs hundreds of scholarships, subsidies, pensions and loan
          schemes — but the rules are scattered across dozens of portals, so
          eligible people never find them. Answer a few quick questions and
          see what you can actually claim, with the exact reasons why.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/find"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-semibold text-white shadow-lg shadow-primary/20 transition-colors duration-200 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none sm:w-auto"
          >
            Find my schemes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/browse"
            className="w-full rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-center font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none sm:w-auto"
          >
            Browse all schemes
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          No login. No personal data stored — answers never leave your browser
          except to compute matches, and are not saved.
        </p>
      </div>

      <ul className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-dark">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-slate-800">{label}</span>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-14 flex max-w-2xl items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Before you apply:</strong> scheme rules and amounts change.
          Every scheme here links to its official portal and shows when we
          last verified it — always confirm there before applying.
        </p>
      </div>
    </div>
  );
}
