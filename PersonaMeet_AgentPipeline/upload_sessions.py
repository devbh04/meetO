"""
upload_sessions.py — One-off script to upload existing meeting session folders to MongoDB.

Usage:
    uv run python upload_sessions.py <session_dir1> [session_dir2] ...

Example:
    uv run python upload_sessions.py \
        meeting-session-2026-03-17T18-20-01 \
        meeting-session-2026-03-17T18-31-24
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
import motor.motor_asyncio

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGO_DB_NAME", "persona_meet")


async def upload_session(session_dir: str):
    """Read output files from a session folder and upsert the document into MongoDB."""
    session_dir = os.path.abspath(session_dir)
    meeting_id  = os.path.basename(session_dir)

    if not os.path.isdir(session_dir):
        print(f"[SKIP] '{session_dir}' is not a directory.")
        return

    print(f"\n[UPLOAD] Processing '{meeting_id}' ...")

    # Read all relevant files
    def read_text(filename):
        path = os.path.join(session_dir, filename)
        return open(path, "r", encoding="utf-8").read() if os.path.exists(path) else ""

    def read_json(filename):
        path = os.path.join(session_dir, filename)
        if not os.path.exists(path):
            return {}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    report_md     = read_text("meeting_report.md")
    transcript_md = read_text("transcript.md")
    analysis_json = read_json("meeting_analysis.json")
    chat_messages = read_json("chat_messages.json")

    # chat_messages.json can be a list or a dict — normalise to list
    if isinstance(chat_messages, dict):
        chat_messages = chat_messages.get("messages", [])

    document = {
        "meeting_id":    meeting_id,
        "metadata":      {
            "meet_url":             analysis_json.get("meeting_url", ""),
            "bot_name":             analysis_json.get("bot_name", "Meeting Agent"),
            "transcript_language":  analysis_json.get("transcript_language", ""),
        },
        "created_at":    datetime.now(timezone.utc),
        "report_md":     report_md,
        "transcript_md": transcript_md,
        "analysis_json": analysis_json,
        "chat_messages": chat_messages,
    }

    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db     = client[DB_NAME]["meetings"]

    await db.update_one(
        {"meeting_id": meeting_id},
        {"$set": document},
        upsert=True,
    )
    client.close()
    print(f"[DB] ✓ Saved '{meeting_id}' → MongoDB ({DB_NAME}.meetings)")


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    for path in sys.argv[1:]:
        await upload_session(path)

    print("\n[DONE] All sessions uploaded.")


if __name__ == "__main__":
    asyncio.run(main())
