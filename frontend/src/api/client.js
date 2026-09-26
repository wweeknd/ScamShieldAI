// Thin API client for the ScamShield AI backend.
// Base URL comes from VITE_API_URL (see .env.example), default localhost:8000.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const DEMO_KEY = "scamshield_demo";

export function getDemoMode() {
  return localStorage.getItem(DEMO_KEY) === "1";
}
export function setDemoModeStorage(v) {
  localStorage.setItem(DEMO_KEY, v ? "1" : "0");
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (e) {
    throw new Error(
      "Cannot reach the backend. Is it running at " + BASE + " ?"
    );
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  base: BASE,
  warmup: () => request("/warmup"),
  health: () => request("/health"),
  dashboardStats: () => request("/dashboard/stats"),
  events: (params = {}) => {
    const q = new URLSearchParams();
    if (params.severity) q.set("severity", params.severity);
    if (params.type) q.set("type", params.type);
    const qs = q.toString();
    return request("/events" + (qs ? `?${qs}` : ""));
  },
  event: (id) => request(`/events/${id}`),
  campaigns: () => request("/campaigns"),
  campaign: (id) => request(`/campaigns/${id}`),
  network: () => request("/network"),
  analyze: ({ type, content, sender }) =>
    request("/analyze", {
      method: "POST",
      body: JSON.stringify({ type, content, sender, demo_mode: getDemoMode() }),
    }),
  analyzeQr: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("demo_mode", getDemoMode() ? "true" : "false");
    return fetch(BASE + "/analyze/qr", { method: "POST", body: fd }).then(
      async (res) => {
        if (!res.ok) {
          let d = "QR analysis failed";
          try {
            d = (await res.json()).detail || d;
          } catch {}
          throw new Error(d);
        }
        return res.json();
      }
    );
  },
  seedDemo: () => request("/demo/seed", { method: "POST" }),
  resetDemo: () => request("/demo/reset", { method: "POST" }),
};
