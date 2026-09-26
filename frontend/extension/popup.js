const $ = (id) => document.getElementById(id);
const out = $("out");

function colorFor(sev) {
  const s = (sev || "").toLowerCase();
  if (s === "high risk") return "#ff3b3b";
  if (s === "suspicious") return "#f59e0b";
  return "#2ee59d";
}

function render(res) {
  if (res.error) {
    out.innerHTML = `<div class="err">${res.error}</div>`;
    return;
  }
  const c = colorFor(res.severity);
  const reasons = (res.reasons || [])
    .slice(0, 4)
    .map((r) => `<li>${r}</li>`)
    .join("");
  out.innerHTML = `
    <div class="meter">
      <div class="score" style="color:${c}">${res.risk_score}</div>
      <div class="bar"><div style="width:${res.risk_score}%;background:${c}"></div></div>
    </div>
    <div class="sev" style="color:${c}">${res.severity}</div>
    ${reasons ? `<ul class="reasons">${reasons}</ul>` : ""}
    <a class="link" href="/report/${res.id}" target="_blank">Open full threat report →</a>
  `;
}

$("analyze").addEventListener("click", async () => {
  const btn = $("analyze");
  btn.disabled = true;
  out.innerHTML = `<div class="err">Analyzing…</div>`;

  const type = $("type").value;
  const sender = $("sender").value.trim();
  let content = $("content").value.trim();

  if (!content) {
    // No manual content — analyze the current page via the active tab.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const r = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          url: location.href,
          text: (document.body ? document.body.innerText : "").slice(0, 4000),
        }),
      });
      const page = r[0].result;
      const host = (tab.url || "").replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      const head = (page.text || "").slice(0, 400).toLowerCase();
      const isJob = /careers|jobs|recruit| hiring/.test(host + " " + head);
      const isEmail = /@/.test(head);
      const t = isJob ? "job" : isEmail ? "email" : "url";
      content = t === "url" ? page.url : page.text;
      if (t !== type) $("type").value = t;
    }
  }

  const { API_URL } = await chrome.storage.local.get("API_URL");
  const base = (API_URL || "http://localhost:8000").replace(/\/$/, "");

  try {
    const res = await fetch(base + "/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, sender, demo_mode: true }),
    });
    render(await res.json());
  } catch (e) {
    render({ error: "Backend unreachable — start it on port 8000" });
  }
  btn.disabled = false;
});