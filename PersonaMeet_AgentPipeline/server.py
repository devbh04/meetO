from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio
import os
import sys

from meeting_pipeline.db import Database, MONGO_URI, DB_NAME

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
        cursor = db.find({}, {"meeting_id": 1, "created_at": 1, "metadata": 1, "report_md": 1}).sort("created_at", -1).limit(20)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

