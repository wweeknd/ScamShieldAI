// Service worker. Handles the toolbar button and messages from the popup.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ API_URL: "http://localhost:8000" });
});

chrome.action.onClicked.addListener(async (tab) => {
  // Inject the content script and trigger analysis on the visible page.
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" });
  } catch (e) {
    /* ignore */
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_API_URL") {
    chrome.storage.local.get("API_URL", (r) => sendResponse({ API_URL: r.API_URL }));
    return true;
  }
  if (msg.type === "ANALYZE") {
    analyze(msg.payload).then(sendResponse);
    return true; // keep channel open for async response
  }
});

async function analyze(payload) {
  const { API_URL } = await chrome.storage.local.get("API_URL");
  const base = (API_URL || "http://localhost:8000").replace(/\/$/, "");
  try {
    const res = await fetch(base + "/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, demo_mode: true }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) {
    return { error: e.message || "Backend unreachable. Start it on port 8000." };
  }
}