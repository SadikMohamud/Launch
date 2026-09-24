// Motion capability hooks.
//
// Three questions decide how much motion the page is allowed to run, and
// every one of them is asked here rather than guessed in a component:
// whether the visitor has asked for reduced motion, whether the device is
// touch driven, and whether an element has entered the viewport yet.

import { useEffect, useRef, useState } from 'react';

/**
 * Whether the visitor has asked for reduced motion.
 *
 * The value is watched rather than read once, because the preference can be
 * changed while the page is open and a visitor who turns it on should not
 * have to reload to be taken seriously.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Whether the primary input is touch.
 *
 * Used to switch off the custom cursor and smooth scroll. A coarse pointer
 * is the reliable signal: checking for touch events alone reports true on
 * plenty of laptops that also have a mouse.
 */
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const onChange = (event: MediaQueryListEvent) => setTouch(event.matches);

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return touch;
}

/**
 * Reveal an element once when it scrolls into view.
 *
 * The observer is disconnected after the first intersection, so scrolling
 * back up never replays the entrance. Under reduced motion the element is
 * marked visible immediately and no observer is created at all.
 *
 * @param threshold how much of the element must be visible, 0 to 1
 */
export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    /**
     * Mark the observed element and every revealable descendant.
     *
     * The ref usually sits on a grid while the .reveal class sits on its
     * children, each with its own stagger delay. Marking only the observed
     * element leaves every child at opacity zero, which reads as an empty
     * section rather than as a missing class.
     */
    const reveal = () => {
      element.classList.add('is-in');
      for (const child of element.querySelectorAll('.reveal')) {
        child.classList.add('is-in');
      }
    };

    if (reduced || typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        reveal();
        observer.disconnect();
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced, threshold]);

  return ref;
}

/**
 * Stagger delay for a child in a revealed group.
 *
 * The interval is the one measured on the reference, 61ms, and it is capped
 * so a long list does not take several seconds to finish arriving.
 */
export function staggerDelay(index: number, intervalMs = 61, maxMs = 480): string {
  return `${Math.min(index * intervalMs, maxMs)}ms`;
}
