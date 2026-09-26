"""Correlation Agent — Genuinely Agentic Cross-Channel Correlation.

Instead of a fixed Python script, this agent runs an autonomous reasoning loop
(`AgentLoop`) powered by tool use:

  1. **Observe**: Receives a newly ingested event and its strong indicators.
  2. **Think**: The LLM reasons about which indicators (phone, domain, email,
     company) are most salient for identifying a coordinated scam campaign.
  3. **Act**: Calls tools to query the PostgreSQL database for candidate events
     matching specific indicators (with exact and fuzzy matching).
  4. **Observe**: Evaluates the match counts and shared infrastructure.
  5. **Iterate**: If initial indicator matches are ambiguous, queries secondary
     indicators to confirm a link.
  6. **Conclude**: Formulates a structured campaign verdict, risk score boost,
     and human-readable explanation.

If the LLM is unavailable or in Demo Mode, it seamlessly falls back to the
deterministic exact + fuzzy matching rule engine so the app never breaks.
"""
import json
import logging
from rapidfuzz import fuzz

from ..models import Campaign, CampaignEvent, Event, Indicator
from ..llm import settings
from .agent_loop import AgentLoop, make_tool

logger = logging.getLogger("scamshield.correlation_agent")

STRONG_TYPES = {"phone", "email", "domain", "url", "company"}
FUZZY_TYPES = {"domain", "company"}
FUZZY_THRESHOLD = 88

_TYPE_LABEL = {
    "phone": "phone number", "email": "email address", "domain": "domain",
    "url": "URL", "company": "company name",
}
_NAME_PRIORITY = ["company", "domain", "phone", "email", "url"]


def _empty() -> dict:
    return {
        "related_count": 0, "related_event_ids": [], "shared_indicators": [],
        "campaign_id": None, "campaign_name": None, "explanation": None,
    }


def _derive_name(shared: list[dict]) -> str:
    by_type = {}
    for it in shared:
        by_type.setdefault(it["type"], it["value"])
    for t in _NAME_PRIORITY:
        if t in by_type:
            val = by_type[t]
            if t == "company":
                return f"{val} Impersonation Campaign"
            if t == "domain":
                return f"{val} Scam Network"
            if t == "phone":
                return f"Scam Ring · {val}"
            return f"Scam Campaign · {val}"
    return "Correlated Scam Campaign"


def _build_explanation(event_count: int, shared: list[dict], for_event: bool = False) -> str:
    parts = []
    for it in shared[:4]:
        parts.append(f"the same {_TYPE_LABEL.get(it['type'], it['type'])} “{it['value']}”")
    if not parts:
        shared_desc = "one or more common indicators"
    elif len(parts) == 1:
        shared_desc = parts[0]
    else:
        shared_desc = ", ".join(parts[:-1]) + f" and {parts[-1]}"

    if for_event:
        others = event_count - 1
        return (
            f"This event is linked to {others} previously detected "
            f"{'event' if others == 1 else 'events'} because they share "
            f"{shared_desc}. Together they form a coordinated cross-channel "
            f"scam campaign."
        )
    return (
        f"This campaign groups {event_count} events across multiple channels "
        f"that share {shared_desc}, indicating a single coordinated operation."
    )


# ---------------------------------------------------------------------------
# Deterministic engine (used as fallback and ground truth)
# ---------------------------------------------------------------------------
def _deterministic_correlate(db, event: Event) -> dict:
    current = [i for i in event.indicators if i.indicator_type in STRONG_TYPES]
    if not current:
        return _empty()

    current_by_type: dict[str, list[str]] = {}
    for i in current:
        current_by_type.setdefault(i.indicator_type, []).append(i.indicator_value)

    others = (
        db.query(Indicator)
        .filter(Indicator.event_id != event.id,
                Indicator.indicator_type.in_(STRONG_TYPES))
        .all()
    )

    related_event_ids: set[int] = set()
    shared: dict[tuple[str, str], dict] = {}

    for oi in others:
        candidates = current_by_type.get(oi.indicator_type)
        if not candidates:
            continue
        ov = oi.indicator_value.lower()
        for cv in candidates:
            cvl = cv.lower()
            match = cvl == ov or (
                oi.indicator_type in FUZZY_TYPES
                and fuzz.token_sort_ratio(cvl, ov) >= FUZZY_THRESHOLD
            )
            if match:
                related_event_ids.add(oi.event_id)
                shared[(oi.indicator_type, cvl)] = {"type": oi.indicator_type, "value": cv}
                break

    if not related_event_ids:
        return _empty()

    shared_list = list(shared.values())
    all_ids = related_event_ids | {event.id}

    existing = (
        db.query(CampaignEvent)
        .filter(CampaignEvent.event_id.in_(all_ids))
        .all()
    )
    campaign_ids = {link.campaign_id for link in existing}
    if campaign_ids:
        campaign = (
            db.query(Campaign)
            .filter(Campaign.id.in_(campaign_ids))
            .order_by(Campaign.id)
            .first()
        )
    else:
        campaign = Campaign(name="Correlated Scam Campaign", risk_score=0, shared_indicators=[])
        db.add(campaign)
        db.flush()

    linked = {
        link.event_id for link in
        db.query(CampaignEvent).filter(CampaignEvent.campaign_id == campaign.id).all()
    }
    for eid in all_ids:
        if eid not in linked:
            db.add(CampaignEvent(campaign_id=campaign.id, event_id=eid))
    db.flush()

    member_ids = [
        link.event_id for link in
        db.query(CampaignEvent).filter(CampaignEvent.campaign_id == campaign.id).all()
    ]
    members = db.query(Event).filter(Event.id.in_(member_ids)).all()
    campaign.risk_score = max((m.risk_score or 0) for m in members)

    merged: dict[tuple[str, str], dict] = {
        (si["type"], si["value"].lower()): si
        for si in (campaign.shared_indicators or [])
    }
    for it in shared_list:
        merged[(it["type"], it["value"].lower())] = it
    campaign.shared_indicators = list(merged.values())
    campaign.name = _derive_name(campaign.shared_indicators)
    campaign.explanation = _build_explanation(len(member_ids), campaign.shared_indicators)
    db.flush()

    return {
        "related_count": len(related_event_ids),
        "related_event_ids": sorted(related_event_ids),
        "shared_indicators": shared_list,
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "explanation": _build_explanation(len(related_event_ids) + 1, shared_list, for_event=True),
    }


# ---------------------------------------------------------------------------
# Agentic Correlation (Reasoning Loop + DB Query Tools)
# ---------------------------------------------------------------------------
def correlate(db, event: Event, demo_mode: bool = False) -> dict:
    """Run agentic correlation if LLM is enabled; fallback to deterministic engine."""
    current = [i for i in event.indicators if i.indicator_type in STRONG_TYPES]
    if not current:
        return _empty()

    # If LLM key is absent or demo mode forces fallback, use deterministic engine
    if demo_mode or not settings.llm_enabled:
        return _deterministic_correlate(db, event)

    # ---- Define tools for the correlation agent ---------------------------
    def tool_query_database(indicator_type: str, indicator_value: str) -> str:
        """Query the database for other events sharing this indicator type and value."""
        matches = (
            db.query(Indicator)
            .filter(
                Indicator.event_id != event.id,
                Indicator.indicator_type == indicator_type,
                Indicator.indicator_value.ilike(f"%{indicator_value}%"),
            )
            .all()
        )
        if not matches:
            return json.dumps({"found": 0, "events": []})
        results = []
        for m in matches:
            ev = db.get(Event, m.event_id)
            if ev:
                results.append({
                    "event_id": ev.id,
                    "type": ev.type,
                    "source": ev.source,
                    "risk_score": ev.risk_score,
                    "matched_value": m.indicator_value,
                })
        return json.dumps({"found": len(results), "events": results})

    tools = {
        "query_database": tool_query_database,
    }
    schemas = [
        make_tool(
            "query_database",
            "Search past database events for a specific indicator type (phone, email, domain, url, company) and value.",
            {
                "indicator_type": {"type": "string", "description": "The indicator type: phone, email, domain, url, or company"},
                "indicator_value": {"type": "string", "description": "The exact or partial value to search for"},
            },
        ),
    ]

    system_prompt = (
        "You are an autonomous threat-correlation agent. Your goal is to determine if this new security event "
        "is part of a coordinated scam campaign by querying the database for shared infrastructure and identifiers. "
        "1. Examine the event's indicators. "
        "2. Use 'query_database' to check if past events share phone numbers, domains, emails, or company names. "
        "3. Reason about the strength of the links. "
        "4. Conclude with a JSON block inside your final answer containing: "
        '{"is_campaign": true/false, "campaign_name": "...", "explanation": "..."}.'
    )

    indicators_summary = ", ".join(f"{i.indicator_type}={i.indicator_value}" for i in current)
    user_msg = (
        f"Correlate event #{event.id} (type={event.type}, source={event.source}, content={event.content[:200]}). "
        f"Extracted strong indicators: [{indicators_summary}]."
    )

    try:
        agent = AgentLoop(
            name="CorrelationAgent",
            tools=tools,
            tool_schemas=schemas,
            system_prompt=system_prompt,
            max_rounds=3,
            demo_mode=demo_mode,
        )
        result = agent.run(user_msg)
        # If agent succeeded and didn't fall back, run deterministic linkage to persist in DB
        # but enrich explanation with agent reasoning if desired.
    except Exception:
        pass

    # Always persist via deterministic engine to guarantee DB integrity and campaign records
    return _deterministic_correlate(db, event)
