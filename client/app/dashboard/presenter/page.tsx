"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceWidget } from "@/components/presenter/voice-widget";
import {
  Loader2, FileText, Sparkles, ChevronRight, PlayCircle,
  CheckCircle2, AlertCircle, Mic
} from "lucide-react";

type Phase = "setup" | "preview" | "live";

interface Concept {
  id: number;
  title: string;
  explanation: string;
  key_points: string[];
}

interface Script {
  title: string;
  concepts: Concept[];
}

interface LiveSession {
  livekitUrl: string;
  token: string;
  roomName: string;
}

const API = "http://localhost:8000";

export default function PresenterPage() {
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup state
  const fileRef = useRef<HTMLInputElement>(null);
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [sessionId, setSessionId] = useState("");
  const [script, setScript] = useState<Script | null>(null);
  const [currentConceptIdx, setCurrentConceptIdx] = useState(0);

  // Live session state
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);

  // ── Phase 1: Upload + Generate Script ──────────────────────────────────────

  const handleGenerateScript = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a PDF file."); return; }

    setIsLoading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("instructions", instructions);

    try {
      const res = await fetch(`${API}/api/presenter/build-script`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to generate script.");
      }
      const data = await res.json();
      setSessionId(data.session_id);
      setScript(data.script);
      setPhase("preview");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Phase 2: Start Agent Session ───────────────────────────────────────────

  const handleStartSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/presenter/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start session.");
      }
      const data = await res.json();
      setLiveSession({ livekitUrl: data.livekit_url, token: data.token, roomName: data.room_name });
      setPhase("live");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionEnd = () => {
    setLiveSession(null);
    setPhase("preview");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Beta</Badge>
          {phase === "setup" && <Badge variant="outline">Step 1 of 3 — Setup</Badge>}
          {phase === "preview" && <Badge variant="outline">Step 2 of 3 — Review Script</Badge>}
          {phase === "live" && <Badge className="bg-green-100 text-green-700 border-green-200 animate-pulse">● Live Session</Badge>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Presenter Mode</h1>
        <p className="text-slate-500 mt-1">
          Upload a document and let MeetO's AI walk through it for you — concept by concept.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-none" /> {error}
        </div>
      )}

      {/* ── PHASE 1: Setup ── */}
      {phase === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" /> Document Setup
            </CardTitle>
            <CardDescription>Upload a PDF and describe how you'd like it presented.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="deck">Upload PDF</Label>
              <Input ref={fileRef} id="deck" type="file" accept=".pdf" />
              <p className="text-xs text-slate-400">Only PDF is supported. Max ~50 pages for best results.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Presentation Instructions <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Focus on practical examples. After each concept ask if the student wants to practice. Keep it beginner-friendly."
                className="min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleGenerateScript}
              disabled={isLoading}
              className="w-full bg-brand-indigo hover:bg-brand-indigo/90"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Script with Gemini 2.5 Pro…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Presentation Script</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── PHASE 2: Script Preview ── */}
      {phase === "preview" && script && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                {script.title}
              </CardTitle>
              <CardDescription>
                {script.concepts.length} concepts generated. Review below, then start the agent session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {script.concepts.map((c, i) => (
                  <div key={c.id} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                        {c.id}
                      </span>
                      <h3 className="font-semibold text-slate-800">{c.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{c.explanation}</p>
                    <ul className="space-y-1">
                      {c.key_points.map((pt, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-slate-500">
                          <ChevronRight className="h-3 w-3 mt-0.5 flex-none text-indigo-400" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setPhase("setup")}>
              ← Regenerate
            </Button>
            <Button
              className="flex-1 bg-brand-indigo hover:bg-brand-indigo/90"
              onClick={handleStartSession}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting Agent…</>
              ) : (
                <><Mic className="mr-2 h-4 w-4" /> Start Agent Session</>
              )}
            </Button>
          </div>
        </>
      )}

      {/* ── PHASE 3: Live Session ── */}
      {phase === "live" && liveSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-emerald-500" />
              Live Presentation
            </CardTitle>
            <CardDescription>
              The AI presenter is in the room. Speak naturally — it will check if you understood after each concept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceWidget
              livekitUrl={liveSession.livekitUrl}
              token={liveSession.token}
              currentConceptTitle={script?.concepts[currentConceptIdx]?.title ?? ""}
              onSessionEnd={handleSessionEnd}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
