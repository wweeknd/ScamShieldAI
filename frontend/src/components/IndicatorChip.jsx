import { indicatorMeta } from "../lib/format";

const ICONS = {
  phone: "phone",
  email: "mail",
  domain: "language",
  url: "link",
  company: "business",
  keyword: "code",
};

export default function IndicatorChip({ type, value, highlight = false }) {
  const meta = indicatorMeta(type);
  const sym = ICONS[type] || "label";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-mono border ${
        highlight
          ? "border-primary-container bg-primary-container/10 text-primary"
          : "border-outline-variant/40 bg-surface-container text-on-surface-variant"
      }`}
      title={`${meta.label}: ${value}`}
    >
      <span className="material-symbols-outlined text-[14px]">{sym}</span>
      <span className="max-w-[220px] truncate">{value}</span>
    </span>
  );
}