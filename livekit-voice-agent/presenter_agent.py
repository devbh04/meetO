"""
presenter_agent.py — LiveKit AI Presenter Agent
Uses Google native audio (Gemini 2.5 Flash Realtime) to walk through a
presentation script concept-by-concept, checking comprehension and answering doubts.

Run alongside the main agent server:
    uv run python presenter_agent.py start
"""
from __future__ import annotations

import json
import os

import httpx
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent
from livekit.plugins import google

load_dotenv(".env.local")

SCRIPT_API_BASE = os.getenv("MEETO_API_BASE", "http://localhost:8000")


# ── Helper: fetch script from FastAPI ────────────────────────────────────────

async def fetch_script(session_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SCRIPT_API_BASE}/api/presenter/script/{session_id}", timeout=10)
        resp.raise_for_status()
        return resp.json()


# ── Build the system prompt from the script ──────────────────────────────────

def build_presenter_prompt(script: dict, kb_text: str, instructions: str) -> str:
    concepts_json = json.dumps(script.get("concepts", []), ensure_ascii=False, indent=2)
    title = script.get("title", "the presentation")

    return f"""You are an expert AI presenter delivering "{title}".

PRESENTATION INSTRUCTIONS FROM THE USER:
{instructions or "Present clearly and professionally."}

YOUR TASK:
- Present each concept in the script below one at a time, in order.
- After explaining each concept, ask the listener: "Did you understand, or do you have any questions?"
- If they say yes / understood / continue / next → move on to the next concept.
- If they say no, ask a question, or seem confused → answer their doubt or re-explain using the FULL DOCUMENT below as your knowledge base, then check again.
- After all concepts are covered, say the presentation is complete and offer to answer any final questions.
- Speak naturally and engagingly. Use short paragraphs and pauses.
- Do NOT rush. Present concept 1 first, then wait for the user's response before proceeding.

FULL DOCUMENT KNOWLEDGE BASE (use this to answer doubts):
{kb_text}

PRESENTATION SCRIPT (follow this order):
{concepts_json}

Start now by greeting the user briefly and then presenting Concept 1.
"""


# ── Agent Definition ─────────────────────────────────────────────────────────

class PresenterAgent(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


# ── AgentServer + RTC Session ─────────────────────────────────────────────────

server = AgentServer()


@server.rtc_session(agent_name="presenter-agent")
async def presenter_session(ctx: agents.JobContext):
    # session_id is stored in the room metadata by the backend
    room_metadata_raw = ctx.room.metadata or "{}"
    try:
        room_meta = json.loads(room_metadata_raw)
    except json.JSONDecodeError:
        room_meta = {}

    session_id = room_meta.get("session_id", "")
    instructions_override = room_meta.get("presentation_instructions", "")

    if not session_id:
        print("[PresenterAgent] ERROR: No session_id in room metadata!")
        return

    # Fetch presentation script + KB from FastAPI
    script_data = await fetch_script(session_id)
    script = script_data.get("script", {})
    kb_text = script_data.get("kb_text", "")

    system_prompt = build_presenter_prompt(script, kb_text, instructions_override)

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-exp-native-audio-thinking-exp",
            voice="Puck",
            temperature=0.7,
            instructions=system_prompt,
        ),
    )

    await session.start(
        room=ctx.room,
        agent=PresenterAgent(instructions=system_prompt),
    )

    # Kick off the presentation
    await session.generate_reply(
        instructions="Begin the presentation now. Greet the user and start with Concept 1."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
