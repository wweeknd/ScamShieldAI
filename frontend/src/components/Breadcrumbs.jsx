import { useEffect } from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { SITE_URL } from "../lib/site";

/**
 * Breadcrumb trail + BreadcrumbList structured data.
 * `items`: [{ label, to? }] — the last item is treated as the current page.
 */
export default function Breadcrumbs({ items = [] }) {
  const trail = [{ label: "Home", to: "/" }, ...items];

  useEffect(() => {
    const data = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: c.to ? SITE_URL + c.to : undefined,
      })),
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-breadcrumbs", "true");
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => el.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(trail)]);

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-1 text-sm text-slate-400">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />}
              {last || !c.to ? (
                <span className="text-slate-200 font-medium" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <Link to={c.to} className="hover:text-accent transition-colors inline-flex items-center gap-1">
                  {i === 0 && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
