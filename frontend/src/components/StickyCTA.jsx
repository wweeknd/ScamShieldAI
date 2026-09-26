import { ScanSearch } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

/**
 * "Book a Trial Class" equivalent: a sticky bottom bar that pulses softly and
 * snaps into view on scroll. Reads as an always-available action, never a popup.
 */
export default function StickyCTA() {
  const { pathname } = useLocation();
  // Don't duplicate the analyze affordance while already on the analyze page.
  if (pathname === "/analyze") return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <Link
        to="/analyze"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-ink-950 bg-accent
                   shadow-[0_0_40px_-8px_rgba(255,90,0,0.8)] hover:brightness-110
                   transition-all duration-200 animate-pulse-soft"
        aria-label="Open the threat analyzer"
      >
        <ScanSearch className="h-4 w-4" />
        Analyze a threat
      </Link>
    </div>
  );
}