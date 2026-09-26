// Central site metadata. SITE_URL drives canonical tags, Open Graph URLs and
// structured data; override at build time with VITE_SITE_URL=https://your-domain.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.scamshield-ai.com").replace(/\/$/, "");
export const SITE_NAME = "ScamShield AI";
export const SITE_TAGLINE = "Multi-Channel Scam Detection & Correlation";
export const DEFAULT_DESCRIPTION =
  "ScamShield AI detects scams across SMS, email, URLs, QR codes and job offers, and correlates suspicious events to expose coordinated scam campaigns.";

// Per-route <title> and meta description. Dynamic routes set these at runtime.
export const PAGE_META = {
  "/": {
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
  },
  "/analyze": {
    title: `Analyze a Message - ${SITE_NAME}`,
    description:
      "Submit an SMS, email, URL, QR code or job offer and get an instant AI risk score, extracted indicators and a plain-language threat report.",
  },
  "/network": {
    title: `Scam Network Graph - ${SITE_NAME}`,
    description:
      "Explore an interactive graph of scam events linked by shared phone numbers, domains, emails and company names to reveal coordinated campaigns.",
  },
  "/history": {
    title: `Detection History - ${SITE_NAME}`,
    description:
      "Browse and filter every analyzed item - SMS, email, URL, QR and job offers - by severity and channel.",
  },
  "/privacy": {
    title: `Privacy Policy - ${SITE_NAME}`,
    description: "Learn how ScamShield AI handles data security, analysis payloads and privacy protection.",
  },
  "/terms": {
    title: `Terms & Conditions - ${SITE_NAME}`,
    description: "Terms and conditions for using the ScamShield AI scam detection and intelligence platform.",
  },
};
