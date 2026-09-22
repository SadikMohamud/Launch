import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { HugeCanvas } from './mechanics/HugeCanvas.tsx';
import { MagneticButton } from './mechanics/MagneticButton.tsx';
import { CustomCursor } from './mechanics/CustomCursor.tsx';
import { SplitReveal } from './mechanics/SplitReveal.tsx';
import { Navbar } from './components/Navbar.tsx';
import { MarqueeTicker } from './components/MarqueeTicker.tsx';
import { VideoTheater } from './components/VideoTheater.tsx';
import { InstallSection } from './components/InstallSection.tsx';
import { FeaturesGrid } from './components/FeaturesGrid.tsx';
import { WorkflowSection } from './components/WorkflowSection.tsx';
import { CliSimulator } from './components/CliSimulator.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { CtaSection } from './components/CtaSection.tsx';
import { Footer } from './components/Footer.tsx';
import { Film, CheckCircle2, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  useEffect(() => {
    // Only initialize smooth scroll on non-touch devices or smooth mobile momentum
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const scrollToShowcase = () => {
    document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0a0807] text-ink-900 dark:text-[#f8f6f5] flex flex-col justify-between selection:bg-accent-pink selection:text-white font-sans antialiased overflow-x-hidden w-full transition-colors duration-200">
      {/* Custom Precision Follower Cursor (auto-disabled on touch) */}
      <CustomCursor />

      {/* Kinetic Background Color Particles */}
      <HugeCanvas />

      {/* Main Studio Navbar with Mobile Menu */}
      <Navbar onWatchClick={scrollToShowcase} />

      {/* Main Content Area */}
      <main className="space-y-16 sm:space-y-28 flex-grow w-full">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-20 space-y-6 sm:space-y-8">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill bg-accent-pink text-white font-mono text-[11px] sm:text-xs font-extrabold shadow-hard">
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-accent-yellow animate-ping" />
              <span>Instant Web-to-Video Engine</span>
            </div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill bg-accent-green text-ink-900 font-mono text-[11px] sm:text-xs font-extrabold border-2 border-ink-900 shadow-hard">
              <span>60fps Deterministic Render</span>
            </div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill bg-accent-yellow text-ink-900 font-mono text-[11px] sm:text-xs font-extrabold border-2 border-ink-900 shadow-hard">
              <span>Zero Watermarks</span>
            </div>
          </div>

          {/* Headline and Lead */}
          <div className="space-y-4 sm:space-y-6">
            <SplitReveal
              text="Turn Any Web Project Into A Cinema Promo Video."
              as="h1"
              className="display-huge text-ink-900 dark:text-white tracking-tight font-extrabold text-4xl sm:text-6xl lg:text-8xl"
            />
            <p className="text-lg sm:text-2xl text-ink-900 dark:text-[#dcd8d5] font-sans max-w-3xl font-bold leading-relaxed">
              Generate unwatermarked 60fps promo videos directly from your local codebase or live URL. Extract computed design tokens and true motion physics in seconds.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <MagneticButton
              onClick={scrollToShowcase}
              className="w-full sm:w-auto bg-ink-900 dark:bg-white text-white dark:text-ink-900 px-6 sm:px-8 py-3.5 sm:py-4 rounded-pill font-mono text-sm sm:text-base font-extrabold hover:bg-accent-pink dark:hover:bg-accent-pink dark:hover:text-white shadow-hard flex items-center justify-center gap-2.5 sm:gap-3 transition-all hover:scale-105"
            >
              <Film className="w-4 h-4 sm:w-5 sm:h-5 text-accent-yellow" />
              <span>Explore Video Showcase</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-accent-green" />
            </MagneticButton>

            <a
              href="#install"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-pill font-mono text-sm sm:text-base font-extrabold text-ink-900 dark:text-white bg-surface dark:bg-[#181412] hover:bg-white dark:hover:bg-[#24201d] border-2 border-ink-900 dark:border-white/20 transition-all shadow-hard text-center flex items-center justify-center"
            >
              $ /launch --help
            </a>
          </div>

          {/* Performance Highlights Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-6 sm:pt-8 border-t-2 border-ink-900 dark:border-white/20 text-xs font-mono font-extrabold text-ink-900 dark:text-white">
            <div className="flex items-center gap-3 bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 p-4 sm:p-5 rounded-2xl shadow-hard-pink">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-accent-pink flex-shrink-0" />
              <div>
                <div className="text-base sm:text-lg font-extrabold text-ink-900 dark:text-white">Computed Design Tokens</div>
                <div className="text-xs sm:text-sm text-ink-900 dark:text-[#dcd8d5] font-semibold mt-0.5">Extracts styles from real CSSOM</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 p-4 sm:p-5 rounded-2xl shadow-hard-green">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-accent-green flex-shrink-0" />
              <div>
                <div className="text-base sm:text-lg font-extrabold text-ink-900 dark:text-white">Sub-Pixel Kinetic Physics</div>
                <div className="text-xs sm:text-sm text-ink-900 dark:text-[#dcd8d5] font-semibold mt-0.5">Authentic cubic-bezier easing</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 p-4 sm:p-5 rounded-2xl shadow-hard-yellow">
              <CheckCircle2 className="w-6 h-6 text-accent-yellow flex-shrink-0" />
              <div>
                <div className="text-base sm:text-lg font-extrabold text-ink-900 dark:text-white">60fps Delivery Master</div>
                <div className="text-xs sm:text-sm text-ink-900 dark:text-[#dcd8d5] font-semibold mt-0.5">Baked frame 0 poster included</div>
              </div>
            </div>
          </div>
        </section>

        {/* Smooth Kinetic Marquee Ticker */}
        <MarqueeTicker />

        {/* Video Theater Showcase Section */}
        <section id="showcase" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3 border-b-2 border-ink-900 dark:border-white/20 pb-4 sm:pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent-pink text-white font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard">
                Productions
              </div>
              <h2 className="display-medium text-ink-900 dark:text-white">
                Showcase Video Theater
              </h2>
            </div>
            <div className="text-xs sm:text-sm font-mono font-extrabold text-ink-900 dark:text-white bg-surface dark:bg-[#181412] px-3 py-1 sm:px-4 sm:py-1.5 rounded-pill border border-ink-900 dark:border-white/20 self-start sm:self-auto">
              Select any production below to play in 4K / 60fps
            </div>
          </div>

          <VideoTheater />
        </section>

        {/* Dedicated Installation & Setup Section */}
        <section id="install" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
          <InstallSection />
        </section>

        {/* Engine Features Grid */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
          <FeaturesGrid />
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
          <WorkflowSection />
        </section>

        {/* CLI Simulator Section */}
        <section id="cli" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6 scroll-mt-20">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent-yellow text-ink-900 font-mono text-xs font-extrabold uppercase tracking-wider shadow-hard border-2 border-ink-900">
              Terminal
            </div>
            <h2 className="display-medium text-ink-900 dark:text-white">
              High-Precision Command Interface
            </h2>
            <p className="text-base sm:text-lg text-ink-900 dark:text-[#dcd8d5] font-sans max-w-xl font-bold">
              Run against local repositories or public URLs to generate deliverables in seconds.
            </p>
          </div>

          <CliSimulator />
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
          <FaqSection />
        </section>

        {/* Call to Action */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <CtaSection onWatchClick={scrollToShowcase} />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
