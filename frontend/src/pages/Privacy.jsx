import { ShieldCheck } from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import { SITE_NAME } from "../lib/site";
import { useDocumentMeta } from "../lib/useDocumentMeta";

export default function Privacy() {
  useDocumentMeta({
    title: `Privacy Policy - ${SITE_NAME}`,
    description: "Learn how ScamShield AI handles data security, analysis payloads and privacy protection.",
    path: "/privacy",
  });

  return (
    <div className="animate-fade-up max-w-4xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
      <div className="card space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-accent/15 border border-accent/30">
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
            <p className="text-xs text-slate-400">Last updated: September 21, 2026</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-silver/80 leading-relaxed">
          <h2 className="text-base font-semibold text-white mt-6">1. Overview</h2>
          <p>
            ScamShield AI ("we", "our", or "us") provides a multi-channel scam detection and cross-channel
            threat correlation platform. This Privacy Policy outlines how we collect, process, and protect
            information submitted to our analysis engine.
          </p>

          <h2 className="text-base font-semibold text-white mt-6">2. Information We Collect</h2>
          <p>
            When you submit text messages, emails, URLs, QR codes, or job offers for analysis, our system
            processes the content to extract indicators (such as URLs, phone numbers, email addresses, and
            company names) and evaluates them against security rules and reputation intelligence feeds.
          </p>

          <h2 className="text-base font-semibold text-white mt-6">3. Data Retention and Security</h2>
          <p>
            Analyzed events and indicators are stored securely in our database to enable cross-channel scam
            campaign correlation. We do not sell, rent, or trade submitted threat payloads or indicators to third parties.
          </p>

          <h2 className="text-base font-semibold text-white mt-6">4. External Intelligence APIs</h2>
          <p>
            To evaluate URL and domain reputation, hashes or domain queries may be submitted to trusted third-party
            threat intelligence services such as VirusTotal in accordance with their respective privacy terms.
          </p>

          <h2 className="text-base font-semibold text-white mt-6">5. Contact Us</h2>
          <p>
            If you have any questions regarding this Privacy Policy, please reach out via our repository or support channels.
          </p>
        </div>
      </div>
    </div>
  );
}
