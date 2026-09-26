import { useRef, useState } from "react";
import { ScanSearch, Sparkles, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import AnalyzingOverlay from "../components/AnalyzingOverlay";
import Breadcrumbs from "../components/Breadcrumbs";
import { useDemoMode } from "../context/DemoMode";
import { TYPE_META } from "../lib/format";
import { PAGE_META } from "../lib/site";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const TYPES = [
  { id: "sms", ...TYPE_META.sms },
  { id: "email", ...TYPE_META.email },
  { id: "url", ...TYPE_META.url },
  { id: "job", ...TYPE_META.job },
  { id: "qr", ...TYPE_META.qr },
];

// Samples aligned with the seeded demo campaign so correlation lights up instantly.
const SAMPLES = {
  sms: "URGENT: Your SecurePay Global account has been locked due to suspicious activity. Verify immediately at http://securepay-global.com/verify or call +1 415-555-0132 to avoid permanent suspension.",
  email:
    "Dear customer, we detected unusual activity on your SecurePay Global wallet. You must confirm your identity within 24 hours at https://securepay-global.com/secure-login or your account will be permanently closed. Reply with your password to expedite.",
  url: "http://securepay-global.com/verify-account",
  job: "SecurePay Global is hiring remote Payment Processing Agents! Earn $4,500/week from home, no experience needed. To get started, pay a one-time $150 equipment deposit and send your SSN and bank details to hr@securepay-global.com. Message us on Telegram to onboard today!",
  qr: "",
};

const PLACEHOLDERS = {
  sms: "Paste the text message you received…",
  email: "Paste the full email body…",
  url: "https://suspicious-link.example/login",
  job: "Paste the job offer or recruiter message…",
};

export default function Analyze() {
  const navigate = useNavigate();
  const { demo } = useDemoMode();
  useDocumentMeta({ ...PAGE_META["/analyze"], path: "/analyze" });
  const [type, setType] = useState("sms");
  const [content, setContent] = useState("");
  const [sender, setSender] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const reset = () => {
    setContent("");
    setSender("");
    setFile(null);
    setError("");
  };

  const canSubmit = type === "qr" ? !!file : content.trim().length > 0;

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    try {
      let res;
      if (type === "qr") {
        res = await api.analyzeQr(file);
      } else {
        res = await api.analyze({ type, content: content.trim(), sender: sender.trim() || undefined });
      }
      // brief hold so the overlay animation reads as intentional
      setTimeout(() => navigate(`/report/${res.id}`), 400);
    } catch (e) {
      setError(e.message || "Analysis failed.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      {loading && <AnalyzingOverlay />}

      <Breadcrumbs items={[{ label: "Analyze" }]} />

      <div>
        <h1 className="text-2xl font-bold text-white">Analyze a suspicious item</h1>
        <p className="text-sm text-slate-400 mt-1">
          Our multi-agent engine scores the risk, extracts indicators, and checks whether it belongs
          to a larger scam campaign.
        </p>
      </div>

      {demo && (
        <div className="chip border-accent/40 bg-accent/10 text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Demo Mode — runs fully offline on realistic sample data
        </div>
      )}

      <div className="card space-y-5">
        {/* type picker */}
        <div>
          <div className="label mb-2">Channel</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const on = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setType(t.id);
                    setError("");
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                    on
                      ? "border-accent/50 bg-accent/10 text-white shadow-glow"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${on ? "text-accent" : ""}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* email sender */}
        {type === "email" && (
          <div>
            <div className="label mb-1.5">Sender email (optional)</div>
            <input
              className="input"
              placeholder="alerts@secure-pay-global.com"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
          </div>
        )}

        {/* content / file */}
        {type === "qr" ? (
          <div>
            <div className="label mb-1.5">QR code image</div>
            <div
              onClick={() => fileInput.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-10 cursor-pointer hover:border-accent/40 transition-colors"
            >
              <Upload className="h-6 w-6 text-slate-400" />
              {file ? (
                <div className="flex items-center gap-2 text-sm text-white">
                  {file.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-slate-400 hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm text-slate-300">Click to upload a QR image</div>
                  <div className="text-xs text-slate-500">PNG or JPG — we decode and analyze the link</div>
                </>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="label">{type === "url" ? "URL" : "Content"}</span>
              <button
                className="text-xs text-accent hover:underline"
                onClick={() => setContent(SAMPLES[type])}
              >
                Try a sample
              </button>
            </div>
            {type === "url" ? (
              <input
                className="input font-mono"
                placeholder={PLACEHOLDERS.url}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            ) : (
              <textarea
                className="input min-h-[150px] resize-y"
                placeholder={PLACEHOLDERS[type]}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button className="btn btn-primary flex-1" disabled={!canSubmit || loading} onClick={submit}>
            <ScanSearch className="h-4 w-4" />
            Analyze threat
          </button>
          {(content || file || sender) && (
            <button className="btn btn-ghost" onClick={reset} disabled={loading}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
