// Masked text reveal.
//
// Studied: "Awwwards Pack/+14 Text Animations/4/code.zip" (files/script.js).
// That component splits a paragraph into characters with GSAP's SplitText,
// caches each character's centre once, marks the cache dirty on resize, and
// throttles its pointer loop to a configurable frame rate.
//
// What we took: the character level split, the measure-once-and-invalidate
// discipline, and the idea that per character work must be budgeted.
//
// What we changed: the pack component scrambles characters around the
// pointer using SplitText and ScrambleTextPlugin, both of which are paid
// GSAP plugins. Ours splits in plain DOM, carries no runtime dependency at
// all, and plays a one shot rise out of a mask on scroll rather than a
// continuous pointer effect. Timing is our own measured signature: 450ms on
// cubic-bezier(0.165, 0.84, 0.44, 1) with a 61ms stagger.

import React, { useEffect, useMemo, useRef } from 'react';
import { usePrefersReducedMotion } from '../hooks/useMotion.ts';

interface SplitRevealProps {
  text: string;
  /** Split by word or by character. Characters suit short display lines. */
  by?: 'word' | 'char';
  /** Delay before the first unit moves, in milliseconds. */
  delay?: number;
  className?: string;
}

export const SplitReveal: React.FC<SplitRevealProps> = ({
  text,
  by = 'char',
  delay = 0,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();

  // Splitting is pure, so it is computed from the text rather than from the
  // DOM, and it never runs again unless the text itself changes.
  const units = useMemo(() => {
    if (by === 'word') return text.split(/(\s+)/).filter((part) => part.length > 0);
    return Array.from(text);
  }, [text, by]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const inner = Array.from(element.querySelectorAll<HTMLElement>('[data-unit]'));

    if (reduced || typeof IntersectionObserver === 'undefined') {
      for (const node of inner) node.style.transform = 'none';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        for (const [index, node] of inner.entries()) {
          // The stagger is capped so a long line still finishes promptly
          // rather than trickling in for several seconds.
          node.style.transitionDelay = `${delay + Math.min(index * 61, 520)}ms`;
          node.style.transform = 'none';
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [units, reduced, delay]);

  return (
    <span ref={ref} className={className}>
      {/* The visible text is duplicated for assistive technology as one
          string, because a screen reader announcing a heading one character
          at a time is unusable. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden="true">
        {units.map((unit, index) =>
          unit.trim() === '' ? (
            <span key={`space-${index}`}> </span>
          ) : (
            <span
              key={`${unit}-${index}`}
              className="inline-block overflow-hidden align-bottom"
              style={{ paddingBottom: '0.16em', marginBottom: '-0.16em' }}
            >
              <span
                data-unit
                className="inline-block will-change-transform"
                style={{
                  transform: reduced ? 'none' : 'translateY(110%)',
                  transition: 'transform 450ms cubic-bezier(0.165, 0.84, 0.44, 1)',
                }}
              >
                {unit}
              </span>
            </span>
          )
        )}
      </span>
    </span>
  );
};
