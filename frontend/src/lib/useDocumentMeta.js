import { useEffect } from "react";
import { SITE_NAME, SITE_URL } from "./site";

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Sets per-page document title, meta description, canonical URL and the
 * Open Graph / Twitter tags that vary by page. Static OG tags live in index.html.
 */
export function useDocumentMeta({ title, description, path }) {
  useEffect(() => {
    const canonical = SITE_URL + (path || window.location.pathname);
    if (title) document.title = title;
    upsertMeta("name", "description", description);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:title", title || SITE_NAME);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:title", title || SITE_NAME);
    upsertMeta("name", "twitter:description", description);
  }, [title, description, path]);
}
