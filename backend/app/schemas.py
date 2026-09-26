"""Pydantic request/response schemas — the API contract the frontend relies on."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# --------------------------------------------------------------------------
#  Requests
# --------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    type: str                       # sms | email | url | job
    content: str                    # message text, email body, or URL
    sender: Optional[str] = None    # optional "From" address for email
    demo_mode: bool = False         # frontend toggle -> offline template mode


class UrlRequest(BaseModel):
    url: str
    demo_mode: bool = False


# --------------------------------------------------------------------------
#  Building blocks
# --------------------------------------------------------------------------
class IndicatorOut(BaseModel):
    type: str
    value: str


class CorrelationOut(BaseModel):
    related_count: int = 0
    related_event_ids: list[int] = []
    shared_indicators: list[IndicatorOut] = []
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    explanation: Optional[str] = None


# --------------------------------------------------------------------------
#  Event responses
# --------------------------------------------------------------------------
class EventSummary(BaseModel):
    id: int
    type: str
    source: Optional[str] = None
    risk_score: int
    severity: str
    timestamp: datetime
    campaign_id: Optional[int] = None

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: int
    type: str
    content: str
    source: Optional[str] = None
    risk_score: int
    severity: str
    reasons: list[str] = []
    agents: list[str] = []
    explanation: Optional[str] = None
    indicators: list[IndicatorOut] = []
    correlation: CorrelationOut = CorrelationOut()
    timestamp: datetime


# --------------------------------------------------------------------------
#  Campaigns
# --------------------------------------------------------------------------
class CampaignOut(BaseModel):
    id: int
    name: str
    risk_score: int
    explanation: Optional[str] = None
    shared_indicators: list[IndicatorOut] = []
    event_count: int = 0
    events: list[EventSummary] = []
    created_at: datetime


# --------------------------------------------------------------------------
#  Dashboard + network
# --------------------------------------------------------------------------
class DashboardStats(BaseModel):
    total_events: int
    scams_detected: int
    suspicious_events: int
    safe_events: int
    active_campaigns: int
    activity: list[dict[str, Any]]      # [{"label": "Mon", "count": 3}, ...]
    recent: list[EventSummary]


class NetworkNode(BaseModel):
    id: str
    label: str
    kind: str          # event | phone | email | domain | url | company | campaign
    severity: Optional[str] = None
    risk_score: Optional[int] = None
    event_id: Optional[int] = None
    campaign_id: Optional[int] = None


class NetworkLink(BaseModel):
    source: str
    target: str
    kind: Optional[str] = None


class NetworkGraph(BaseModel):
    nodes: list[NetworkNode]
    links: list[NetworkLink]
