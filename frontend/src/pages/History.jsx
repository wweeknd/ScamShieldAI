import { useState } from "react";
import { Filter, History as HistoryIcon } from "lucide-react";
import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
import ThreatTable from "../components/ThreatTable";
import { Empty, ErrorState, Loading } from "../components/ui";
import { TYPE_META } from "../lib/format";
import { PAGE_META } from "../lib/site";
import { useAsync } from "../lib/useApi";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import useScrollReveal from "../hooks/useScrollReveal";

const SEVERITIES = [
  { id: "", label: "All" },
  { id: "HIGH RISK", label: "High Risk" },
  { id: "SUSPICIOUS", label: "Suspicious" },
  { id: "SAFE", label: "Safe" },
];

export default function History() {
  useDocumentMeta({ ...PAGE_META["/history"], path: "/history" });
  const [severity, setSeverity] = useState("");
  const [type, setType] = useState("");
  const { loading, error, data, reload } = useAsync(
    () => api.events({ severity: severity || undefined, type: type || undefined }),
    [severity, type]
  );

  const headRef = useScrollReveal();
  const filterRef = useScrollReveal({ delay: 60 });

  return (
    <div className="space-y-6 animate-fade-up">
      <Breadcrumbs items={[{ label: "History" }]} />

      <div ref={headRef}>
        <div className="label mb-1">DETECTION LOG</div>
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-sm text-silver/60 mt-1">
          Every analyzed item, newest first. Click a row for the full report.
        </p>
      </div>

      <div ref={filterRef} className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-silver/60">
            <Filter className="h-4 w-4" /> Filter
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeverity(s.id)}
                className={`chip text-xs transition-colors ${
                  severity === s.id
                    ? "border-accent/50 bg-accent/10 text-white"
                    : "text-silver/60 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input py-2 text-sm w-auto"
            >
              <option value="">All channels</option>
              {Object.entries(TYPE_META).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Loading label="Loading history…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <Empty
            icon={HistoryIcon}
            title="No matching events"
            hint="Try clearing the filters, or analyze something new."
          />
        ) : (
          <ThreatTable events={data} />
        )}
      </div>
    </div>
  );
}