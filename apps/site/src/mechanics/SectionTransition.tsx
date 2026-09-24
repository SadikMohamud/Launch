// Section transition.
//
// Studied: "Awwwards Pack/+17 Page Transitions/4/code.zip"
// (js/demo1/overlay.js). That component builds a grid of cell elements
// inside an overlay, sets the column count as a CSS custom property so the
// grid is styled rather than positioned in script, and animates the cells
// in and out with a grid aware stagger to wipe the screen between pages.
//
// What we took: the cell grid and the grid stagger with an origin, which is
// what makes the wipe read as a direction rather than as a flash.
//
// What we changed: the pack component transitions between separate
// documents. This is one page, so the wipe covers, jumps the scroll while
// nothing is visible, and uncovers, which is the honest equivalent: the
// visitor never sees the intervening sections smear past. It is exposed
// through context rather than a render prop so the navigation markup stays
// ordinary anchors, and it does nothing at all under reduced motion, where
// a full screen wipe between sections is an obstacle rather than a
// flourish.

import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '../hooks/useMotion.ts';

const ROWS = 6;
const COLUMNS = 10;

type Navigate = (hash: string) => void;

/** Falls back to ordinary anchor behaviour when no provider is mounted. */
const SectionTransitionContext = createContext<Navigate>(() => {});

export function useSectionTransition(): Navigate {
  return useContext(SectionTransitionContext);
}

export const SectionTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const running = useRef(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    gsap.set(overlay.children, { scaleY: 0, transformOrigin: '50% 100%' });
  }, []);

  const navigate = useCallback<Navigate>(
    (hash) => {
      const target = document.querySelector(hash);
      if (!target) return;

      // Reduced motion, or a transition already in flight. Queueing a second
      // wipe behind the first holds the overlay up for twice as long, which
      // reads as a hang rather than as an effect.
      if (reduced || running.current || !overlayRef.current) {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        return;
      }

      running.current = true;
      const overlay = overlayRef.current;
      const cells = overlay.children;

      gsap
        .timeline({ onComplete: () => { running.current = false; } })
        .set(overlay, { pointerEvents: 'auto' })
        .to(cells, {
          scaleY: 1,
          transformOrigin: '50% 100%',
          duration: 0.3,
          ease: 'power3.in',
          // amount, not each: the spread is a fixed total however many cells
          // there are. With each, sixty cells stretched one direction to
          // 0.72s and the whole transition past two seconds.
          stagger: { amount: 0.22, grid: [ROWS, COLUMNS], from: 'start' },
        })
        .add(() => {
          // The jump happens while the screen is covered, so nothing is
          // seen sliding past.
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        })
        .set(overlay, { pointerEvents: 'none' })
        .to(cells, {
          scaleY: 0,
          transformOrigin: '50% 0%',
          duration: 0.34,
          ease: 'power3.out',
          stagger: { amount: 0.22, grid: [ROWS, COLUMNS], from: 'end' },
        });
    },
    [reduced]
  );

  return (
    <SectionTransitionContext.Provider value={navigate}>
      {children}

      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[90] grid"
        style={{
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: ROWS * COLUMNS }).map((_, index) => (
          <div key={index} className="bg-film" style={{ willChange: 'transform', outline: '1px solid var(--film)' }} />
        ))}
      </div>
    </SectionTransitionContext.Provider>
  );
};
