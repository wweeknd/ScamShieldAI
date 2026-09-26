"""Agentic AI runtime — the observe -> think -> act -> observe loop.

This is the difference between a fixed pipeline and an agent:

  * A **pipeline** runs a predetermined sequence of functions and stops.
  * An **agent** reasons about a goal, chooses tools, executes them, reads
    the results, and *iterates* until it can answer. It can also change its
    mind mid-flight.

Every agent in ScamShield AI is built on `AgentLoop`. The LLM is the
reasoning core; the tools are its hands. If the LLM is unavailable the loop
degrades to a deterministic fallback so the app still works offline.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Callable

from ..llm import generate_tool_call

logger = logging.getLogger("scamshield.agent")


class AgentLoop:
    """A minimal ReAct-style agent: think -> act -> observe, up to N rounds."""

    def __init__(
        self,
        name: str,
        tools: dict[str, Callable],
        tool_schemas: list[dict],
        system_prompt: str,
        max_rounds: int = 5,
        demo_mode: bool = False,
    ) -> None:
        self.name = name
        self.tools = tools
        self.schemas = tool_schemas
        self.system_prompt = system_prompt
        self.max_rounds = max_rounds
        self.demo_mode = demo_mode
        self.transcript: list[dict] = []

    # ------------------------------------------------------------------
    def run(self, user_message: str, context: dict | None = None) -> dict:
        """Run the loop. Returns {answer, transcript, rounds, fallback}."""
        context = context or {}
        transcript: list[dict] = [{"role": "user", "content": user_message}]
        rounds = 0
        fallback = False

        for _ in range(self.max_rounds):
            rounds += 1
            # ---- THINK: ask the model what to do next -----------------
            tool_call = generate_tool_call(
                transcript=transcript,
                system=self.system_prompt,
                tools=self.schemas,
                demo_mode=self.demo_mode,
            )

            if tool_call is None:
                # No LLM available -> deterministic fallback
                fallback = True
                break

            # ---- ACT: execute the chosen tool -------------------------
            name = tool_call.get("name")
            args = tool_call.get("input") or {}
            transcript.append(
                {"role": "assistant", "content": json.dumps({"tool_use": {"name": name, "input": args}})}
            )

            tool_fn = self.tools.get(name)
            if tool_fn is None:
                observation = f"ERROR: unknown tool '{name}'. Available: {list(self.tools)}"
            else:
                try:
                    observation = tool_fn(**args)
                    if not isinstance(observation, str):
                        observation = json.dumps(observation, default=str)
                except Exception as exc:  # tool failure -> agent observes and retries
                    observation = f"ERROR: tool '{name}' failed: {exc}"

            # ---- OBSERVE: feed the result back to the model -----------
            transcript.append({"role": "user", "content": f"TOOL_RESULT({name}): {observation}"})

            # If the model asked for a final answer, stop.
            if tool_call.get("is_final"):
                break

        self.transcript = transcript
        return {
            "answer": self._final_answer(transcript, fallback),
            "transcript": transcript,
            "rounds": rounds,
            "fallback": fallback,
        }

    # ------------------------------------------------------------------
    def _final_answer(self, transcript: list[dict], fallback: bool) -> str:
        """Extract the agent's conclusion. Falls back to a template if needed."""
        for msg in reversed(transcript):
            content = msg.get("content") or ""
            if isinstance(content, str) and "FINAL_ANSWER:" in content:
                return content.split("FINAL_ANSWER:", 1)[1].strip()
        if fallback:
            return "Analysis complete (offline mode — template result)."
        return "Analysis complete."


def make_tool(name: str, description: str, parameters: dict) -> dict:
    """Build an Anthropic tool schema."""
    return {
        "name": name,
        "description": description,
        "input_schema": {"type": "object", "properties": parameters, "required": []},
    }


def text_block(text: str) -> dict:
    return {"type": "text", "text": text}