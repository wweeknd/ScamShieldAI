import {
  Braces,
  Briefcase,
  Building2,
  Globe,
  HelpCircle,
  Link2,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
} from "lucide-react";

export const TYPE_META = {
  sms: { label: "SMS", icon: MessageSquare },
  email: { label: "Email", icon: Mail },
  url: { label: "URL", icon: Link2 },
  qr: { label: "QR Code", icon: QrCode },
  job: { label: "Job Offer", icon: Briefcase },
};

export function typeMeta(t) {
  return TYPE_META[t] || { label: (t || "").toUpperCase(), icon: HelpCircle };
}

export const INDICATOR_META = {
  phone: { label: "Phone", icon: Phone },
  email: { label: "Email", icon: Mail },
  domain: { label: "Domain", icon: Globe },
  url: { label: "URL", icon: Link2 },
  company: { label: "Company", icon: Building2 },
  keyword: { label: "Keyword", icon: Braces },
};
export function indicatorMeta(t) {
  return INDICATOR_META[t] || { label: t, icon: Braces };
}

export function severityMeta(sev) {
  switch (sev) {
    case "HIGH RISK":
      return {
        label: "High Risk",
        text: "text-danger",
        bg: "bg-danger/10",
        border: "border-danger/30",
        ring: "#fb7185",
        dot: "bg-danger",
      };
    case "SUSPICIOUS":
      return {
        label: "Suspicious",
        text: "text-warn",
        bg: "bg-warn/10",
        border: "border-warn/30",
        ring: "#fbbf24",
        dot: "bg-warn",
      };
    default:
      return {
        label: "Safe",
        text: "text-safe",
        bg: "bg-safe/10",
        border: "border-safe/30",
        ring: "#34d399",
        dot: "bg-safe",
      };
  }
}

export function scoreColor(score) {
  if (score >= 70) return "#fb7185";
  if (score >= 35) return "#fbbf24";
  return "#34d399";
}

// Backend sends naive UTC ISO strings; append Z so JS treats them as UTC.
export function parseDate(ts) {
  if (!ts) return null;
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts);
  return new Date(hasTz ? ts : ts + "Z");
}

export function formatDate(ts) {
  const d = parseDate(ts);
  if (!d || isNaN(d)) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(ts) {
  const d = parseDate(ts);
  if (!d || isNaN(d)) return "";
  const secs = (Date.now() - d.getTime()) / 1000;
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
