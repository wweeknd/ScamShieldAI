import { severityMeta } from "../lib/format";

export default function SeverityBadge({ severity, score, size = "md" }) {
  const s = severityMeta(severity);
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  const kinetic = {
    "High Risk": "bg-primary-container text-on-primary border-primary-container",
    Suspicious: "bg-tertiary-container text-on-tertiary-container border-tertiary-container",
    Safe: "bg-surface-container text-guarded border-guarded/40",
  }[s.label] || "bg-surface-container text-on-surface-variant border-outline-variant/40";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-none border font-semibold ${pad} ${kinetic}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          s.label === "High Risk"
            ? "bg-primary-container"
            : s.label === "Suspicious"
              ? "bg-tertiary-container"
              : "bg-guarded"
        }`}
      />
      {s.label}
      {typeof score === "number" && <span className="opacity-80">· {score}</span>}
    </span>
  );
}