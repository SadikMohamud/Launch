// HyperFrames project generation.
//
// Turns the captured tokens, content and media into a complete HyperFrames
// project on disk: a host composition, one sub-composition per scene, the
// downloaded media, and the manifests the CLI expects.
//
// The scene plan is chosen from what the site actually gave us. A site with
// no photography does not get a case study scene, and a site that publishes
// no figures does not get a statistics scene, because an empty template is
// worse than a shorter film.

import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanTitle, splitIntoLines } from '../capture/content.js';
import {
  heroScene,
  statementScene,
  caseStudyScene,
  statsScene,
  galleryScene,
  closingScene,
  escapeHtml,
} from './scenes.js';

/** The GSAP ease used for every entrance, chosen from the site's own curve. */
export function easeForMotion(motion) {
  const family = motion?.primaryEasing?.family ?? 'out-soft';

  // GSAP's named eases are used rather than a CustomEase plugin, because
  // CustomEase is a paid plugin and the free build would silently fall back
  // to linear, flattening every entrance in the film.
  return {
    'out-strong': 'power4.out',
    'out-soft': 'power2.out',
    'in-out-strong': 'power4.inOut',
    'in-out-soft': 'power2.inOut',
    overshoot: 'back.out(1.7)',
    anticipate: 'back.in(1.4)',
    spring: 'elastic.out(1, 0.6)',
    bounce: 'bounce.out',
    linear: 'none',
    in: 'power2.in',
  }[family] ?? 'power3.out';
}

/**
 * Type and layout scale for a frame size.
 *
 * Sizes are derived from the frame width so one set of templates reads
 * correctly in landscape, vertical and square without a separate layout.
 */
export function scaleFor({ width, height }) {
  const portrait = height > width;
  const base = portrait ? width * 1.35 : width;

  return {
    display: Math.round(base * 0.044),
    headline: Math.round(base * 0.054),
    title: Math.round(base * 0.040),
    body: Math.round(base * 0.0112),
    label: Math.round(base * 0.0100),
    gutter: Math.round(width * (portrait ? 0.075 : 0.067)),
    cardWidth: Math.round(width * (portrait ? 0.84 : 0.52)),
    cardHeight: Math.round(height * 0.30),
    cardPad: Math.round(width * (portrait ? 0.045 : 0.033)),
  };
}

/**
 * Decide which scenes to build, from the content the site actually provided.
 *
 * @returns {{ type: string, weight: number, props: object }[]}
 */
export function planScenes(content, media, options) {
  const plan = [];
  const brand = content.brand || cleanTitle(content.title);

  const headline = content.headline || brand;
  plan.push({ type: 'hero', weight: 3.4, props: { headline } });

  // Statements become their own scenes, in the order the page tells them.
  // A short film takes one, the long form takes more.
  // The brand wordmark is set large and sits near the top, so it looks like
  // a statement to a size based ranking. Presenting the company's own logo
  // text as its message reads as a mistake, so it is excluded by name.
  const brandKey = brand.toLowerCase().replace(/\s+/g, '');

  const usedText = new Set([headline.toLowerCase()]);
  const statements = (content.statements ?? [])
    .map((entry) => entry.text)
    .filter((text) => {
      const key = text.toLowerCase();
      if (usedText.has(key) || text.length < 12) return false;
      if (key.replace(/\s+/g, '') === brandKey) return false;
      usedText.add(key);
      return true;
    });

  const statementBudget = options.long ? 2 : 1;
  for (const statement of statements.slice(0, statementBudget)) {
    plan.push({
      type: 'statement',
      weight: 3.0,
      props: { eyebrow: content.eyebrows?.[0] || 'What we do', statement },
    });
  }

  // Case studies pair a short title with one of the site's own photographs.
  const titles = statements
    .slice(statementBudget)
    .filter((text) => text.length <= 40);

  const photos = media.images ?? [];
  const caseBudget = options.long ? 3 : 1;
  const services = content.lists?.[0]?.items ?? [];

  for (let i = 0; i < Math.min(caseBudget, photos.length); i++) {
    const title = titles[i] ?? 'Selected work';
    plan.push({
      type: 'case-study',
      weight: 3.0,
      props: {
        title,
        items: i === 0 ? services.slice(0, 5) : [],
        photo: `assets/${photos[i]}`,
        index: String(i + 1).padStart(2, '0'),
      },
    });
  }

  // Figures only appear when the site publishes at least two of them.
  const stats = (content.stats ?? []).filter((stat) => stat.label).slice(0, 3);
  if (stats.length >= 2) {
    plan.push({
      type: 'stats',
      weight: 2.8,
      props: { eyebrow: 'By the numbers', stats },
    });
  }

  // A long film uses any remaining photography as full bleed plates.
  if (options.long) {
    const remaining = photos.slice(caseBudget, caseBudget + 1);
    for (const photo of remaining) {
      plan.push({
        type: 'gallery',
        weight: 2.4,
        props: { caption: titles[caseBudget] ?? brand, photo: `assets/${photo}` },
      });
    }
  }

  const closing = content.cta?.text
    ? (statements.find((text) => /\b(discuss|talk|work|start|build|contact)\b/i.test(text)) ?? `Work with ${brand}`)
    : `Work with ${brand}`;

  plan.push({
    type: 'closing',
    weight: 2.8,
    props: { closing, cta: content.cta?.text ?? 'Get in touch' },
  });

  return plan;
}

/** Share the requested duration across the planned scenes by weight. */
export function allocateDurations(plan, totalMs) {
  const totalWeight = plan.reduce((sum, scene) => sum + scene.weight, 0) || 1;

  let cursor = 0;
  const timed = plan.map((scene) => {
    const durationMs = Math.round((scene.weight / totalWeight) * totalMs);
    const entry = { ...scene, startMs: cursor, durationMs };
    cursor += durationMs;
    return entry;
  });

  // Rounding each scene independently leaves the total a few milliseconds
  // out, so the last scene absorbs the difference and the film is exactly
  // as long as it was asked to be.
  if (timed.length > 0) {
    const drift = totalMs - cursor;
    timed[timed.length - 1].durationMs += drift;
  }

  return timed;
}

/** Build one scene's sub-composition file contents. */
function renderScene(scene, id, context) {
  const seconds = Number((scene.durationMs / 1000).toFixed(3));
  const common = { id, duration: seconds };

  switch (scene.type) {
    case 'hero':
      return heroScene({ ...common, ...scene.props, domain: context.domain, media: context.media });
    case 'statement':
      return statementScene({ ...common, ...scene.props });
    case 'case-study':
      return caseStudyScene({ ...common, ...scene.props });
    case 'stats':
      return statsScene({ ...common, ...scene.props });
    case 'gallery':
      return galleryScene({ ...common, ...scene.props });
    case 'closing':
    default:
      return closingScene({ ...common, ...scene.props, domain: context.domain });
  }
}

/**
 * Write the complete project.
 *
 * @returns {Promise<{ projectDir: string, totalSeconds: number, scenes: object[] }>}
 */
export async function writeProject({ tokens, content, media, options, workDir, hyperframesVersion }) {
  const projectDir = path.join(workDir, 'project');
  const compositionsDir = path.join(projectDir, 'compositions');
  const assetsDir = path.join(projectDir, 'assets');

  await fs.mkdir(compositionsDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });

  const { width, height } = options.dimensions;
  const scale = scaleFor(options.dimensions);
  const ease = easeForMotion(tokens.motion);

  const totalMs = options.duration !== undefined
    ? Math.round(options.duration * 1000)
    : options.long ? 45_000 : 20_000;

  const plan = allocateDurations(planScenes(content, media, options), totalMs);

  let domain = '';
  try {
    domain = new URL(tokens.source.finalUrl).hostname.replace(/^www\./, '');
  } catch {
    domain = content.brand || 'launch';
  }

  const context = { domain, media };

  // Write each scene as its own sub-composition.
  const scenes = [];
  for (let index = 0; index < plan.length; index++) {
    const scene = plan[index];
    const id = `scene-${index + 1}-${scene.type}`;

    const html = renderScene(scene, id, context)
      .replaceAll('{{WIDTH}}', String(width))
      .replaceAll('{{HEIGHT}}', String(height))
      .replaceAll('{{EASE}}', ease);

    await fs.writeFile(path.join(compositionsDir, `${id}.html`), html, 'utf8');

    scenes.push({
      id,
      type: scene.type,
      startSeconds: Number((scene.startMs / 1000).toFixed(3)),
      durationSeconds: Number((scene.durationMs / 1000).toFixed(3)),
    });
  }

  const totalSeconds = Number((totalMs / 1000).toFixed(3));

  // The host: tokens on :root, one slot per scene. Sub-compositions inherit
  // the custom properties, which is how a single token set styles the film.
  const hostSlots = scenes
    .map(
      (scene, index) => `      <div id="${scene.id}-host" class="clip"
           data-composition-id="${scene.id}"
           data-composition-src="compositions/${scene.id}.html"
           data-start="${scene.startSeconds}" data-duration="${scene.durationSeconds}"
           data-track-index="${index}"
           data-width="${width}" data-height="${height}"></div>`
    )
    .join('\n\n');

  const host = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <title>${escapeHtml(content.brand || cleanTitle(content.title))}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /* Every value here is measured from the target site. Scenes inherit
         them, so one token set styles the whole film. */
      :root {
        --ink: ${tokens.colour.ink};
        --canvas: ${tokens.colour.canvas};
        --accent: ${tokens.colour.accent.hex};
        --button-ink: ${tokens.colour.accent.onAccent ?? tokens.colour.canvas};
        --muted: ${tokens.colour.muted};
        --gutter: ${scale.gutter}px;
        --card-width: ${scale.cardWidth}px;
        --card-height: ${scale.cardHeight}px;
        --card-pad: ${scale.cardPad}px;
        --size-display: ${scale.display}px;
        --size-headline: ${scale.headline}px;
        --size-title: ${scale.title}px;
        --size-body: ${scale.body}px;
        --size-label: ${scale.label}px;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      html, body {
        width: ${width}px; height: ${height}px;
        overflow: hidden;
        background: var(--ink);
      }

      #root {
        position: relative;
        width: 100%; height: 100%;
        overflow: hidden;
        /* Only generic families, so no @font-face is required and the render
           never depends on fetching a font. */
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-synthesis: none;
      }

      .clip { position: absolute; inset: 0; overflow: hidden; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-width="${width}"
      data-height="${height}"
      data-duration="${totalSeconds}"
    >
${hostSlots}
    </div>

    <script>
      // The root carries no motion of its own. Each scene registers its own
      // timeline and the runtime nests them automatically.
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

  await fs.writeFile(path.join(projectDir, 'index.html'), host, 'utf8');

  // Manifests the CLI expects.
  await fs.writeFile(
    path.join(projectDir, 'hyperframes.json'),
    `${JSON.stringify({
      $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
      paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
      media: { autoProxy: true },
    }, null, 2)}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(projectDir, 'meta.json'),
    `${JSON.stringify({ id: 'launch', name: 'launch' }, null, 2)}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    `${JSON.stringify({
      name: 'launch-composition',
      private: true,
      type: 'module',
      scripts: {
        check: `npx --yes hyperframes@${hyperframesVersion} check`,
        render: `npx --yes hyperframes@${hyperframesVersion} render`,
      },
    }, null, 2)}\n`,
    'utf8'
  );

  return { projectDir, assetsDir, totalSeconds, scenes };
}
