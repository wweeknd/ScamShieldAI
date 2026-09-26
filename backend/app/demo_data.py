"""Demo Mode data.

Provides:
  * DEMO_MALICIOUS_DOMAINS / _PHONES — canned "threat intel" so live analysis
    in demo mode is deterministic (no VirusTotal needed).
  * SEED_EVENTS + the SecurePay Global campaign — a set of 4 CONNECTED scam
    events across SMS, email, job offer and URL that share a company name,
    domain and phone number, so the Correlation Agent and Scam Network page
    demonstrate cross-channel correlation reliably offline. Plus a few
    standalone events so the dashboard looks realistic.
"""
from datetime import datetime, timedelta

# Indicators the URL agent treats as known-bad while in demo mode.
DEMO_MALICIOUS_DOMAINS = {
    "securepay-global.com", "secure-pay-global.com", "deals-mail.info",
}
DEMO_MALICIOUS_PHONES = {"+14155550132"}

_COMPANY = "SecurePay Global"
_DOMAIN = "securepay-global.com"
_PHONE = "+14155550132"

# Each entry becomes one Event row (+ its indicators). `campaign=True` links it
# into the shared SecurePay Global campaign. `age` = how long ago it happened.
SEED_EVENTS: list[dict] = [
    {
        "key": "sms1", "campaign": True, "type": "sms",
        "age": timedelta(days=2),
        "source": _PHONE, "risk_score": 92, "severity": "HIGH RISK",
        "content": (
            "URGENT: Your SecurePay Global account has been suspended due to "
            "suspicious activity. Verify immediately at "
            "http://securepay-global.com/verify or call +1 (415) 555-0132 within "
            "24 hours to avoid permanent suspension and legal action."
        ),
        "reasons": [
            "Urgency / pressure tactics detected (“urgent”, “suspended”)",
            "Threats or intimidation detected (“legal action”)",
            "Request for passwords, OTPs or personal data (“verify your account”)",
            "Domain impersonates a trusted-brand pattern (securepay-global.com)",
            "Flagged as malicious by threat-intelligence feeds (demo data)",
        ],
        "agents": ["Text/SMS Agent", "URL Agent", "Correlation Agent"],
        "indicators": [
            {"type": "phone", "value": _PHONE},
            {"type": "url", "value": "http://securepay-global.com/verify"},
            {"type": "domain", "value": _DOMAIN},
            {"type": "company", "value": _COMPANY},
        ],
    },
    {
        "key": "email1", "campaign": True, "type": "email",
        "age": timedelta(days=2, hours=-1),
        "source": "support@securepay-global.com", "risk_score": 95,
        "severity": "HIGH RISK",
        "content": (
            "From: SecurePay Global Support <support@securepay-global.com>\n"
            "Subject: Immediate action required\n\n"
            "Dear Customer, we detected unauthorized access to your SecurePay "
            "Global account. To restore access, confirm your identity and "
            "password now at http://securepay-global.com/login. Failure to "
            "verify within 24 hours will result in account termination. "
            "Call our support line +1 (415) 555-0132."
        ),
        "reasons": [
            "Request for passwords, OTPs or personal data (“confirm your identity”)",
            "Urgency / pressure tactics detected (“within 24 hours”)",
            "Threats or intimidation detected (“account termination”)",
            "Phishing link to an impersonating domain (securepay-global.com)",
            "Flagged as malicious by threat-intelligence feeds (demo data)",
        ],
        "agents": ["Email Agent", "URL Agent", "Correlation Agent"],
        "indicators": [
            {"type": "email", "value": "support@securepay-global.com"},
            {"type": "domain", "value": _DOMAIN},
            {"type": "url", "value": "http://securepay-global.com/login"},
            {"type": "phone", "value": _PHONE},
            {"type": "company", "value": _COMPANY},
        ],
    },
    {
        "key": "job1", "campaign": True, "type": "job",
        "age": timedelta(hours=6),
        "source": _COMPANY, "risk_score": 88, "severity": "HIGH RISK",
        "content": (
            "Congratulations! SecurePay Global is hiring remote Payment "
            "Processing Agents. Earn $4,500/week, no experience required. To get "
            "started, pay a one-time $250 onboarding fee for your equipment. "
            "Send your SSN and bank account details to begin. Contact HR at "
            "hr.securepayglobal@gmail.com or +1 (415) 555-0132. "
            "Interview via Telegram only."
        ),
        "reasons": [
            "Unrealistically high pay for the role ($4500/week)",
            "Requests an upfront payment from the applicant (“onboarding fee”)",
            "Asks for sensitive personal/financial data (“ssn”)",
            "Interview conducted only via a messaging app (“telegram”)",
            "Recruiter contact uses a personal webmail address (hr.securepayglobal@gmail.com)",
        ],
        "agents": ["Job Scam Agent", "Correlation Agent"],
        "indicators": [
            {"type": "company", "value": _COMPANY},
            {"type": "email", "value": "hr.securepayglobal@gmail.com"},
            {"type": "phone", "value": _PHONE},
        ],
    },
    {
        "key": "url1", "campaign": True, "type": "url",
        "age": timedelta(days=1),
        "source": _DOMAIN, "risk_score": 90, "severity": "HIGH RISK",
        "content": "http://securepay-global.com/account-verify",
        "reasons": [
            "Domain impersonates a trusted-brand pattern (securepay-global.com)",
            "Domain contains an unusual number of hyphens",
            "Flagged as malicious by threat-intelligence feeds (demo data)",
        ],
        "agents": ["URL Agent", "Correlation Agent"],
        "indicators": [
            {"type": "url", "value": "http://securepay-global.com/account-verify"},
            {"type": "domain", "value": _DOMAIN},
        ],
    },
    # ---- standalone events (not part of the campaign) --------------------
    {
        "key": "safe_sms", "campaign": False, "type": "sms",
        "age": timedelta(days=3),
        "source": "appointment reminder", "risk_score": 6, "severity": "SAFE",
        "content": (
            "Hi, this is a reminder that your dentist appointment is scheduled "
            "for tomorrow at 3 PM. Reply C to confirm or R to reschedule."
        ),
        "reasons": ["No known scam patterns detected in the message text"],
        "agents": ["Text/SMS Agent", "Correlation Agent"],
        "indicators": [],
    },
    {
        "key": "susp_email", "campaign": False, "type": "email",
        "age": timedelta(days=1, hours=5),
        "source": "promotions@deals-mail.info", "risk_score": 54,
        "severity": "SUSPICIOUS",
        "content": (
            "From: promotions@deals-mail.info\n"
            "You've been selected for a special offer! Claim your $100 gift card "
            "now by clicking http://deals-mail.info/claim. Limited time only, "
            "act now before it expires!"
        ),
        "reasons": [
            "Fake reward or prize bait detected (“gift card”, “you have been selected”)",
            "Urgency / pressure tactics detected (“act now”, “expires”)",
            "Flagged as malicious by threat-intelligence feeds (demo data)",
        ],
        "agents": ["Email Agent", "URL Agent", "Correlation Agent"],
        "indicators": [
            {"type": "email", "value": "promotions@deals-mail.info"},
            {"type": "domain", "value": "deals-mail.info"},
            {"type": "url", "value": "http://deals-mail.info/claim"},
        ],
    },
    {
        "key": "safe_url", "campaign": False, "type": "url",
        "age": timedelta(days=4),
        "source": "google.com", "risk_score": 4, "severity": "SAFE",
        "content": "https://www.google.com",
        "reasons": ["No suspicious URL patterns detected"],
        "agents": ["URL Agent", "Correlation Agent"],
        "indicators": [
            {"type": "url", "value": "https://www.google.com"},
            {"type": "domain", "value": "google.com"},
        ],
    },
]

_CAMPAIGN = {
    "name": f"{_COMPANY} Impersonation Campaign",
    "risk_score": 95,
    "shared_indicators": [
        {"type": "company", "value": _COMPANY},
        {"type": "domain", "value": _DOMAIN},
        {"type": "phone", "value": _PHONE},
    ],
    "explanation": (
        f"Four events across SMS, email, a job offer and a URL are linked into a "
        f"single coordinated campaign because they share the company name "
        f"“{_COMPANY}”, the domain “{_DOMAIN}” and the phone number “{_PHONE}”. "
        f"This indicates one scam operation attacking victims through multiple "
        f"channels at once."
    ),
}


def seed_demo_data(db, reset: bool = False) -> dict:
    """Insert the demo dataset. Idempotent unless reset=True."""
    from .models import Campaign, CampaignEvent, Event, Indicator

    if reset:
        db.query(CampaignEvent).delete()
        db.query(Indicator).delete()
        db.query(Campaign).delete()
        db.query(Event).delete()
        db.commit()

    if db.query(Event).count() > 0 and not reset:
        return {"seeded": False, "reason": "database not empty"}

    now = datetime.utcnow()
    id_map: dict[str, int] = {}

    for spec in SEED_EVENTS:
        event = Event(
            type=spec["type"], content=spec["content"], source=spec["source"],
            risk_score=spec["risk_score"], severity=spec["severity"],
            reasons=spec["reasons"], agents=spec["agents"],
            timestamp=now - spec["age"],
        )
        db.add(event)
        db.flush()
        id_map[spec["key"]] = event.id
        for ind in spec["indicators"]:
            db.add(Indicator(event_id=event.id, indicator_type=ind["type"],
                             indicator_value=ind["value"]))
    db.flush()

    campaign = Campaign(
        name=_CAMPAIGN["name"], risk_score=_CAMPAIGN["risk_score"],
        explanation=_CAMPAIGN["explanation"],
        shared_indicators=_CAMPAIGN["shared_indicators"],
    )
    db.add(campaign)
    db.flush()
    for spec in SEED_EVENTS:
        if spec["campaign"]:
            db.add(CampaignEvent(campaign_id=campaign.id, event_id=id_map[spec["key"]]))

    # set the campaign explanation onto member events for a nicer report
    for spec in SEED_EVENTS:
        if spec["campaign"]:
            ev = db.get(Event, id_map[spec["key"]])
            if ev and not ev.explanation:
                ev.explanation = (
                    "This message is part of the detected " + _CAMPAIGN["name"] +
                    ". " + _CAMPAIGN["explanation"]
                )
    db.commit()
    return {"seeded": True, "events": len(SEED_EVENTS), "campaigns": 1}
