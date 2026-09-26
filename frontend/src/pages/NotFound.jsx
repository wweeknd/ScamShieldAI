import { useEffect } from "react";
import { Compass, LayoutDashboard, ScanSearch, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { SITE_NAME } from "../lib/site";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze a message", icon: ScanSearch },
  { to: "/network", label: "Scam Network", icon: Compass },
];

export default function NotFound() {
  useDocumentMeta({
    title: `Page Not Found — ${SITE_NAME}`,
    description: "The page you were looking for doesn't exist. Return to the ScamShield AI dashboard.",
    path: "/404",
  });

  // 404s should not be indexed. Update the existing robots meta in place
  // (index.html ships one) and restore it when navigating away, so we never
  // leave two conflicting robots tags in the head.
  useEffect(() => {
    let el = document.head.querySelector('meta[name="robots"]');
    const created = !el;
    const previous = el ? el.getAttribute("content") : null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, follow");
    return () => {
      if (created) el.remove();
      else if (previous != null) el.setAttribute("content", previous);
    };
  }, []);

  return (
    <div className="animate-fade-up">
      <Breadcrumbs items={[{ label: "Page not found" }]} />
      <div className="card flex flex-col items-center text-center py-16">
        <div className="grid place-items-center h-16 w-16 rounded-2xl bg-danger/10 border border-danger/30 mb-4">
          <ShieldAlert className="h-8 w-8 text-danger" aria-hidden="true" />
        </div>
        <div className="text-5xl font-extrabold text-white tracking-tight">404</div>
        <h1 className="text-xl font-semibold text-white mt-3">This page couldn't be found</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          The link may be broken or the page may have been moved. Here are some useful places to go
          instead:
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="btn btn-ghost">
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
