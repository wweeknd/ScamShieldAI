"""VirusTotal domain-reputation lookups (free tier friendly).

- In-memory TTL cache so we never re-query the same domain within an hour.
- A soft rate-limit guard (free tier is ~4 requests/minute).
- Fully optional: with no API key, or in demo mode, callers fall back to
  pattern rules. Never raises — always returns a dict.
"""
import threading
import time

import requests

from ..config import settings

_API = "https://www.virustotal.com/api/v3/domains/{domain}"

_cache: dict[str, tuple[float, dict]] = {}
_recent_calls: list[float] = []
_lock = threading.Lock()

_RATE_LIMIT = 4        # requests
_RATE_WINDOW = 60.0    # seconds


def _rate_limited() -> bool:
    now = time.time()
    with _lock:
        # drop timestamps older than the window
        while _recent_calls and now - _recent_calls[0] > _RATE_WINDOW:
            _recent_calls.pop(0)
        if len(_recent_calls) >= _RATE_LIMIT:
            return True
        _recent_calls.append(now)
        return False


def check_domain(domain: str, demo_mode: bool = False) -> dict:
    """Return a normalized reputation verdict for a domain."""
    if not domain:
        return {"available": False, "reason": "no_domain"}

    if demo_mode or not settings.virustotal_enabled:
        return {
            "available": False,
            "reason": "demo_mode" if demo_mode else "no_api_key",
        }

    # cache hit?
    cached = _cache.get(domain)
    if cached and time.time() - cached[0] < settings.VT_CACHE_TTL:
        result = dict(cached[1])
        result["source"] = "cache"
        return result

    if _rate_limited():
        return {"available": False, "reason": "rate_limit_guard"}

    try:
        resp = requests.get(
            _API.format(domain=domain),
            headers={"x-apikey": settings.VIRUSTOTAL_API_KEY},
            timeout=settings.VT_TIMEOUT,
        )
    except requests.RequestException:
        return {"available": False, "reason": "request_error"}

    if resp.status_code == 404:
        result = {"available": True, "found": False, "malicious": 0,
                  "suspicious": 0, "harmless": 0, "reputation": 0,
                  "source": "virustotal"}
        _cache[domain] = (time.time(), result)
        return result
    if resp.status_code == 429:
        return {"available": False, "reason": "rate_limited"}
    if resp.status_code != 200:
        return {"available": False, "reason": f"http_{resp.status_code}"}

    try:
        attrs = resp.json()["data"]["attributes"]
        stats = attrs.get("last_analysis_stats", {})
        result = {
            "available": True,
            "found": True,
            "malicious": int(stats.get("malicious", 0)),
            "suspicious": int(stats.get("suspicious", 0)),
            "harmless": int(stats.get("harmless", 0)),
            "reputation": int(attrs.get("reputation", 0)),
            "source": "virustotal",
        }
    except (KeyError, ValueError, TypeError):
        return {"available": False, "reason": "parse_error"}

    _cache[domain] = (time.time(), result)
    return result
