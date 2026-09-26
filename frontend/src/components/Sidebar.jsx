import { ShieldCheck, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useDemoMode } from "../context/DemoMode";

const NAV = [
  { to: "/", label: "Dashboard", icon: "grid_view" },
  { to: "/analyze", label: "Analyze Threat", icon: "radar" },
  { to: "/network", label: "Scam Network", icon: "hub" },
  { to: "/history", label: "Threat Log / History", icon: "receipt_long" },
  { to: "/privacy", label: "Privacy", icon: "shield" },
  { to: "/terms", label: "Terms", icon: "gavel" },
];

function Icon({ name, className = "text-[18px]" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function Sidebar({ status = "connecting", open, onClose }) {
  const { demo } = useDemoMode();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-72 flex flex-col justify-between
          bg-surface-container-lowest border-r border-outline-variant/30
          transition-transform duration-300 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col">
          {/* brand */}
          <div className="px-space-lg pt-space-lg pb-space-md border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(255,86,37,0.35)]">
                <ShieldCheck className="w-5 h-5 text-on-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm uppercase tracking-wider text-on-surface">
                  SCAMSHIELD // AI
                </span>
                <span className="font-label-sm uppercase tracking-widest text-primary">
                  CROSS-CHANNEL CORRELATION
                </span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container border border-outline-variant/40 rounded">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-label-sm uppercase tracking-widest text-on-surface">
                  AI ENGINE ● ONLINE
                </span>
              </div>
            </div>
          </div>

          {/* nav */}
          <nav className="flex flex-col gap-space-xs px-space-md py-space-lg">
            {NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-space-md px-space-md py-space-sm rounded transition-colors uppercase tracking-wider font-label-md ${
                    isActive
                      ? "bg-primary-container text-on-primary font-bold shadow-[0_0_12px_rgba(255,86,37,0.25)]"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={icon} className={isActive ? "text-on-primary" : ""} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-space-md border-t border-outline-variant/20 flex flex-col gap-space-sm bg-surface-container-low">
          {demo && (
            <div className="chip w-full justify-center border-primary-container/40 bg-primary-container/10 text-primary">
              ● Demo Mode active
            </div>
          )}
          <div className="flex items-center justify-between font-label-sm uppercase tracking-wider text-secondary">
            <span>STATUS</span>
            <span className="text-primary uppercase">SECURE NODE</span>
          </div>
          <div className="p-space-sm bg-surface-container border border-outline-variant/30 rounded font-label-sm flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-secondary">LATENCY</span>
              <span className="text-on-surface font-semibold">14ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">INGESTION</span>
              <span className="text-on-surface font-semibold">4.2k/sec</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}