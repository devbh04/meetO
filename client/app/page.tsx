import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { StickyFeatures } from "@/components/landing/StickyFeatures";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="bg-brand-surface font-sans text-slate-900 selection:bg-brand-indigo/30 selection:text-brand-indigo">
      <Header />
      <Hero />
      <StickyFeatures />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}
