// Composition builder.
//
// Turns the tokens, the timeline and the captured stills into a single self
// contained HTML page that the renderer drives through window.__seek. The
// page is written to the working directory next to the stills it references.
//
// The page deliberately contains no CSS transitions and no CSS animations.
// Those are driven by the compositor rather than by script, so a paused clock
// cannot stop them, and a frame captured mid transition would depend on
// wall clock timing rather than on the timeline position.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Escape text for safe interpolation into HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Choose a rendering typeface stack.
 *
 * The target site's own webfont is not embedded: it is usually licensed for
 * that domain only, and may not be downloadable at all. A stack in the same
 * classification is used instead, so the film reads as the same kind of page
 * without misrepresenting the original typeface.
 */
export function chooseFontStack(tokens) {
  const primary = tokens.type?.families?.[0]?.stack ?? '';
  const isSerif = /serif/i.test(primary) && !/sans-serif/i.test(primary);
  const isMono = /mono/i.test(primary);

  if (isMono) return "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', 'SF Mono', Menlo, Consolas, monospace";
  if (isSerif) return "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
  return "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
}

/** Split a title into words the runtime can stagger individually. */
function titleWords(title, limit = 8) {
  const cleaned = String(title ?? '')
    .replace(/\s*[|·–-]\s*/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, limit);
  return words.length > 0 ? words : ['Launch'];
}

/** Locate a still by role, returning its relative path or undefined. */
function stillPath(tokens, role, index = 0) {
  const matches = (tokens.media?.stills ?? []).filter((still) => still.role === role);
  const chosen = matches[index];
  return chosen ? chosen.file.split(path.sep).join('/') : undefined;
}

/** Build the markup for one scene. */
function sceneMarkup(scene, tokens, context) {
  const { host, fontStack } = context;

  switch (scene.type) {
    case 'title-card': {
      const words = titleWords(tokens.source?.title).map(
        (word) => `<span class="word"><span data-word>${escapeHtml(word)}</span></span>`
      ).join(' ');

      return `
        <div class="pad">
          <h1 class="display">${words}</h1>
          <p class="subtitle" data-subtitle>${escapeHtml(host)}</p>
        </div>`;
    }

    case 'hero-reveal': {
      const file = stillPath(tokens, 'hero') ?? stillPath(tokens, 'section');
      if (!file) return '<div class="pad"></div>';
      return `
        <img class="still cover" data-still src="${escapeHtml(file)}" alt="" />
        <div class="veil" data-veil></div>`;
    }

    case 'scroll-pan': {
      const file = stillPath(tokens, 'fullpage') ?? stillPath(tokens, 'hero');
      if (!file) return '<div class="pad"></div>';
      return `<img class="still pan" data-still src="${escapeHtml(file)}" alt="" />`;
    }

    case 'detail-punch': {
      const file = stillPath(tokens, 'section', scene.still ?? 0) ?? stillPath(tokens, 'hero');
      if (!file) return '<div class="pad"></div>';
      return `<img class="still cover" data-still src="${escapeHtml(file)}" alt="" />`;
    }

    case 'token-card': {
      const swatches = (tokens.colour?.palette ?? [])
        .slice(0, 6)
        .map((entry) => `<div class="swatch" data-swatch style="background:${escapeHtml(entry.hex)}"></div>`)
        .join('');

      const display = tokens.type?.scale?.[0];
      const specimen = display
        ? `${escapeHtml(display.px)}px / ${escapeHtml(display.weight)} · ${escapeHtml(
            String(display.family).split(',')[0].replace(/["']/g, '')
          )}`
        : '';

      return `
        <div class="pad">
          <div class="swatches">${swatches}</div>
          <p class="specimen" data-specimen style="font-family:${fontStack}">${specimen}</p>
        </div>`;
    }

    case 'url-outro':
    default: {
      return `
        <div class="pad centre">
          <p class="url" data-url>${escapeHtml(host)}</p>
          <div class="rule" data-rule></div>
        </div>`;
    }
  }
}

/**
 * Build and write the composition page.
 *
 * @param {object} args
 * @param {object} args.tokens
 * @param {object} args.timeline
 * @param {string} args.workDir
 * @param {{ width: number, height: number }} args.dimensions
 * @returns {Promise<string>} the path to the written composition
 */
export async function writeComposition({ tokens, timeline, workDir, dimensions }) {
  const runtime = await fs.readFile(path.join(here, 'runtime.browser.js'), 'utf8');

  const canvas = tokens.colour?.canvas ?? '#ffffff';
  const ink = tokens.colour?.ink ?? '#000000';
  const accent = tokens.colour?.accent?.hex ?? ink;
  const fontStack = chooseFontStack(tokens);

  let host = tokens.source?.finalUrl ?? '';
  try {
    host = new URL(host).hostname.replace(/^www\./, '');
  } catch {
    host = tokens.source?.title ?? 'launch';
  }

  const context = { host, fontStack };

  const scenes = timeline.scenes
    .map((scene, index) => `
      <section class="scene" data-scene data-index="${index}" data-type="${escapeHtml(scene.type)}">
        ${sceneMarkup(scene, tokens, context)}
      </section>`)
    .join('\n');

  // Type sizes are expressed against the frame width so the same composition
  // reads correctly at 1920x1080, 1080x1920 and 1080x1080 without a separate
  // layout per format.
  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>Launch composition</title>
<style>
  /* No transitions and no animations anywhere: every animated value is
     written by the runtime as a pure function of the timeline position. */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    transition: none !important;
    animation: none !important;
  }

  :root {
    --canvas: ${canvas};
    --ink: ${ink};
    --accent: ${accent};
    --fw: ${dimensions.width}px;
    --fh: ${dimensions.height}px;
    --gutter: calc(var(--fw) * 0.072);
  }

  html, body {
    width: var(--fw);
    height: var(--fh);
    overflow: hidden;
    background: var(--canvas);
    color: var(--ink);
    font-family: ${fontStack};
    -webkit-font-smoothing: antialiased;
  }

  .stage { position: relative; width: var(--fw); height: var(--fh); overflow: hidden; }

  .scene {
    position: absolute;
    inset: 0;
    display: none;
    overflow: hidden;
    background: var(--canvas);
    will-change: opacity, clip-path;
  }

  .pad {
    position: absolute;
    inset: 0;
    padding: var(--gutter);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: calc(var(--fw) * 0.018);
  }

  .pad.centre { justify-content: center; align-items: flex-start; }

  .display {
    font-size: calc(var(--fw) * 0.062);
    line-height: 1.04;
    letter-spacing: -0.02em;
    font-weight: 600;
    max-width: 78%;
  }

  .word { display: inline-block; overflow: hidden; vertical-align: bottom; }
  .word > [data-word] { display: inline-block; will-change: transform, opacity; }

  .subtitle {
    font-size: calc(var(--fw) * 0.017);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0;
    will-change: transform, opacity;
  }

  .still { position: absolute; inset: 0; width: 100%; will-change: transform, opacity; }
  .still.cover { height: 100%; object-fit: cover; object-position: top center; transform-origin: 50% 40%; }
  .still.pan { height: auto; top: 0; }

  .veil { position: absolute; inset: 0; background: var(--canvas); will-change: opacity; }

  .swatches { display: flex; gap: calc(var(--fw) * 0.012); }
  .swatch {
    width: calc(var(--fw) * 0.062);
    height: calc(var(--fw) * 0.062);
    border-radius: calc(var(--fw) * 0.003);
    opacity: 0;
    will-change: transform, opacity;
    outline: 1px solid rgba(128, 128, 128, 0.25);
    outline-offset: -1px;
  }

  .specimen {
    font-size: calc(var(--fw) * 0.019);
    letter-spacing: 0.04em;
    opacity: 0;
    will-change: transform, opacity;
  }

  .url {
    font-size: calc(var(--fw) * 0.038);
    letter-spacing: -0.01em;
    font-weight: 500;
    opacity: 0;
    will-change: transform, opacity;
  }

  .rule {
    margin-top: calc(var(--fw) * 0.016);
    width: calc(var(--fw) * 0.34);
    height: calc(var(--fw) * 0.0022);
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: 0 50%;
    will-change: transform;
  }
</style>
</head>
<body>
<div class="stage">
${scenes}
</div>
<script>
window.LAUNCH_TIMELINE = ${JSON.stringify(timeline)};
window.LAUNCH_TOKENS = ${JSON.stringify({ colour: tokens.colour, motion: tokens.motion, type: tokens.type, source: tokens.source })};
</script>
<script>
${runtime}
</script>
</body>
</html>
`;

  const file = path.join(workDir, 'composition.html');
  await fs.writeFile(file, html, 'utf8');
  return file;
}
