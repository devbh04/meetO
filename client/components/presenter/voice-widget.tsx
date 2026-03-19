"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  VoiceAssistantControlBar,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Inner component — rendered inside LiveKitRoom context ───────────────────

function PresenterInner({ conceptTitle, onEnd }: { conceptTitle: string; onEnd: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  const [muted, setMuted] = useState(false);

  const toggleMic = async () => {
    const localParticipant = room.localParticipant;
    await localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
  };

  const handleEnd = () => {
    room.disconnect();
    onEnd();
  };

  const stateLabel: Record<string, string> = {
    connecting: "Connecting…",
    initializing: "Initialising agent…",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Presenting…",
    idle: "Idle",
    disconnected: "Disconnected",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Current Concept Banner */}
      <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
        <p className="text-xs uppercase tracking-widest font-bold text-indigo-400 mb-1">Current Topic</p>
        <p className="text-lg font-bold text-slate-800">{conceptTitle || "Starting…"}</p>
      </div>

      {/* Visualizer */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="h-20 w-full max-w-xs">
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={24}
            style={{ "--lk-fg": "hsl(263 70% 50%)" } as React.CSSProperties}
          />
        </div>
        <span className="text-sm font-medium text-slate-500">
          {stateLabel[state] ?? state}
        </span>
      </div>

      <RoomAudioRenderer />

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleMic}
        >
          {muted ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={handleEnd}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Speak naturally — the agent will hear you after each concept explanation.
      </p>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

interface VoiceWidgetProps {
  livekitUrl: string;
  token: string;
  currentConceptTitle: string;
  onSessionEnd: () => void;
}

export function VoiceWidget({ livekitUrl, token, currentConceptTitle, onSessionEnd }: VoiceWidgetProps) {
  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onSessionEnd}
    >
      <PresenterInner conceptTitle={currentConceptTitle} onEnd={onSessionEnd} />
    </LiveKitRoom>
  );
}
