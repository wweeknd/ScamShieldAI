"""Email Agent.

Builds on the SMS agent's text rules, adds link analysis (via the URL agent)
and email-specific checks: sender-domain / brand mismatch and free-webmail
senders claiming to be an organisation.
"""
import re

from ..services.indicators import KNOWN_BRANDS, extract_emails
from . import text_agent, url_agent

FREE_EMAIL_PROVIDERS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com",
    "icloud.com", "protonmail.com", "gmx.com", "mail.com", "yandex.com",
    "live.com", "msn.com", "ymail.com", "zoho.com",
}

_FROM_RE = re.compile(r"(?im)^\s*from:\s*(.+)$")


def _sender_domain(content: str, sender: str | None) -> str | None:
    candidate = sender
    if not candidate:
        m = _FROM_RE.search(content or "")
        if m:
            candidate = m.group(1)
    if not candidate:
        return None
    emails = extract_emails(candidate)
    if not emails:
        return None
    return emails[0].split("@")[-1].lower()


def analyze(content: str, indicators: list[dict], sender: str | None = None,
            demo_mode: bool = False) -> dict:
    text = text_agent.scan_text(content)
    url_result = url_agent.analyze(content, indicators, demo_mode=demo_mode)

    score = max(text["score"], url_result["risk_score"])
    reasons = list(text["reasons"])
    # fold in URL findings (skip the "nothing found" filler)
    for r in url_result["reasons"]:
        if not r.startswith("No "):
            reasons.append(r)

    lowered = (content or "").lower()
    sender_dom = _sender_domain(content, sender)
    claimed_brands = [b for b in KNOWN_BRANDS if re.search(rf"\b{re.escape(b)}\b", lowered)]

    if sender_dom:
        sld = sender_dom.split(".")[-2] if sender_dom.count(".") >= 1 else sender_dom
        # brand/sender mismatch
        if claimed_brands and not any(b == sld or b in sender_dom for b in claimed_brands):
            score = min(score + 28, 100)
            reasons.append(
                f"Sender domain '{sender_dom}' does not match the brand it claims "
                f"to be ('{claimed_brands[0].capitalize()}')"
            )
        # organisation using free webmail
        if sender_dom in FREE_EMAIL_PROVIDERS and any(
            w in lowered for w in ("bank", "account", "support team", "security team",
                                   "billing", "invoice", "payroll", "hr department")
        ):
            score = min(score + 18, 100)
            reasons.append(
                f"Email claims to be from an organisation but was sent from a free "
                f"webmail address ({sender_dom})"
            )

    if not reasons:
        reasons.append("No known phishing patterns detected in the email")

    # de-duplicate
    seen, deduped = set(), []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            deduped.append(r)

    return {"agent": "Email Agent", "risk_score": min(score, 100), "reasons": deduped}
