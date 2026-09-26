"""LLM abstraction — Claude via the Anthropic SDK, with graceful degradation.

The whole app must run with NO API key and during API outages, so this module
never raises: `generate()` returns the model's text on success, or ``None`` on
any failure / when disabled. Callers always have a template fallback ready.
"""
from .config import settings

DEFAULT_SYSTEM = (
    "You are a senior cybersecurity threat analyst for ScamShield AI. "
    "You write concise, factual, plain-English threat explanations for a "
    "non-technical audience. Never invent indicators that were not provided. "
    "Do not use markdown headings; write 2-4 short sentences."
)

_client = None


def _get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic  # imported lazily so it's optional

        _client = Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=settings.LLM_TIMEOUT,
            max_retries=1,
        )
    return _client


def generate(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 500,
    demo_mode: bool = False,
) -> str | None:
    """Return Claude's completion text, or None if unavailable/failed."""
    if demo_mode or not settings.llm_enabled:
        return None
    try:
        client = _get_client()
        msg = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=max_tokens,
            system=system or DEFAULT_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(
            block.text for block in msg.content
            if getattr(block, "type", None) == "text"
        ).strip()
        return text or None
    except Exception:
        # Any error (bad key, rate limit, network, timeout) -> template fallback.
        return None


# ---------------------------------------------------------------------------
# Tool-use: the agent loop asks the LLM "what should I do next?" and expects
# either a tool call or a final answer. Returns a dict on success, None on
# any failure (so the caller can fall back to deterministic behaviour).
# ---------------------------------------------------------------------------
_TOOL_USE_SYSTEM = (
    "You are an autonomous threat-analysis agent for ScamShield AI. "
    "You reason step by step. On each turn you MUST either call exactly one tool "
    "or emit a final answer. Never output free prose without a tool call or "
    "FINAL_ANSWER: prefix. Use the tools to gather evidence, then conclude."
)


def generate_tool_call(
    transcript: list[dict],
    system: str | None = None,
    tools: list[dict] | None = None,
    demo_mode: bool = False,
) -> dict | None:
    """Ask the LLM for the next action: a tool call or a final answer.

    Returns a dict like {"name": "...", "input": {...}, "is_final": False}
    or {"is_final": True, "answer": "..."} on success, or None if the LLM is
    unavailable so the caller can fall back to deterministic logic.
    """
    if demo_mode or not settings.llm_enabled or not tools:
        return None
    try:
        client = _get_client()
        msg = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=500,
            system=system or _TOOL_USE_SYSTEM,
            messages=transcript,
            tools=tools,
        )
    except Exception:
        return None

    tool_use = None
    final_text = ""
    for block in msg.content:
        btype = getattr(block, "type", None)
        if btype == "tool_use":
            tool_use = block
        elif btype == "text":
            final_text += getattr(block, "text", "") or ""

    if tool_use is not None:
        return {
            "name": tool_use.name,
            "input": tool_use.input or {},
            "is_final": False,
        }

    if final_text.strip():
        return {"is_final": True, "answer": final_text.strip()}

    return None
