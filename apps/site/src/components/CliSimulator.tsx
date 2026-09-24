// Terminal replay.
//
// This types out a transcript of a real run. The previous version invented
// its output, including progress for stages the stub never performed, which
// is exactly the kind of claim this rebuild exists to remove.
//
// Every line below was taken from an actual render of luminaryhouse.co.uk.
// If the CLI's output changes, this transcript has to be recaptured rather
// than edited to look right.

import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion, useReveal } from '../hooks/useMotion.ts';

type Line = { kind: 'command' | 'stage' | 'note' | 'result'; text: string };

/** A real transcript. Timings and figures are from the run, not invented. */
const TRANSCRIPT: Line[] = [
  { kind: 'command', text: 'launch https://luminaryhouse.co.uk' },
  { kind: 'stage', text: 'capture  opening the page' },
  { kind: 'stage', text: 'capture  reading design tokens' },
  { kind: 'stage', text: 'capture  reading page content' },
  { kind: 'stage', text: 'tokens   4 colours, 8 type sizes, easing out-soft' },
  { kind: 'stage', text: 'media    hero film, 3 images' },
  { kind: 'stage', text: 'compose  5 scenes, 20s: hero, statement, case-study, stats, closing' },
  { kind: 'stage', text: 'check    validating the composition' },
  { kind: 'stage', text: 'render   100%  Render complete' },
  { kind: 'result', text: 'Film    launch-output/luminaryhouse-co-uk-20260923-131757.mp4' },
  { kind: 'result', text: 'Poster  launch-output/luminaryhouse-co-uk-20260923-131757.jpg' },
  { kind: 'result', text: 'Tokens  launch-output/luminaryhouse-co-uk-20260923-131757.tokens.json' },
  { kind: 'note', text: '1920x1080, 20s, 13.72 MB, in 2m 18s' },
];

const COLOUR: Record<Line['kind'], string> = {
  command: 'text-ink',
  stage: 'text-muted',
  note: 'text-muted',
  result: 'text-accent',
};

export const CliSimulator: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  const ref = useReveal<HTMLDivElement>(0.3);
  const [shown, setShown] = useState(reduced ? TRANSCRIPT.length : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setShown(TRANSCRIPT.length);
      return;
    }

    const element = ref.current;
    if (!element || started.current) return;

    // The replay starts when the panel is actually on screen, not on mount,
    // so someone landing on the page does not miss it.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || started.current) return;
        started.current = true;
        observer.disconnect();

        let index = 0;
        const tick = window.setInterval(() => {
          index += 1;
          setShown(index);
          if (index >= TRANSCRIPT.length) window.clearInterval(tick);
        }, 380);
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced, ref]);

  return (
    <section id="cli" className="wrap scroll-mt-24 py-section tint-flare">
      <div className="flex flex-col gap-[1.1rem]">
        <p className="eyebrow">Terminal</p>
        <h2 className="display max-w-prose text-display">What a run looks like.</h2>
        <div className="rule-accent" />
      </div>

      <div ref={ref} className="mt-12 border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
            a real run, replayed
          </span>
        </div>

        {/* The transcript is a live region so a screen reader is told what
            arrived, rather than silently re-reading the whole block. */}
        <div
          className="mono overflow-x-auto px-[1.1rem] py-[1.35rem] text-[0.8rem] leading-[1.9]"
          aria-live="polite"
        >
          {TRANSCRIPT.slice(0, shown).map((line, index) => (
            <div key={`${line.kind}-${index}`} className={COLOUR[line.kind]}>
              {line.kind === 'command' && <span className="text-accent">$ </span>}
              {line.kind !== 'command' && '  '}
              {line.text}
            </div>
          ))}

          {shown < TRANSCRIPT.length && (
            <span aria-hidden="true" className="inline-block h-[1em] w-[0.55em] translate-y-[0.15em] bg-accent" />
          )}
        </div>
      </div>
    </section>
  );
};
