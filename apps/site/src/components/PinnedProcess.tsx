// Pinned process.
//
// Studied: "Awwwards Pack/+57 Scroll Animation/31/code.zip"
// (src/dual-wave/DualWaveAnimation.js), which builds a ScrollTrigger from
// "top bottom" to "bottom top" over a wrapper, recalculates its ranges on
// resize, and drives transforms from the scroll progress rather than from
// a clock. Cross-checked against k95.it (MiMic 220), which pins its team
// section across 8.43vh of scroll and scrubs clip-path, scale and rotate.
//
// What we took: the pin-and-scrub structure, and recomputing measurements
// on resize instead of caching them for the life of the page.
//
// What we changed: the pack component scrubs a decorative wave of repeated
// text. Ours scrubs the actual explanation of the product, so the section
// earns the three screens of scroll it takes. It also degrades to a plain
// stacked list under reduced motion, where pinning the viewport would be
// hostile, and it tears the trigger down on unmount rather than leaving it
// bound to a dead element.

import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from '../hooks/useMotion.ts';
import { ScrollWordReveal } from '../mechanics/ScrollWordReveal.tsx';

gsap.registerPlugin(ScrollTrigger);

interface Stage {
  number: string;
  title: string;
  body: string;
  tint: string;
  /** The measured artefact this stage produces. */
  artefact: React.ReactNode;
}

/** Colours the engine actually extracted from luminaryhouse.co.uk. */
const EXTRACTED = ['#ee3390', '#0b0a0d', '#f2f2f2', '#8b1e23', '#c5b09d'];

/** The scenes the engine actually composed for that site. */
const SCENES = ['hero', 'statement', 'case-study', 'stats', 'closing'];

const STAGES: Stage[] = [
  {
    number: '01',
    title: 'Capture',
    tint: 'tint-signal',
    body:
      'Opens the page, waits for fonts and lazily loaded images to settle, then measures colour by the area it actually paints, the type scale, the spacing rhythm and the transition curves the site declares.',
    artefact: (
      <div className="flex flex-wrap gap-2" data-artefact>
        {EXTRACTED.map((hex) => (
          <div key={hex} className="flex flex-col gap-2" data-swatch>
            <div
              className="h-20 w-20 border border-line sm:h-24 sm:w-24"
              style={{ background: hex }}
            />
            <span className="mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">{hex}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: '02',
    title: 'Compose',
    tint: 'tint-flare',
    body:
      'Reads what the page says, not only how it looks, then builds a scene sequence from the site’s own hero film and photography rather than from screenshots of it.',
    artefact: (
      <div className="flex flex-wrap gap-2" data-artefact>
        {SCENES.map((scene, index) => (
          <div
            key={scene}
            data-swatch
            className="flex min-w-[7.5rem] flex-col gap-1 border border-line bg-surface px-4 py-3"
          >
            <span className="mono text-[0.6rem] text-accent">{String(index + 1).padStart(2, '0')}</span>
            <span className="mono text-[0.7rem] uppercase tracking-[0.1em]">{scene}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: '03',
    title: 'Render',
    tint: 'tint-film',
    body:
      'Validates the composition, then renders H.264 at 30 or 60fps with a matching poster frame and a tokens file recording everything that was measured.',
    artefact: (
      <div className="flex flex-wrap gap-2" data-artefact>
        {[
          ['1920×1080', 'landscape'],
          ['60fps', 'exact'],
          ['yuv420p', 'bt709'],
          ['20.000s', 'as asked'],
        ].map(([value, label]) => (
          <div
            key={value}
            data-swatch
            className="flex min-w-[8.5rem] flex-col gap-1 border border-line bg-surface px-4 py-3"
          >
            <span className="mono text-[0.85rem] text-accent">{value}</span>
            <span className="mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">{label}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export const PinnedProcess: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    // Pinning the viewport is exactly what someone asking for reduced
    // motion does not want, so the stacked fallback is left alone.
    if (reduced) return;

    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('[data-panel]');
      const bars = gsap.utils.toArray<HTMLElement>('[data-bar]');

      // Only the first panel is visible at rest.
      gsap.set(panels.slice(1), { autoAlpha: 0, yPercent: 8 });
      gsap.set(bars.slice(1), { scaleX: 0 });
      gsap.set(bars[0], { scaleX: 1 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          // One viewport of scroll per handover, which is what makes the
          // scrub feel proportionate rather than rushed.
          end: () => `+=${window.innerHeight * (panels.length - 1)}`,
          pin: stage,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      for (let index = 1; index < panels.length; index++) {
        timeline
          .to(panels[index - 1], { autoAlpha: 0, yPercent: -8, duration: 0.5, ease: 'none' })
          .to(bars[index - 1], { scaleX: 0.25, duration: 0.5, ease: 'none' }, '<')
          .to(panels[index], { autoAlpha: 1, yPercent: 0, duration: 0.5, ease: 'none' }, '<0.15')
          .to(bars[index], { scaleX: 1, duration: 0.5, ease: 'none' }, '<')
          .from(
            panels[index].querySelectorAll('[data-swatch]'),
            { yPercent: 30, autoAlpha: 0, duration: 0.4, stagger: 0.05, ease: 'none' },
            '<'
          );
      }
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  // Reduced motion: a plain stacked list, no pin, no scrub.
  if (reduced) {
    return (
      <section id="how" className="wrap tint-flare scroll-mt-24 py-section">
        <p className="eyebrow">How it works</p>
        <h2 className="display mt-4 max-w-prose text-display">Three stages, no timeline to learn.</h2>
        <div className="rule-accent mt-4" />

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STAGES.map((stage) => (
            <article key={stage.number} className={stage.tint}>
              <p className="mono text-ui tracking-[0.16em] text-accent">{stage.number}</p>
              <h3 className="display mt-3 text-title">{stage.title}</h3>
              <p className="mt-3 text-[0.92rem] text-muted">{stage.body}</p>
              <div className="mt-6">{stage.artefact}</div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} id="how" className="tint-flare relative scroll-mt-24">
      <div ref={stageRef} className="flex min-h-[100svh] flex-col justify-center py-section">
        <div className="wrap">
          <p className="eyebrow">How it works</p>

          <ScrollWordReveal
            as="h2"
            className="display mt-4 max-w-prose text-display"
            text="Three stages, no timeline to learn."
          />

          {/* Progress bars, one per stage. */}
          <div className="mt-10 flex gap-2" aria-hidden="true">
            {STAGES.map((stage) => (
              <div key={stage.number} className="h-[2px] w-16 bg-line">
                <div data-bar className="h-full w-full origin-left bg-accent" />
              </div>
            ))}
          </div>

          {/* The panels are stacked so the pinned stage never changes
              height as they swap, which would make the pin jump. */}
          <div className="relative mt-10 min-h-[22rem]">
            {STAGES.map((stage) => (
              <article
                key={stage.number}
                data-panel
                className={`absolute inset-0 ${stage.tint}`}
              >
                <p className="mono text-ui tracking-[0.16em] text-accent">{stage.number}</p>
                <h3
                  className="display mt-3 text-title"
                  style={{ fontVariationSettings: "'wdth' 110, 'wght' 600" }}
                >
                  {stage.title}
                </h3>
                <p className="mt-3 max-w-prose text-[0.95rem] text-muted">{stage.body}</p>
                <div className="mt-8">{stage.artefact}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
