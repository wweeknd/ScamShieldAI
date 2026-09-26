// Runs on every page. Extracts content, shows a badge, and listens for
// scan requests from the toolbar button and the popup.
(function () {
  "use strict";

  let badge = null;

  function ensureBadge() {
    if (badge) return badge;
    badge = document.createElement("div");
    badge.id = "scamshield-badge";
    badge.className = "scamshield-badge";
    badge.innerHTML = `
      <div class="ss-inner">
        <div class="ss-title">SCAMSHIELD AI</div>
        <div class="ss-sub">Analyzing page…</div>
      </div>`;
    document.body.appendChild(badge);
    return badge;
  }

  function showResult(res) {
    const b = ensureBadge();
    const sev = (res.severity || "SAFE").toLowerCase();
    const color =
      sev === "high risk" ? "#ff3b3b" :
      sev === "suspicious" ? "#f59e0b" : "#2ee59d";
    b.querySelector(".ss-sub").textContent =
      res.error ? res.error : `${res.risk_score}/100 · ${res.severity}`;
    b.style.borderColor = color;
    b.style.boxShadow = `0 0 16px ${color}55`;
    b.querySelector(".ss-title").style.color = color;
  }

  function extract() {
    const url = location.href;
    const text =
      (document.body ? document.body.innerText : "") || "";
    return { url, text: text.slice(0, 4000) };
  }

  function classify() {
    const { url, text } = extract();
    const host = (location.hostname || "").toLowerCase();
    const head = text.slice(0, 400).toLowerCase();
    const isJob = /careers|jobs|recruit| hiring/.test(host + " " + head);
    const isEmail = /@/.test(head);
    const type = isJob ? "job" : isEmail ? "email" : "url";
    const content = type === "url" ? url : text;
    return { type, content, sender: null };
  }

  async function scan() {
    const b = ensureBadge();
    b.querySelector(".ss-sub").textContent = "Analyzing page…";
    const payload = classify();

    // Ask the service worker for the configured API URL.
    const { API_URL } = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "GET_API_URL" }, resolve)
    );
    const base = (API_URL || "http://localhost:8000").replace(/\/$/, "");

    try {
      const res = await fetch(base + "/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, demo_mode: true }),
      });
      showResult(await res.json());
    } catch (e) {
      showResult({ error: "Backend unreachable — start it on port 8000" });
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCAN_PAGE") scan();
  });

  // Auto-scan on load for http(s) pages.
  if (location.protocol.startsWith("http")) scan();
})();