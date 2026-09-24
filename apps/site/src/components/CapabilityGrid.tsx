// Capabilities.
//
// One cell per shipped flag. If a flag is ever removed from the CLI it must
// be removed from here on the same day: this grid is the page's main promise
// about what the tool does, and the README, the skill file and this list are
// required to agree.

import React from 'react';
import { ScrollWordReveal } from '../mechanics/ScrollWordReveal.tsx';
import { useReveal, staggerDelay } from '../hooks/useMotion.ts';

interface Capability {
  flag: string;
  title: string;
  body: string;
}

const CAPABILITIES: Capability[] = [
  {
    flag: '--format',
    title: 'Landscape, vertical, square',
    body: '1920×1080, 1080×1920 or 1080×1080, all from the same capture.',
  },
  {
    flag: '--long',
    title: 'Extended cut',
    body: 'Around 45 seconds, drawing on more of the site’s work and published figures.',
  },
  {
    flag: '--duration',
    title: 'Any length, 8 to 90s',
    body: 'The scene sequence rescales so the film is exactly as long as you asked for.',
  },
  {
    flag: '--tokens-only',
    title: 'Design tokens, no film',
    body: 'Writes the measured colour, typography, spacing and motion as JSON, with the stills.',
  },
  {
    flag: '--quality draft',
    title: 'Fast iteration',
    body: 'A lower bitrate pass for checking the edit before committing to a final render.',
  },
  {
    flag: '--json',
    title: 'Built for CI',
    body: 'A machine readable result on stdout, with a distinct exit code per failure class.',
  },
];

export const CapabilityGrid: React.FC = () => {
  const ref = useReveal<HTMLDivElement>(0.12);

  return (
    <section id="capabilities" className="wrap scroll-mt-24 py-section tint-film wash">
      <div className="flex flex-col gap-[1.1rem]">
        <p className="eyebrow">Flags</p>
        <ScrollWordReveal
          as="h2"
          className="display max-w-prose text-display"
          text="Everything it ships with."
        />
        <div className="rule-accent" />
      </div>

      <div ref={ref} className="mt-14 grid gap-[1px] bg-line sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((capability, index) => (
          <article
            key={capability.flag}
            className="reveal bg-canvas px-7 py-8"
            style={{ transitionDelay: staggerDelay(index) }}
          >
            <p className="mono text-[0.72rem] text-accent">{capability.flag}</p>
            <h3 className="mt-2 text-base font-semibold">{capability.title}</h3>
            <p className="mt-2 text-[0.88rem] text-muted">{capability.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
