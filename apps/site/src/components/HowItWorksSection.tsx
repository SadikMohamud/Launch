// How it works.
//
// Three stages, named after what the engine actually does. Every claim here
// is something the CLI performs. Nothing on this page describes a feature
// that does not exist.

import React from 'react';
import { ScrollWordReveal } from '../mechanics/ScrollWordReveal.tsx';
import { useReveal, staggerDelay } from '../hooks/useMotion.ts';

const STAGES = [
  {
    number: '01',
    title: 'Capture',
    body:
      'Opens the page, waits for fonts and lazily loaded images to settle, then measures colour by the area it actually paints, the type scale, the spacing rhythm, and the transition curves the site itself declares.',
  },
  {
    number: '02',
    title: 'Compose',
    body:
      'Reads what the page says, not only how it looks: the headline, supporting statements, published figures and the call to action. Scenes are built from the site’s own hero film and photography rather than screenshots of it.',
  },
  {
    number: '03',
    title: 'Render',
    body:
      'Validates the composition, then renders H.264 at 30 or 60fps with a matching poster frame and a tokens file recording everything that was measured.',
  },
];

export const HowItWorksSection: React.FC = () => {
  const ref = useReveal<HTMLDivElement>(0.15);

  return (
    <section id="how" className="wrap scroll-mt-24 py-section tint-flare wash">
      <div className="flex flex-col gap-[1.1rem]">
        <p className="eyebrow">How it works</p>
        <ScrollWordReveal
          as="h2"
          className="display max-w-prose text-display"
          text="Three stages, no timeline to learn."
        />
        <div className="rule-accent" />
      </div>

      <div ref={ref} className="mt-14 grid gap-[1px] border-t border-line bg-line md:grid-cols-3">
        {STAGES.map((stage, index) => (
          <article
            key={stage.number}
            className="reveal bg-canvas px-7 py-9"
            style={{ transitionDelay: staggerDelay(index) }}
          >
            <p className="mono text-ui tracking-[0.16em] text-accent">{stage.number}</p>
            <h3
              className="display mt-4 text-title"
              style={{ fontVariationSettings: "'wdth' 110, 'wght' 600" }}
            >
              {stage.title}
            </h3>
            <p className="mt-3 text-[0.92rem] text-muted">{stage.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
