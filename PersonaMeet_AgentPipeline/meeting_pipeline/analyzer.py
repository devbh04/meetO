from __future__ import annotations

import json
import re
from collections import defaultdict

from .config import PipelineConfig
from .models import ActionItem, ChatMessage, DecisionItem, MeetingReport, SpeakerHighlight, TranscriptData


# ── Rule-based pattern library ──────────────────────────────────────────────

# Phrases that strongly signal a decision was made
_DECISION_PATTERNS = re.compile(
    r"\b("
    r"we('re| are| will| have)? (decided|agreed|going|finalizing|finalised|finalize|approved|confirmed|chosen|picking|going with|sticking with)"
    r"|let'?s (go with|finalize|confirm|use|keep|stick with)"
    r"|decided to"
    r"|final decision"
    r"|we('l?l)? go with"
    r"|approved"
    r"|confirmed"
    r"|agreed (to|on|that)"
    r"|that'?s (decided|confirmed|final|settled|approved)"
    r"|we'?re going with"
    r"|the decision is"
    r"|we chose"
    r")",
    re.IGNORECASE,
)

# Phrases that signal an action item assignment
_ACTION_PATTERNS = re.compile(
    r"\b("
    r"will (take care of|handle|do|fix|send|write|review|update|check|create|build|test|deploy|push|merge|set up|set up|share|prepare|finish|complete|make sure|follow up|look into)"
    r"|needs? to"
    r"|should (send|write|review|update|check|create|build|test|deploy|push|fix|handle|prepare|finish|complete|follow up|look into)"
    r"|is responsible for"
    r"|action item"
    r"|assigned to"
    r"|take care of"
    r"|follow up on"
    r"|please (send|write|review|update|check|create|build|test|deploy|push|fix|handle|prepare|finish|complete)"
    r")",
    re.IGNORECASE,
)

# Deadline time words
_DEADLINE_PATTERN = re.compile(
    r"\b(by |before |until )(monday|tuesday|wednesday|thursday|friday|saturday|sunday"
    r"|today|tomorrow|eod|eow|end of (day|week|month)"
    r"|next week|this week|[0-9]{1,2}[/-][0-9]{1,2}|[0-9]+th|[0-9]+st|[0-9]+rd|[0-9]+nd)",
    re.IGNORECASE,
)

# Common English first names + pronoun heuristic for owner extraction
_OWNER_PATTERN = re.compile(
    r"(?:^|\s)([A-Z][a-z]{2,15})(?:\s[A-Z][a-z]{2,15})?(?=\s+(will|should|needs? to|is responsible|please|can you|could you))"
)


class AnalysisError(RuntimeError):
    pass


def _format_seconds(total_seconds: float | None) -> str:
    if total_seconds is None:
        return "Unknown"
    total_seconds = max(0, int(total_seconds))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return f"{minutes:02d}:{seconds:02d}"


def _safe_json_loads(payload: str) -> dict:
    text = payload.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.replace("json\n", "", 1)
    return json.loads(text)


class MeetingAnalyzer:
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.last_backend: str | None = None

    def analyze(self, transcript: TranscriptData, chat_messages: list[ChatMessage], metadata: dict) -> MeetingReport:
        """Analyze meeting — tries OpenAI, then Gemini, then rule-based fallback."""
        if self.config.openai_api_key:
            try:
                report = self._analyze_openai(transcript, chat_messages, metadata)
                self.last_backend = "openai"
                return report
            except Exception as exc:
                print(f"[Pipeline] OpenAI analysis failed ({exc}). Trying Gemini...")
        if self.config.gemini_api_key:
            try:
                report = self._analyze_gemini(transcript, chat_messages, metadata)
                self.last_backend = "gemini"
                return report
            except Exception as exc:
                print(f"[Pipeline] Gemini analysis failed ({exc}). Using rule-based fallback...")
        self.last_backend = "rule-based"
        return self._fallback_report(transcript, chat_messages, metadata)

    @staticmethod
    def _normalize_text(text: str, max_len: int = 220) -> str:
        cleaned = re.sub(r"\s+", " ", (text or "").strip())
        if not cleaned:
            return ""

        # Collapse obvious repeated short phrase loops (e.g. 'haan ji' repeated many times).
        words = cleaned.split()
        if len(words) >= 12:
            for n in (1, 2, 3):
                if len(words) < n * 6:
                    continue
                unit = words[:n]
                repeats = 0
                idx = 0
                while idx + n <= len(words) and words[idx:idx + n] == unit:
                    repeats += 1
                    idx += n
                if repeats >= 6:
                    phrase = " ".join(unit)
                    tail = " ".join(words[idx:])
                    cleaned = f"{phrase} (repeated {repeats} times)"
                    if tail:
                        cleaned += f". {tail}"
                    break

        if len(cleaned) > max_len:
            cleaned = cleaned[: max_len - 3].rstrip() + "..."
        return cleaned

    # ── OpenAI analysis backend ─────────────────────────────────────────

    def _analyze_openai(self, transcript: TranscriptData, chat_messages: list[ChatMessage], metadata: dict) -> MeetingReport:
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise AnalysisError("openai package not installed") from exc

        client = OpenAI(api_key=self.config.openai_api_key)
        unified_lines = self._build_unified_lines(transcript, chat_messages)
        chunk_payloads = self._chunk_lines(unified_lines)

        chunk_analyses = []
        for index, chunk in enumerate(chunk_payloads, start=1):
            response = client.chat.completions.create(
                model=self.config.summary_model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a meticulous meeting analyst. Extract every piece of structured "
                            "information from the provided chunk. Return strict JSON only."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Meeting metadata: {json.dumps(metadata, ensure_ascii=True)}\n"
                            f"Chunk {index} of {len(chunk_payloads)}\n"
                            "Analyze the following unified meeting events and return JSON with keys: "
                            "chunk_summary (string), "
                            "important_highlights (array of strings — the most critical points), "
                            "main_tasks (array of strings — concrete tasks/topics discussed), "
                            "decisions (array of objects with decision,timestamp,evidence), "
                            "action_items (array of objects with task,owner,deadline,timestamp,evidence), "
                            "speaker_highlights (array of objects with speaker,highlights), "
                            "key_timestamps (array of strings).\n\n"
                            + chunk
                        ),
                    },
                ],
            )
            payload = response.choices[0].message.content or "{}"
            chunk_analyses.append(_safe_json_loads(payload))

        response = client.chat.completions.create(
            model=self.config.summary_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You consolidate meeting analysis into one comprehensive final report. "
                        "Be thorough and detailed. Return strict JSON only. "
                        "Use relevant emojis naturally throughout your text responses — in headings, summaries, "
                        "highlight points, and conclusions — to make the output more engaging and scannable. "
                        "Keep emoji use purposeful and not excessive."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Meeting metadata: {json.dumps(metadata, ensure_ascii=True)}\n"
                        "Combine these chunk analyses into one final JSON object with these keys:\n"
                        "  overview (string — a concise 2-3 sentence executive summary of the entire meeting),\n"
                        "  important_highlights (array of strings — the most critical points and takeaways),\n"
                        "  main_tasks (array of strings — concrete tasks/topics that were discussed or assigned),\n"
                        "  decisions (array of objects with decision,timestamp,evidence),\n"
                        "  action_items (array of objects with task,owner,deadline,timestamp,evidence),\n"
                        "  key_timestamps (array of strings like 'MM:SS - description'),\n"
                        "  summary_note (string — this is the MOST IMPORTANT and LONGEST section. "
                        "Write extremely detailed meeting notes that combine narrative paragraphs with bullet points. "
                        "Include [MM:SS] timestamp references throughout so the reader can locate the original moment. "
                        "Cover every topic discussed, every argument made, every concern raised, and every piece of context shared. "
                        "Structure it as: opening paragraph summarizing the meeting flow, then for each major topic a paragraph "
                        "explaining it followed by bullet points with specific details and timestamps. "
                        "Do NOT summarize briefly — be exhaustive and thorough),\n"
                        "  meeting_outcomes (array of strings — concrete results/outcomes from the meeting),\n"
                        "  conclusion (string — a closing summary paragraph wrapping up the meeting),\n"
                        "  speaker_highlights (array of objects with speaker,highlights),\n"
                        "  chronological_summary (array of strings with [MM:SS] timestamps)\n\n"
                        + json.dumps(chunk_analyses, ensure_ascii=True)
                    ),
                },
            ],
        )
        final_payload = response.choices[0].message.content or "{}"
        report = self._report_from_payload(_safe_json_loads(final_payload), transcript.language)

        # ── Custom insights (optional) ──
        custom_prompt = (metadata.get("custom_insights_prompt") or "").strip()
        if custom_prompt:
            report.custom_insights = self._extract_custom_insights_openai(
                client, unified_lines, metadata, custom_prompt
            )

        return report

    def _extract_custom_insights_openai(
        self, client, unified_lines: list[str], metadata: dict, custom_prompt: str
    ) -> list[str]:
        # Strip heavy keys from metadata to avoid bloating the LLM context
        light_meta = {k: v for k, v in metadata.items() if k not in ("speaker_events", "participant_names")}
        unified_text = "\n".join(unified_lines)
        try:
            print(f"[Pipeline] Extracting custom insights with prompt: \"{custom_prompt}\"")
            response = client.chat.completions.create(
                model=self.config.summary_model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a thorough meeting analyst. Extract custom insights as requested. "
                            "Be interpretive — look for both explicit mentions AND implied/related references. "
                            "Return strict JSON with a single key: custom_insights (array of strings)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Meeting metadata: {json.dumps(light_meta, ensure_ascii=True)}\n\n"
                            f"User's custom extraction request: \"{custom_prompt}\"\n\n"
                            "Based on the meeting transcript below, extract insights matching the request. "
                            "Be thorough — include explicit mentions AND implied/related references. "
                            "Each insight should be a detailed sentence with context and a [MM:SS] timestamp if available. "
                            "You MUST return a non-empty array if there is ANY relevant content.\n\n"
                            "Return JSON: {\"custom_insights\": [\"insight 1\", \"insight 2\", ...]}\n\n"
                            + unified_text
                        ),
                    },
                ],
            )
            payload = _safe_json_loads(response.choices[0].message.content or "{}")
            insights = [str(item).strip() for item in payload.get("custom_insights", []) if str(item).strip()]
            print(f"[Pipeline] Custom insights extracted: {len(insights)} item(s)")
            return insights
        except Exception as exc:
            print(f"[Pipeline] Custom insights extraction failed: {exc}")
            return []

    # ── Gemini analysis backend ─────────────────────────────────────────

    def _analyze_gemini(self, transcript: TranscriptData, chat_messages: list[ChatMessage], metadata: dict) -> MeetingReport:
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise AnalysisError(
                "google-generativeai package not installed. Run: pip install google-generativeai"
            ) from exc

        genai.configure(api_key=self.config.gemini_api_key)
        model = genai.GenerativeModel(self.config.gemini_model)

        unified_lines = self._build_unified_lines(transcript, chat_messages)
        unified_text = "\n".join(unified_lines)

        prompt = (
            f"Meeting metadata: {json.dumps(metadata, ensure_ascii=False)}\n\n"
            "Analyze this meeting transcript thoroughly. It may be in Hindi, Marathi, English, or a mix. "
            "Write ALL output in English. Be comprehensive and extract every important detail. "
            "Use relevant emojis naturally throughout your text fields — in the overview, highlights, summary notes, "
            "conclusions, and chronological entries — to make the report more engaging and easy to skim. "
            "Keep emoji use purposeful and not over the top. "
            "Return ONLY a valid JSON object with these exact keys:\n"
            "  overview (string — a concise 2-3 sentence executive summary of the entire meeting),\n"
            "  important_highlights (array of strings — the most critical points and takeaways),\n"
            "  main_tasks (array of strings — concrete tasks/topics that were discussed or assigned),\n"
            "  decisions (array of {decision, timestamp, evidence}),\n"
            "  action_items (array of {task, owner, deadline, timestamp, evidence}),\n"
            "  key_timestamps (array of strings like 'MM:SS - description'),\n"
            "  summary_note (string — this is the MOST IMPORTANT and LONGEST section. "
            "Write extremely detailed meeting notes that combine narrative paragraphs with bullet points. "
            "Include [MM:SS] timestamp references throughout so the reader can locate the original moment. "
            "Cover every topic discussed, every argument made, every concern raised, and every piece of context shared. "
            "Structure it as: opening paragraph summarizing the meeting flow, then for each major topic a paragraph "
            "explaining it followed by bullet points with specific details and timestamps. "
            "Do NOT summarize briefly — be exhaustive and thorough),\n"
            "  meeting_outcomes (array of strings — concrete results, agreements, or outcomes from the meeting),\n"
            "  conclusion (string — a closing summary paragraph that wraps up the meeting and its impact),\n"
            "  speaker_highlights (array of {speaker, highlights[]}),\n"
            "  chronological_summary (array of strings with [MM:SS] timestamps)\n\n"
            "Meeting transcript:\n"
            + unified_text
        )

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        payload = _safe_json_loads(response.text or "{}")
        report = self._report_from_payload(payload, transcript.language)

        # ── Custom insights (optional) ──
        custom_prompt = (metadata.get("custom_insights_prompt") or "").strip()
        if custom_prompt:
            report.custom_insights = self._extract_custom_insights_gemini(
                model, genai, unified_text, metadata, custom_prompt
            )

        return report

    def _extract_custom_insights_gemini(
        self, model, genai, unified_text: str, metadata: dict, custom_prompt: str
    ) -> list[str]:
        # Strip heavy keys from metadata to avoid bloating the LLM context
        light_meta = {k: v for k, v in metadata.items() if k not in ("speaker_events", "participant_names")}
        try:
            prompt = (
                f"Meeting metadata: {json.dumps(light_meta, ensure_ascii=False)}\n\n"
                f"User's custom extraction request: \"{custom_prompt}\"\n\n"
                "Based on the meeting transcript below, extract insights that match the user's request. "
                "Be thorough and interpretive — look for BOTH explicit mentions AND implied/related references. "
                "For example, if the user asks about 'risk', include financial risks, uncertainties, or concerns. "
                "If the user asks about 'timeline', include any deadlines, scheduling, or time-related discussions. "
                "If the user asks about 'budget', include any cost, pricing, investment, or financial discussions.\n\n"
                "You MUST return a non-empty array if there is ANY relevant content. "
                "Each insight should be a detailed sentence with context and a [MM:SS] timestamp if available.\n\n"
                "Return ONLY a valid JSON object: {\"custom_insights\": [\"insight 1\", \"insight 2\", ...]}\n\n"
                "Meeting transcript:\n"
                + unified_text
            )
            print(f"[Pipeline] Extracting custom insights with prompt: \"{custom_prompt}\"")
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            raw = response.text or "{}"
            payload = _safe_json_loads(raw)
            insights = [str(item).strip() for item in payload.get("custom_insights", []) if str(item).strip()]
            print(f"[Pipeline] Custom insights extracted: {len(insights)} item(s)")
            return insights
        except Exception as exc:
            print(f"[Pipeline] Custom insights extraction failed: {exc}")
            return []

    def _build_unified_lines(self, transcript: TranscriptData, chat_messages: list[ChatMessage]) -> list[str]:
        lines = []
        for segment in transcript.segments:
            speaker = segment.speaker or "Unknown Speaker"
            lines.append(
                f"[{_format_seconds(segment.start)}][audio][{speaker}] {segment.text}"
            )

        for message in chat_messages:
            lines.append(
                f"[{_format_seconds(message.relative_seconds)}][chat][{message.author or 'Unknown Author'}] {message.text}"
            )

        if not lines and transcript.text:
            lines.append(f"[00:00][audio][Unknown Speaker] {transcript.text}")

        return sorted(lines)

    def _chunk_lines(self, lines: list[str]) -> list[str]:
        if not lines:
            return [""]

        chunks = []
        current_chunk = []
        current_length = 0

        for line in lines:
            if current_chunk and current_length + len(line) + 1 > self.config.max_chunk_chars:
                chunks.append("\n".join(current_chunk))
                current_chunk = []
                current_length = 0
            current_chunk.append(line)
            current_length += len(line) + 1

        if current_chunk:
            chunks.append("\n".join(current_chunk))

        return chunks

    def _report_from_payload(self, payload: dict, language: str | None) -> MeetingReport:
        speaker_highlights = []
        for entry in payload.get("speaker_highlights", []):
            speaker = (entry.get("speaker") or "Unknown Speaker").strip()
            highlights = [item.strip() for item in entry.get("highlights", []) if str(item).strip()]
            if highlights:
                speaker_highlights.append(SpeakerHighlight(speaker=speaker, highlights=highlights))

        decisions = []
        for entry in payload.get("decisions", []):
            decision_text = (entry.get("decision") or "").strip()
            if decision_text:
                decisions.append(
                    DecisionItem(
                        decision=decision_text,
                        timestamp=(entry.get("timestamp") or "").strip() or None,
                        evidence=(entry.get("evidence") or "").strip() or None,
                    )
                )

        action_items = []
        for entry in payload.get("action_items", []):
            task_text = (entry.get("task") or "").strip()
            if task_text:
                action_items.append(
                    ActionItem(
                        task=task_text,
                        owner=(entry.get("owner") or "").strip() or None,
                        deadline=(entry.get("deadline") or "").strip() or None,
                        timestamp=(entry.get("timestamp") or "").strip() or None,
                        evidence=(entry.get("evidence") or "").strip() or None,
                    )
                )

        return MeetingReport(
            title=(payload.get("title") or "").strip() or None,
            overview=(payload.get("overview") or "").strip() or None,
            important_highlights=[item.strip() for item in payload.get("important_highlights", []) if str(item).strip()],
            main_tasks=[item.strip() for item in payload.get("main_tasks", []) if str(item).strip()],
            chronological_summary=[item.strip() for item in payload.get("chronological_summary", []) if str(item).strip()],
            speaker_highlights=speaker_highlights,
            decisions=decisions,
            action_items=action_items,
            key_timestamps=[item.strip() for item in payload.get("key_timestamps", []) if str(item).strip()],
            transcript_language=language,
            summary_note=(payload.get("summary_note") or "").strip() or None,
            meeting_outcomes=[item.strip() for item in payload.get("meeting_outcomes", []) if str(item).strip()],
            conclusion=(payload.get("conclusion") or "").strip() or None,
        )

    def _fallback_report(self, transcript: TranscriptData, chat_messages: list[ChatMessage], metadata: dict) -> MeetingReport:
        """Rule-based extraction — runs offline with no API key required."""

        # Combine all text lines with timestamps
        all_lines: list[tuple[float | None, str, str]] = []  # (start, source, text)
        for segment in transcript.segments:
            normalized = self._normalize_text(segment.text)
            if normalized:
                all_lines.append((segment.start, "audio", normalized))
        for message in chat_messages:
            normalized = self._normalize_text(message.text)
            if normalized:
                all_lines.append((message.relative_seconds, "chat", normalized))
        all_lines.sort(key=lambda item: item[0] if item[0] is not None else 0)

        if not all_lines and transcript.text:
            all_lines = [
                (None, "audio", self._normalize_text(part))
                for part in transcript.text.split(".")
                if self._normalize_text(part)
            ]

        # ── Overview ───────────────────────────────────────────────────
        overview: str | None = None
        if all_lines:
            first_texts = [text for _ts, _src, text in all_lines[:3]]
            overview = "Meeting covered: " + "; ".join(first_texts[:2]) + "."

        # ── Chronological summary ──────────────────────────────────────
        chronological_summary = [
            f"[{_format_seconds(ts)}] {text}" if ts is not None else text
            for ts, _source, text in all_lines[:12]
        ]

        # ── Speaker highlights ──────────────────────────────────────────
        speaker_map: dict[str, list[str]] = defaultdict(list)
        for segment in transcript.segments:
            normalized = self._normalize_text(segment.text)
            if normalized:
                speaker = segment.speaker or "Unknown Speaker"
                if len(speaker_map[speaker]) < 5:
                    if normalized not in speaker_map[speaker]:
                        speaker_map[speaker].append(normalized)
        speaker_highlights = [
            SpeakerHighlight(speaker=spk, highlights=items)
            for spk, items in speaker_map.items()
        ]

        # ── Decision detection ──────────────────────────────────────────
        decisions: list[DecisionItem] = []
        seen_decisions: set[str] = set()
        for ts, _source, text in all_lines:
            if _DECISION_PATTERNS.search(text):
                key = text[:80].lower()
                if key not in seen_decisions:
                    seen_decisions.add(key)
                    decisions.append(
                        DecisionItem(
                            decision=text,
                            timestamp=_format_seconds(ts) if ts is not None else None,
                            evidence=None,
                        )
                    )

        # ── Action item extraction ──────────────────────────────────────
        action_items: list[ActionItem] = []
        seen_tasks: set[str] = set()
        for ts, _source, text in all_lines:
            if _ACTION_PATTERNS.search(text):
                key = text[:80].lower()
                if key in seen_tasks:
                    continue
                seen_tasks.add(key)

                owner: str | None = None
                owner_match = _OWNER_PATTERN.search(text)
                if owner_match:
                    owner = owner_match.group(1)

                deadline: str | None = None
                deadline_match = _DEADLINE_PATTERN.search(text)
                if deadline_match:
                    deadline = deadline_match.group(0).strip()

                action_items.append(
                    ActionItem(
                        task=text,
                        owner=owner,
                        deadline=deadline,
                        timestamp=_format_seconds(ts) if ts is not None else None,
                        evidence=None,
                    )
                )

        # ── Main tasks: derive from action items + decisions ───────────
        main_tasks: list[str] = []
        for a in action_items:
            main_tasks.append(a.task)
        for d in decisions:
            main_tasks.append(d.decision)
        if not main_tasks:
            main_tasks = [text for _ts, _src, text in all_lines[:5]]

        # ── Important highlights ───────────────────────────────────────
        important_highlights: list[str] = []
        for d in decisions[:3]:
            important_highlights.append(f"Decision: {d.decision}")
        for a in action_items[:3]:
            owner_part = f" (Owner: {a.owner})" if a.owner else ""
            deadline_part = f" (Deadline: {a.deadline})" if a.deadline else ""
            important_highlights.append(f"Action: {a.task}{owner_part}{deadline_part}")
        if not important_highlights:
            important_highlights = [text for _ts, _src, text in all_lines[:5]]
        if chat_messages:
            important_highlights.append(f"{len(chat_messages)} chat message(s) captured during the meeting.")

        dedup_highlights: list[str] = []
        seen_highlights: set[str] = set()
        for item in important_highlights:
            key = item.lower().strip()
            if not key or key in seen_highlights:
                continue
            seen_highlights.add(key)
            dedup_highlights.append(item)
        important_highlights = dedup_highlights[:8]

        # ── Key timestamps ─────────────────────────────────────────────
        key_timestamps = [
            f"[{_format_seconds(segment.start)}] {self._normalize_text(segment.text, max_len=100)}"
            for segment in transcript.segments[:8]
            if segment.text.strip()
        ]

        # ── Meeting outcomes ───────────────────────────────────────────
        meeting_outcomes: list[str] = [d.decision for d in decisions]
        if not meeting_outcomes and action_items:
            meeting_outcomes = [f"Task assigned: {a.task}" for a in action_items[:3]]

        # ── Conclusion ─────────────────────────────────────────────────
        conclusion: str | None = None
        if all_lines:
            conclusion = f"The meeting covered {len(all_lines)} discussion points with {len(decisions)} decision(s) and {len(action_items)} action item(s)."

        transcription_backend = (metadata.get("transcription_backend") or "unknown").strip()
        analysis_backend = (metadata.get("analysis_backend") or "rule-based").strip()

        summary_note = (
            f"Transcription backend: {transcription_backend}. "
            f"Analysis backend: {analysis_backend}. "
            "This report used deterministic rule-based extraction, so decisions/action items may be conservative. "
            "Set OPENAI_API_KEY or GEMINI_API_KEY for richer, LLM-generated summaries."
        )

        return MeetingReport(
            overview=overview,
            important_highlights=important_highlights,
            main_tasks=main_tasks,
            chronological_summary=chronological_summary,
            speaker_highlights=speaker_highlights,
            decisions=decisions,
            action_items=action_items,
            key_timestamps=key_timestamps,
            transcript_language=transcript.language,
            summary_note=summary_note,
            meeting_outcomes=meeting_outcomes,
            conclusion=conclusion,
        )