import { useState } from "react";

/**
 * "Coach-card" style flip card — one per detection agent.
 * Hover flips it to reveal what it detects and its confidence signal.
 * No gradients, no pills: hard black + neon orange + metallic silver.
 */
const AGENTS = [
  {
    key: "url",
    name: "URL Agent",
    icon: "://",
    signal: "Reputation",
    detects: ["URL shorteners", "typosquatting", "unusual TLDs", "mismatched domains"],
    feeds: "VirusTotal",
  },
  {
    key: "sms",
    name: "Text / SMS Agent",
    icon: "SMS",
    signal: "Language",
    detects: ["urgency", "threats", "fake rewards", "money requests", "credential bait"],
    feeds: "rulebook",
  },
  {
    key: "email",
    name: "Email Agent",
    icon: "MAIL",
    signal: "Sender",
    detects: ["domain mismatch", "phishing language", "malicious links", "spoofed identity"],
    feeds: "rulebook",
  },
  {
    key: "job",
    name: "Job Scam Agent",
    icon: "JOB",
    signal: "Recruitment",
    detects: ["unreal salary", "upfront fees", "fake interviews", "generic domains"],
    feeds: "rulebook",
  },
  {
    key: "qr",
    name: "QR Agent",
    icon: "QR",
    signal: "Decode",
    detects: ["encoded URLs", "hidden links", "obfuscated destinations"],
    feeds: "OpenCV",
  },
  {
    key: "correlation",
    name: "Correlation Agent",
    icon: "NET",
    signal: "Campaign",
    detects: ["shared phones", "shared domains", "shared companies", "fuzzy matches"],
    feeds: "PostgreSQL",
  },
];

export default function AgentCard({ agent }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="group h-[156px] [perspective:900px]"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      aria-label={`${agent.name} — ${flipped ? "detection detail" : "front"}`}
    >
      <div
        className={`relative h-full w-full rounded-xl border border-white/10 bg-ink-900/80 transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center [backface-visibility:hidden]">
          <div className="grid place-items-center h-10 w-10 rounded-lg border border-accent/40 bg-accent/10 text-accent font-mono text-sm font-bold">
            {agent.icon}
          </div>
          <div className="mt-3 text-sm font-bold text-white">{agent.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-silver/50">
            {agent.signal} check
          </div>
          <div className="mt-2 text-[10px] text-silver/40">hover to inspect</div>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 flex flex-col p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-ink-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-accent">Detects</span>
            <span className="text-[10px] text-silver/40">source: {agent.feeds}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {agent.detects.map((d) => (
              <li key={d} className="flex items-start gap-2 text-[11px] text-silver/80">
                <span className="mt-1 h-1 w-1 rounded-full bg-accent shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AgentGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {AGENTS.map((a) => (
        <AgentCard key={a.key} agent={a} />
      ))}
    </div>
  );
}