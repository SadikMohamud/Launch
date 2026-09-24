// Hero.
//
// A film the engine rendered plays behind the wordmark, dimmed and graded so
// the colour bleeds up into the type. That is the whole argument of the
// product made visually: the page is lit by its own output.
//
// The film is decorative, so it is muted, inert, hidden from assistive
// technology, and replaced by its own poster when the visitor has asked for
// reduced motion or is on a touch device, where a looping background video
// is an expensive way to say very little.

import React, { useEffect, useRef } from 'react';
import { useReveal, usePrefersReducedMotion, useIsTouch } from '../hooks/useMotion.ts';

/** The two commands a first time user actually types. */
const COMMANDS = ['launch https://your-site.com', 'launch doctor'];

export const HeroSection: React.FC = () => {
  const ref = useReveal<HTMLDivElement>(0.05);
  const reduced = usePrefersReducedMotion();
  const isTouch = useIsTouch();
  const wordmarkRef = useRef<HTMLHeadingElement>(null);

  // The wordmark is above the fold, so it opens on mount rather than
  // waiting for an intersection that has already happened.
  useEffect(() => {
    const element = wordmarkRef.current;
    if (!element || reduced) return;

    const frame = requestAnimationFrame(() => {
      element.style.clipPath = 'inset(0 0 -10% 0)';
    });

    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const playFilm = !reduced && !isTouch;

  return (
    <header className="tint-film relative overflow-hidden pb-[clamp(2rem,4vw,3rem)] pt-[clamp(3rem,7vw,6rem)]">
      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {playFilm ? (
          <video
            className="h-full w-full object-cover opacity-[0.28]"
            src="/videos/luminaryhouse-launch.mp4"
            poster="/videos/luminaryhouse.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            className="h-full w-full object-cover opacity-[0.22]"
            src="/videos/luminaryhouse.jpg"
            alt=""
          />
        )}

        {/* Graded veil. The film is pushed towards the page's own palette so
            it reads as lighting rather than as an embedded video. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, var(--canvas) 0%, color-mix(in oklab, var(--canvas) 72%, transparent) 38%, var(--canvas) 96%), radial-gradient(70% 60% at 18% 30%, color-mix(in oklab, var(--film) 30%, transparent) 0%, transparent 72%), radial-gradient(60% 50% at 88% 12%, color-mix(in oklab, var(--flare) 20%, transparent) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="wrap">
        <p className="eyebrow">
          v1.0.0 <span className="text-muted">·</span> macOS, Windows, Ubuntu
        </p>

        {/* The wordmark is deliberately NOT split into per character masks.
            display-graded paints the gradient with background-clip: text,
            and each mask in SplitReveal creates its own stacking context
            (overflow hidden plus a transform), which an ancestor's clipped
            background cannot paint through. The result is transparent
            glyphs over nothing: an invisible heading.

            So it reveals with a clip-path on the heading itself. That keeps
            the gradient intact, needs no inner elements, and animates a
            single compositable property. */}
        <h1
          ref={wordmarkRef}
          className="display display-graded mt-6 text-hero uppercase"
          style={{
            marginLeft: '-0.012em',
            clipPath: reduced ? 'none' : 'inset(0 0 105% 0)',
            transition: 'clip-path 900ms var(--ease-signal)',
          }}
        >
          Launch
        </h1>

        <div ref={ref} className="reveal">
          <p className="mt-7 max-w-lead text-[clamp(1rem,1.5vw,1.35rem)] text-ink/85">
            One command turns any website or local project into a finished promo film. It reads the
            site&rsquo;s real colours, type and motion, uses the site&rsquo;s own footage, and
            renders an unwatermarked MP4.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              {COMMANDS.map((command) => (
                <code
                  key={command}
                  className="mono flex items-center gap-3 border border-line bg-surface/70 px-[1.1rem] py-[0.85rem] text-[0.85rem] backdrop-blur-sm"
                >
                  <span className="text-accent">$</span>
                  {command}
                </code>
              ))}
            </div>

            <p className="mono text-ui uppercase tracking-[0.14em] text-muted">
              <span className="text-ink">1920&times;1080</span> · 60fps · H.264 ·{' '}
              <span className="text-ink">no watermark</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
