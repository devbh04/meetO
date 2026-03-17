from __future__ import annotations
import os
import json
from datetime import datetime, timezone
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "persona_meet")

class Database:
    client: motor.motor_asyncio.AsyncIOMotorClient = None
    db = None

    @classmethod
    def connect(cls):
        if cls.client is None:
            cls.client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
            cls.db = cls.client[DB_NAME]
            print(f"[DB] Connected to MongoDB at {MONGO_URI} (db: {DB_NAME})")

    @classmethod
    def get_meetings_collection(cls):
        if cls.db is None:
            cls.connect()
        return cls.db["meetings"]

async def save_meeting_to_db(meeting_id: str, session_dir: str, metadata: dict):
    """
    Reads the output files from the session directory and upserts them into MongoDB.
    """
    try:
        db = Database.get_meetings_collection()
        
        # Read files if they exist
        report_md, transcript_md, analysis_json, chat_json = "", "", {}, []
        
        report_path = os.path.join(session_dir, "meeting_report.md")
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                report_md = f.read()
                
        transcript_path = os.path.join(session_dir, "transcript.md")
        if os.path.exists(transcript_path):
            with open(transcript_path, "r", encoding="utf-8") as f:
                transcript_md = f.read()
                
        analysis_path = os.path.join(session_dir, "meeting_analysis.json")
        if os.path.exists(analysis_path):
            with open(analysis_path, "r", encoding="utf-8") as f:
                analysis_json = json.load(f)
                
        chat_path = os.path.join(session_dir, "chat_messages.json")
        if os.path.exists(chat_path):
            with open(chat_path, "r", encoding="utf-8") as f:
                chat_json = json.load(f)

        document = {
            "meeting_id": meeting_id,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc),
            "report_md": report_md,
            "transcript_md": transcript_md,
            "analysis_json": analysis_json,
            "chat_messages": chat_json,
        }
        
        # Upsert the document
        await db.update_one(
            {"meeting_id": meeting_id},
            {"$set": document},
            upsert=True
        )
        print(f"[DB] Successfully saved meeting data for '{meeting_id}' to MongoDB.")
    except Exception as e:
        print(f"[DB] Error saving meeting '{meeting_id}' to MongoDB: {e}")
