"""Database models.

Schema (matches the spec, with a few extra columns for a richer threat report):
  events           id, type, content, source, risk_score, severity,
                   reasons(JSON), agents(JSON), explanation, timestamp
  indicators       id, event_id, indicator_type, indicator_value
  campaigns        id, name, risk_score, explanation, shared_indicators(JSON), created_at
  campaign_events  campaign_id, event_id  (many-to-many link table)
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(32), index=True)          # sms | email | url | qr | job
    content = Column(Text)                          # raw analysed content
    source = Column(String(255), nullable=True)     # headline indicator (phone/domain/…)
    risk_score = Column(Integer, default=0)
    severity = Column(String(32), index=True)       # SAFE | SUSPICIOUS | HIGH RISK
    reasons = Column(JSON, default=list)            # list[str]
    agents = Column(JSON, default=list)             # list[str] agent names involved
    explanation = Column(Text, nullable=True)       # human-readable threat report
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    indicators = relationship(
        "Indicator", back_populates="event", cascade="all, delete-orphan"
    )
    campaign_links = relationship(
        "CampaignEvent", back_populates="event", cascade="all, delete-orphan"
    )


class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), index=True)
    indicator_type = Column(String(32), index=True)   # phone|email|domain|url|company|keyword
    indicator_value = Column(String(512), index=True)

    event = relationship("Event", back_populates="indicators")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    risk_score = Column(Integer, default=0)
    explanation = Column(Text, nullable=True)
    shared_indicators = Column(JSON, default=list)    # list[{"type","value"}]
    created_at = Column(DateTime, default=datetime.utcnow)

    event_links = relationship(
        "CampaignEvent", back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignEvent(Base):
    __tablename__ = "campaign_events"

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)

    campaign = relationship("Campaign", back_populates="event_links")
    event = relationship("Event", back_populates="campaign_links")
