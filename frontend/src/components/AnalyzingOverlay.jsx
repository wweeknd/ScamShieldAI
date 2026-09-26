import { useEffect, useState } from "react";
import { Brain, GitCompareArrows, Layers, Radar, ShieldCheck } from "lucide-react";

const STEPS = [
  { icon: Radar, label: "Routing to detection agents" },
  { icon: ShieldCheck, label: "Scanning indicators & threat intel" },
  { icon: Layers, label: "Aggregating agent risk scores" },
  { icon: GitCompareArrows, label: "Correlating across channels" },
  { icon: Brain, label: "Generating threat report" },
];

export default function AnalyzingOverlay() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 850);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-md animate-fade-up">
      <div className="glass w-[min(420px,90vw)] p-8 text-center">
        {/* radar */}
        <div className="relative mx-auto mb-6 h-24 w-24">
          <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-accent animate-spin" />
          <div className="absolute inset-3 rounded-full border border-accent/10" />
          <div className="absolute inset-0 grid place-items-center">
            <ShieldCheck className="h-9 w-9 text-accent animate-pulse" />
          </div>
        </div>

        <div className="text-lg font-semibold text-white">Analyzing threat…</div>
        <div className="text-sm text-slate-400 mt-1">Multi-agent engine at work</div>

        <div className="mt-6 space-y-2.5 text-left">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                  active
                    ? "bg-accent/10 text-white"
                    : done
                    ? "text-safe"
                    : "text-slate-500"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "animate-pulse text-accent" : ""}`} />
                <span className="text-sm">{s.label}</span>
                {done && <span className="ml-auto text-xs">✓</span>}
                {active && (
                  <span className="ml-auto flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
