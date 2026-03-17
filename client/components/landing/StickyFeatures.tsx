"use client";

import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "presenter",
    title: "Presenter Mode",
    headline: "You bring the deck. We'll run the show.",
    description:
      "Upload your PPT or PDF and MeetO generates a contextual script. During the live meeting, it presents smoothly and can even pause to answer specific audience doubts instantly.",
    RightContent: () => (
      <div className="bg-slate-900 rounded-3xl p-1 aspect-video shadow-2xl overflow-hidden relative group w-full h-full">
        <div className="absolute inset-0 bg-linear-to-tr from-brand-indigo/20 to-transparent" />
        <div className="p-6 h-full flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <pre className="text-slate-400 font-mono text-xs md:text-sm leading-tight overflow-hidden">
            <code>
              <span className="text-brand-indigo">const</span> deck =
              MeetO.upload([<span className="text-emerald-400">'q3_pitch.pdf'</span>]);
              {"\n"}
              <span className="text-brand-indigo">const</span> script =
              <span className="text-brand-indigo">await</span> deck.generateScript();
              {"\n\n"}
              MeetO.on(<span className="text-emerald-400">'audience_doubt'</span>,
              (question) =&gt; {"{ \n"}
              {"  "}deck.pause();{"\n"}
              {"  "}<span className="text-brand-indigo">await</span> MeetO.answer(question);{"\n{"});
            </code>
          </pre>
        </div>
      </div>
    ),
  },
  {
    id: "note-taker",
    title: "Note Taking Mode",
    headline: "Be present. We'll handle the notes.",
    description:
      "Stay focused on the conversation. MeetO takes highly accurate, timestamped notes in real-time. You can manually flag important moments or let the AI do it for you.",
    RightContent: () => (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 aspect-video shadow-xl flex items-center justify-center relative overflow-hidden w-full h-full">
        {/* Grayscale Blueprint Style */}
        <div
          className="w-full h-full opacity-30 absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10 w-full flex flex-col gap-4 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-xs font-semibold text-slate-500">RECORDING...</span>
          </div>
          <div className="h-4 w-3/4 bg-slate-200 rounded-full" />
          <div className="h-4 w-1/2 bg-slate-200 rounded-full" />
          <div className="h-4 w-2/3 bg-slate-200 rounded-full" />
          <div className="h-4 w-5/6 bg-brand-indigo/20 rounded-full" />
          <div className="h-4 w-1/3 bg-brand-indigo/20 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    id: "transcriber",
    title: "Full Transcriber",
    headline: "Every word captured. Everywhere.",
    description:
      "Schedule MeetO to join any call. It transcribes the entire meeting flawlessly, distinguishing speakers and filtering cross-talk, supporting dozens of platform integrations natively.",
    RightContent: () => (
      <div className="bg-slate-900 rounded-3xl p-8 aspect-video shadow-2xl relative flex items-center justify-center group w-full h-full">
        <div className="absolute inset-0 bg-brand-indigo/10 mix-blend-overlay rounded-3xl" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full border-2 border-brand-indigo flex items-center justify-center text-brand-indigo animate-pulse">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <span className="text-slate-400 font-mono text-xs uppercase tracking-widest text-center leading-relaxed">
            Transcribing...<br />
            <span className="text-emerald-400">Speaker 1:</span> "Let's review..."<br />
            <span className="text-blue-400">Speaker 2:</span> "Sure, I have the..."
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "extraction",
    title: "Data Extraction",
    headline: "Turn chatter into action items.",
    description:
      "Instantly extract meaningful data post-call. Pull out action items, decisions, and tasks. You can even prompt MeetO with custom queries like 'What risks were mentioned about the budget?'",
    RightContent: () => (
      <div className="bg-brand-indigo rounded-3xl p-8 aspect-video shadow-xl flex items-center justify-center relative overflow-hidden w-full h-full">
        <div className="absolute inset-0 bg-white/10 mix-blend-overlay rounded-3xl pattern-dots" />
        <div className="relative z-10 w-full flex flex-col items-center text-center gap-2">
           <svg className="w-12 h-12 text-white/90 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
           </svg>
           <h3 className="font-display font-bold text-white text-xl">Entity Extraction</h3>
           <p className="text-indigo-100 text-sm max-w-[200px]">3 Action Items<br />2 Key Decisions</p>
        </div>
      </div>
    ),
  }
];

export function StickyFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const activeIndexRaw = useTransform(
    scrollYProgress,
    [0, 1],
    [0, FEATURES.length - 1]
  );

  return (
    <section data-bg="light" ref={containerRef} className="relative bg-brand-surface" style={{ height: `${FEATURES.length * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full flex items-center px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-16 relative">
          
          {/* Sidebar / Scroll Spy */}
          <aside className="hidden md:flex w-1/4 flex-col justify-center h-full">
            <ul className="space-y-6">
              {FEATURES.map((feature, index) => (
                <NavItem 
                  key={feature.id} 
                  title={feature.title} 
                  index={index} 
                  activeIndexRaw={activeIndexRaw} 
                />
              ))}
            </ul>
          </aside>

          {/* Main Feature Content Container */}
          <main className="w-full md:w-3/4 h-[60vh] md:h-[70vh] relative pt-20 md:pt-0">
            {FEATURES.map((feature, index) => (
              <FeatureSlide
                key={feature.id}
                feature={feature}
                index={index}
                activeIndexRaw={activeIndexRaw}
              />
            ))}
          </main>
        </div>
      </div>
    </section>
  );
}

// Subcomponents to handle individual motion logic

function NavItem({ title, index, activeIndexRaw }: { title: string, index: number, activeIndexRaw: any }) {
  // Active when target scroll is within index boundaries (-0.5 to +0.5)
  const isActive = useTransform(activeIndexRaw, (v: number) => Math.round(v) === index);
  
  const color = useTransform(
    activeIndexRaw,
    (v: number) => Math.round(v) === index ? "var(--color-slate-900, #0f172a)" : "var(--color-slate-400, #94a3b8)"
  );

  return (
    <motion.li 
      className="flex items-center gap-4 transition-all duration-300"
      style={{
        fontWeight: isActive.get() ? "bold" : "500",
        color: color
      }}
    >
      <motion.div 
        className="w-1.5 h-1.5 rounded-full bg-slate-900"
        initial={false}
        animate={{ opacity: isActive.get() ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      <span>{title}</span>
    </motion.li>
  );
}

function FeatureSlide({ feature, index, activeIndexRaw }: { feature: any, index: number, activeIndexRaw: any }) {
  const opacity = useTransform(
    activeIndexRaw,
    [index - 0.5, index, index + 0.5],
    [0, 1, 0]
  );

  const y = useTransform(
    activeIndexRaw,
    [index - 1, index, index + 1],
    [50, 0, -50]
  );

  const scale = useTransform(
    activeIndexRaw,
    [index - 0.5, index, index + 0.5],
    [0.95, 1, 0.95]
  );

  const zIndex = useTransform(
    activeIndexRaw,
    (v: number) => Math.round(v) === index ? 10 : 0
  );
  
  const pointerEvents = useTransform(
    activeIndexRaw,
    (v: number) => Math.round(v) === index ? "auto" : "none"
  );

  return (
    <motion.div
      style={{ opacity, y, zIndex, pointerEvents }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="font-serif text-4xl md:text-5xl leading-tight text-slate-900">
            {feature.headline.split('. ').map((part: string, i: number, arr: any[]) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && ". "}<br className="hidden md:block"/>
              </span>
            ))}
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            {feature.description}
          </p>
          <div className="pt-4">
            <button className="flex items-center gap-2 font-display font-bold text-brand-indigo hover:gap-4 transition-all">
              Explore {feature.title} 
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
        
        <motion.div style={{ scale }} className="w-full h-full flex items-center justify-center">
          <feature.RightContent />
        </motion.div>
      </div>
    </motion.div>
  );
}
