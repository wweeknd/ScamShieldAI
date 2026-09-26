// Generates SEO text files (robots.txt, sitemap.xml, llms.txt) from SITE_URL.
// Runs automatically before `vite build` (see package.json "prebuild"), and can
// be run manually: `node scripts/gen-seo.mjs`. Override the domain with:
//   VITE_SITE_URL=https://your-domain.com node scripts/gen-seo.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = (process.env.VITE_SITE_URL || "https://www.scamshield-ai.com").replace(/\/$/, "");
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(PUBLIC, { recursive: true });

const ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/analyze", priority: "0.9", changefreq: "weekly" },
  { path: "/network", priority: "0.8", changefreq: "daily" },
  { path: "/history", priority: "0.6", changefreq: "daily" },
  { path: "/privacy", priority: "0.4", changefreq: "monthly" },
  { path: "/terms", priority: "0.4", changefreq: "monthly" },
];

const today = new Date().toISOString().slice(0, 10);

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
  ).join("\n") +
  `\n</urlset>\n`;

const robots =
  `# ScamShield AI\nUser-agent: *\nAllow: /\n\n` +
  `Sitemap: ${SITE_URL}/sitemap.xml\n`;

const llms =
  `# ScamShield AI\n\n` +
  `> ScamShield AI is an AI-powered, multi-channel scam detection and correlation platform. ` +
  `It analyzes SMS messages, emails, URLs, QR codes, and job offers, then correlates suspicious ` +
  `events across channels to reveal coordinated scam campaigns.\n\n` +
  `ScamShield AI runs a multi-agent engine (URL, Text/SMS, Email, Job, QR and a Correlation agent) ` +
  `orchestrated with LangGraph. Each item receives a risk score (0-100), a severity ` +
  `(Safe / Suspicious / High Risk), extracted indicators, and a plain-language analyst summary.\n\n` +
  `## Pages\n\n` +
  `- [Dashboard](${SITE_URL}/): threat overview, statistics and recent detections\n` +
  `- [Analyze](${SITE_URL}/analyze): submit an SMS, email, URL, QR image or job offer for analysis\n` +
  `- [Scam Network](${SITE_URL}/network): interactive graph of events linked by shared indicators\n` +
  `- [History](${SITE_URL}/history): filterable log of all analyzed items\n` +
  `- [Privacy Policy](${SITE_URL}/privacy): data handling, retention and security\n` +
  `- [Terms & Conditions](${SITE_URL}/terms): service terms and acceptable use\n\n` +
  `## Notes\n\n` +
  `- The core differentiator is cross-channel correlation: matching shared phones, domains, emails ` +
  `and company names to group separate events into a single scam campaign.\n` +
  `- A Demo Mode runs the full experience offline on realistic sample data.\n`;

writeFileSync(join(PUBLIC, "sitemap.xml"), sitemap);
writeFileSync(join(PUBLIC, "robots.txt"), robots);
writeFileSync(join(PUBLIC, "llms.txt"), llms);
console.log(`SEO files generated for ${SITE_URL} → public/{sitemap.xml, robots.txt, llms.txt}`);
