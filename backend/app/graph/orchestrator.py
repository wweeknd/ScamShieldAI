"""LangGraph orchestration.

Pipeline:  extract → [router] → agent(s) → aggregate(+persist) →
           correlation → explanation → END

The router picks the specialised agent for the UI-selected input type (simple
logic, no LLM). The aggregator combines agent scores and persists the event;
the correlation node links it to past events; the explanation node makes the
single LLM call (falling back to a template) that produces the threat report.
"""
from typing import Any, Optional, TypedDict

from langgraph.graph import END, StateGraph

from ..agents import correlation_agent, email_agent, job_agent, text_agent, url_agent
from ..config import severity_from_score
from ..llm import generate
from ..models import Event, Indicator
from ..services.indicators import extract_indicators

_CHANNEL = {
    "sms": "SMS / text message", "email": "email", "url": "URL",
    "qr": "QR code", "job": "job offer",
}


class AnalysisState(TypedDict, total=False):
    db: Any
    input_type: str
    content: str
    sender: Optional[str]
    demo_mode: bool
    extra_agents: list[str]
    extra_urls: list[str]
    indicators: list[dict]
    agent_results: list[dict]
    extra_agent_names: list[str]
    risk_score: int
    severity: str
    reasons: list[str]
    agents_involved: list[str]
    source: Optional[str]
    event_id: int
    correlation: dict
    explanation: str


# --------------------------------------------------------------------------
#  Nodes
# --------------------------------------------------------------------------
def _extract_node(state: AnalysisState) -> dict:
    indicators = extract_indicators(state["content"], state.get("extra_urls"))
    return {"indicators": indicators}


def _route(state: AnalysisState) -> str:
    return {
        "sms": "text_agent", "email": "email_agent", "url": "url_agent",
        "qr": "url_agent", "job": "job_agent",
    }.get(state["input_type"], "text_agent")


def _has_url(indicators: list[dict]) -> bool:
    return any(i["type"] in ("url", "domain") for i in indicators)


def _text_node(state: AnalysisState) -> dict:
    ind, demo = state["indicators"], state.get("demo_mode", False)
    results = [text_agent.analyze(state["content"], ind, demo)]
    if _has_url(ind):
        results.append(url_agent.analyze(state["content"], ind, demo))
    return {"agent_results": results, "extra_agent_names": []}


def _email_node(state: AnalysisState) -> dict:
    ind, demo = state["indicators"], state.get("demo_mode", False)
    result = email_agent.analyze(state["content"], ind, state.get("sender"), demo)
    extra = ["URL Agent"] if _has_url(ind) else []
    return {"agent_results": [result], "extra_agent_names": extra}


def _url_node(state: AnalysisState) -> dict:
    ind, demo = state["indicators"], state.get("demo_mode", False)
    return {"agent_results": [url_agent.analyze(state["content"], ind, demo)],
            "extra_agent_names": []}


def _job_node(state: AnalysisState) -> dict:
    ind, demo = state["indicators"], state.get("demo_mode", False)
    results = [job_agent.analyze(state["content"], ind, demo)]
    if _has_url(ind):
        results.append(url_agent.analyze(state["content"], ind, demo))
    return {"agent_results": results, "extra_agent_names": []}


def _pick_source(input_type: str, indicators: list[dict], content: str) -> str:
    by_type: dict[str, str] = {}
    for i in indicators:
        by_type.setdefault(i["type"], i["value"])
    order = {
        "sms": ["phone", "url", "domain", "company"],
        "email": ["email", "domain", "url", "company"],
        "url": ["domain", "url"],
        "qr": ["domain", "url"],
        "job": ["company", "email", "domain", "phone"],
    }.get(input_type, ["domain", "url", "phone", "email", "company"])
    for t in order:
        if t in by_type:
            return by_type[t]
    text = content.strip()
    return (text[:48] + "…") if len(text) > 48 else (text or "unknown")


def _aggregate_node(state: AnalysisState) -> dict:
    results = state.get("agent_results", [])
    indicators = state["indicators"]

    score = max((r["risk_score"] for r in results), default=0)
    # multiple agents independently flagging risk is itself a signal
    if sum(1 for r in results if r["risk_score"] >= 35) >= 2:
        score = min(score + 6, 100)

    all_reasons, substantive = [], []
    for r in results:
        for reason in r["reasons"]:
            all_reasons.append(reason)
            if not reason.startswith(("No ", "Content does not")):
                substantive.append(reason)
    chosen = substantive or all_reasons[:1]
    seen, reasons = set(), []
    for r in chosen:
        if r not in seen:
            seen.add(r)
            reasons.append(r)

    agent_names = [r["agent"] for r in results]
    agent_names += state.get("extra_agent_names", [])
    agent_names += state.get("extra_agents", [])
    agent_names.append("Correlation Agent")
    agents_involved = list(dict.fromkeys(agent_names))

    severity = severity_from_score(score)
    source = _pick_source(state["input_type"], indicators, state["content"])

    db = state["db"]
    event = Event(
        type=state["input_type"], content=state["content"], source=source,
        risk_score=score, severity=severity, reasons=reasons, agents=agents_involved,
    )
    db.add(event)
    db.flush()
    for ind in indicators:
        db.add(Indicator(event_id=event.id, indicator_type=ind["type"],
                         indicator_value=ind["value"]))
    db.flush()

    return {"risk_score": score, "severity": severity, "reasons": reasons,
            "agents_involved": agents_involved, "source": source,
            "event_id": event.id}


def _correlation_node(state: AnalysisState) -> dict:
    db = state["db"]
    event = db.get(Event, state["event_id"])
    corr = correlation_agent.correlate(db, event, state.get("demo_mode", False))

    if corr["related_count"] > 0:
        boosted = min(100, (state["risk_score"] or 0) + 12)
        event.risk_score = boosted
        event.severity = severity_from_score(boosted)
        db.flush()
        return {"correlation": corr, "risk_score": boosted, "severity": event.severity}
    return {"correlation": corr}


def _explanation_node(state: AnalysisState) -> dict:
    report = _llm_report(state) or _template_report(state)
    event = state["db"].get(Event, state["event_id"])
    event.explanation = report
    state["db"].flush()
    return {"explanation": report}


# --------------------------------------------------------------------------
#  Report generation (LLM with template fallback)
# --------------------------------------------------------------------------
def _correlation_prompt_block(corr: dict) -> str:
    if not corr or corr.get("related_count", 0) == 0:
        return "No correlation with previously seen events."
    inds = ", ".join(f"{i['type']}={i['value']}" for i in corr["shared_indicators"][:5])
    return (f"Correlated with {corr['related_count']} prior event(s); "
            f"shared indicators: {inds}.")


def _llm_report(state: AnalysisState) -> str | None:
    channel = _CHANNEL.get(state["input_type"], state["input_type"])
    reasons = "\n".join(f"- {r}" for r in state["reasons"])
    prompt = (
        f"Produce a threat report for a {channel}.\n"
        f"Risk score: {state['risk_score']}/100 (severity: {state['severity']}).\n"
        f"Detected signals:\n{reasons}\n"
        f"{_correlation_prompt_block(state.get('correlation', {}))}\n\n"
        "Write 2-4 plain-English sentences explaining why this is or isn't a scam "
        "and what the user should do. Do not use markdown."
    )
    return generate(prompt, max_tokens=350, demo_mode=state.get("demo_mode", False))


def _template_report(state: AnalysisState) -> str:
    channel = _CHANNEL.get(state["input_type"], state["input_type"])
    severity, score = state["severity"], state["risk_score"]
    lead = {
        "HIGH RISK": f"This {channel} is very likely a scam.",
        "SUSPICIOUS": f"This {channel} shows several warning signs and should be treated with caution.",
        "SAFE": f"This {channel} shows no strong signs of being a scam.",
    }[severity]
    body = ""
    top = [r for r in state["reasons"] if not r.startswith(("No ", "Content does not"))][:3]
    if top:
        body = " Key indicators: " + "; ".join(r.rstrip(".") for r in top) + "."
    advice = {
        "HIGH RISK": " Do not respond, click any links, call any numbers, or send money or personal information.",
        "SUSPICIOUS": " Verify the sender through an official channel before taking any action.",
        "SAFE": " Always stay cautious with unexpected messages.",
    }[severity]
    corr = state.get("correlation", {})
    corr_txt = f" {corr['explanation']}" if corr.get("related_count", 0) > 0 else ""
    return f"{lead} (Risk score {score}/100).{body}{advice}{corr_txt}"
    
def _needs_deep_check(state: AnalysisState) -> str:
    score = state.get("risk_score", 0)
    if 30 <= score < 70:
        return "deep_check"
    return "correlation"


def _deep_check_node(state: AnalysisState) -> dict:
    channel = _CHANNEL.get(state["input_type"], state["input_type"])
    reasons = "\n".join(f"- {r}" for r in state["reasons"])
    prompt = (
        f"A {channel} scored {state['risk_score']}/100 on an initial scam check "
        f"-- inconclusive. Signals so far:\n{reasons}\n\n"
        "Re-examine for anything the first pass may have missed (subtler urgency "
        "cues, mismatched sender claims, indirect payment requests). Reply with "
        "ONLY an integer 0-100 for a revised risk score."
    )
    raw = generate(prompt, max_tokens=10, demo_mode=state.get("demo_mode", False))
    revised = None
    if raw:
        digits = "".join(c for c in raw if c.isdigit())[:3]
        if digits:
            revised = max(0, min(100, int(digits)))

    if revised is None:
        indicator_count = len(state.get("indicators", []))
        nudge = 6 if indicator_count >= 2 else -4
        revised = max(0, min(100, state["risk_score"] + nudge))
        note = "Escalated for rule-based secondary review (borderline initial score, no LLM key)."
    else:
        note = "Escalated for AI secondary review (borderline initial score)."

    if revised != state["risk_score"]:
        event = state["db"].get(Event, state["event_id"])
        event.risk_score = revised
        event.severity = severity_from_score(revised)
        state["db"].flush()
        return {"risk_score": revised, "severity": event.severity,
                "reasons": state["reasons"] + [note]}
    return {"reasons": state["reasons"] + [note]}


def _build_graph():
    g = StateGraph(AnalysisState)
    g.add_node("extract", _extract_node)
    g.add_node("text_agent", _text_node)
    g.add_node("email_agent", _email_node)
    g.add_node("url_agent", _url_node)
    g.add_node("job_agent", _job_node)
    g.add_node("aggregate", _aggregate_node)
    g.add_node("correlation", _correlation_node)
    g.add_node("explanation", _explanation_node)

    g.set_entry_point("extract")
    g.add_conditional_edges("extract", _route, {
        "text_agent": "text_agent", "email_agent": "email_agent",
        "url_agent": "url_agent", "job_agent": "job_agent",
    })
    for node in ("text_agent", "email_agent", "url_agent", "job_agent"):
        g.add_edge(node, "aggregate")
    g.add_edge("aggregate", "correlation")
    g.add_edge("correlation", "explanation")
    g.add_edge("explanation", END)
    return g.compile()


_GRAPH = _build_graph()


def run_analysis(db, input_type: str, content: str, sender: str | None = None,
                 demo_mode: bool = False, extra_agents: list[str] | None = None,
                 extra_urls: list[str] | None = None) -> AnalysisState:
    """Execute the full pipeline and return the final state (event persisted)."""
    initial: AnalysisState = {
        "db": db, "input_type": input_type, "content": content, "sender": sender,
        "demo_mode": demo_mode, "extra_agents": extra_agents or [],
        "extra_urls": extra_urls or [],
    }
    return _GRAPH.invoke(initial)
