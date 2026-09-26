import { useEffect, useState } from "react";
import { ArrowRight, Building2, GitCompareArrows, Network as NetworkIcon, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
import IndicatorChip from "../components/IndicatorChip";
import NetworkGraph from "../components/NetworkGraph";
import SeverityBadge from "../components/SeverityBadge";
import { Empty, ErrorState, Loading } from "../components/ui";
import { scoreColor, typeMeta } from "../lib/format";
import { PAGE_META } from "../lib/site";
import { useAsync } from "../lib/useApi";
import { useDocumentMeta } from "../lib/useDocumentMeta";

export default function ScamNetwork() {
  const [params] = useSearchParams();
  const focus = params.get("focus");
  useDocumentMeta({ ...PAGE_META["/network"], path: "/network" });
  const { loading, error, data, reload } = useAsync(
    () => Promise.all([api.network(), api.campaigns()]).then(([network, campaigns]) => ({ network, campaigns })),
    []
  );
  const [selected, setSelected] = useState(null);

  // preselect from ?focus=event-<id> — prefer the campaign that contains it
  useEffect(() => {
    if (!data || !focus) return;
    const node = data.network.nodes.find((n) => n.id === focus);
    if (!node) return;
    if (node.event_id) {
      const camp = data.campaigns.find((c) => c.events.some((e) => e.id === node.event_id));
      if (camp) {
        const cnode = data.network.nodes.find((n) => n.id === `campaign-${camp.id}`);
        if (cnode) return setSelected(cnode);
      }
    }
    setSelected(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, focus]);

  if (loading) return <Loading label="Mapping the scam network…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { network, campaigns } = data;
  const campaignById = (id) => campaigns.find((c) => c.id === id);

  return (
    <div className="space-y-6 animate-fade-up">
      <Breadcrumbs items={[{ label: "Scam Network" }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label mb-1">CROSS-CHANNEL GRAPH</div>
          <h1 className="text-2xl font-bold text-white">Scam Network</h1>
          <p className="text-sm text-silver/60 mt-1">
            Events linked by shared phones, domains, emails and company names — revealing coordinated
            campaigns.
          </p>
        </div>
        <div className="chip gap-2 border-accent/30 text-accent">
          <NetworkIcon className="h-4 w-4" />
          {network.nodes.length} nodes · {network.links.length} links
        </div>
      </div>

      {network.nodes.length === 0 ? (
        <div className="card">
          <Empty
            icon={NetworkIcon}
            title="No network to display yet"
            hint="Analyze a few related items, or load the demo data from the Dashboard, to see cross-channel correlation."
            action={
              <Link to="/" className="btn btn-primary mt-1">
                Go to Dashboard
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2 p-2 sm:p-3">
            <NetworkGraph
              data={network}
              selectedId={selected?.id}
              onSelect={setSelected}
              height={540}
            />
          </div>

          <div className="card lg:max-h-[560px] overflow-auto">
            <SidePanel node={selected} campaignById={campaignById} network={network} campaigns={campaigns} onSelect={setSelected} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidePanel({ node, campaignById, network, campaigns, onSelect }) {
  if (!node) {
    return (
      <div className="space-y-4">
        <h2 className="font-semibold text-white">Campaigns</h2>
        {campaigns.length === 0 && (
          <p className="text-sm text-slate-400">No campaigns detected. Click any node to inspect it.</p>
        )}
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(network.nodes.find((n) => n.id === `campaign-${c.id}`))}
            className="card-hover w-full text-left rounded-xl border border-white/10 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white text-sm">{c.name}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor(c.risk_score) }}>
                {c.risk_score}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{c.event_count} linked events</div>
          </button>
        ))}
        <p className="text-xs text-slate-500 pt-2">Tip: drag nodes, scroll to zoom, click to inspect.</p>
      </div>
    );
  }

  if (node.kind === "campaign") {
    const c = campaignById(node.campaign_id);
    if (!c) return <p className="text-sm text-slate-400">Campaign not found.</p>;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-accent" />
          <h2 className="font-bold text-white">Campaign</h2>
        </div>
        <div>
          <div className="text-lg font-bold text-white">{c.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-silver/60">Campaign risk</span>
            <span className="font-bold tabular-nums" style={{ color: scoreColor(c.risk_score) }}>
              {c.risk_score}
            </span>
          </div>
        </div>
        {c.explanation && <p className="text-sm text-silver/80 leading-relaxed">{c.explanation}</p>}
        {c.shared_indicators?.length > 0 && (
          <div>
            <div className="label mb-1.5">Shared indicators</div>
            <div className="flex flex-wrap gap-1.5">
              {c.shared_indicators.map((s, i) => (
                <IndicatorChip key={i} type={s.type} value={s.value} highlight />
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="label mb-1.5">Linked events ({c.event_count})</div>
          <div className="space-y-1.5">
            {c.events.map((e) => {
              const m = typeMeta(e.type);
              const Icon = m.icon;
              return (
                <Link
                  key={e.id}
                  to={`/report/${e.id}`}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <Icon className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">{e.source || m.label}</span>
                  <SeverityBadge severity={e.severity} size="sm" />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === "event") {
    const camp = campaigns.find((c) => c.events.some((e) => e.id === node.event_id));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-white">Event</h2>
        </div>
        <div className="text-sm text-slate-300 break-words">{node.label}</div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={node.severity} score={node.risk_score} />
        </div>
        {camp && (
          <div className="rounded-lg border border-accent-violet/30 bg-accent-violet/10 p-3">
            <div className="text-xs text-accent-violet font-medium">Part of campaign</div>
            <button
              className="text-sm text-white hover:underline text-left"
              onClick={() => onSelect(network.nodes.find((n) => n.id === `campaign-${camp.id}`))}
            >
              {camp.name}
            </button>
          </div>
        )}
        <Link to={`/report/${node.event_id}`} className="btn btn-primary w-full">
          Open full report <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // indicator node
  const connectedEventIds = network.links
    .filter((l) => l.target === node.id)
    .map((l) => l.source);
  const connectedEvents = network.nodes.filter((n) => connectedEventIds.includes(n.id));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-accent" />
        <h2 className="font-semibold text-white">Shared indicator</h2>
      </div>
      <div>
        <div className="label">{node.kind}</div>
        <div className="text-sm text-white font-mono break-all mt-1">{node.label}</div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-300">
        Referenced by <span className="text-white font-semibold">{connectedEvents.length}</span>{" "}
        {connectedEvents.length === 1 ? "event" : "events"} — a strong signal these are connected.
      </div>
      <div className="space-y-1.5">
        {connectedEvents.map((n) => (
          <Link
            key={n.id}
            to={`/report/${n.event_id}`}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 hover:bg-white/5 transition-colors"
          >
            <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">{n.label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
