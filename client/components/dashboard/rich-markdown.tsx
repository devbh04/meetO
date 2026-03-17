"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import React from "react";

// ─── Timestamp highlighter ────────────────────────────────────────────────────
// Matches patterns like [00:13], [01:18 - 01:22], [00:22, 00:40]
const TIMESTAMP_RE = /(\[\d{1,2}:\d{2}(?:\s*[-–,]\s*\d{1,2}:\d{2})*\])/g;

function highlightTimestamps(text: string): React.ReactNode[] {
  const parts = text.split(TIMESTAMP_RE);
  return parts.map((part, i) => {
    if (TIMESTAMP_RE.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 font-mono text-[0.72em] font-bold tracking-tight border border-violet-200 shadow-sm"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ─── Text node renderer ───────────────────────────────────────────────────────
function RichText({ children }: { children?: React.ReactNode }) {
  if (typeof children === "string") {
    return <>{highlightTimestamps(children)}</>;
  }
  // recurse into arrays of children
  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, i) =>
          typeof child === "string" ? (
            <React.Fragment key={i}>{highlightTimestamps(child)}</React.Fragment>
          ) : (
            <React.Fragment key={i}>{child}</React.Fragment>
          )
        )}
      </>
    );
  }
  return <>{children}</>;
}

// ─── Custom component map ─────────────────────────────────────────────────────
const components: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p className="leading-relaxed text-slate-700 mb-4">
      <RichText>{children}</RichText>
    </p>
  ),

  // H2 sections get a bold indigo divider
  h2: ({ children }) => (
    <h2 className="flex items-center gap-3 mt-10 mb-4 text-xl font-black text-brand-indigo border-b-2 border-indigo-100 pb-3">
      <span className="w-2 h-6 rounded-full bg-gradient-to-b from-brand-indigo to-brand-purple flex-none" />
      {children}
    </h2>
  ),

  // H3 sections get a subtle left-bar
  h3: ({ children }) => (
    <h3 className="flex items-center gap-2 mt-8 mb-3 text-lg font-bold text-slate-800 border-l-4 border-violet-300 pl-3">
      {children}
    </h3>
  ),

  // H4 — rarely used but nice to have
  h4: ({ children }) => (
    <h4 className="mt-6 mb-2 text-base font-bold text-slate-700 uppercase tracking-wider text-xs">
      {children}
    </h4>
  ),

  // Unordered list items — each gets a colorful bullet
  li: ({ children }) => (
    <li className="flex items-start gap-3 mb-2 text-slate-700 leading-relaxed">
      <span className="mt-2 flex-none h-1.5 w-1.5 rounded-full bg-brand-indigo" />
      <span><RichText>{children}</RichText></span>
    </li>
  ),

  ul: ({ children }) => (
    <ul className="my-3 space-y-1 list-none pl-0">{children}</ul>
  ),

  ol: ({ children }) => (
    <ol className="my-3 space-y-2 list-decimal list-inside">{children}</ol>
  ),

  // Inline code — small pill
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[0.85em] border border-indigo-100">
      {children}
    </code>
  ),

  // Blockquote — evidence / quote style
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-violet-400 bg-violet-50/60 rounded-r-xl px-5 py-4 text-slate-700 italic text-sm leading-relaxed">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1 not-italic">Quote</span>
      {children}
    </blockquote>
  ),

  // Strong / bold
  strong: ({ children }) => (
    <strong className="font-bold text-slate-900">{children}</strong>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-8 border-t-2 border-dashed border-slate-200" />
  ),

  // Tables — styled
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wider">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-bold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 border-t border-slate-100">
      <RichText>{children}</RichText>
    </td>
  ),
};

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  children: string;
  /** Strip the very first H1 title line (often a duplicate of page header) */
  stripTitle?: boolean;
}

export default function RichMarkdown({ children, stripTitle = true }: Props) {
  const content = stripTitle ? children.replace(/^#[^\n]*\n/, "") : children;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
