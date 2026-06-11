import { Landmark } from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Questionnaire from "./pages/Questionnaire";
import Results from "./pages/Results";
import Browse from "./pages/Browse";
import SchemeDetail from "./pages/SchemeDetail";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
    isActive ? "bg-primary-soft text-primary-dark" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg font-display text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
              <Landmark className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            SchemeFinder
          </Link>
          <nav className="flex gap-1" aria-label="Main">
            <NavLink to="/find" className={navLink}>
              Find my schemes
            </NavLink>
            <NavLink to="/browse" className={navLink}>
              Browse all
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/find" element={<Questionnaire />} />
          <Route path="/results" element={<Results />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/schemes/:id" element={<SchemeDetail />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-600">
        <p className="mx-auto max-w-2xl px-4">
          SchemeFinder is an independent, open-source discovery tool — not a
          government website. Always verify eligibility and apply on the
          official portal linked with each scheme.
        </p>
      </footer>
    </div>
  );
}
