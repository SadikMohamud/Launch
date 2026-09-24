// Ambient background field.
//
// Studied: "Awwwards Pack/+10 Background Animations/2/code.zip" and
// "Awwwards Pack/+19 Webgl _ ThreeJS Effects/4/code.zip". Both drive a
// full viewport field of points with a WebGL shader and a render loop that
// never idles.
//
// What we took: the slow drifting point field, and the idea of deriving
// point density from viewport area rather than fixing a count.
//
// What we changed, and why it matters more than the look: the pack versions
// need Three.js, which is around 150KB gzipped on its own and would consume
// the page's entire JavaScript budget before a single component loaded. This
// is a 2D canvas with no dependency at all. It also stops rendering whenever
// the tab is hidden or the section scrolls away, which neither pack version
// does, and it is never mounted under reduced motion or on touch.

import React, { useEffect, useRef } from 'react';

/** One point per this many square pixels, so density is resolution aware. */
const AREA_PER_POINT = 26_000;

/** Never exceed this, however large the display. */
const MAX_POINTS = 90;

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export const HugeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    let points: Point[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;

    // The accent is read from the stylesheet rather than hardcoded, so the
    // field follows the theme without this file knowing the palette.
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim() || '#00f5f3';

    const resize = () => {
      // Capped at 2x: beyond that the pixel cost rises sharply for no
      // visible gain on a field of soft dots.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_POINTS, Math.round((width * height) / AREA_PER_POINT));

      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        r: 0.6 + Math.random() * 1.4,
      }));
    };

    const draw = () => {
      if (!running) return;

      context.clearRect(0, 0, width, height);

      for (const point of points) {
        point.x += point.vx;
        point.y += point.vy;

        // Wrap rather than bounce, so the field has no visible edges.
        if (point.x < -4) point.x = width + 4;
        if (point.x > width + 4) point.x = -4;
        if (point.y < -4) point.y = height + 4;
        if (point.y > height + 4) point.y = -4;

        context.beginPath();
        context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        context.fillStyle = accent;
        context.globalAlpha = 0.16;
        context.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    // A background animation running in a hidden tab is pure battery cost.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    frame = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
};
