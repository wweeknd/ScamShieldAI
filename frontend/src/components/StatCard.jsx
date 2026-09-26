export default function StatCard({ icon: Icon, label, value, tone = "primary", hint }) {
  const tones = {
    primary: "text-primary border-primary-container/40 bg-primary-container/10",
    danger: "text-critical-risk border-error/40 bg-error-container/15",
    warn: "text-elevated-threat border-tertiary-container/40 bg-tertiary-container/10",
    safe: "text-guarded border-guarded/40 bg-guarded/10",
    secondary: "text-on-surface border-outline-variant/40 bg-surface-container",
  };
  const t = tones[tone] || tones.primary;
  return (
    <div className="flex items-center gap-space-md p-space-lg bg-surface-container border border-outline-variant/30">
      <div className={`grid place-items-center h-10 w-10 rounded border ${t}`}>
        {Icon && <Icon className={`h-5 w-5 ${t.split(" ")[0]}`} />}
      </div>
      <div className="min-w-0">
        <div className="font-display-xl tracking-tight text-on-surface leading-none">
          {value}
        </div>
        <div className="font-label-sm uppercase tracking-widest text-text-muted font-semibold mt-1">
          {label}
        </div>
        {hint && <div className="text-[11px] text-secondary mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}