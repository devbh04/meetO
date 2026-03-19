"""
presenter_agent.py — AI Presenter Agent (runs from PersonaMeet_AgentPipeline)

Run this as a separate worker process to handle presenter agent sessions:
    uv run python presenter_agent.py start

The agent is dispatched into a room by the /api/presenter/start-session endpoint.
It fetches its script from /api/presenter/script/{session_id} using the session_id
stored in the LiveKit room metadata.
"""
from __future__ import annotations

import json
import os

import httpx
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google, noise_cancellation

load_dotenv(".env")

SCRIPT_API_BASE = os.getenv("MEETO_API_BASE", "http://localhost:8000")


# ── Fetch script from FastAPI ─────────────────────────────────────────────────

async def fetch_script(session_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SCRIPT_API_BASE}/api/presenter/script/{session_id}",
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()


# ── Build the system prompt ───────────────────────────────────────────────────

def build_presenter_prompt(script: dict, kb_text: str, instructions: str) -> str:
    concepts_json = json.dumps(script.get("concepts", []), ensure_ascii=False, indent=2)
    title = script.get("title", "the presentation")

    return f"""You are an expert AI presenter delivering "{title}".

PRESENTATION INSTRUCTIONS FROM THE USER:
{instructions or "Present clearly and engagingly."}

YOUR TASK:
- Present each concept from the script below one at a time, in order.
- After explaining each concept, ask: "Did you understand, or do you have any questions?"
- If they say YES / understood / continue / next → move to the next concept.
- If they say NO, ask a question, or seem confused → answer using the FULL DOCUMENT below as your knowledge base, then check again.
- After the last concept, say the presentation is complete and offer to answer any remaining questions.
- Speak naturally. Keep each concept explanation concise — 3-5 sentences.

FULL DOCUMENT KNOWLEDGE BASE (use this to answer doubts):
{kb_text[:20000]}

PRESENTATION SCRIPT (follow this order):
{concepts_json}

Start now: greet the user briefly and then present Concept 1.
"""


# ── Agent class ───────────────────────────────────────────────────────────────

class PresenterAgent(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


# ── AgentServer setup ─────────────────────────────────────────────────────────

server = AgentServer()


@server.rtc_session(agent_name="presenter-agent")
async def presenter_session(ctx: agents.JobContext):
    # Read session_id from dispatch job metadata (set by start-session API)
    # ctx.job.metadata is available immediately; ctx.room.metadata requires connecting first
    try:
        job_meta = json.loads(ctx.job.metadata or "{}")
    except (json.JSONDecodeError, AttributeError):
        job_meta = {}

    session_id = job_meta.get("session_id", "")
    instructions_override = job_meta.get("instructions", "")

    if not session_id:
        print("[PresenterAgent] ERROR: No session_id in room metadata — cannot load script.")
        return

    print(f"[PresenterAgent] Fetching script for session_id={session_id}")
    script_data = await fetch_script(session_id)
    script = script_data.get("script", {})
    kb_text = script_data.get("kb_text", "")

    system_prompt = build_presenter_prompt(script, kb_text, instructions_override)
    print(f"[PresenterAgent] Loaded script: '{script.get('title', 'Unknown')}' "
          f"with {len(script.get('concepts', []))} concepts")

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Puck",
            temperature=0.7,
            instructions=system_prompt,
        ),
    )

    await session.start(
        room=ctx.room,
        agent=PresenterAgent(instructions=system_prompt),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    await session.generate_reply(
        instructions="Greet the user warmly and begin presenting Concept 1 from your script now."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
