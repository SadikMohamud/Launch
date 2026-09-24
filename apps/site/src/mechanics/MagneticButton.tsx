// Magnetic control.
//
// Studied: "Awwwards Pack/+24 Hover Effects/5/code.zip"
// (3DLettersMenuHover-main/js/menuItem.js and js/cursor.js). That component
// tracks the pointer against each menu item's bounding box and drives a
// per-letter 3D transform from the offset, recalculating the box on every
// pointer enter.
//
// What we took: measuring the target's box on enter rather than on every
// move, and expressing the pull as a fraction of the box rather than as a
// pixel constant, so the effect is proportionate on any size of control.
//
// What we changed: no per letter split and no 3D rotation. Ours translates
// the whole control on our measured curve and releases on leave. It only
// arms on a fine pointer, and it is a wrapper rather than a replacement, so
// the child keeps its own semantics, focus behaviour and keyboard handling.

import React, { useCallback, useRef } from 'react';
import { useIsTouch, usePrefersReducedMotion } from '../hooks/useMotion.ts';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** How far the control may travel, as a fraction of its own size. */
  pull?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  pull = 0.22,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const box = useRef<DOMRect | null>(null);
  const isTouch = useIsTouch();
  const reduced = usePrefersReducedMotion();

  const armed = !isTouch && !reduced;

  const onEnter = useCallback(() => {
    if (!armed) return;
    // Measured once per hover. Reading it on every move would force layout
    // on a pointer event, which is the usual cause of a janky magnet.
    box.current = ref.current?.getBoundingClientRect() ?? null;
  }, [armed]);

  const onMove = useCallback(
    (event: React.PointerEvent) => {
      const element = ref.current;
      const rect = box.current;
      if (!armed || !element || !rect) return;

      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);

      element.style.transform = `translate3d(${offsetX * pull}px, ${offsetY * pull}px, 0)`;
    },
    [armed, pull]
  );

  const onLeave = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    element.style.transform = 'translate3d(0, 0, 0)';
  }, []);

  return (
    <span
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`inline-block will-change-transform ${className}`}
      style={{ transition: 'transform 450ms cubic-bezier(0.165, 0.84, 0.44, 1)' }}
    >
      {children}
    </span>
  );
};
