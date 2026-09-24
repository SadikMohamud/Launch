// The Launch landing page.
//
// The section order tells one story: what it does today, proof it does it,
// how to get it, what is coming, and how to be told when it arrives.
//
// Smooth scroll is opt-in rather than default. It runs only on a fine
// pointer and only when the visitor has not asked for reduced motion, and
// the heavy background canvas is loaded lazily so it never sits on the
// critical path.

import React, { Suspense, lazy, useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Navbar } from "./components/Navbar.tsx";
import { HeroSection } from "./components/HeroSection.tsx";
import { ProofTheatre } from "./components/ProofTheatre.tsx";
import { PinnedProcess } from "./components/PinnedProcess.tsx";
import { ColourBand } from "./components/ColourBand.tsx";
import { InstallSection } from "./components/InstallSection.tsx";
import { CapabilityGrid } from "./components/CapabilityGrid.tsx";
import { CliSimulator } from "./components/CliSimulator.tsx";
import { PlatformSection } from "./components/PlatformSection.tsx";
import { FaqSection } from "./components/FaqSection.tsx";
import { Footer } from "./components/Footer.tsx";
import { MarqueeTicker } from "./components/MarqueeTicker.tsx";
import { CustomCursor } from "./mechanics/CustomCursor.tsx";
import { usePrefersReducedMotion, useIsTouch } from "./hooks/useMotion.ts";
import { SectionTransitionProvider } from "./mechanics/SectionTransition.tsx";

// The WebGL field is the single heaviest thing on the page, so it is split
// into its own chunk and only requested once the rest has rendered.
const HugeCanvas = lazy(() =>
  import("./mechanics/HugeCanvas.tsx").then((module) => ({
    default: module.HugeCanvas,
  })),
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

    // Lenis owns the scroll position, so ScrollTrigger has to be updated
    // from it. Without this a pinned section measures against the native
    // scroll value that Lenis has already moved away from, and the pin
    // drifts by however far the smoothing is behind.
    gsap.registerPlugin(ScrollTrigger);
    lenis.on("scroll", ScrollTrigger.update);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // A pin measured before the fonts land is measured against the wrong
    // height, so the trigger is refreshed once they have settled.
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, [isTouch, reducedMotion]);

  const showAmbient = !reducedMotion && !isTouch;

  return (
    <SectionTransitionProvider>
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

          <ColourBand
            tint="film"
            label="What you get"
            drift="LAUNCH"
            lines={["No timeline.", "No watermark.", "One command."]}
          />

          <MarqueeTicker />
          <PinnedProcess />
          <InstallSection />
          <CapabilityGrid />
          <CliSimulator />

          <ColourBand
            tint="flare"
            label="Coming next"
            drift="PLATFORM"
            lines={["Everything the engine does,", "in your browser."]}
          />

          <PlatformSection />
          <FaqSection />
        </main>

        <Footer />
      </div>
    </SectionTransitionProvider>
  );
};
