import { AlertTriangle, Inbox, RefreshCw, Zap } from "lucide-react";
import { useDemoMode } from "../context/DemoMode";

/* ---------- Spinner / loading ---------- */
export function Spinner({ className = "h-5 w-5" }) {
  return (
    <span className={`material-symbols-outlined animate-spin-slow ${className}`}>progress_activity</span>
  );
}

export function Loading({ label = "Loading…", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-secondary ${className}`}>
      <Spinner className="h-7 w-7 text-primary-container" />
      <span className="font-label-sm uppercase tracking-widest">{label}</span>
    </div>
  );
}

/* ---------- Error state ---------- */
export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="grid place-items-center h-12 w-12 rounded bg-error-container/20 border border-error/40">
        <AlertTriangle className="h-6 w-6 text-error" />
      </div>
      <div className="text-sm text-on-surface-variant max-w-md">{message}</div>
      {onRetry && (
        <button className="btn-ghost mt-1" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ icon: Icon = Inbox, title = "Nothing here yet", hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="grid place-items-center h-12 w-12 rounded bg-surface-container border border-outline-variant/40">
        {Icon ? (
          <Icon className="h-6 w-6 text-secondary" />
        ) : (
          <span className="material-symbols-outlined text-secondary text-[24px]">inbox</span>
        )}
      </div>
      <div className="text-on-surface font-medium">{title}</div>
      {hint && <div className="text-sm text-secondary max-w-sm">{hint}</div>}
      {action}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className = "" }) {
  return <div className={`animate-shimmer rounded bg-surface-container-high ${className}`} />;
}

/* ---------- Demo mode toggle ---------- */
export function DemoToggle() {
  const { demo, toggle } = useDemoMode();
  return (
    <button
      onClick={toggle}
      title="Demo Mode runs entirely on realistic sample data — no external APIs required. Ideal for live demos."
      className={`inline-flex items-center gap-1.5 px-space-sm py-space-xs rounded font-label-sm uppercase tracking-wider transition-colors ${
        demo
          ? "bg-primary-container text-on-primary font-bold"
          : "bg-surface-container text-secondary hover:text-on-surface"
      }`}
    >
      <Zap className="h-3.5 w-3.5" />
      <span>Demo {demo ? "On" : "Off"}</span>
    </button>
  );
}