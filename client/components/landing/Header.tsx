"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Header() {
  const [isLightBg, setIsLightBg] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-bg]');
      let foundLight = false;
      const triggerY = 35; // approx middle of the header

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom > triggerY) {
          if (section.getAttribute('data-bg') === 'light') {
            foundLight = true;
          }
        }
      });
      setIsLightBg(foundLight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center transition-all duration-500",
        isLightBg ? "text-slate-900" : "text-white"
      )}
    >
      <Link href="/" className="logo-hover flex items-center gap-2 group">
        <div className="w-8 h-8 bg-brand-indigo rounded-lg flex items-center justify-center text-white transition-transform duration-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </div>
        <span className={cn(
          "font-display font-bold text-xl tracking-tight transition-colors duration-500",
          isLightBg ? "text-slate-900" : "text-white mix-blend-difference"
        )}>
          MeetO
        </span>
      </Link>

      <nav className={cn(
        "hidden md:flex items-center gap-8 px-6 py-2 rounded-full text-sm font-medium transition-all duration-500",
        isLightBg ? "bg-slate-100/80 text-slate-600 backdrop-blur-md border border-slate-200 shadow-sm" : "glass-soft text-white"
      )}>
        <a href="#features" className="hover:text-brand-indigo transition-colors">Features</a>
        <a href="#workflow" className="hover:text-brand-indigo transition-colors">Workflow</a>
        <a href="#testimonials" className="hover:text-brand-indigo transition-colors">Wall of Love</a>
        <a href="#faq" className="hover:text-brand-indigo transition-colors">FAQ</a>
      </nav>

      <button className={cn(
        "px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-500",
        isLightBg 
          ? "bg-slate-900 text-white hover:bg-brand-indigo shadow-lg" 
          : "bg-white text-brand-dark hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
      )}>
        Get Started
      </button>
    </header>
  );
}
