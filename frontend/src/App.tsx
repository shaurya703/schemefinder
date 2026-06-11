import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Questionnaire from "./pages/Questionnaire";
import Results from "./pages/Results";
import Browse from "./pages/Browse";
import SchemeDetail from "./pages/SchemeDetail";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-emerald-100 text-emerald-900" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
              S
            </span>
            SchemeFinder
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/find" className={navLink}>
              Find my schemes
            </NavLink>
            <NavLink to="/browse" className={navLink}>
              Browse all
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/find" element={<Questionnaire />} />
          <Route path="/results" element={<Results />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/schemes/:id" element={<SchemeDetail />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="mx-auto max-w-2xl px-4">
          SchemeFinder is an independent, open-source discovery tool — not a
          government website. Always verify eligibility and apply on the
          official portal linked with each scheme.
        </p>
      </footer>
    </div>
  );
}
