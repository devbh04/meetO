"use client";

import Image from "next/image";

const TESTIMONIALS = [
  {
    quote: "MeetO has fundamentally changed how we handle design sprints. The Presenter Mode alone saves us hours of setup time every single week. It's magic.",
    name: "Julianne Deon",
    handle: "@jdeon_design",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdaJ-7wGFuCj6dIT19aoTvPjzZg3jQB2eu_H1Yb5od8PjB5Bii__b_jzbc-28TBnGbQR9CX54O4cNQvYwSGcCJxiXFSeeLEc1D886n7uI1L3HtGASaSYb1gW9XRNIXMukvyNKB13uMjPpNjeulBA0BqHx2wPtzpxH27Ngx_B7qhuyOgsQiw8RQvxBXWnQJBS5v7-XNKVgNtbMz05XLdYCJ1XaVI92D50lxfJyjQS-_dYi70Rk9F9Z7jsM-rg7uevhN4mCWy--57fR8"
  },
  {
    quote: "I was skeptical about AI bots in meetings, but the nuance capture is incredible. It caught a subtle requirement change that would have cost us weeks of rework.",
    name: "Marcus K.",
    handle: "@mk_dev",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_2ubfcjElEHG3lEI7TnDUvnjw6xzU1jGtv6TmJFYTfH4cT9fX44aNiWQc-53nXqvbdDUVilQdVLjNouD9DNBHX4Gl7gADEwHUem1sv2xgMomoVBT7ij5V5fAjLPv09e9QyMcdU80h4cYGcs6Pbnutox8p7NHtycVfkY5sfXt87oO3bjJMjd8CGhYWaU5-vAaSnKJTHSIVNBRh6hcdxS2kQLaqK6D2sJEHLSiP282lBJr0YBpq9i0RrbsNdu-k_RGzCP0lkNzQK3wa",
    offsetY: true
  },
  {
    quote: "The Knowledge Base feature is like having a second brain in the room. I can ask 'Did we discuss the budget for Q3?' and get an instant answer during the live call.",
    name: "Sarah Reed",
    handle: "@reed_exec",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnzCwp7tdjiUbHkeTPNijrI9MKaWk4vl9i981KVdpngS-o5D51JUX7pyeSzqnP9va3s3ZWfBOPhww_F7NfhuAv5R9wJOpXGbmtFfC2W01grTADGC3DCFXT4tu4fAfBtCQnxe0kVwxBpw99iDZ69J-9D4UbQ1f5GEWxyufUQM0xbGqE15TKvKGvy48sizV5g-63qJaFoZemB4Sln0d885wYFGw6xcxYnmX4qruz8jeU8YmGDApPMGaJZeJZ0ZPLCK0HrzQfVyoJhtOt"
  }
];

export function Testimonials() {
  return (
    <section data-bg="dark" id="testimonials" className="bg-brand-dark py-32 px-6">
      <div className="max-w-7xl mx-auto text-center mb-20">
        <h2 className="font-serif text-5xl text-white mb-6">Loved by visionaries.</h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg hover:text-white transition-colors">
          See how the world's most productive teams are using MeetO to reclaim their time.
        </p>
      </div>

      {/* Masonry-like Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, idx) => (
          <div 
            key={idx} 
            className={`glass-strong p-8 rounded-2xl flex flex-col gap-6 h-fit transform hover:-translate-y-2 transition-transform duration-300 ${t.offsetY ? 'md:translate-y-12' : ''}`}
          >
            <p className="text-slate-200 text-sm leading-loose">"{t.quote}"</p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm hover:text-brand-indigo transition-colors">{t.name}</h4>
                <p className="text-slate-500 text-xs">{t.handle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
