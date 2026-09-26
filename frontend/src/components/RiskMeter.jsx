import { useEffect, useState } from "react";
import { severityMeta } from "../lib/format";

/**
 * Arc risk gauge (Stitch "Arc Risk Meter"). Animates from 0 to `score`.
 * 120x120 SVG arc with a fiery primary-container stroke.
 */
export default function RiskMeter({ score = 0, severity, size = 200 }) {
  const [val, setVal] = useState(0);
  const sev = severityMeta(severity);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - val / 100);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          stroke="currentColor"
          className="text-surface-variant"
          r={r}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          stroke="currentColor"
          className="text-primary-container"
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display-xl tracking-tight text-on-surface leading-none">
          {val}
        </div>
        <div className="font-label-sm uppercase tracking-widest text-secondary mt-1">
          / 100 INDEX
        </div>
        <div
          className={`mt-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded ${
            sev.label === "High Risk"
              ? "bg-primary-container text-on-primary"
              : sev.label === "Suspicious"
                ? "bg-tertiary-container text-on-tertiary-container"
                : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {sev.label}
        </div>
      </div>
    </div>
  );
}