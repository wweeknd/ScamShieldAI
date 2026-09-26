-- ==========================================================================
--  ScamShield AI — PostgreSQL schema
--  You normally DON'T need to run this by hand: the FastAPI app creates these
--  tables automatically on startup (via SQLAlchemy) for both SQLite and
--  PostgreSQL. This file is provided as the canonical schema reference and for
--  setting up a database manually if you prefer.
--
--  Run with:  psql "$DATABASE_URL" -f schema.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS events (
    id          SERIAL PRIMARY KEY,
    type        VARCHAR(32),               -- sms | email | url | qr | job
    content     TEXT,
    source      VARCHAR(255),              -- headline indicator (phone/domain/…)
    risk_score  INTEGER DEFAULT 0,         -- 0-100
    severity    VARCHAR(32),               -- SAFE | SUSPICIOUS | HIGH RISK
    reasons     JSONB DEFAULT '[]'::jsonb, -- list of reason strings
    agents      JSONB DEFAULT '[]'::jsonb, -- agents involved
    explanation TEXT,                      -- human-readable threat report
    timestamp   TIMESTAMP DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS ix_events_type ON events (type);
CREATE INDEX IF NOT EXISTS ix_events_severity ON events (severity);
CREATE INDEX IF NOT EXISTS ix_events_timestamp ON events (timestamp);

CREATE TABLE IF NOT EXISTS indicators (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER REFERENCES events (id) ON DELETE CASCADE,
    indicator_type  VARCHAR(32),           -- phone|email|domain|url|company
    indicator_value VARCHAR(512)
);
CREATE INDEX IF NOT EXISTS ix_indicators_event_id ON indicators (event_id);
CREATE INDEX IF NOT EXISTS ix_indicators_type ON indicators (indicator_type);
CREATE INDEX IF NOT EXISTS ix_indicators_value ON indicators (indicator_value);

CREATE TABLE IF NOT EXISTS campaigns (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(255),
    risk_score        INTEGER DEFAULT 0,
    explanation       TEXT,
    shared_indicators JSONB DEFAULT '[]'::jsonb,  -- list of {type, value}
    created_at        TIMESTAMP DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS campaign_events (
    campaign_id INTEGER REFERENCES campaigns (id) ON DELETE CASCADE,
    event_id    INTEGER REFERENCES events (id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, event_id)
);
