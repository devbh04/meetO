import Link from "next/link";

export function Footer() {
  return (
    <footer data-bg="dark" className="bg-brand-dark border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 logo-hover group">
            <div className="w-6 h-6 bg-brand-indigo rounded flex items-center justify-center text-white transition-transform duration-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg text-white">MeetO</span>
          </Link>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Superdesign Systems Inc. All rights reserved.</p>
        </div>
        
        <div className="flex gap-8 text-slate-400 text-sm">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
          <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
