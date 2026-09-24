// Frequently asked questions.
//
// Built on <details> and <summary> rather than a hand rolled accordion, so
// it is keyboard operable, announced correctly by screen readers, and
// findable with the browser's own find-in-page, none of which the previous
// div based version managed.

import React from 'react';
import { Plus } from 'lucide-react';
import { ScrollWordReveal } from '../mechanics/ScrollWordReveal.tsx';
import { useReveal, staggerDelay } from '../hooks/useMotion.ts';

const QUESTIONS = [
  {
    question: 'Does it need FFmpeg installed?',
    answer:
      'No. A build ships with the engine. If you already have FFmpeg on your PATH it uses yours instead, and launch doctor tells you which one is in use.',
  },
  {
    question: 'Is the output watermarked?',
    answer:
      'Never. The films, posters and token files you render are yours, royalty free, with no attribution requirement.',
  },
  {
    question: 'How long does a render take?',
    answer:
      'About two minutes for a 20 second landscape film on a recent laptop, including the time spent capturing the site. Most of that is waiting for the page rather than rendering.',
  },
  {
    question: 'Does it work on a local project?',
    answer:
      'Yes. Point it at a folder and it detects the development server command, starts it, waits for the port, captures, then shuts the whole process tree down, including after Ctrl+C.',
  },
  {
    question: 'What happens to my site’s video and images?',
    answer:
      'They are downloaded to a temporary folder, used in the film, and the folder is deleted when the render finishes. Nothing is uploaded anywhere.',
  },
  {
    question: 'Which operating systems are supported?',
    answer:
      'macOS, Windows and Ubuntu, on Node 22 or newer. The installer checks every dependency and prints the exact fix command for your platform.',
  },
];

export const FaqSection: React.FC = () => {
  const ref = useReveal<HTMLDivElement>(0.1);

  return (
    <section id="faq" className="wrap scroll-mt-24 py-section tint-signal">
      <div className="flex flex-col gap-[1.1rem]">
        <p className="eyebrow">Questions</p>
        <ScrollWordReveal
          as="h2"
          className="display max-w-prose text-display"
          text="Before you install."
        />
        <div className="rule-accent" />
      </div>

      <div ref={ref} className="mt-14 border-t border-line">
        {QUESTIONS.map((item, index) => (
          <details
            key={item.question}
            className="reveal group border-b border-line"
            style={{ transitionDelay: staggerDelay(index) }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[1.05rem] font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus
                aria-hidden="true"
                className="h-4 w-4 flex-shrink-0 text-accent transition-transform duration-signal ease-signal group-open:rotate-45"
              />
            </summary>
            <p className="max-w-prose pb-6 text-[0.9rem] text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
};
