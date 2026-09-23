// Composition runtime.
//
// This file is injected into the generated composition page. It is browser
// code, not Node code, and it is kept as a real source file rather than a
// template string so it stays readable and syntax checked.
//
// The contract with the renderer is a single function, window.__seek(tMs),
// which writes every animated property as a pure function of the timeline
// position. There are no CSS transitions, no CSS animations and no
// requestAnimationFrame loops anywhere in the composition, because any of
// those would make a frame depend on when it was captured rather than on
// where it sits in the timeline. That is what allows frames to be rendered
// out of order, in parallel, and still assemble into a correct film.

/* global document, window */

(function initialiseRuntime() {
  'use strict';

  // LAUNCH_TIMELINE and LAUNCH_TOKENS are written into the page above this
  // script by the composer.
  const timeline = window.LAUNCH_TIMELINE;
  const tokens = window.LAUNCH_TOKENS;

  /**
   * Solve a cubic bezier easing for a given progress value.
   *
   * Newton iteration converges in a handful of steps for the curves used by
   * real sites, and is deterministic, which matters more here than raw speed.
   */
  function cubicBezier(p1x, p1y, p2x, p2y) {
    return function solve(t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;

      let x = t;
      const cx = 3 * p1x;
      const bx = 3 * (p2x - p1x) - cx;
      const ax = 1 - cx - bx;

      for (let i = 0; i < 8; i++) {
        const fx = ((ax * x + bx) * x + cx) * x - t;
        if (Math.abs(fx) < 1e-6) break;
        const dx = (3 * ax * x + 2 * bx) * x + cx;
        if (Math.abs(dx) < 1e-6) break;
        x -= fx / dx;
      }

      const cy = 3 * p1y;
      const by = 3 * (p2y - p1y) - cy;
      const ay = 1 - cy - by;
      return ((ay * x + by) * x + cy) * x;
    };
  }

  /** Map a CSS easing string onto a solver, falling back to a soft ease out. */
  function parseEasing(value) {
    const named = {
      linear: function (t) { return t; },
      ease: cubicBezier(0.25, 0.1, 0.25, 1),
      'ease-in': cubicBezier(0.42, 0, 1, 1),
      'ease-out': cubicBezier(0, 0, 0.58, 1),
      'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
    };

    const text = String(value || '').trim();
    if (Object.prototype.hasOwnProperty.call(named, text)) return named[text];

    const match = text.match(/cubic-bezier\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map(function (part) { return Number(part.trim()); });
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        return cubicBezier(parts[0], parts[1], parts[2], parts[3]);
      }
    }

    return cubicBezier(0.16, 1, 0.3, 1);
  }

  // The source site's dominant easing drives every entrance in the film.
  // This is what makes the output feel like the site it came from.
  const ease = parseEasing(tokens.motion && tokens.motion.primaryEasing && tokens.motion.primaryEasing.value);

  /** Clamp a raw time window into a 0 to 1 progress value. */
  function progress(tMs, startMs, durationMs) {
    if (durationMs <= 0) return tMs >= startMs ? 1 : 0;
    const raw = (tMs - startMs) / durationMs;
    return raw < 0 ? 0 : raw > 1 ? 1 : raw;
  }

  /** Linear interpolation. */
  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  /**
   * Scene updaters, keyed by scene type. Each receives the scene's root
   * element, the time elapsed within that scene, and the scene definition.
   */
  const updaters = {
    /** Opening card: the site name rising a word at a time. */
    'title-card': function (root, localMs, scene) {
      const words = root.querySelectorAll('[data-word]');
      const stagger = 90;
      const rise = Math.min(700, scene.durationMs * 0.45);

      for (let i = 0; i < words.length; i++) {
        const amount = ease(progress(localMs, 240 + i * stagger, rise));
        words[i].style.transform = 'translateY(' + ((1 - amount) * 110).toFixed(3) + '%)';
        words[i].style.opacity = amount.toFixed(4);
      }

      const subtitle = root.querySelector('[data-subtitle]');
      if (subtitle) {
        const amount = ease(progress(localMs, 240 + words.length * stagger, 600));
        subtitle.style.opacity = amount.toFixed(4);
        subtitle.style.transform = 'translateY(' + ((1 - amount) * 24).toFixed(2) + 'px)';
      }
    },

    /** The hero still, revealed behind a wipe and pushed in slowly. */
    'hero-reveal': function (root, localMs, scene) {
      const image = root.querySelector('[data-still]');
      const veil = root.querySelector('[data-veil]');
      const reveal = Math.min(900, scene.durationMs * 0.4);

      if (image) {
        const push = localMs / scene.durationMs;
        image.style.transform = 'scale(' + lerp(1, 1.06, push).toFixed(5) + ')';
      }

      if (veil) {
        veil.style.opacity = (1 - ease(progress(localMs, 0, reveal))).toFixed(4);
      }
    },

    /** A long pan down the full page still. */
    'scroll-pan': function (root, localMs, scene) {
      const image = root.querySelector('[data-still]');
      if (!image) return;

      // The pan is eased at both ends so it starts and stops rather than
      // cutting into and out of a constant velocity move.
      const amount = ease(progress(localMs, 0, scene.durationMs));
      const start = typeof scene.from === 'number' ? scene.from : 0;
      const travel = Math.max(0, image.naturalHeight - root.clientHeight);
      const offset = lerp(start * travel, Math.min(travel, (start + 0.5) * travel), amount);

      image.style.transform = 'translateY(' + (-offset).toFixed(2) + 'px)';
    },

    /** A crop of one section, punching in and settling. */
    'detail-punch': function (root, localMs, scene) {
      const image = root.querySelector('[data-still]');
      if (!image) return;

      const amount = ease(progress(localMs, 0, scene.durationMs * 0.8));
      image.style.transform =
        'scale(' + lerp(1.14, 1.0, amount).toFixed(5) + ') ' +
        'translateY(' + lerp(-1.2, 0, amount).toFixed(3) + '%)';
      image.style.opacity = ease(progress(localMs, 0, 320)).toFixed(4);
    },

    /** The extracted palette and type specimen, shown as a design card. */
    'token-card': function (root, localMs) {
      const swatches = root.querySelectorAll('[data-swatch]');
      for (let i = 0; i < swatches.length; i++) {
        const amount = ease(progress(localMs, 200 + i * 70, 560));
        swatches[i].style.transform = 'translateY(' + ((1 - amount) * -36).toFixed(2) + 'px)';
        swatches[i].style.opacity = amount.toFixed(4);
      }

      const specimen = root.querySelector('[data-specimen]');
      if (specimen) {
        const amount = ease(progress(localMs, 200 + swatches.length * 70, 620));
        specimen.style.opacity = amount.toFixed(4);
        specimen.style.transform = 'translateY(' + ((1 - amount) * 28).toFixed(2) + 'px)';
      }
    },

    /** Closing card: the URL, with the accent rule drawing beneath it. */
    'url-outro': function (root, localMs, scene) {
      const label = root.querySelector('[data-url]');
      const rule = root.querySelector('[data-rule]');

      if (label) {
        const amount = ease(progress(localMs, 160, 620));
        label.style.opacity = amount.toFixed(4);
        label.style.transform = 'translateY(' + ((1 - amount) * 20).toFixed(2) + 'px)';
      }

      if (rule) {
        const amount = ease(progress(localMs, 420, Math.min(1100, scene.durationMs * 0.6)));
        rule.style.transform = 'scaleX(' + amount.toFixed(4) + ')';
      }
    },
  };

  const sceneRoots = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));

  /**
   * Apply a scene's transition in, returning the opacity it should carry.
   * A wipe also writes a clip path, which is why this returns rather than
   * simply setting opacity itself.
   */
  function applyTransition(root, scene, localMs) {
    const transition = scene.transition || { kind: 'cut', durationMs: 0 };

    if (transition.kind === 'cut' || transition.durationMs <= 0) {
      root.style.clipPath = '';
      return 1;
    }

    const amount = ease(progress(localMs, 0, transition.durationMs));

    if (transition.kind === 'wipe') {
      // The wipe runs bottom to top, uncovering the incoming scene.
      root.style.clipPath = 'inset(' + ((1 - amount) * 100).toFixed(3) + '% 0 0 0)';
      return 1;
    }

    root.style.clipPath = '';
    return amount;
  }

  /**
   * The single entry point the renderer drives.
   *
   * Every frame is written from tMs alone, with no dependence on the previous
   * frame, so frames may be produced in any order and on any worker.
   */
  window.__seek = function seek(tMs) {
    const t = Math.max(0, Math.min(timeline.totalMs, Number(tMs) || 0));

    for (let i = 0; i < sceneRoots.length; i++) {
      const root = sceneRoots[i];
      const scene = timeline.scenes[i];
      const localMs = t - scene.startMs;

      // A scene paints from its own start until its end, and stays painted
      // underneath the next scene for the length of that scene's transition
      // so there is something to dissolve or wipe from.
      const next = timeline.scenes[i + 1];
      const holdMs = next && next.transition ? next.transition.durationMs : 0;
      const visible = t >= scene.startMs && t < scene.endMs + holdMs;

      if (!visible) {
        root.style.display = 'none';
        continue;
      }

      root.style.display = 'block';
      root.style.zIndex = String(i + 1);
      root.style.opacity = String(applyTransition(root, scene, localMs));

      const update = updaters[scene.type];
      if (update) update(root, Math.max(0, localMs), scene);
    }
  };

  // Paint frame zero immediately, then announce readiness. The renderer waits
  // for this flag before it begins, so it never captures an unstyled frame.
  window.__seek(0);
  window.__launchReady = true;
})();
