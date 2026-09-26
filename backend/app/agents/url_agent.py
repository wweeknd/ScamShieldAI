"""URL Agent.

Pure rules + VirusTotal reputation (no LLM). Flags shorteners, suspicious
TLDs, IP-literal hosts, typosquatting / brand impersonation, '@' tricks,
punycode and hyphen/digit-heavy domains, then folds in VirusTotal's verdict.
"""
from ..services.indicators import KNOWN_BRANDS, domain_of_url
from ..services.virustotal import check_domain

URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy", "bit.do",
    "adf.ly", "t.ly", "shorturl.com",
}

SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "club", "work", "click",
    "link", "gdn", "loan", "zip", "mov", "country", "stream", "download",
    "review", "kim", "men", "date", "racing", "win", "bid", "party",
}

# Scam-flavoured words that show up in phishing URL paths / query strings.
SUSPICIOUS_PATH_KEYWORDS = {
    "login", "signin", "verify", "secure", "account", "update", "confirm",
    "free", "win", "prize", "gift", "claim", "bonus", "reward", "password",
    "bank", "wallet", "unlock", "suspend", "billing", "authorize",
}

_IP_HOST = __import__("re").compile(r"^\d{1,3}(\.\d{1,3}){3}$")


def _detect_impersonation(domain: str) -> str | None:
    labels = domain.split(".")
    sld = labels[-2] if len(labels) >= 2 else domain
    flat = domain.replace(".", "").replace("-", "")
    for brand in KNOWN_BRANDS:
        if len(brand) < 4:
            continue
        if brand in flat and sld != brand:
            return brand
    return None


def _score_domain(url: str, domain: str, demo_mode: bool) -> tuple[int, list[str]]:
    # local import avoids any import-order surprises
    from ..demo_data import DEMO_MALICIOUS_DOMAINS

    score = 0
    reasons: list[str] = []
    labels = domain.split(".")
    tld = labels[-1] if labels else ""
    sld = labels[-2] if len(labels) >= 2 else domain

    if domain in URL_SHORTENERS:
        score += 38
        reasons.append(f"Uses a URL shortener ({domain}) that hides the real destination")

    if tld in SUSPICIOUS_TLDS:
        score += 30
        reasons.append(f"Unusual / high-abuse top-level domain (.{tld})")

    if _IP_HOST.match(domain):
        score += 32
        reasons.append("Link points to a raw IP address instead of a domain name")

    if "@" in url:
        score += 25
        reasons.append("URL contains an '@' symbol, a trick to disguise the real host")

    if url.lower().startswith("xn--") or domain.startswith("xn--") or "xn--" in domain:
        score += 25
        reasons.append("Domain uses punycode (look-alike international characters)")

    if sld.count("-") >= 2:
        score += 14
        reasons.append("Domain contains an unusual number of hyphens")

    if sum(c.isdigit() for c in sld) >= 4:
        score += 12
        reasons.append("Domain name contains many digits (often auto-generated)")

    tail = url.lower().split(domain, 1)[-1] if domain in url.lower() else ""
    path_hits = [k for k in SUSPICIOUS_PATH_KEYWORDS if k in tail]
    if path_hits:
        score += 14
        reasons.append(f"URL path contains scam-related keywords (“{path_hits[0]}”)")

    brand = _detect_impersonation(domain)
    if brand:
        score += 35
        reasons.append(
            f"Domain impersonates a trusted brand ('{brand}') without being its real site"
        )

    # --- reputation -------------------------------------------------------
    if demo_mode and domain in DEMO_MALICIOUS_DOMAINS:
        score += 60
        reasons.append("Flagged as malicious by threat-intelligence feeds (demo data)")
    else:
        verdict = check_domain(domain, demo_mode=demo_mode)
        if verdict.get("available"):
            mal, susp = verdict.get("malicious", 0), verdict.get("suspicious", 0)
            if mal > 0:
                score += min(50, 20 + mal * 6)
                reasons.append(f"VirusTotal: flagged malicious by {mal} security vendor(s)")
            elif susp > 0:
                score += min(30, 10 + susp * 5)
                reasons.append(f"VirusTotal: flagged suspicious by {susp} vendor(s)")
            elif verdict.get("found") and verdict.get("harmless", 0) > 0:
                reasons.append("VirusTotal: no vendors flagged this domain")

    return min(score, 100), reasons


def analyze(content: str, indicators: list[dict], demo_mode: bool = False) -> dict:
    urls = [i["value"] for i in indicators if i["type"] == "url"]
    domains = [i["value"] for i in indicators if i["type"] == "domain"]

    # If content itself is a bare URL/domain, make sure we score it.
    if not urls and not domains and content.strip():
        maybe = content.strip()
        d = domain_of_url(maybe)
        if d:
            urls = [maybe]
            domains = [d]

    reasons: list[str] = []
    max_score = 0
    checked = set()

    # score every URL by its domain
    for url in urls:
        d = domain_of_url(url) or ""
        if not d or d in checked:
            continue
        checked.add(d)
        s, rs = _score_domain(url, d, demo_mode)
        max_score = max(max_score, s)
        reasons.extend(rs)

    # score any domains not already covered (e.g. from an email sender)
    for d in domains:
        if d in checked:
            continue
        checked.add(d)
        s, rs = _score_domain(d, d, demo_mode)
        max_score = max(max_score, s)
        reasons.extend(rs)

    if not checked:
        return {
            "agent": "URL Agent",
            "risk_score": 0,
            "reasons": ["No URLs or domains found to analyse"],
        }

    if not reasons:
        reasons.append("No suspicious URL patterns detected")

    # de-duplicate reasons, preserve order
    seen, deduped = set(), []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            deduped.append(r)

    return {"agent": "URL Agent", "risk_score": max_score, "reasons": deduped}
