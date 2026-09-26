"""Central configuration, loaded from environment variables (.env supported).

Everything has a sensible default so the app boots with an empty environment.
"""
import os

from dotenv import load_dotenv

load_dotenv()  # loads a local .env file if present


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    def __init__(self) -> None:
        # ---- Database -----------------------------------------------------
        db_url = os.getenv("DATABASE_URL", "sqlite:///./scamshield.db")
        # Render/Heroku hand out "postgres://" which SQLAlchemy no longer accepts.
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        self.DATABASE_URL: str = db_url

        # ---- Claude LLM (optional) ---------------------------------------
        self.ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.LLM_MODEL: str = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001").strip()
        self.LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "20"))

        # ---- VirusTotal (optional) ---------------------------------------
        self.VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "").strip()
        self.VT_TIMEOUT: float = float(os.getenv("VT_TIMEOUT", "8"))
        self.VT_CACHE_TTL: int = int(os.getenv("VT_CACHE_TTL", "3600"))  # seconds

        # ---- Behaviour flags ---------------------------------------------
        self.DEMO_MODE: bool = _as_bool(os.getenv("DEMO_MODE"), False)
        self.AUTO_SEED: bool = _as_bool(os.getenv("AUTO_SEED"), True)

        # ---- CORS ---------------------------------------------------------
        self.CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

    @property
    def virustotal_enabled(self) -> bool:
        return bool(self.VIRUSTOTAL_API_KEY)


settings = Settings()

# ---- Risk scoring thresholds (shared everywhere) -------------------------
HIGH_RISK_THRESHOLD = 70
SUSPICIOUS_THRESHOLD = 35


def severity_from_score(score: int) -> str:
    """Map a 0-100 risk score to a severity label."""
    if score >= HIGH_RISK_THRESHOLD:
        return "HIGH RISK"
    if score >= SUSPICIOUS_THRESHOLD:
        return "SUSPICIOUS"
    return "SAFE"
