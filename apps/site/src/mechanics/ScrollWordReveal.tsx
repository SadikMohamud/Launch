// Scroll scrubbed word reveal.
//
// Studied: k95.it (MiMic reference 220) and hugeinc.com (reference 140).
// k95 wraps every word in a `gsap-word-reveal-wrap` / `gsap-word-reveal`
// pair and scrubs opacity and transform against scroll over roughly 1.3vh,
// starting when the block is about 0.53 of the way up the viewport, on
// cubic-bezier(0.22, 1, 0.36, 1) at a 350ms median. Six CSS scroll
// timelines are declared on the page, so the scrubbing is native rather
// than driven from a scroll listener.
//
// That is the difference between a page that fades things in and a page
// that feels alive under the hand: the copy resolves as you scroll, and it
// unresolves if you scroll back.
//
// What we changed: k95 drives its version through GSAP ScrollTrigger with a
// pinned timeline. Ours uses the native `animation-timeline: view()` so the
// work happens off the main thread and costs no JavaScript per frame, and
// it degrades to a single IntersectionObserver reveal on browsers that do
// not support scroll timelines yet. Our word range and easing are our own.

import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/useMotion.ts';

interface ScrollWordRevealProps {
  text: string;
  className?: string;
  /** Element to render as. Headings should pass their own tag. */
  as?: 'h2' | 'h3' | 'p' | 'span';
}

/** Whether the browser can scrub an animation against scroll natively. */
function supportsScrollTimeline(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('animation-timeline', 'view()');
}

export const ScrollWordReveal: React.FC<ScrollWordRevealProps> = ({
  text,
  className = '',
  as: Tag = 'p',
}) => {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [native, setNative] = useState(true);

  useEffect(() => setNative(supportsScrollTimeline()), []);

  const words = text.split(/\s+/).filter(Boolean);

  // Fallback path: one IntersectionObserver reveal, no scrubbing.
  useEffect(() => {
    const element = ref.current;
    if (!element || native) return;

    if (reduced || typeof IntersectionObserver === 'undefined') {
      element.classList.add('words-in');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.classList.add('words-in');
        observer.disconnect();
      },
      // The same trigger point k95 uses: about half way up the viewport.
      { threshold: 0, rootMargin: '0px 0px -47% 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [native, reduced]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`word-reveal ${native ? 'word-reveal--scrub' : ''} ${className}`}
    >
      {/* Read as one string. A screen reader announcing word by word with
          per word markup is worse than useless. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden="true">
        {words.map((word, index) => (
          // The space sits outside the mask on purpose. Inside it, the
          // wrapper's overflow: hidden and inline-block collapse the
          // trailing whitespace and every word runs together.
          <React.Fragment key={`${word}-${index}`}>
            <span className="word-reveal__wrap">
              <span
                className="word-reveal__word"
                // The per word offset is a share of the scrub range rather
                // than a time, so the stagger holds at any scroll speed.
                style={
                  { '--word-index': index, '--word-total': words.length } as React.CSSProperties
                }
              >
                {word}
              </span>
            </span>
            {index < words.length - 1 ? ' ' : null}
          </React.Fragment>
        ))}
      </span>
    </Tag>
  );
};
