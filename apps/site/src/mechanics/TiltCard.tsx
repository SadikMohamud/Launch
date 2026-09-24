// Tilting surface.
//
// Studied: "Awwwards Pack/+24 Hover Effects/5/code.zip"
// (3DLettersMenuHover-main/js/menu.js), which builds a perspective context
// on a container and rotates its children from the pointer's normalised
// offset within that container.
//
// What we took: the perspective on the parent rather than the child, and
// normalising the pointer offset to a range from -1 to 1 so the maximum
// angle is a single readable constant.
//
// What we changed: the pack component rotates individual letters on three
// axes with a spring. Ours tilts one surface on two axes with our measured
// easing, resets on leave, and arms only on a fine pointer with motion
// allowed. It also keeps its own children non-transformed, so text inside
// stays crisp rather than being resampled by a 3D transform.

import React, { useCallback, useRef } from 'react';
import { useIsTouch, usePrefersReducedMotion } from '../hooks/useMotion.ts';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum rotation on either axis, in degrees. */
  maxTilt?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', maxTilt = 5 }) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const box = useRef<DOMRect | null>(null);
  const isTouch = useIsTouch();
  const reduced = usePrefersReducedMotion();

  const armed = !isTouch && !reduced;

  const onEnter = useCallback(() => {
    if (!armed) return;
    box.current = surfaceRef.current?.getBoundingClientRect() ?? null;
  }, [armed]);

  const onMove = useCallback(
    (event: React.PointerEvent) => {
      const surface = surfaceRef.current;
      const rect = box.current;
      if (!armed || !surface || !rect) return;

      // Normalised to -1 .. 1 from the centre, so maxTilt is the real limit.
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      surface.style.transform = `rotateX(${(-y * maxTilt * 2).toFixed(2)}deg) rotateY(${(x * maxTilt * 2).toFixed(2)}deg)`;
    },
    [armed, maxTilt]
  );

  const onLeave = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }, []);

  return (
    <div
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ perspective: '900px' }}
      className={className}
    >
      <div
        ref={surfaceRef}
        className="h-full w-full will-change-transform"
        style={{ transition: 'transform 450ms cubic-bezier(0.165, 0.84, 0.44, 1)' }}
      >
        {children}
      </div>
    </div>
  );
};
