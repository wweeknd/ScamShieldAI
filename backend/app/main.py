"""ScamShield AI — FastAPI application (routes, CORS, startup, warm-up)."""
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import crud, models  # noqa: F401  (models import registers tables)
from .agents.qr_agent import decode_qr
from .config import settings
from .database import Base, engine, get_db
from .demo_data import seed_demo_data
from .graph.orchestrator import run_analysis
from .schemas import (
    AnalyzeRequest,
    CampaignOut,
    DashboardStats,
    EventOut,
    EventSummary,
    NetworkGraph,
    UrlRequest,
)

logger = logging.getLogger("scamshield")
VALID_TYPES = {"sms", "email", "url", "job"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create tables + optionally seed the demo dataset on first boot
    try:
        Base.metadata.create_all(bind=engine)
        if settings.AUTO_SEED:
            from .database import SessionLocal
            db = SessionLocal()
            try:
                result = seed_demo_data(db)
                if result.get("seeded"):
                    logger.info("Seeded demo data: %s", result)
            finally:
                db.close()
    except Exception as exc:  # never let startup crash the whole service
        logger.exception("Startup initialisation failed: %s", exc)
    yield


app = FastAPI(title="ScamShield AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
#  Health / warm-up (hit /warmup before a demo to beat Render cold starts)
# --------------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "service": "ScamShield AI",
        "status": "online",
        "demo_mode_default": settings.DEMO_MODE,
        "llm_enabled": settings.llm_enabled,
        "virustotal_enabled": settings.virustotal_enabled,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/warmup")
def warmup(db: Session = Depends(get_db)):
    count = db.query(func.count(models.Event.id)).scalar() or 0
    return {"status": "warm", "events": count}


# --------------------------------------------------------------------------
#  Analyze
# --------------------------------------------------------------------------
def _analyze_sync(db: Session, input_type: str, content: str,
                  sender: str | None, demo_mode: bool,
                  extra_agents: list[str] | None = None) -> EventOut:
    try:
        state = run_analysis(db, input_type, content, sender=sender,
                             demo_mode=demo_mode, extra_agents=extra_agents)
        db.commit()
    except Exception:
        db.rollback()
        raise
    event = db.get(models.Event, state["event_id"])
    return crud.to_event_out(db, event)


@app.post("/analyze", response_model=EventOut)
def analyze(req: AnalyzeRequest, db: Session = Depends(get_db)):
    input_type = req.type.lower().strip()
    if input_type not in VALID_TYPES:
        raise HTTPException(422, f"Unsupported type '{req.type}'. "
                                 f"Use one of: {', '.join(sorted(VALID_TYPES))}.")
    if not req.content or not req.content.strip():
        raise HTTPException(422, "Content must not be empty.")
    demo = req.demo_mode or settings.DEMO_MODE
    return _analyze_sync(db, input_type, req.content, req.sender, demo)


@app.post("/analyze/url", response_model=EventOut)
def analyze_url(req: UrlRequest, db: Session = Depends(get_db)):
    if not req.url or not req.url.strip():
        raise HTTPException(422, "URL must not be empty.")
    demo = req.demo_mode or settings.DEMO_MODE
    return _analyze_sync(db, "url", req.url.strip(), None, demo)


@app.post("/analyze/qr", response_model=EventOut)
async def analyze_qr(file: UploadFile = File(...), demo_mode: bool = Form(False),
                     db: Session = Depends(get_db)):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(422, "Uploaded file is empty.")
    decoded = await run_in_threadpool(decode_qr, image_bytes)
    if not decoded:
        raise HTTPException(422, "Could not read a QR code from the image.")
    demo = demo_mode or settings.DEMO_MODE
    # If the QR encodes a URL, analyse it as a URL; otherwise treat as text.
    is_url = decoded.lower().startswith(("http://", "https://", "www.")) or "." in decoded.split()[0]
    input_type = "url" if is_url else "sms"
    return await run_in_threadpool(
        _analyze_sync, db, input_type, decoded, None, demo, ["QR Agent"]
    )


# --------------------------------------------------------------------------
#  Events
# --------------------------------------------------------------------------
@app.get("/events", response_model=list[EventSummary])
def get_events(
    severity: str | None = Query(None),
    type: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_events(db, severity=severity, type=type, limit=limit)


@app.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(models.Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found.")
    return crud.to_event_out(db, event)


# --------------------------------------------------------------------------
#  Campaigns
# --------------------------------------------------------------------------
@app.get("/campaigns", response_model=list[CampaignOut])
def get_campaigns(db: Session = Depends(get_db)):
    return crud.list_campaigns(db)


@app.get("/campaigns/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.get(models.Campaign, campaign_id)
    if not campaign:
        raise HTTPException(404, "Campaign not found.")
    return crud.to_campaign_out(db, campaign)


# --------------------------------------------------------------------------
#  Dashboard + network
# --------------------------------------------------------------------------
@app.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.dashboard_stats(db)


@app.get("/network", response_model=NetworkGraph)
def get_network(db: Session = Depends(get_db)):
    return crud.build_network(db)


# --------------------------------------------------------------------------
#  Demo data controls
# --------------------------------------------------------------------------
@app.post("/demo/seed")
def demo_seed(db: Session = Depends(get_db)):
    return seed_demo_data(db)


@app.post("/demo/reset")
def demo_reset(db: Session = Depends(get_db)):
    return seed_demo_data(db, reset=True)
