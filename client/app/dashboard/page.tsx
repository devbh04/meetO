"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  CheckSquare, Trash2, Video, AlertCircle, Loader2, ExternalLink
} from "lucide-react";

const API = "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────────

interface ScheduledMeeting {
  id: string;
  title: string;
  meeting_link: string;
  bot_name: string;
  instructions?: string;
  scheduled_at: string;
}

interface ActionItem {
  task: string;
  owner?: string;
  deadline?: string;
  completed?: boolean;
}

interface RecentMeeting {
  meeting_id: string;
  created_at: string;
  analysis_json?: { title?: string; action_items?: ActionItem[]; main_tasks?: string[] };
  metadata?: { bot_name?: string };
}

// ── Mini Calendar ──────────────────────────────────────────────────────────

function MiniCalendar({ selected, onChange, meetingDates }: {
  selected: Date;
  onChange: (d: Date) => void;
  meetingDates: string[];
}) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 rounded hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-700">{format(viewMonth, "MMMM yyyy")}</span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 rounded hover:bg-slate-100">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map(day => {
          const iso = format(day, "yyyy-MM-dd");
          const hasMeeting = meetingDates.includes(iso);
          const isSelected = isSameDay(day, selected);
          const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
          return (
            <button
              key={iso}
              onClick={() => onChange(day)}
              className={`
                relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition-all
                ${!isCurrentMonth ? "text-slate-300" : "text-slate-700"}
                ${isSelected ? "bg-indigo-600 text-white shadow" : isToday(day) ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-100"}
              `}
            >
              {format(day, "d")}
              {hasMeeting && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Today's Timeline ────────────────────────────────────────────────────────

function TodayTimeline({ meetings, onDelete }: { meetings: ScheduledMeeting[]; onDelete: (id: string) => void }) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
        <Calendar className="h-8 w-8 opacity-40" />
        <p className="text-xs">No meetings scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {meetings.map(m => {
        const timeStr = format(parseISO(m.scheduled_at), "hh:mm a");
        const dateStr = format(parseISO(m.scheduled_at), "EEE, MMM d");

        return (
          <div key={m.id} className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex flex-col items-center bg-indigo-50 rounded-lg px-2.5 py-1.5 min-w-[52px] flex-none">
                    <span className="text-[11px] font-bold text-indigo-700 leading-tight">{timeStr.split(" ")[0]}</span>
                    <span className="text-[9px] font-semibold text-indigo-400 uppercase">{timeStr.split(" ")[1]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{m.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{dateStr}</p>
                  </div>
                </div>
                <div className="flex space-x-6">
                  <div className="flex">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400 mr-2 flex-none">Bot</span>
                    <span className="text-xs flex items-center text-slate-600 font-medium">{m.bot_name}</span>
                  </div>
                  <div className="flex">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400 mr-2 flex-none">Link</span>
                    <a href={m.meeting_link} target="_blank" rel="noreferrer"
                      className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline truncate max-w-[220px] inline-flex items-center gap-1">
                      <Video className="h-3 w-3 flex-none" />
                      {m.meeting_link.replace(/^https?:\/\//, "").slice(0, 40)}{m.meeting_link.length > 46 ? "…" : ""}
                    </a>
                  </div>
                  {m.instructions && (
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400 mr-2 flex-none">Notes</span>
                      <span className="text-xs flex items-center text-slate-500 leading-snug line-clamp-2">{m.instructions}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 flex-none">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule Meet Form ──────────────────────────────────────────────────────

function ScheduleMeetDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", meeting_link: "", bot_name: "MeetO Bot", instructions: "", scheduled_at: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.title || !form.meeting_link || !form.scheduled_at) {
      setError("Title, meeting link and date/time are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/scheduled-meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to schedule");
      setOpen(false);
      setForm({ title: "", meeting_link: "", bot_name: "MeetO Bot", instructions: "", scheduled_at: "" });
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Schedule Meet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-indigo-500" /> Schedule a Meeting
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md p-2">
              <AlertCircle className="h-4 w-4 flex-none" />{error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Meeting Title</Label>
            <Input placeholder="Weekly Sync" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Meeting Link</Label>
            <Input placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Bot Name</Label>
            <Input value={form.bot_name} onChange={e => setForm(f => ({ ...f, bot_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Instructions <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
            <Textarea placeholder="Focus on action items, capture decisions..." value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} className="min-h-[80px]" />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scheduling…</> : "Add to Schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dashboard Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allMeetings, setAllMeetings] = useState<ScheduledMeeting[]>([]);
  const [todayMeetings, setTodayMeetings] = useState<ScheduledMeeting[]>([]);
  const [recentMeeting, setRecentMeeting] = useState<RecentMeeting | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // All meeting dates (for dots on calendar)
  const meetingDates = [...new Set(allMeetings.map(m => m.scheduled_at.slice(0, 10)))];

  // Meetings on selectedDate for timeline
  const selectedDayMeetings = allMeetings.filter(m =>
    m.scheduled_at.startsWith(format(selectedDate, "yyyy-MM-dd"))
  );

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/scheduled-meetings`);
      if (res.ok) {
        const data = await res.json();
        setAllMeetings(data.meetings || []);
      }
    } catch { }
  }, []);

  const fetchToday = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      const res = await fetch(`${API}/api/scheduled-meetings?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setTodayMeetings(data.meetings || []);
      }
    } catch { }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/meetings`);
      if (res.ok) {
        const data = await res.json();
        if (data.meetings?.length) setRecentMeeting(data.meetings[0]);
      }
    } catch { }
    setLoadingRecent(false);
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchToday();
    fetchRecent();
  }, [fetchScheduled, fetchToday, fetchRecent]);

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/scheduled-meetings/${id}`, { method: "DELETE" });
    fetchScheduled();
    fetchToday();
  };

  const recentActionItems = recentMeeting?.analysis_json?.action_items ?? [];
  const recentTasks = recentMeeting?.analysis_json?.main_tasks ?? [];
  const recentTitle = recentMeeting?.analysis_json?.title || recentMeeting?.metadata?.bot_name || "Recent Meeting";

  return (
    <div className="space-y-6 pb-20">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Your MeetO command center.</p>
      </div>

      {/* ── Top row: Calendar + Today Timeline ── */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">

        {/* Left: Mini Calendar */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <MiniCalendar selected={selectedDate} onChange={setSelectedDate} meetingDates={meetingDates} />
        </div>

        {/* Right: Timeline for selected day */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">
                {isToday(selectedDate) ? "Today's Schedule" : format(selectedDate, "EEE, MMM d")}
              </h2>
              <p className="text-xs text-slate-400">{selectedDayMeetings.length} meeting{selectedDayMeetings.length !== 1 ? "s" : ""}</p>
            </div>
            <ScheduleMeetDialog onSuccess={() => { fetchScheduled(); fetchToday(); }} />
          </div>
          <TodayTimeline meetings={selectedDayMeetings} onDelete={handleDelete} />
        </div>
      </div>

      {/* ── Bottom row: Action Items + Tasks ── */}
      {!loadingRecent && recentMeeting && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">From Your Latest Meeting</h2>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <span className="truncate max-w-xs">{recentTitle}</span>
                {recentMeeting.meeting_id && (
                  <a href={`/dashboard/meeting/${recentMeeting.meeting_id}`} className="hover:text-indigo-500 transition-colors">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action Items */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="h-4 w-4 text-indigo-500" />
                <h3 className="font-semibold text-sm text-slate-800">Action Items</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{recentActionItems.length}</Badge>
              </div>
              {recentActionItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No action items</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recentActionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Checkbox checked={!!item.completed} onCheckedChange={() => { }} className="mt-0.5 flex-none" />
                      <div className="min-w-0">
                        <p className={`leading-snug break-words ${item.completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {item.task}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.owner && <span className="text-[10px] text-slate-400">{item.owner}</span>}
                          {item.deadline && <span className="text-[10px] text-slate-400">• due {item.deadline}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tasks */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-purple-500" />
                <h3 className="font-semibold text-sm text-slate-800">Tasks</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{recentTasks.length}</Badge>
              </div>
              {recentTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No tasks recorded</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recentTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="leading-snug break-words">{task}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {loadingRecent && (
        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading recent meeting data…</span>
        </div>
      )}
    </div>
  );
}
