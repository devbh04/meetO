from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio
import os
import sys
import json
import uuid
import io

from meeting_pipeline.db import Database, MONGO_URI, DB_NAME

# In-memory store for presenter sessions (script + kb_text)
presenter_sessions: dict[str, dict] = {}


app = FastAPI(title="Streamline AI Bot API")

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartMeetingRequest(BaseModel):
    meeting_link: str
    bot_name: str
    instructions: str | None = None

@app.on_event("startup")
async def startup_db_client():
    Database.connect()

def run_bot_subprocess(meet_url: str, bot_name: str, insights: str | None = None):
    """
    Run the persona_meet_bot.py in a detached subprocess.
    """
    cmd = [
        sys.executable, "persona_meet_bot.py",
        meet_url,
        "--name", bot_name,
    ]
    if insights:
        cmd.extend(["--insights", insights])
        
    print(f"[API] Starting Bot Subprocess: {' '.join(cmd)}")
    subprocess.Popen(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))


@app.post("/api/meetings/start")
async def start_meeting(req: StartMeetingRequest, background_tasks: BackgroundTasks):
    """
    Trigger the automation bot to join the meeting.
    Returns immediately, launching the bot in the background.
    """
    background_tasks.add_task(run_bot_subprocess, req.meeting_link, req.bot_name, req.instructions)
    return {"status": "started", "message": "Bot is joining the meeting."}


@app.get("/api/meetings")
async def list_meetings():
    """
    List all processed meetings from MongoDB.
    """
    try:
        db = Database.get_meetings_collection()
        cursor = db.find({}, {"meeting_id": 1, "created_at": 1, "metadata": 1, "report_md": 1, "analysis_json": 1}).sort("created_at", -1).limit(20)
        meetings = await cursor.to_list(length=20)
        
        # Serialize ObjectIds/dates
        for m in meetings:
            m["_id"] = str(m["_id"])
            if "created_at" in m:
                m["created_at"] = m["created_at"].isoformat()
        return {"meetings": meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    """
    Retrieve full details for a specific meeting by its session ID.
    """
    try:
        db = Database.get_meetings_collection()
        meeting = await db.find_one({"meeting_id": meeting_id})
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        meeting["_id"] = str(meeting["_id"])
        if "created_at" in meeting:
            meeting["created_at"] = meeting["created_at"].isoformat()
            
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ToggleActionItemRequest(BaseModel):
    completed: bool

@app.patch("/api/meetings/{meeting_id}/action-items/{item_index}")
async def toggle_action_item(meeting_id: str, item_index: int, req: ToggleActionItemRequest):
    """
    Toggle the 'completed' field on a specific action item (by index) in MongoDB.
    Fetches the document, updates the in-memory array, and writes it back
    so it works even when action_items don't yet have a 'completed' field.
    """
    try:
        db = Database.get_meetings_collection()
        meeting = await db.find_one({"meeting_id": meeting_id}, {"analysis_json.action_items": 1})
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        action_items = (meeting.get("analysis_json") or {}).get("action_items") or []
        if item_index < 0 or item_index >= len(action_items):
            raise HTTPException(status_code=400, detail="Invalid action item index")

        action_items[item_index]["completed"] = req.completed

        await db.update_one(
            {"meeting_id": meeting_id},
            {"$set": {"analysis_json.action_items": action_items}}
        )
        return {"status": "ok", "item_index": item_index, "completed": req.completed}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ─── Scheduled Meetings Endpoints ────────────────────────────────────────────

from datetime import datetime

class ScheduledMeeting(BaseModel):
    title: str
    meeting_link: str
    bot_name: str
    instructions: str | None = None
    scheduled_at: str  # ISO 8601 datetime string e.g. "2026-03-18T14:30:00"

@app.post("/api/scheduled-meetings")
async def create_scheduled_meeting(req: ScheduledMeeting):
    try:
        db = Database.db["scheduled_meetings"]
        doc = req.model_dump()
        doc["created_at"] = datetime.utcnow().isoformat()
        doc["id"] = str(uuid.uuid4())
        await db.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scheduled-meetings")
async def list_scheduled_meetings(date: str | None = None):
    """List all scheduled meetings, optionally filtered to a specific date (YYYY-MM-DD)."""
    try:
        db = Database.db["scheduled_meetings"]
        query = {}
        if date:
            query["scheduled_at"] = {"$regex": f"^{date}"}
        cursor = db.find(query, {"_id": 0}).sort("scheduled_at", 1)
        items = await cursor.to_list(length=100)
        return {"meetings": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/scheduled-meetings/{meeting_id}")
async def delete_scheduled_meeting(meeting_id: str):
    try:
        db = Database.db["scheduled_meetings"]
        result = await db.delete_one({"id": meeting_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Presenter Endpoints ─────────────────────────────────────────────────────

@app.post("/api/presenter/build-script")
async def build_presenter_script(
    file: UploadFile = File(...),
    instructions: str = Form(default=""),
):
    """
    Parse an uploaded PDF and use Gemini 2.5 Pro to generate a structured
    presentation script (list of concepts).
    """
    try:
        import google.generativeai as genai
        from pypdf import PdfReader

        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        genai.configure(api_key=google_api_key)

        # Extract text from PDF
        raw_bytes = await file.read()
        reader = PdfReader(io.BytesIO(raw_bytes))
        kb_text = "\n\n".join(
            page.extract_text() or "" for page in reader.pages
        ).strip()

        if not kb_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")

        prompt = f"""You are an expert instructional designer.
The user uploaded this document and wants it turned into a structured interactive presentation.

USER INSTRUCTIONS: {instructions or "Present the content clearly and pedagogically."}

DOCUMENT TEXT:
{kb_text[:30000]}

Return ONLY a valid JSON object with this exact structure:
{{
  "title": "short title for the presentation",
  "concepts": [
    {{
      "id": 1,
      "title": "Concept title",
      "explanation": "Clear 2-4 sentence explanation an AI presenter will speak aloud",
      "key_points": ["bullet 1", "bullet 2", "bullet 3"]
    }}
  ]
}}

Create between 4 and 12 concepts that cover the document logically and progressively.
Make each explanation natural to speak aloud — not too academic, engaging and clear."""

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        raw = response.text or "{}"
        script = json.loads(raw)

        session_id = str(uuid.uuid4())
        presenter_sessions[session_id] = {
            "script": script,
            "kb_text": kb_text,
            "instructions": instructions,
        }

        return {"session_id": session_id, "script": script}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Script generation failed: {e}")


@app.get("/api/presenter/script/{session_id}")
async def get_presenter_script(session_id: str):
    """Retrieve the script + KB text for the presenter agent."""
    data = presenter_sessions.get(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return data


@app.post("/api/presenter/start-session")
async def start_presenter_session(body: dict):
    """
    Create a LiveKit room, mint a frontend participant token,
    and dispatch the presenter-agent into the room.
    """
    try:
        from livekit import api as lkapi

        session_id = body.get("session_id", "")
        if not session_id or session_id not in presenter_sessions:
            raise HTTPException(status_code=404, detail="session_id not found")

        lk_api_key = os.getenv("LIVEKIT_API_KEY", "")
        lk_api_secret = os.getenv("LIVEKIT_API_SECRET", "")
        lk_url = os.getenv("LIVEKIT_URL", "").replace("wss://", "https://")

        room_name = f"presenter-{session_id[:8]}"
        instructions = presenter_sessions[session_id].get("instructions", "")

        lk = lkapi.LiveKitAPI(url=lk_url, api_key=lk_api_key, api_secret=lk_api_secret)

        # Create the room with session metadata so the agent can fetch its script
        room_meta = json.dumps({"session_id": session_id, "presentation_instructions": instructions})
        await lk.room.create_room(
            lkapi.CreateRoomRequest(
                name=room_name,
                metadata=room_meta,
            )
        )

        # Mint a short-lived participant token for the browser
        token = (
            lkapi.AccessToken(api_key=lk_api_key, api_secret=lk_api_secret)
            .with_identity("user")
            .with_name("Learner")
            .with_grants(lkapi.VideoGrants(room_join=True, room=room_name))
            .to_jwt()
        )

        # Dispatch the presenter agent — pass session_id as job metadata
        # (room metadata is not yet populated when agent reads ctx before connecting)
        dispatch_meta = json.dumps({"session_id": session_id, "instructions": instructions})
        await lk.agent_dispatch.create_dispatch(
            lkapi.CreateAgentDispatchRequest(
                agent_name="presenter-agent",
                room=room_name,
                metadata=dispatch_meta,
            )
        )

        await lk.aclose()

        return {
            "livekit_url": os.getenv("NEXT_PUBLIC_LIVEKIT_URL", lk_url),
            "token": token,
            "room_name": room_name,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session start failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

