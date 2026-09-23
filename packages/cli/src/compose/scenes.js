// Scene templates.
//
// Each template returns one HyperFrames sub-composition file. They are
// deliberately built as sub-compositions rather than as sections of one
// document, because HyperFrames refuses a timed <video> nested inside
// another timed element, and because the timeline in Studio shows one row
// per top level element.
//
// Hard rules learned from the linter, all of which fail silently or
// catastrophically if broken:
//
//   - Asset paths are resolved against the project root, so "assets/x.mp4",
//     never "../assets/x.mp4".
//   - Every <video> needs an id or it renders as a frozen frame.
//   - A sub-composition root is styled by #root, never by a class.
//   - A text mask needs bottom padding and a matching negative margin, or
//     descenders are clipped off.
//   - Never pair a CSS initial transform with a GSAP tween on the same
//     property. Always use fromTo.

import { splitIntoLines } from '../capture/content.js';

/** Escape text for interpolation into HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render a headline as masked lines the runtime can stagger. */
function maskedLines(text, maxLines, maxChars) {
  return splitIntoLines(text, maxLines, maxChars)
    .map((line) => `<span class="line" data-layout-allow-overflow><span>${escapeHtml(line)}</span></span>`)
    .join('\n            ');
}

/**
 * Wrap scene markup, styles and timeline into a sub-composition file.
 *
 * @param {object} args
 * @param {string} args.id      the composition id, matching the host slot
 * @param {string} args.styles  CSS, scoped by #root
 * @param {string} args.body    markup inside #root
 * @param {string} args.timeline  the body of the timeline builder
 */
function subComposition({ id, styles, body, timeline }) {
  return `<!doctype html>
<html lang="en-GB">
  <head><meta charset="UTF-8" /><title>${escapeHtml(id)}</title></head>
  <body>
    <template>
      <style>
        /* The root is styled by id. A class selector here is rejected by
           lint as subcomposition_root_styled_by_class. */
        #root { position: absolute; inset: 0; overflow: hidden; }
        /* Masks carry headroom so descenders survive, and the negative
           margin puts the optical spacing back. */
        #root .line { display: block; overflow: hidden; padding-bottom: 0.16em; margin-bottom: -0.16em; }
        #root .line > span { display: block; }
${styles}
      </style>

      <div id="root" data-composition-id="${escapeHtml(id)}" data-width="{{WIDTH}}" data-height="{{HEIGHT}}">
${body}
      </div>

      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });
          const RISE = "{{EASE}}";
          const q = (selector) =>
            document.querySelectorAll('[data-composition-id="${id}"] ' + selector);
${timeline}
          window.__timelines["${id}"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
}

/**
 * Opening scene: the site's own hero film behind a card carrying the
 * headline. Falls back to a captured still when no film could be downloaded.
 */
export function heroScene({ id, headline, domain, media, duration }) {
  const isVideo = Boolean(media.heroVideo);
  const source = isVideo ? `assets/${media.heroVideo}` : media.heroStill;

  const mediaMarkup = isVideo
    ? `<video id="${id}-film" src="${escapeHtml(source)}" muted data-start="0" data-duration="${duration}"></video>`
    : `<img src="${escapeHtml(source)}" alt="" />`;

  return subComposition({
    id,
    styles: `        #root { background: var(--ink); }
        #root .media { position: absolute; inset: 0; }
        #root .media video, #root .media img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          display: block;
        }
        #root .scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.10) 42%, rgba(0,0,0,0.58) 100%);
        }
        #root .card {
          position: absolute;
          left: 50%; top: 50%;
          width: var(--card-width); margin-left: calc(var(--card-width) / -2);
          margin-top: calc(var(--card-height) / -2);
          background: var(--canvas);
          padding: var(--card-pad);
        }
        #root .card h1 {
          font-size: var(--size-display);
          line-height: 1.04; letter-spacing: -0.035em;
          font-weight: 700; color: var(--ink);
        }
        #root .badge {
          position: absolute;
          left: var(--gutter); bottom: var(--gutter);
          display: flex; align-items: center; gap: 18px;
          color: #ffffff;
          font-size: var(--size-label);
          letter-spacing: 0.22em; text-transform: uppercase;
        }
        #root .badge i { display: block; width: 58px; height: 3px; background: var(--accent); }`,
    body: `        <div class="media" data-layout-allow-overflow>${mediaMarkup}</div>
        <div class="scrim"></div>
        <div class="card">
          <h1>
            ${maskedLines(headline, 2, 22)}
          </h1>
        </div>
        <div class="badge"><i></i><span>${escapeHtml(domain)}</span></div>`,
    timeline: `          tl.fromTo(q(".media ${isVideo ? 'video' : 'img'}"), { scale: 1.0 }, { scale: 1.06, duration: ${duration}, ease: "none" }, 0);
          tl.fromTo(q(".card"), { yPercent: 7, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: RISE }, 0.2);
          tl.fromTo(q(".line > span"), { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: RISE, stagger: 0.09 }, 0.4);
          tl.fromTo(q(".badge"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: RISE }, 0.9);
          tl.fromTo(q(".badge i"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: RISE, transformOrigin: "0% 50%" }, 1.0);`,
  });
}

/** A statement scene: eyebrow label, large statement, accent rule. */
export function statementScene({ id, eyebrow, statement }) {
  return subComposition({
    id,
    styles: `        #root { background: var(--canvas); }
        #root .inner {
          position: absolute;
          left: var(--gutter); right: var(--gutter);
          top: 50%; transform: translateY(-50%);
        }
        #root .eyebrow {
          font-size: var(--size-label);
          letter-spacing: 0.26em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 44px;
        }
        #root h2 {
          font-size: var(--size-headline);
          line-height: 1.08; letter-spacing: -0.035em;
          font-weight: 700; color: var(--ink);
        }
        #root .rule {
          margin-top: 58px; width: 420px; height: 6px;
          background: var(--accent); transform-origin: 0 50%;
        }`,
    body: `        <div class="inner">
          <p class="eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>
            ${maskedLines(statement, 3, 24)}
          </h2>
          <div class="rule"></div>
        </div>`,
    timeline: `          tl.fromTo(q(".eyebrow"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: RISE }, 0.15);
          tl.fromTo(q(".line > span"), { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: RISE, stagger: 0.11 }, 0.3);
          tl.fromTo(q(".rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: RISE }, 0.95);`,
  });
}

/** A case study scene: a titled panel beside the site's own photography. */
export function caseStudyScene({ id, title, items, photo, index, duration }) {
  const listMarkup = items.length > 0
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';

  return subComposition({
    id,
    styles: `        #root { background: var(--ink); display: flex; }
        #root .left {
          position: relative; width: 46%;
          padding: 0 calc(var(--gutter) * 0.7);
          display: flex; flex-direction: column; justify-content: center;
          color: var(--canvas);
        }
        #root .left h3 {
          font-size: var(--size-title);
          line-height: 1.04; letter-spacing: -0.03em; font-weight: 700;
        }
        #root .rule { margin: 38px 0 34px; width: 180px; height: 5px; background: var(--accent); transform-origin: 0 50%; }
        #root ul { list-style: none; }
        #root li {
          font-size: var(--size-body);
          letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(255,255,255,0.82); padding: 9px 0;
        }
        #root .right { position: relative; width: 54%; overflow: hidden; }
        #root .right img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center; display: block;
        }
        #root .index {
          position: absolute; right: 54px; bottom: 46px;
          color: rgba(255,255,255,0.9);
          font-size: var(--size-label); letter-spacing: 0.2em;
        }`,
    body: `        <div class="left">
          <h3>
            ${maskedLines(title, 3, 18)}
          </h3>
          <div class="rule"></div>
          ${listMarkup}
        </div>
        <div class="right" data-layout-allow-overflow>
          <img src="${escapeHtml(photo)}" alt="" />
          <div class="index">${escapeHtml(index)}</div>
        </div>`,
    timeline: `          tl.fromTo(q(".line > span"), { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: RISE, stagger: 0.08 }, 0.15);
          tl.fromTo(q(".rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: RISE }, 0.4);
          tl.fromTo(q("li"), { opacity: 0, x: -22 }, { opacity: 1, x: 0, duration: 0.55, ease: RISE, stagger: 0.08 }, 0.55);
          tl.fromTo(q(".right img"), { scale: 1.10 }, { scale: 1.0, duration: ${duration}, ease: "none" }, 0);
          tl.fromTo(q(".index"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: RISE }, 0.9);`,
  });
}

/** A figures scene: the standout numbers the site publishes about itself. */
export function statsScene({ id, eyebrow, stats }) {
  const cells = stats
    .map(
      (stat) => `<div class="stat">
            <p class="figure">${escapeHtml(stat.value)}</p>
            <p class="label">${escapeHtml(stat.label)}</p>
          </div>`
    )
    .join('\n          ');

  return subComposition({
    id,
    styles: `        #root { background: var(--canvas); }
        #root .inner {
          position: absolute;
          left: var(--gutter); right: var(--gutter);
          top: 50%; transform: translateY(-50%);
        }
        #root .eyebrow {
          font-size: var(--size-label);
          letter-spacing: 0.26em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 64px;
        }
        #root .row { display: flex; gap: calc(var(--gutter) * 0.6); }
        #root .stat { flex: 1; }
        #root .figure {
          font-size: var(--size-headline);
          line-height: 1; letter-spacing: -0.04em;
          font-weight: 700; color: var(--ink);
        }
        #root .stat-rule { width: 84px; height: 5px; background: var(--accent); margin: 24px 0 20px; transform-origin: 0 50%; }
        #root .label {
          font-size: var(--size-body);
          color: var(--muted); max-width: 320px; line-height: 1.4;
        }`,
    body: `        <div class="inner">
          <p class="eyebrow">${escapeHtml(eyebrow)}</p>
          <div class="row">
          ${cells}
          </div>
        </div>`,
    timeline: `          tl.fromTo(q(".eyebrow"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: RISE }, 0.15);
          tl.fromTo(q(".figure"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.7, ease: RISE, stagger: 0.12 }, 0.3);
          tl.fromTo(q(".label"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: RISE, stagger: 0.12 }, 0.6);`,
  });
}

/** A full bleed photograph with a caption. */
export function galleryScene({ id, caption, photo, duration }) {
  return subComposition({
    id,
    styles: `        #root { background: var(--ink); }
        #root .media { position: absolute; inset: 0; }
        #root .media img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center; display: block;
        }
        #root .scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.62) 100%);
        }
        #root .caption {
          position: absolute;
          left: var(--gutter); right: var(--gutter); bottom: var(--gutter);
          color: #ffffff;
          font-size: var(--size-title);
          line-height: 1.08; letter-spacing: -0.03em; font-weight: 700;
        }`,
    body: `        <div class="media" data-layout-allow-overflow><img src="${escapeHtml(photo)}" alt="" /></div>
        <div class="scrim"></div>
        <div class="caption">
          ${maskedLines(caption, 2, 26)}
        </div>`,
    timeline: `          tl.fromTo(q(".media img"), { scale: 1.08 }, { scale: 1.0, duration: ${duration}, ease: "none" }, 0);
          tl.fromTo(q(".line > span"), { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: RISE, stagger: 0.1 }, 0.3);`,
  });
}

/** Closing scene: the call to action and the address. */
export function closingScene({ id, closing, cta, domain }) {
  const ctaMarkup = cta ? `<div class="button">${escapeHtml(cta)}</div>` : '';

  return subComposition({
    id,
    styles: `        #root { background: var(--ink); }
        #root .inner {
          position: absolute;
          left: var(--gutter); right: var(--gutter);
          top: 50%; transform: translateY(-50%);
        }
        #root h2 {
          font-size: var(--size-headline);
          line-height: 1.06; letter-spacing: -0.035em;
          font-weight: 700; color: var(--canvas);
        }
        #root .row { display: flex; align-items: center; gap: 40px; margin-top: 62px; flex-wrap: wrap; }
        #root .button {
          background: var(--accent); color: var(--button-ink);
          font-size: var(--size-body); font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          padding: 26px 52px;
        }
        #root .url { color: rgba(255,255,255,0.88); font-size: var(--size-body); }`,
    body: `        <div class="inner">
          <h2>
            ${maskedLines(closing, 2, 22)}
          </h2>
          <div class="row">
            ${ctaMarkup}
            <div class="url">${escapeHtml(domain)}</div>
          </div>
        </div>`,
    timeline: `          tl.fromTo(q(".line > span"), { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: RISE, stagger: 0.1 }, 0.2);
          tl.fromTo(q(".row"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: RISE }, 0.75);`,
  });
}
