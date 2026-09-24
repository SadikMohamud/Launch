// Full bleed colour moment.
//
// The backdrop behind body copy has to stay restrained, because a
// saturated field under small text cannot also pass WCAG AA. hugeinc.com
// (MiMic 140) and k95.it (MiMic 220) both solve that the same way: the
// bold colour lives in dedicated full bleed bands with nothing but display
// type on them, and the reading sections stay calm.
//
// This is that band. The type sits directly on the fill rather than over
// the backdrop, so the contrast pair is text against a known solid colour,
// which measures 5.33:1 for the extracted magenta with the canvas colour on
// top. The saturation costs nothing in legibility.
//
// Studied: "Awwwards Pack/+57 Scroll Animation/31/code.zip" for driving
// transforms from scroll progress rather than from a clock, and the
// supplied Launch-Loadscreen for the clip-path wipe shape. Ours scrubs a
// parallax offset and a mask against the band's own scroll range, and it
// holds still entirely under reduced motion.

import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from '../hooks/useMotion.ts';

gsap.registerPlugin(ScrollTrigger);

interface ColourBandProps {
  /** Which graded light fills the band. */
  tint: 'film' | 'flare' | 'signal';
  /** The statement. Kept short: this is a held breath, not a paragraph. */
  lines: string[];
  /** Small label above the statement. */
  label: string;
  /** Repeated word that drifts across behind the statement. */
  drift: string;
}

export const ColourBand: React.FC<ColourBandProps> = ({ tint, lines, label, drift }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return;

    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // The drift track moves across as the band passes, which gives the
      // colour somewhere to go without animating on a clock.
      gsap.to('[data-drift]', {
        xPercent: -28,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      });

      // The statement rises slightly slower than the page, the standard
      // parallax offset that makes a band feel like a layer rather than a
      // block of colour.
      gsap.fromTo(
        '[data-statement]',
        { yPercent: 14 },
        {
          yPercent: -10,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      // Full bleed: the band breaks out of the page container entirely.
      className={`tint-${tint} relative isolate overflow-hidden`}
      style={{ background: 'var(--accent)' }}
    >
      {/* A second light across the fill so it is graded rather than flat. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(75% 120% at 88% 10%, color-mix(in oklab, var(--canvas) 42%, transparent) 0%, transparent 62%)',
        }}
      />

      {/* The drifting word. Decorative, and deliberately clipped by the
          band so it reads as a passing layer. */}
      <div
        aria-hidden="true"
        data-drift
        className="display pointer-events-none absolute left-0 top-1/2 -z-10 flex -translate-y-1/2 gap-10 whitespace-nowrap opacity-[0.16]"
        style={{ fontSize: 'clamp(6rem, 18vw, 17rem)', color: 'var(--accent-ink)' }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index}>{drift}</span>
        ))}
      </div>

      <div className="wrap py-[clamp(5rem,14vw,11rem)]">
        <div data-statement>
          <p
            className="mono text-ui uppercase tracking-[0.2em]"
            style={{ color: 'color-mix(in oklab, var(--accent-ink) 72%, transparent)' }}
          >
            {label}
          </p>

          <h2
            className="display mt-6 text-[clamp(2.4rem,6.6vw,6rem)]"
            style={{ color: 'var(--accent-ink)' }}
          >
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
        </div>
      </div>
    </section>
  );
};
