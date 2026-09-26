"""Read-side helpers: queries + serialization from ORM models to API schemas."""
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import func

from .models import Campaign, CampaignEvent, Event, Indicator
from .schemas import (
    CampaignOut,
    CorrelationOut,
    DashboardStats,
    EventOut,
    EventSummary,
    IndicatorOut,
    NetworkGraph,
    NetworkLink,
    NetworkNode,
)


def event_campaign_id(db, event_id: int) -> int | None:
    link = db.query(CampaignEvent).filter(CampaignEvent.event_id == event_id).first()
    return link.campaign_id if link else None


def to_event_summary(db, event: Event) -> EventSummary:
    return EventSummary(
        id=event.id, type=event.type, source=event.source,
        risk_score=event.risk_score or 0, severity=event.severity,
        timestamp=event.timestamp, campaign_id=event_campaign_id(db, event.id),
    )


def _correlation_for(db, event: Event) -> CorrelationOut:
    link = db.query(CampaignEvent).filter(CampaignEvent.event_id == event.id).first()
    if not link:
        return CorrelationOut()
    campaign = db.get(Campaign, link.campaign_id)
    if not campaign:
        return CorrelationOut()
    member_ids = [
        l.event_id for l in
        db.query(CampaignEvent).filter(CampaignEvent.campaign_id == campaign.id).all()
    ]
    others = [i for i in member_ids if i != event.id]
    return CorrelationOut(
        related_count=len(others),
        related_event_ids=others,
        shared_indicators=[IndicatorOut(**si) for si in (campaign.shared_indicators or [])],
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        explanation=campaign.explanation,
    )


def to_event_out(db, event: Event) -> EventOut:
    return EventOut(
        id=event.id, type=event.type, content=event.content, source=event.source,
        risk_score=event.risk_score or 0, severity=event.severity,
        reasons=event.reasons or [], agents=event.agents or [],
        explanation=event.explanation,
        indicators=[IndicatorOut(type=i.indicator_type, value=i.indicator_value)
                    for i in event.indicators],
        correlation=_correlation_for(db, event),
        timestamp=event.timestamp,
    )


def list_events(db, severity: str | None = None, type: str | None = None,
                limit: int = 200) -> list[EventSummary]:
    q = db.query(Event)
    if severity:
        q = q.filter(Event.severity == severity)
    if type:
        q = q.filter(Event.type == type)
    q = q.order_by(Event.timestamp.desc()).limit(limit)
    return [to_event_summary(db, e) for e in q.all()]


def list_campaigns(db) -> list[CampaignOut]:
    return [to_campaign_out(db, c)
            for c in db.query(Campaign).order_by(Campaign.risk_score.desc()).all()]


def to_campaign_out(db, campaign: Campaign) -> CampaignOut:
    member_ids = [
        l.event_id for l in
        db.query(CampaignEvent).filter(CampaignEvent.campaign_id == campaign.id).all()
    ]
    events = (
        db.query(Event).filter(Event.id.in_(member_ids))
        .order_by(Event.timestamp.desc()).all()
        if member_ids else []
    )
    return CampaignOut(
        id=campaign.id, name=campaign.name, risk_score=campaign.risk_score or 0,
        explanation=campaign.explanation,
        shared_indicators=[IndicatorOut(**si) for si in (campaign.shared_indicators or [])],
        event_count=len(member_ids),
        events=[to_event_summary(db, e) for e in events],
        created_at=campaign.created_at,
    )


def dashboard_stats(db) -> DashboardStats:
    total = db.query(func.count(Event.id)).scalar() or 0
    scams = db.query(func.count(Event.id)).filter(Event.severity == "HIGH RISK").scalar() or 0
    suspicious = db.query(func.count(Event.id)).filter(Event.severity == "SUSPICIOUS").scalar() or 0
    safe = db.query(func.count(Event.id)).filter(Event.severity == "SAFE").scalar() or 0
    campaigns = db.query(func.count(Campaign.id)).scalar() or 0

    # activity over the last 7 days
    today = datetime.utcnow().date()
    counts: dict = defaultdict(int)
    for (ts,) in db.query(Event.timestamp).all():
        if ts and (today - ts.date()).days < 7:
            counts[ts.date()] += 1
    activity = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        activity.append({"label": day.strftime("%a"), "date": day.isoformat(),
                         "count": counts.get(day, 0)})

    recent = (db.query(Event).order_by(Event.timestamp.desc()).limit(8).all())
    return DashboardStats(
        total_events=total, scams_detected=scams, suspicious_events=suspicious,
        safe_events=safe, active_campaigns=campaigns, activity=activity,
        recent=[to_event_summary(db, e) for e in recent],
    )


_NODE_KINDS = {"phone", "email", "domain", "url", "company"}


def build_network(db) -> NetworkGraph:
    nodes: dict[str, NetworkNode] = {}
    links: list[NetworkLink] = []

    events = db.query(Event).all()
    for ev in events:
        eid = f"event-{ev.id}"
        nodes[eid] = NetworkNode(
            id=eid, label=f"{ev.type.upper()} · {ev.source or ('#' + str(ev.id))}"[:40],
            kind="event", severity=ev.severity, risk_score=ev.risk_score,
            event_id=ev.id,
        )
        for ind in ev.indicators:
            if ind.indicator_type not in _NODE_KINDS:
                continue
            nid = f"{ind.indicator_type}:{ind.indicator_value.lower()}"
            if nid not in nodes:
                nodes[nid] = NetworkNode(
                    id=nid, label=ind.indicator_value[:40],
                    kind=ind.indicator_type,
                )
            links.append(NetworkLink(source=eid, target=nid, kind="has-indicator"))

    for camp in db.query(Campaign).all():
        cid = f"campaign-{camp.id}"
        nodes[cid] = NetworkNode(
            id=cid, label=camp.name[:40], kind="campaign",
            risk_score=camp.risk_score, campaign_id=camp.id,
        )
        for link in db.query(CampaignEvent).filter(
                CampaignEvent.campaign_id == camp.id).all():
            eid = f"event-{link.event_id}"
            if eid in nodes:
                links.append(NetworkLink(source=cid, target=eid, kind="in-campaign"))

    return NetworkGraph(nodes=list(nodes.values()), links=links)
