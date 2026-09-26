"""Job Scam Agent.

Rule-based detection of fake recruitment: unrealistic pay, upfront fees,
personal-data harvesting, messaging-app-only interviews and recruiters using
free webmail instead of a corporate domain.
"""
import re

from ..services.indicators import extract_emails
from .email_agent import FREE_EMAIL_PROVIDERS
from . import text_agent

UPFRONT_FEE = [
    "registration fee", "training fee", "onboarding fee", "equipment fee",
    "starter kit", "activation fee", "processing fee", "security deposit",
    "pay for your equipment", "purchase the software", "buy your own",
    "refundable deposit", "administration fee",
]
PERSONAL_INFO = [
    "ssn", "social security", "bank account", "routing number", "sort code",
    "copy of your id", "copy of your passport", "passport", "date of birth",
    "credit card", "driver's license", "driving licence", "national insurance",
]
MESSAGING_ONLY = [
    "telegram", "whatsapp", "google hangouts", "signal app", "skype interview",
    "interview via text", "interview on telegram", "chat on whatsapp",
]
JOB_HINTS = [
    "hiring", "job offer", "position", "vacancy", "work from home", "remote job",
    "we are recruiting", "career opportunity", "employment", "recruit",
    "data entry", "package handler", "reshipping", "payment processor",
]

_SALARY_RE = re.compile(
    r"\$\s?([\d,]{2,})\s?(?:/|per\s|a\s)?\s?(hour|hr|day|week|wk)", re.IGNORECASE
)


def _unrealistic_salary(text: str) -> str | None:
    for m in _SALARY_RE.finditer(text or ""):
        try:
            amount = int(m.group(1).replace(",", ""))
        except ValueError:
            continue
        period = m.group(2).lower()
        if period in ("hour", "hr") and amount >= 80:
            return f"${amount}/hour"
        if period in ("day",) and amount >= 600:
            return f"${amount}/day"
        if period in ("week", "wk") and amount >= 2000:
            return f"${amount}/week"
    return None


def analyze(content: str, indicators: list[dict], demo_mode: bool = False) -> dict:
    lowered = (content or "").lower()
    score = 0
    reasons: list[str] = []

    salary = _unrealistic_salary(content)
    if salary:
        score += 26
        reasons.append(f"Unrealistically high pay for the role ({salary})")

    fees = [p for p in UPFRONT_FEE if p in lowered]
    if fees:
        score += 34
        reasons.append(f"Requests an upfront payment from the applicant (“{fees[0]}”)")

    info = [p for p in PERSONAL_INFO if p in lowered]
    if info:
        score += 26
        reasons.append(f"Asks for sensitive personal/financial data (“{info[0]}”)")

    msg = [p for p in MESSAGING_ONLY if p in lowered]
    if msg:
        score += 22
        reasons.append(f"Interview conducted only via a messaging app (“{msg[0]}”)")

    if "no experience" in lowered and ("$" in content or "salary" in lowered):
        score += 12
        reasons.append("High pay promised with 'no experience required'")

    # recruiter using a free webmail address rather than a company domain
    for email in extract_emails(content):
        if email.split("@")[-1].lower() in FREE_EMAIL_PROVIDERS:
            score += 18
            reasons.append(
                f"Recruiter contact uses a personal webmail address ({email}), "
                "not a corporate domain"
            )
            break

    # borrow generic scam signals (urgency, etc.) at a light weight
    text = text_agent.scan_text(content)
    if text["categories"]:
        score += min(text["score"] // 3, 15)
        reasons.extend(text["reasons"][:2])

    looks_like_job = any(h in lowered for h in JOB_HINTS)
    if not reasons:
        reasons.append(
            "No classic job-scam signals detected"
            if looks_like_job else
            "Content does not strongly resemble a job offer"
        )

    seen, deduped = set(), []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            deduped.append(r)

    return {"agent": "Job Scam Agent", "risk_score": min(score, 100), "reasons": deduped}
