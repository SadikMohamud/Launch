// Timeline construction.
//
// Given the tokens and the options, this decides which scenes run, in what
// order, for how long, and how they join. It is pure and deterministic: the
// same tokens and options always produce the same timeline, which is what
// makes a render reproducible and the end to end test meaningful.

/**
 * Scene presets. Durations are expressed as weights rather than milliseconds,
 * so the same sequence can be scaled to any requested total length without
 * any scene collapsing to nothing.
 */
const SHORT_SEQUENCE = [
  { type: 'title-card', weight: 2.0 },
  { type: 'hero-reveal', weight: 3.0 },
  { type: 'scroll-pan', weight: 3.2 },
  { type: 'detail-punch', weight: 2.4, still: 0 },
  { type: 'url-outro', weight: 2.0 },
];

const LONG_SEQUENCE = [
  { type: 'title-card', weight: 2.0 },
  { type: 'hero-reveal', weight: 3.2 },
  { type: 'detail-punch', weight: 2.4, still: 0 },
  { type: 'scroll-pan', weight: 3.6 },
  { type: 'token-card', weight: 2.8 },
  { type: 'detail-punch', weight: 2.4, still: 1 },
  { type: 'scroll-pan', weight: 3.2, from: 0.45 },
  { type: 'detail-punch', weight: 2.4, still: 2 },
  { type: 'url-outro', weight: 2.2 },
];

/** Default total durations, in milliseconds, before any override. */
export const DEFAULT_SHORT_MS = 18_000;
export const DEFAULT_LONG_MS = 45_000;

/** Transition lengths, in milliseconds. */
const DISSOLVE_MS = 240;
const WIPE_MS = 420;

/**
 * Choose the transition into a scene.
 *
 * The rule is fixed rather than random, so a given site always produces the
 * same film. An emphatic motion signature on the source site earns wipes;
 * a soft one gets dissolves.
 *
 * @param {string} previousType  the scene being left, or null at the start
 * @param {string} nextType      the scene being entered
 * @param {string} easingFamily  the classified motion signature of the source
 */
export function chooseTransition(previousType, nextType, easingFamily) {
  if (previousType === null) return { kind: 'cut', durationMs: 0 };

  // Returning to the same scene type reads better as a hard cut, because a
  // dissolve between two near identical frames looks like a mistake.
  if (previousType === nextType) return { kind: 'cut', durationMs: 0 };

  // The outro always arrives on a dissolve, so the film settles rather than
  // snapping to its final card.
  if (nextType === 'url-outro') return { kind: 'dissolve', durationMs: DISSOLVE_MS };

  const emphatic = easingFamily === 'out-strong' || easingFamily === 'overshoot' || easingFamily === 'anticipate';
  return emphatic
    ? { kind: 'wipe', durationMs: WIPE_MS }
    : { kind: 'dissolve', durationMs: DISSOLVE_MS };
}

/**
 * Build the timeline.
 *
 * @param {object} tokens   the tokens document from the capture stage
 * @param {object} options  normalised CLI options
 * @returns {{ totalMs: number, fps: number, frameCount: number,
 *            posterAtMs: number, scenes: object[] }}
 */
export function buildTimeline(tokens, options) {
  const sequence = options.long ? LONG_SEQUENCE : SHORT_SEQUENCE;

  const requestedMs = options.duration !== undefined
    ? Math.round(options.duration * 1000)
    : options.long ? DEFAULT_LONG_MS : DEFAULT_SHORT_MS;

  // Scenes that need a still they do not have are dropped before the weights
  // are shared out, so a one screen site does not get three empty scenes.
  const sectionStills = (tokens.media?.stills ?? []).filter((still) => still.role === 'section');
  const usable = sequence.filter((scene) => {
    if (scene.type !== 'detail-punch') return true;
    return sectionStills.length > (scene.still ?? 0);
  });

  const totalWeight = usable.reduce((sum, scene) => sum + scene.weight, 0);
  const easingFamily = tokens.motion?.primaryEasing?.family ?? 'out-soft';

  const scenes = [];
  let cursor = 0;
  let previousType = null;

  for (const entry of usable) {
    const durationMs = Math.round((entry.weight / totalWeight) * requestedMs);
    const transition = chooseTransition(previousType, entry.type, easingFamily);

    scenes.push({
      type: entry.type,
      startMs: cursor,
      durationMs,
      endMs: cursor + durationMs,
      transition,
      still: entry.still,
      from: entry.from,
    });

    cursor += durationMs;
    previousType = entry.type;
  }

  // Rounding each scene independently can leave the total a few milliseconds
  // short or long, so the final scene absorbs the difference. The rendered
  // duration then matches the requested duration exactly.
  if (scenes.length > 0) {
    const drift = requestedMs - cursor;
    scenes[scenes.length - 1].durationMs += drift;
    scenes[scenes.length - 1].endMs += drift;
    cursor = requestedMs;
  }

  const frameCount = Math.round((cursor / 1000) * options.fps);

  return {
    totalMs: cursor,
    fps: options.fps,
    frameCount,
    posterAtMs: choosePosterTime(scenes, options),
    scenes,
  };
}

/**
 * Choose the poster frame.
 *
 * The default is the settled moment of the hero reveal, which is the most
 * representative single frame of the film. An explicit --poster-at overrides
 * it, clamped into the film so a mistyped value cannot produce a black poster.
 */
export function choosePosterTime(scenes, options) {
  const totalMs = scenes.length > 0 ? scenes[scenes.length - 1].endMs : 0;

  if (options.posterAt !== undefined) {
    return Math.max(0, Math.min(totalMs - 1, Math.round(options.posterAt * 1000)));
  }

  const hero = scenes.find((scene) => scene.type === 'hero-reveal');
  if (hero) return hero.startMs + Math.round(hero.durationMs * 0.75);

  return Math.round(totalMs * 0.4);
}
