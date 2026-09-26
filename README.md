<div align="center">

# 🛡️ ScamShield AI

### Multi-Channel Scam Detection & Correlation

**ScamShield AI** analyzes SMS messages, emails, URLs, QR codes and job offers with a
multi-agent AI engine — then **correlates suspicious events across channels** to expose
coordinated scam campaigns that any single check would miss.

*Built for the AgentX-2026 hackathon.*

</div>

---

## ✨ What makes it different

Most scam checkers score one message in isolation. ScamShield AI's **Correlation Agent**
links events by their shared **phone numbers, domains, emails and company names** — so a
lone "suspicious" text and a "high-risk" email are revealed as two arms of the *same*
campaign. That cross-channel graph is the core of the product.

| Capability | Detail |
|---|---|
| **6 specialized agents** | URL · Text/SMS · Email · **Correlation** · Job · QR |
| **Risk scoring** | Every item gets a 0–100 score, a severity (Safe / Suspicious / High Risk), extracted indicators and a plain-language analyst summary |
| **Scam network graph** | Interactive force-directed graph of events ↔ shared indicators ↔ campaigns |
| **Demo Mode** | Runs the full experience on realistic sample data with **no API keys** |

### The five pages

1. **Dashboard** — threat overview, stats, 7-day activity, recent detections
2. **Analyze** — submit an SMS, email, URL, QR image or job offer
3. **Threat Report** — full breakdown of one item (score, reasons, indicators, correlation)
4. **Scam Network** — the cross-channel correlation graph
5. **History** — filterable log of everything analyzed

---

## 🧱 Tech stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router (custom SVG charts & graph — no heavy chart libs)
- **Backend:** Python + FastAPI, orchestrated with **LangGraph**
- **AI:** Claude (optional; graceful template fallback when no key)
- **Threat intel:** VirusTotal (optional; rule-based fallback when no key)
- **Database:** SQLite for local dev, PostgreSQL in production
- **Deploy:** Render (Blueprint included)

---

## 🚀 Quick start (local)

> **You need:** [Python 3.11+](https://www.python.org/downloads/) and
> [Node.js 18+](https://nodejs.org/). Check with `python --version` and `node --version`.
>
> **Good news:** you do **not** need any API keys. The app runs fully in Demo Mode out of the box.

You'll run **two** terminals — one for the backend, one for the frontend.

### 1️⃣ Backend (FastAPI)

```bash
cd backend

# create + activate a virtual environment
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows (Git Bash):
source .venv/Scripts/activate
# Windows (PowerShell):   .venv\Scripts\Activate.ps1

# install dependencies
pip install -r requirements.txt

# start the API (http://localhost:8000)
uvicorn app.main:app --reload --port 5500
```

On first boot the backend creates the database and (because `AUTO_SEED=true`) loads the
connected demo scam campaign automatically. Visit **http://localhost:8000/docs** for the
interactive API.

### 2️⃣ Frontend (React + Vite)

Open a **second** terminal:

```bash
cd frontend

# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev
```

Open **http://localhost:5173** — the Dashboard should already show the seeded campaign.
Head to **Analyze**, click *"Try a sample"*, and watch it flow through to the Threat Report
and light up the Scam Network. 🎉

---

## 🔑 Environment variables

**Everything is optional.** Copy the example files only if you want to customize behavior:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./scamshield.db` | Postgres URL in production. `postgres://` is auto-rewritten to `postgresql://`. |
| `ANTHROPIC_API_KEY` | *(unset)* | Enables Claude-generated explanations. Without it, polished template explanations are used. [Get one](https://console.anthropic.com/). |
| `LLM_MODEL` | `claude-haiku-4-5-20251001` | Which Claude model to use. |
| `VIRUSTOTAL_API_KEY` | *(unset)* | Real URL/domain reputation. Without it, rule-based checks are used. [Free key](https://www.virustotal.com/gui/my-apikey). |
| `AUTO_SEED` | `true` | On first boot with an empty DB, load the demo campaign. |
| `DEMO_MODE` | `false` | Force offline explanations + canned intel globally (the UI toggle does this per-request). |
| `CORS_ORIGINS` | `*` | Comma-separated allowed frontend origins, or `*`. |

### Frontend (`frontend/.env`) — inlined at **build** time

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | URL of the backend API. |
| `VITE_SITE_URL` | `https://www.scamshield-ai.com` | Public site URL — used for canonical tags, Open Graph, `sitemap.xml`, `robots.txt`, `llms.txt`. |

> ℹ️ **Demo Mode ≠ no backend.** Demo Mode means *no external API keys are required* — the
> FastAPI server still runs and does the detection locally.

---

## ☁️ Deploy to Render (Blueprint)

This repo ships a [`render.yaml`](render.yaml) Blueprint that provisions **three** resources:
a PostgreSQL database, the FastAPI backend, and the static React frontend (with SPA routing).

### Steps

1. Push this repository to **GitHub**.
2. In the [Render dashboard](https://dashboard.render.com/): **New +** → **Blueprint**.
3. Connect your repo. Render reads `render.yaml` and shows the three resources — click **Apply**.
4. Wait for the first deploy (a few minutes). You'll get two URLs:
   - Backend: `https://scamshield-api.onrender.com`
   - Frontend: `https://scamshield-web.onrender.com`
5. **Verify the URLs match.** If Render appended a suffix (because a name was taken), open
   `render.yaml` and update the frontend's `VITE_API_URL` / `VITE_SITE_URL` and the backend's
   `CORS_ORIGINS` to the real URLs, commit, and let it redeploy. *(Vite inlines env vars at
   build time, so the static site must rebuild after any change.)*
6. *(Optional)* Add `ANTHROPIC_API_KEY` and `VIRUSTOTAL_API_KEY` to the **scamshield-api**
   service under **Environment** for live Claude explanations and VirusTotal checks. They are
   marked `sync: false` so they're never committed to the repo.

> ⚠️ **Free-tier notes:** Render's free web services **sleep after inactivity** — the first
> request after a nap takes ~30–60s (cold start). Hit `GET /warmup` on the backend right
> before a demo to wake it. Render's free PostgreSQL is also **deleted ~30 days** after
> creation. For a hackathon that's fine; `AUTO_SEED` rebuilds the demo data on each fresh boot.

### Prefer SQLite (no database service)?

Delete the `databases:` block and the `DATABASE_URL` env var from `render.yaml`. The backend
falls back to an ephemeral SQLite file and re-seeds the demo campaign on every boot. Simpler,
but user-analyzed events won't survive restarts.

---

## 🌐 Custom domain

The default site URL (`https://www.scamshield-ai.com`) is a **placeholder** used for SEO
tags. To use your own domain:

1. Register a domain with any registrar and add it to your **scamshield-web** service in
   Render (**Settings → Custom Domains**), following Render's DNS instructions.
2. Set `VITE_SITE_URL` to your domain (e.g. `https://scamshield.io`) and redeploy so canonical
   tags, Open Graph URLs, and the generated `sitemap.xml` / `robots.txt` / `llms.txt` all point
   at it.

---

## 🖼️ Regenerating SEO assets

- **Text files** (`sitemap.xml`, `robots.txt`, `llms.txt`) regenerate automatically on every
  build via the `prebuild` script. To run manually:
  ```bash
  cd frontend && npm run gen:seo
  ```
- **Social image** (`public/og-image.png`) and the Apple touch icon are produced by a one-time
  [Pillow](https://pypi.org/project/pillow/) script (they are committed, not part of the build):
  ```bash
  pip install pillow
  python frontend/scripts/gen_og.py
  ```

---

## 📁 Project structure

```
hackathon/
├── render.yaml              # Render Blueprint (db + backend + frontend)
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes, CORS, startup/seed, warm-up
│   │   ├── config.py        # env-driven settings (all optional)
│   │   ├── database.py      # SQLAlchemy engine (SQLite ↔ Postgres)
│   │   ├── models.py        # Event / Campaign / Indicator tables
│   │   ├── schemas.py       # Pydantic response models
│   │   ├── crud.py          # queries, dashboard stats, network builder
│   │   ├── demo_data.py     # the connected demo scam campaign
│   │   ├── llm.py           # Claude client (optional)
│   │   ├── agents/          # url / text / email / job / qr agents
│   │   ├── graph/           # LangGraph orchestrator + correlation
│   │   └── services/        # VirusTotal, indicator extraction
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/           # Dashboard, Analyze, ThreatReport, ScamNetwork, History, NotFound
    │   ├── components/      # NetworkGraph, ActivityChart, RiskMeter, ... (all custom SVG)
    │   ├── lib/             # api client, SEO hooks, formatters
    │   └── context/         # Demo Mode provider
    ├── scripts/
    │   ├── gen-seo.mjs      # sitemap / robots / llms generator
    │   └── gen_og.py        # Open Graph image generator (Pillow)
    ├── public/              # favicon, og-image, generated SEO files
    ├── vite.config.js       # code-splitting + no prod sourcemaps
    └── .env.example
```

---

## 🧪 API cheatsheet

```bash
# analyze a message
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"type":"sms","content":"Your account is locked, verify at http://bad.example","demo_mode":true}'

# other endpoints
curl http://localhost:8000/dashboard/stats
curl http://localhost:8000/network
curl http://localhost:8000/campaigns
curl http://localhost:8000/warmup      # wake the service before a demo
```

Full interactive docs at **`/docs`** when the backend is running.
