"use client";

import { useState, useCallback } from "react";
import { 
  Calendar, Sparkles, FileText, Search, 
  MoreVertical, ListChecks, Kanban, Plus, MessageSquare, CheckCircle, Clock 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import RichMarkdown from "@/components/dashboard/rich-markdown";

export default function MeetingDashboardView({ meeting }: { meeting: any }) {
  const [activeTab, setActiveTab] = useState("overview");

  const analysis = meeting.analysis_json || {};
  const metadata = meeting.metadata || {};
  const chatMessages = meeting.chat_messages || [];

  // Initialize checkbox state from DB (analysis_json.action_items[].completed)
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() =>
    (analysis.action_items || []).map((item: any) => !!item.completed)
  );

  const handleToggle = useCallback(async (idx: number, checked: boolean) => {
    // Optimistic UI update
    setCheckedItems(prev => {
      const next = [...prev];
      next[idx] = checked;
      return next;
    });
    // Persist to MongoDB via backend
    try {
      await fetch(`http://localhost:8000/api/meetings/${meeting.meeting_id}/action-items/${idx}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: checked }),
      });
    } catch (err) {
      console.error("Failed to save checkbox state:", err);
    }
  }, [meeting.meeting_id]);

  const dateStr = meeting.created_at 
    ? new Date(meeting.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : "Unknown Date";

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500 pb-20">
      {/* Header section */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-indigo">
            <Calendar className="h-4 w-4" />
            <span>{dateStr}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{metadata.bot_name || "Meeting Agent"}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            {analysis.title || metadata.meet_url || "Meeting"}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {metadata.transcript_language && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Language: {metadata.transcript_language.toUpperCase()}
              </Badge>
            )}
            <Badge variant="outline" className="bg-brand-indigo/10 text-brand-indigo border-transparent">
              AI Processed
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Completed
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-slate-100 rounded-md p-1.5 flex gap-1 overflow-x-auto custom-scrollbar border border-slate-200">
        {[
          { id: "overview", label: "Overview", icon: Sparkles },
          { id: "transcript", label: "Transcript", icon: FileText },
          { id: "chat", label: "Chat Context", icon: MessageSquare },
          { id: "decisions", label: "Key Decisions", icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.id 
                ? "bg-white text-brand-indigo shadow-sm border border-slate-200" 
                : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-brand-indigo" : "text-slate-400"}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Column (Main Content) */}
        <div className="space-y-6 lg:col-span-8 overflow-hidden">
          
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Sparkles className="h-6 w-6 text-brand-indigo" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Comprehensive Report</h2>
                </div>
                
                {meeting.report_md ? (
                  <div className="h-[800px] overflow-y-auto">
                    <RichMarkdown stripTitle>{meeting.report_md}</RichMarkdown>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    No full markdown report available for this meeting.
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "transcript" && (
            <section className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden h-[800px] animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">Full Transcription</h2>
                </div>
              </div>
              <div className="custom-scrollbar flex-1 overflow-y-auto p-6 md:p-10 bg-white">
                {meeting.transcript_md ? (
                  <RichMarkdown stripTitle>{meeting.transcript_md}</RichMarkdown>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">No transcript available.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === "chat" && (
            <section className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden h-[700px] animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">Chat Messages</h2>
                </div>
                <Badge variant="secondary" className="bg-white">{chatMessages.length} Messages</Badge>
              </div>
              <div className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {chatMessages.length > 0 ? chatMessages.map((msg: any, idx: number) => (
                  <div key={idx} className="flex gap-4">
                    <div className="h-10 w-10 flex-none rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-brand-indigo text-sm shadow-sm">
                      {(msg.author || "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1.5 flex-1 p-4 bg-white rounded-lg rounded-tl-none border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{msg.author || "Unknown"}</span>
                        <span className="text-xs font-mono text-slate-400 px-1.5 py-0.5 bg-slate-50 rounded">
                          {msg.relative_seconds ? `${Math.floor(msg.relative_seconds / 60)}:${Math.floor(msg.relative_seconds % 60).toString().padStart(2, '0')}` : "?"}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">{msg.text}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex h-full items-center justify-center text-slate-400">No chat messages recorded.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === "decisions" && (
            <section className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[500px] animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">Key Outcomes & Decisions</h2>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-none">{analysis.decisions?.length || 0} Decisions</Badge>
              </div>
              <div className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                {analysis.decisions && analysis.decisions.length > 0 ? analysis.decisions.map((dec: any, idx: number) => (
                  <div key={idx} className="relative rounded-md border border-emerald-100 bg-white p-5 shadow-sm overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 group-hover:bg-emerald-500 transition-colors"></div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-base font-bold text-slate-900 leading-snug pr-4">{dec.decision}</h4>
                      {dec.timestamp && (
                        <Badge variant="outline" className="font-mono text-xs whitespace-nowrap bg-slate-50 text-slate-500 border-slate-200">
                          {dec.timestamp}
                        </Badge>
                      )}
                    </div>
                    {dec.evidence && (
                      <div className="bg-slate-50 px-4 py-3 rounded-lg text-sm text-slate-600 italic border border-slate-100">
                        <span className="font-semibold text-slate-400 block mb-1 not-italic text-xs uppercase tracking-wider">Evidence Transcript:</span>
                        "{dec.evidence}"
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="flex h-full items-center justify-center text-slate-400 mt-10">No specific decisions detected.</div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column (Sidebars) */}
        <div className="space-y-6 lg:col-span-4 custom-scrollbar lg:pl-4">
          
          {/* Action Items */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-purple/10 rounded-md">
                   <ListChecks className="h-5 w-5 text-brand-purple" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Action Items</h2>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-none">
                {analysis.action_items?.length || 0}
              </Badge>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {analysis.action_items && analysis.action_items.length > 0 ? (
                analysis.action_items.map((item: any, idx: number) => (
                  <div key={idx} className="group relative rounded-md border border-slate-100 bg-white hover:bg-slate-50 hover:border-brand-purple/30 transition-all p-4 shadow-sm flex items-start gap-3 overflow-hidden">
                    <Checkbox
                      id={`task-${idx}`}
                      checked={!!checkedItems[idx]}
                      onCheckedChange={(val) => handleToggle(idx, !!val)}
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 flex-none"
                    />
                    <div className="grid gap-1.5 flex-1 min-w-0">
                      <label
                        htmlFor={`task-${idx}`}
                        className={`text-sm font-semibold leading-snug cursor-pointer transition-colors break-words ${
                          checkedItems[idx]
                            ? "line-through text-slate-400"
                            : "text-slate-800 group-hover:text-brand-indigo"
                        }`}
                      >
                        {item.task}
                      </label>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.owner && (
                              <Badge variant="outline" className="text-[10px] uppercase font-bold text-brand-indigo bg-indigo-50 border-indigo-100 max-w-full truncate">
                                  {item.owner}
                              </Badge>
                          )}
                          {(item.deadline || item.timestamp) && (
                              <div className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.deadline && item.deadline !== "N/A" ? item.deadline : item.timestamp}
                              </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-md border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">No action items assigned.</p>
                </div>
              )}
            </div>
          </section>

          {/* General Tasks / Main tasks */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-md">
                   <Kanban className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Task Pipeline</h2>
              </div>
            </div>
            <div className="space-y-3">
              {analysis.main_tasks && analysis.main_tasks.length > 0 ? (
                analysis.main_tasks.map((task: string, idx: number) => (
                   <div key={idx} className="rounded-md bg-slate-50 border border-slate-100 p-4 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                      <div className="mb-1.5">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Focus Area</span>
                      </div>
                     <p className="text-sm font-semibold text-slate-800 leading-snug">{task}</p>
                   </div>
                ))
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-md border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">No strategic focus tasks extracted.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
