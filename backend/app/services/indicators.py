"""Indicator extraction.

Pulls the structured "indicators of compromise" out of raw content: phone
numbers, emails, domains, URLs and company names. These are what the
Correlation Agent matches across channels to detect coordinated campaigns.

Design note: generic scam keywords (e.g. "urgent") are recorded as *reasons*
by the agents, not as indicators, because matching on them would create
spurious cross-links. Correlation uses only strong indicators.
"""
import re
from urllib.parse import urlparse

# Brands that scammers commonly impersonate — single-word names we trust.
KNOWN_BRANDS = {
    "paypal", "amazon", "apple", "microsoft", "netflix", "google", "facebook",
    "instagram", "whatsapp", "fedex", "ups", "dhl", "usps", "irs", "hmrc",
    "chase", "citibank", "coinbase", "binance", "walmart", "costco", "venmo",
    "zelle", "cashapp", "docusign", "linkedin", "geeksquad", "norton", "mcafee",
}

# Capitalised filler words to strip from company-name candidates.
COMPANY_STOPWORDS = {
    "your", "you", "dear", "hello", "hi", "please", "verify", "confirm", "click",
    "urgent", "warning", "notice", "alert", "account", "update", "team", "support",
    "congratulations", "winner", "claim", "final", "important", "attention", "the",
    "we", "our", "your", "this", "from", "sent", "get", "new", "free", "call", "now",
    "today", "thanks", "thank", "regards", "best", "hey", "note", "reminder",
}

_URL_RE = re.compile(r"\b((?:https?://|www\.)[^\s<>()\[\]\"']+)", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)\d{3}[\s.\-]?\d{4}"
)
_COMPANY_RE = re.compile(r"\b([A-Z][A-Za-z0-9&]+(?:\s+[A-Z][A-Za-z0-9&]+){1,2})\b")


def _clean_url(url: str) -> str:
    url = url.rstrip(".,);:!?\"'")
    if url.lower().startswith("www."):
        url = "http://" + url
    return url


def extract_urls(text: str) -> list[str]:
    seen, out = set(), []
    for m in _URL_RE.findall(text or ""):
        u = _clean_url(m)
        if u.lower() not in seen:
            seen.add(u.lower())
            out.append(u)
    return out


def extract_emails(text: str) -> list[str]:
    seen, out = set(), []
    for m in _EMAIL_RE.findall(text or ""):
        e = m.lower()
        if e not in seen:
            seen.add(e)
            out.append(e)
    return out


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"[^\d+]", "", raw)
    # keep a single leading + if present
    if digits.startswith("+"):
        digits = "+" + re.sub(r"\D", "", digits)
    else:
        digits = re.sub(r"\D", "", digits)
    return digits


def extract_phones(text: str) -> list[str]:
    seen, out = set(), []
    for m in _PHONE_RE.findall(text or ""):
        p = normalize_phone(m)
        # require at least 10 digits to be a real phone number
        if len(re.sub(r"\D", "", p)) >= 10 and p not in seen:
            seen.add(p)
            out.append(p)
    return out


def domain_of_url(url: str) -> str | None:
    try:
        netloc = urlparse(url if "://" in url else "http://" + url).netloc.lower()
        netloc = netloc.split("@")[-1].split(":")[0]
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc or None
    except Exception:
        return None


def extract_domains(text: str, urls: list[str], emails: list[str]) -> list[str]:
    seen, out = set(), []

    def add(d: str | None):
        if d and d not in seen:
            seen.add(d)
            out.append(d)

    for u in urls:
        add(domain_of_url(u))
    for e in emails:
        dom = e.split("@")[-1].lower()
        add(dom)
    return out


def extract_companies(text: str) -> list[str]:
    text = text or ""
    lowered = text.lower()
    found: set[str] = set()

    for brand in KNOWN_BRANDS:
        if re.search(rf"\b{re.escape(brand)}\b", lowered):
            found.add(brand.capitalize())

    for match in _COMPANY_RE.findall(text):
        words = match.split()
        # strip leading/trailing filler ("Your SecurePay Global" -> "SecurePay Global")
        while words and words[0].lower() in COMPANY_STOPWORDS:
            words.pop(0)
        while words and words[-1].lower() in COMPANY_STOPWORDS:
            words.pop()
        if not words or all(w.lower() in COMPANY_STOPWORDS for w in words):
            continue
        candidate = " ".join(words)
        if len(candidate) >= 4:
            found.add(candidate)

    return sorted(found)


def extract_indicators(text: str, extra_urls: list[str] | None = None) -> list[dict]:
    """Return a de-duplicated list of {"type", "value"} indicators."""
    urls = extract_urls(text)
    for u in extra_urls or []:
        if u not in urls:
            urls.append(u)
    emails = extract_emails(text)
    phones = extract_phones(text)
    domains = extract_domains(text, urls, emails)
    companies = extract_companies(text)

    indicators: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def add(itype: str, value: str):
        key = (itype, value.lower())
        if value and key not in seen:
            seen.add(key)
            indicators.append({"type": itype, "value": value})

    for p in phones:
        add("phone", p)
    for e in emails:
        add("email", e)
    for d in domains:
        add("domain", d)
    for u in urls:
        add("url", u)
    for c in companies:
        add("company", c)

    return indicators
