import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { DemoToggle } from "./ui";

const TITLES = {
  "/": "Dashboard",
  "/analyze": "Analyze Threat",
  "/network": "Scam Network",
  "/history": "Threat Log / History",
  "/privacy": "Privacy",
  "/terms": "Terms",
};

export default function Topbar({ status, onMenu }) {
  const { pathname } = useLocation();
  const title =
    TITLES[pathname] || (pathname.startsWith("/report") ? "Threat Report" : "ScamShield AI");

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 z-40 px-space-lg flex items-center justify-between">
      <div className="flex items-center gap-space-md">
        <button
          className="lg:hidden text-on-surface-variant hover:text-on-surface"
          onClick={onMenu}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container border border-outline-variant/40 rounded font-label-sm">
          <span className="material-symbols-outlined text-[14px] text-primary">database</span>
          <span>
            VIRUSTOTAL API: <span className="text-on-surface font-semibold">CACHED</span>
          </span>
          <span className="text-outline-variant">|</span>
          <span className="material-symbols-outlined text-[14px] text-tertiary-container">account_tree</span>
          <span>
            LANGGRAPH: <span className="text-on-surface font-semibold">ACTIVE</span>
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-space-xs px-space-sm py-space-xs bg-primary-container/10 border border-primary-container/40 rounded font-label-sm text-primary">
          <span className="material-symbols-outlined text-[14px]">science</span>
          <span className="uppercase font-semibold tracking-wider">
            DEMO MODE: ACTIVE (4 CORRELATED ATTACKS SEEDED)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-md">
        <DemoToggle />
        <Link
          to="/analyze"
          className="btn-primary hidden sm:inline-flex"
        >
          <span className="material-symbols-outlined text-[18px]">radar</span>
          New Analysis
        </Link>
      </div>
    </header>
  );
}