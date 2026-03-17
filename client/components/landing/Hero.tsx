"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "generates perfect notes.",
  "automates your follow-ups.",
  "joins every call for you."
];

export function Hero() {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const tick = () => {
      const currentPhrase = PHRASES[phraseIndex];
      
      if (isDeleting) {
        setText(currentPhrase.substring(0, text.length - 1));
      } else {
        setText(currentPhrase.substring(0, text.length + 1));
      }

      if (!isDeleting && text === currentPhrase) {
        // Wait before starting to delete
        timeoutId = setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && text === "") {
        // Move to next phrase
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        timeoutId = setTimeout(tick, 500);
      } else {
        // Keep typing or deleting
        timeoutId = setTimeout(tick, isDeleting ? 50 : 100);
      }
    };

    timeoutId = setTimeout(tick, isDeleting ? 50 : 100);
    return () => clearTimeout(timeoutId);
  }, [text, isDeleting, phraseIndex]);

  return (
    <section data-bg="dark" className="relative min-h-[100vh] bg-brand-dark flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] glow-overlay animate-glow-pulse" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-brand-dark/50 to-brand-dark" />
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", 
            backgroundSize: "40px 40px" 
          }} 
        />
      </div>

      <div className="relative -mt-20 z-10 max-w-5xl w-full text-center flex flex-col items-center gap-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-indigo/20 border border-brand-indigo/30 text-brand-indigo text-xs font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-brand-indigo animate-pulse" />
          New: Presenter Mode
        </span>

        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white max-w-4xl tracking-tight leading-tight">
          Meetings that <span className="italic text-brand-indigo">actually</span> matter.
        </h1>

        <p className="text-slate-400 text-lg md:text-xl font-sans max-w-3xl leading-relaxed">
          Let MeetO join your calls, capture the nuance, and{" "}
          <span className="text-white font-medium cursor-blink">
            {text}
          </span>
        </p>
        
        {/* Vibe Input Box intentionally removed per user request */}
      </div>

      {/* Integration Bar */}
      <div className="absolute bottom-12 w-full max-w-4xl px-4 z-20">
        <div className="glass-soft rounded-2xl flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
          <div className="px-8 py-6 flex flex-col gap-2 shrink-0 bg-white/5">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Frameworks</span>
            <div className="flex gap-4 items-center">
              <span className="text-white font-display font-bold">React</span>
              <span className="text-white font-display font-bold">Vue</span>
              <span className="text-white font-display font-bold">Next.js</span>
            </div>
          </div>
          <div className="px-8 py-6 flex-1 flex flex-col gap-2 overflow-hidden">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Integrations</span>
            <div className="flex overflow-hidden relative group">
              <div className="flex gap-12 animate-marquee grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700">
                <span className="text-white font-display font-bold whitespace-nowrap">Slack</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Zoom</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Notion</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Discord</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Teams</span>
                {/* Duplicate for seamless loop */}
                <span className="text-white font-display font-bold whitespace-nowrap">Slack</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Zoom</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Notion</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Discord</span>
                <span className="text-white font-display font-bold whitespace-nowrap">Teams</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
