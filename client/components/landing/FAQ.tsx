"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Is MeetO compatible with Zoom and Teams?",
    answer: "Yes, MeetO integrates natively with Zoom, Microsoft Teams, Google Meet, and even Discord. One-click setup connects your calendar and automates the process."
  },
  {
    question: "How secure is my meeting data?",
    answer: "We use enterprise-grade AES-256 encryption. Your data is your own; we never train our global models on your private meeting content."
  },
  {
    question: "Can I customize the summary format?",
    answer: "Absolutely. You can define custom templates for project managers, engineers, or executives to ensure everyone gets the signal they need."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section data-bg="light" id="faq" className="bg-white py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-serif text-5xl text-slate-900 mb-12 text-center">Frequently asked.</h2>
        
        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isActive = openIndex === index;
            return (
              <div 
                key={index}
                className={cn(
                  "bg-slate-50 rounded-2xl overflow-hidden cursor-pointer p-6 accordion-item hover:bg-slate-100 transition-colors",
                  isActive && "active"
                )}
                onClick={() => toggleAccordion(index)}
              >
                <div className="flex justify-between items-center group">
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-brand-indigo transition-colors">{faq.question}</h3>
                  <svg 
                    className={cn(
                      "w-5 h-5 chevron transition-transform duration-300 text-slate-500",
                      isActive && "rotate-180 text-brand-indigo"
                    )} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                <div 
                  className={cn(
                    "accordion-content mt-0 overflow-hidden transition-all duration-400 ease-in-out",
                    isActive ? "max-h-[200px] mt-4" : "max-h-0"
                  )}
                >
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
