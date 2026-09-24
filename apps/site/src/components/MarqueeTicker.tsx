// Marquee.
//
// A quiet band listing the formats and platforms the engine supports. It is
// decorative, so it is hidden from assistive technology, and under reduced
// motion it stops entirely rather than merely slowing down.

import React from 'react';
import { usePrefersReducedMotion } from '../hooks/useMotion.ts';

const ITEMS = [
  '16:9 landscape',
  '9:16 vertical',
  '1:1 square',
  '30 / 60 fps',
  'H.264 yuv420p',
  'bt709 limited range',
  'macOS',
  'Windows',
  'Ubuntu',
  'no watermark',
];

export const MarqueeTicker: React.FC = () => {
  const reduced = usePrefersReducedMotion();

  // The list is repeated so the loop has no visible seam at the wrap point.
  // Under reduced motion a single static row is rendered instead, because a
  // duplicated static row would just read as a stutter.
  const runs = reduced ? 1 : 2;

  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-line py-3">
      <div
        className="flex w-max gap-10 whitespace-nowrap"
        style={reduced ? undefined : { animation: 'launch-marquee 38s linear infinite' }}
      >
        {Array.from({ length: runs }).flatMap((_, run) =>
          ITEMS.map((item) => (
            <span
              key={`${run}-${item}`}
              className="mono text-ui uppercase tracking-[0.18em] text-muted"
            >
              {item}
            </span>
          ))
        )}
      </div>

      <style>{`
        @keyframes launch-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
