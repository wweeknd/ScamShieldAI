import { Link2, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatRelative, typeMeta } from "../lib/format";
import SeverityBadge from "./SeverityBadge";

export default function ThreatTable({ events = [], compact = false }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 px-2 sm:px-0">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-1 font-medium">Type</th>
            <th className="px-3 py-1 font-medium">Source</th>
            <th className="px-3 py-1 font-medium">Severity</th>
            {!compact && <th className="px-3 py-1 font-medium">Campaign</th>}
            <th className="px-3 py-1 font-medium text-right">When</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const meta = typeMeta(e.type);
            const Icon = meta.icon;
            return (
              <tr
                key={e.id}
                onClick={() => navigate(`/report/${e.id}`)}
                className="group cursor-pointer transition-colors [&>td]:bg-white/[0.03] hover:[&>td]:bg-white/[0.07] [&>td]:border-y [&>td]:border-white/5"
              >
                <td className="px-3 py-2.5 rounded-l-xl [&]:border-l">
                  <div className="flex items-center gap-2">
                    <span className="grid place-items-center h-7 w-7 rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-silver/90">{meta.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 max-w-[260px]">
                  <div className="truncate text-sm text-silver/80" title={e.source || "—"}>
                    {e.source || <span className="text-silver/40">—</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <SeverityBadge severity={e.severity} score={e.risk_score} size="sm" />
                </td>
                {!compact && (
                  <td className="px-3 py-2.5">
                    {e.campaign_id ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <Network className="h-3.5 w-3.5" /> Linked
                      </span>
                    ) : (
                      <span className="text-xs text-silver/40">—</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2.5 rounded-r-xl [&]:border-r text-right">
                  <span className="text-xs text-silver/50 whitespace-nowrap">
                    {formatRelative(e.timestamp)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {events.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Link2 className="h-4 w-4" /> No events to show yet.
        </div>
      )}
    </div>
  );
}
