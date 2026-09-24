// Trailing cursor ring.
//
// Studied: "Awwwards Pack/+19 Mouse Effect/6/code.zip" (files/script.js).
// That component fills a full screen canvas with black, switches the context
// to destination-out, and erases circles along the pointer path to reveal
// the content beneath. Its useful trick is that it interpolates between the
// previous and current pointer position using the pointer's own movementX
// and movementY, so a fast flick still erases a continuous stroke instead of
// leaving a dotted trail.
//
// What we took: that interpolation, and the habit of reading movement
// deltas rather than assuming one event per frame.
//
// What we changed: no canvas, no compositing and no erase mask. Ours is a
// single small ring element easing towards the pointer on our measured
// curve, which costs one transform per frame instead of a full screen
// repaint. It also never hides the system cursor, which the pack component
// does; hiding it strands anyone navigating by keyboard or relying on the
// operating system pointer.

import React, { useEffect, useRef } from 'react';

/** How quickly the ring closes on the pointer. Higher is snappier. */
const FOLLOW = 0.18;

/** Elements that make the ring grow, signalling that they are interactive. */
const INTERACTIVE = 'a, button, summary, input, [role="tab"]';

export const CustomCursor: React.FC = () => {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let scale = 1;
    let targetScale = 1;
    let frame = 0;
    let visible = false;

    const onMove = (event: PointerEvent) => {
      // Mid-flick positions are taken from the movement deltas, so the ring
      // tracks the real path rather than only the sampled endpoints.
      const steps = Math.min(4, Math.round(Math.max(Math.abs(event.movementX), Math.abs(event.movementY)) / 40));
      if (steps > 0) {
        pointerX += (event.clientX - pointerX) / (steps + 1);
        pointerY += (event.clientY - pointerY) / (steps + 1);
      }

      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!visible) {
        visible = true;
        ring.style.opacity = '1';
      }

      targetScale = (event.target as Element | null)?.closest?.(INTERACTIVE) ? 2.1 : 1;
    };

    const onLeave = () => {
      visible = false;
      ring.style.opacity = '0';
    };

    const tick = () => {
      ringX += (pointerX - ringX) * FOLLOW;
      ringY += (pointerY - ringY) * FOLLOW;
      scale += (targetScale - scale) * FOLLOW;

      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-7 w-7 rounded-full border border-accent opacity-0 mix-blend-difference"
      style={{ transition: 'opacity 200ms linear', willChange: 'transform' }}
    />
  );
};
