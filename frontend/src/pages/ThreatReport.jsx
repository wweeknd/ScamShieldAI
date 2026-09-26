import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Fingerprint,
  GitCompareArrows,
  Info,
  Network,
  ShieldAlert,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { AgentGrid } from "../components/AgentCard";
import Breadcrumbs from "../components/Breadcrumbs";
import IndicatorChip from "../components/IndicatorChip";
import RiskMeter from "../components/RiskMeter";
import SeverityBadge from "../components/SeverityBadge";
import { ErrorState, Loading } from "../components/ui";
import { formatDate, severityMeta, typeMeta } from "../lib/format";
import { SITE_NAME } from "../lib/site";
import { useAsync } from "../lib/useApi";
import { useDocumentMeta } from "../lib/useDocumentMeta";

export default function ThreatReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data, reload } = useAsync(() => api.event(id), [id]);

  const ev = data;
  useDocumentMeta({
    title: ev
      ? `Threat Report: ${severityMeta(ev.severity).label} ${typeMeta(ev.type).label} — ${SITE_NAME}`
      : `Threat Report — ${SITE_NAME}`,
    description: ev
      ? `Risk score ${ev.risk_score}/100 — ${severityMeta(ev.severity).label}. ${typeMeta(ev.type).label} analyzed by ScamShield AI with extracted indicators and cross-channel scam correlation.`
      : "Detailed AI threat report with risk score, indicators and cross-channel correlation.",
    path: `/report/${id}`,
  });

  if (loading) return <Loading label="Building threat report…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const meta = typeMeta(ev.type);
  const TypeIcon = meta.icon;
  const sev = severityMeta(ev.severity);
  const corr = ev.correlation || {};
  const correlated = (corr.related_count || 0) > 0 || corr.campaign_id;

  return (
    <div className="space-y-6 animate-fade-up">
      <Breadcrumbs items={[{ label: "History", to: "/history" }, { label: "Threat Report" }]} />

      {/* back + title */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Threat Report</h1>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* hero */}
      <div className={`card border ${sev.border}`}>
        <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-stretch">
          {/* meter */}
          <div className="grid place-items-center shrink-0">
            <RiskMeter score={ev.risk_score} severity={ev.severity} size={190} />
          </div>

          {/* meta */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip gap-1.5">
                <TypeIcon className="h-3.5 w-3.5 text-accent" /> {meta.label}
              </span>
              <SeverityBadge severity={ev.severity} />
              <span className="text-xs text-slate-500">{formatDate(ev.timestamp)}</span>
            </div>
            {ev.source && (
              <div className="text-sm text-slate-400">
                Source: <span className="text-slate-200 font-mono">{ev.source}</span>
              </div>
            )}
            <div className="rounded-xl bg-black/30 border border-white/10 p-3 max-h-32 overflow-auto">
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-300 font-mono leading-relaxed">
                {ev.content}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* correlation banner (high priority — the differentiator) */}
      {correlated && (
        <div className="card border border-accent/40 bg-accent/[0.06]">
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid place-items-center h-11 w-11 rounded-xl bg-accent/15 border border-accent/30 shrink-0">
              <GitCompareArrows className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-white">Part of a coordinated scam campaign</h2>
                <span className="chip border-accent/40 bg-accent/10 text-accent text-xs">
                  {corr.related_count} related {corr.related_count === 1 ? "event" : "events"}
                </span>
              </div>
              {corr.campaign_name && (
                <div className="text-sm text-accent mt-1 font-medium">{corr.campaign_name}</div>
              )}
              {corr.explanation && (
                <p className="text-sm text-silver/80 mt-2 leading-relaxed">{corr.explanation}</p>
              )}
              {corr.shared_indicators?.length > 0 && (
                <div className="mt-3">
                  <div className="label mb-1.5">Shared indicators</div>
                  <div className="flex flex-wrap gap-1.5">
                    {corr.shared_indicators.map((s, i) => (
                      <IndicatorChip key={i} type={s.type} value={s.value} highlight />
                    ))}
                  </div>
                </div>
              )}
              <Link
                to={`/network?focus=event-${ev.id}`}
                className="btn btn-primary mt-4"
              >
                <Network className="h-4 w-4" /> View Scam Network
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* why detected */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className={`h-5 w-5 ${sev.text}`} />
            <h2 className="font-bold text-white">Why this was flagged</h2>
          </div>
          {ev.reasons?.length ? (
            <ul className="space-y-2.5">
              {ev.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-silver/80">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${sev.text}`} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-silver/60">
              No suspicious signals detected. This item looks safe.
            </p>
          )}
        </div>

        {/* indicators + agents */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="h-5 w-5 text-accent" />
              <h2 className="font-bold text-white">Extracted indicators</h2>
            </div>
            {ev.indicators?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {ev.indicators.map((ind, i) => (
                  <IndicatorChip key={i} type={ind.type} value={ind.value} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-silver/60">No structured indicators extracted.</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-accent" />
              <h2 className="font-bold text-white">Agents involved</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(ev.agents || []).map((a, i) => (
                <span key={i} className="chip text-xs border-silver/20 text-silver/80">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI explanation */}
      {ev.explanation && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-white">Analyst summary</h2>
          </div>
          <p className="text-sm text-silver/80 leading-relaxed whitespace-pre-wrap">{ev.explanation}</p>
        </div>
      )}
    </div>
  );
}
