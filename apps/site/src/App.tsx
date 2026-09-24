// The Launch landing page.
//
// The section order tells one story: what it does today, proof it does it,
// how to get it, what is coming, and how to be told when it arrives.
//
// Smooth scroll is opt-in rather than default. It runs only on a fine
// pointer and only when the visitor has not asked for reduced motion, and
// the heavy background canvas is loaded lazily so it never sits on the
// critical path.

import React, { Suspense, lazy, useEffect } from 'react';
import Lenis from 'lenis';

import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ProofTheatre } from './components/ProofTheatre.tsx';
import { HowItWorksSection } from './components/HowItWorksSection.tsx';
import { InstallSection } from './components/InstallSection.tsx';
import { CapabilityGrid } from './components/CapabilityGrid.tsx';
import { CliSimulator } from './components/CliSimulator.tsx';
import { PlatformSection } from './components/PlatformSection.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { Footer } from './components/Footer.tsx';
import { MarqueeTicker } from './components/MarqueeTicker.tsx';
import { CustomCursor } from './mechanics/CustomCursor.tsx';
import { usePrefersReducedMotion, useIsTouch } from './hooks/useMotion.ts';

// The WebGL field is the single heaviest thing on the page, so it is split
// into its own chunk and only requested once the rest has rendered.
const HugeCanvas = lazy(() =>
  import('./mechanics/HugeCanvas.tsx').then((module) => ({ default: module.HugeCanvas }))
);

export const App: React.FC = () => {
  const reducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouch();

  useEffect(() => {
    // Touch platforms already have momentum scrolling of their own, and
    // hijacking it makes a page feel worse rather than better. Reduced
    // motion rules it out entirely.
    if (isTouch || reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [isTouch, reducedMotion]);

  const showAmbient = !reducedMotion && !isTouch;

  return (
    <div className="grain flex min-h-screen flex-col bg-canvas text-ink">
      {/* Keyboard users get a way past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-ui focus:uppercase focus:text-accent-ink"
      >
        Skip to content
      </a>

      {showAmbient && <CustomCursor />}

      {showAmbient && (
        <Suspense fallback={null}>
          <HugeCanvas />
        </Suspense>
      )}

      <Navbar />

      <main id="main" className="flex-grow">
        <HeroSection />
        <ProofTheatre />
        <MarqueeTicker />
        <HowItWorksSection />
        <InstallSection />
        <CapabilityGrid />
        <CliSimulator />
        <PlatformSection />
        <FaqSection />
      </main>

      <Footer />
    </div>
  );
};
