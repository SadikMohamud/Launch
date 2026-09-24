// Intro reveal.
//
// A camera slate holds the page while it loads, draws a progress ring, then
// wipes away and grows the page into place.
//
// Adapted from the supplied Launch-Loadscreen component, with three changes:
//
//   1. No click gate. The original waited on an "Action" button. This runs
//      straight through: once the intro has played and the page is genuinely
//      ready, the exit fires on its own.
//   2. Rethemed onto the graded tokens rather than the old pink and green.
//   3. The ring geometry is read after layout rather than on the first
//      frame, because getTotalLength on an unlaid-out SVG returns zero and
//      the ring then draws instantly.
//
// It plays once per browser session, never under reduced motion, and every
// inline style it sets is reverted when it unmounts so the navbar, cursor
// and canvas behave normally afterwards.

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// Two curves carry the whole sequence: a hard in-out and a softer glide.
CustomEase.create('launchHop', '0.9, 0, 0.1, 1');
CustomEase.create('launchGlide', '0.8, 0, 0.2, 1');

const SESSION_KEY = 'launch-reveal-seen';

const CLIP_FULL = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
const CLIP_GONE = 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)';

/** Never hold the visitor longer than this waiting for assets. */
const ASSET_WAIT_CAP_MS = 3500;

/** Decide on first render whether the reveal plays at all. */
function shouldPlay(oncePerSession: boolean): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (!oncePerSession) return true;

  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    // Storage can be blocked. Playing the reveal is the safe default.
    return true;
  }
}

/** Resolve when fonts and the load event are done, or at the cap. */
function waitForAssets(): Promise<void> {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const load =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          window.addEventListener('load', () => resolve(), { once: true })
        );

  return Promise.race([
    Promise.all([fonts, load]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, ASSET_WAIT_CAP_MS)),
  ]);
}

/** A line of text that slides up out of a mask. */
const MaskLine: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <span className={`block overflow-hidden ${className}`}>
    <span data-line className="block will-change-transform">
      {children}
    </span>
  </span>
);

interface PageRevealProps {
  children: React.ReactNode;
  onComplete?: () => void;
  oncePerSession?: boolean;
}

export const PageReveal: React.FC<PageRevealProps> = ({
  children,
  onComplete,
  oncePerSession = true,
}) => {
  const [active, setActive] = useState(() => shouldPlay(oncePerSession));

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGCircleElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) onCompleteRef.current?.();
  }, [active]);

  useLayoutEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    let cancelled = false;

    html.style.overflow = 'hidden';
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const ctx = gsap.context(() => {
      const track = trackRef.current;
      const progress = progressRef.current;
      const stage = stageRef.current;
      if (!track || !progress || !stage) return;

      const ringLength = track.getTotalLength();

      gsap.set([track, progress], { strokeDasharray: ringLength, strokeDashoffset: ringLength });
      gsap.set('[data-line]', { yPercent: 100 });
      gsap.set(stage, {
        scale: 0.78,
        transformOrigin: `50% ${window.innerHeight / 2}px`,
        height: '100svh',
        overflow: 'hidden',
      });

      const intro = gsap.timeline({ delay: 0.35 });
      intro
        .to('[data-slate-text] [data-line]', {
          yPercent: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.07,
        })
        .to(track, { strokeDashoffset: 0, duration: 1.6, ease: 'launchHop' }, '<')
        .to('[data-rings]', { rotation: 270, duration: 1.6, ease: 'launchHop' }, '<');

      // The progress ring steps rather than sweeping, so it reads as work
      // being done. The steps are fixed, not random: a reveal that differs
      // on every load cannot be snapshot tested.
      for (const [index, stop] of [0.24, 0.41, 0.83].entries()) {
        intro.to(progress, {
          strokeDashoffset: ringLength * (1 - stop),
          duration: 0.55,
          ease: 'launchGlide',
          delay: index === 0 ? 0.2 : 0.22,
        });
      }

      const introDone = new Promise<void>((resolve) =>
        intro.eventCallback('onComplete', () => resolve())
      );

      // No button. Once the intro has played and the page is ready, the
      // ring completes and the exit runs straight away.
      Promise.all([introDone, waitForAssets()]).then(() => {
        if (cancelled) return;

        ctx.add(() => {
          gsap
            .timeline({ onComplete: finish })
            .to(progress, { strokeDashoffset: 0, duration: 0.5, ease: 'launchGlide' })
            .to('[data-mark]', { scale: 1.15, duration: 0.4, ease: 'launchHop' }, '-=0.2')
            .to('[data-label] [data-line]', { yPercent: 0, duration: 0.5, ease: 'power3.out' }, '-=0.35')
            .to({}, { duration: 0.25 })
            .to('[data-slate]', { scale: 0.78, duration: 1, ease: 'launchHop' })
            .to([track, progress], { strokeDashoffset: -ringLength, duration: 1, ease: 'launchHop' }, '<')
            .to('[data-label] [data-line]', { yPercent: -100, duration: 0.55, ease: 'power3.out' }, '<')
            .to('[data-slate]', { clipPath: CLIP_GONE, duration: 1.15, ease: 'launchHop' }, '-=0.25')
            .to('[data-revealer]', { clipPath: CLIP_GONE, duration: 1.15, ease: 'launchHop' }, '<0.06')
            .to(stage, { scale: 1, duration: 1, ease: 'launchHop' }, '-=0.75');
        });
      });
    }, rootRef);

    function finish() {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // Storage blocked: the reveal simply plays again next session.
      }
      html.style.overflow = previousOverflow;
      setActive(false);
    }

    return () => {
      cancelled = true;
      ctx.revert();
      html.style.overflow = previousOverflow;
    };
  }, [active]);

  return (
    <div ref={rootRef}>
      {/* Slate margin content, visible around the shrunken page. */}
      {active && (
        <div
          aria-hidden
          className="mono fixed inset-0 z-0 flex flex-col justify-between bg-canvas text-[11px] font-medium uppercase tracking-[0.16em] text-muted"
        >
          <div className="flex justify-between p-5 sm:p-6">
            <span>Launch</span>
            <span className="hidden sm:block">Capture / computed tokens</span>
            <span className="hidden sm:block">Poster / frame zero</span>
            <span>London</span>
          </div>
          <div className="flex items-end justify-between p-5 sm:p-6">
            <span>60 fps</span>
            <span className="hidden sm:block">Deterministic render</span>
            <span className="hidden sm:block">No watermark</span>
            <span>Take 01</span>
          </div>
        </div>
      )}

      {/* The page itself, shrunk into a card while the slate is up. */}
      <div ref={stageRef} className="relative z-[1]" aria-hidden={active || undefined}>
        {children}
        {active && (
          <div
            data-revealer
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-[60] h-[100svh] bg-film"
            style={{ clipPath: CLIP_FULL }}
          />
        )}
      </div>

      {/* The slate. */}
      {active && (
        <div
          data-slate
          role="status"
          aria-label="Loading"
          className="mono fixed inset-0 z-[100] flex flex-col justify-between bg-[#050308] text-[11px] font-medium uppercase tracking-[0.16em] text-ink will-change-transform sm:text-xs"
          style={{ clipPath: CLIP_FULL }}
        >
          <div data-slate-text className="flex justify-between p-5 sm:p-6">
            <MaskLine>Warming up</MaskLine>
            <MaskLine className="text-signal">Scene 01</MaskLine>
          </div>

          <div data-slate-text className="flex items-end justify-between p-5 sm:p-6">
            <div className="flex gap-10 sm:gap-24">
              <div className="space-y-1">
                <MaskLine>Capture</MaskLine>
                <MaskLine className="text-muted">Tokens and motion</MaskLine>
              </div>
              <div className="hidden space-y-1 sm:block">
                <MaskLine>Render</MaskLine>
                <MaskLine className="text-muted">60 fps master</MaskLine>
              </div>
            </div>
            <MaskLine className="text-film">LX-01</MaskLine>
          </div>

          {/* Centre: the mark, the ring, and the label. */}
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 sm:h-80 sm:w-80">
            <span
              data-mark
              className="display absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center bg-film text-2xl text-[#050308]"
            >
              /
            </span>

            <span
              data-label
              className="absolute left-1/2 top-[calc(50%+4.5rem)] -translate-x-1/2 text-[11px] text-signal"
            >
              <MaskLine>Rolling</MaskLine>
            </span>

            <span data-rings className="absolute inset-0 block will-change-transform">
              <svg viewBox="0 0 320 320" fill="none" className="h-full w-full" aria-hidden>
                <circle ref={trackRef} cx="160" cy="160" r="155" stroke="rgba(246,244,248,0.16)" strokeWidth="2" />
                <circle ref={progressRef} cx="160" cy="160" r="155" stroke="var(--film)" strokeWidth="2" />
              </svg>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
