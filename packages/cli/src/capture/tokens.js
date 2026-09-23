// Design token extraction.
//
// Everything here is measured from the rendered page rather than guessed.
// A single pass in the page collects computed styles from every painted
// element, weighted by the area that element actually covers, so a full
// bleed hero outranks a footnote. The clustering and role assignment then
// happen in Node, where they can be unit tested without a browser.

/**
 * The function evaluated inside the page. It must be self contained, because
 * it is serialised across the protocol boundary and has no access to this
 * module's scope.
 */
export function collectInPage() {
  /** Elements that never paint and would only add noise. */
  const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'NOSCRIPT', 'BR']);

  /** Parse a computed colour into RGBA, or null when it never paints. */
  function parseColour(value) {
    if (!value || value === 'transparent' || value === 'none') return null;
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    if (![r, g, b].every(Number.isFinite) || a === 0) return null;
    return { r, g, b, a };
  }

  /** Convert RGB to a lowercase hex string. */
  function toHex({ r, g, b }) {
    const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + part(r) + part(g) + part(b);
  }

  /** Pull the numeric pixel value out of a computed length. */
  function px(value) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  // Colour weights are accumulated by painted area. Text colour is weighted
  // by a rough glyph coverage rather than the full box, because a paragraph
  // colours far less of its rectangle than a filled panel does.
  const backgroundWeights = new Map();
  const textWeights = new Map();
  const colourSelectors = new Map();

  const typeSamples = [];
  const spacingCounts = new Map();
  const radiusCounts = new Map();
  const borderWidthCounts = new Map();
  const shadowCounts = new Map();
  const durationCounts = new Map();
  const easingCounts = new Map();

  /** Record a value against a frequency map. */
  function count(map, key, by = 1) {
    if (key === undefined || key === null || key === '') return;
    map.set(key, (map.get(key) ?? 0) + by);
  }

  /** Remember an example selector for a colour, for the tokens report. */
  function noteSelector(hex, element) {
    if (!colourSelectors.has(hex)) colourSelectors.set(hex, []);
    const list = colourSelectors.get(hex);
    if (list.length >= 3) return;
    const tag = element.tagName.toLowerCase();
    const className = typeof element.className === 'string' ? element.className.trim() : '';
    const selector = className ? tag + '.' + className.split(/\s+/)[0] : tag;
    if (!list.includes(selector)) list.push(selector);
  }

  const elements = document.querySelectorAll('*');

  for (const element of elements) {
    if (IGNORED_TAGS.has(element.tagName)) continue;

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area <= 0) continue;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;

    // Background colour, weighted by the full painted box.
    const background = parseColour(style.backgroundColor);
    if (background) {
      const hex = toHex(background);
      count(backgroundWeights, hex, area * background.a);
      noteSelector(hex, element);
    }

    // Text colour, only for elements holding their own text, weighted by an
    // approximate glyph coverage of the line box.
    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent.trim())
      .join(' ')
      .trim();

    if (ownText.length > 0) {
      const foreground = parseColour(style.color);
      if (foreground) {
        const hex = toHex(foreground);
        count(textWeights, hex, area * 0.32 * foreground.a);
        noteSelector(hex, element);
      }

      typeSamples.push({
        tag: element.tagName.toLowerCase(),
        fontSize: px(style.fontSize),
        lineHeight: style.lineHeight === 'normal' ? px(style.fontSize) * 1.2 : px(style.lineHeight),
        weight: Number.parseInt(style.fontWeight, 10) || 400,
        letterSpacing: style.letterSpacing === 'normal' ? 0 : px(style.letterSpacing),
        family: style.fontFamily,
        textTransform: style.textTransform,
        area,
        sample: ownText.slice(0, 80),
      });
    }

    // Spacing rhythm, collected from the values a designer actually set.
    const spacingProperties = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'rowGap', 'columnGap'];
    for (const property of spacingProperties) {
      const value = Math.round(px(style[property]));
      if (value > 0 && value <= 400) count(spacingCounts, value);
    }

    const radius = Math.round(px(style.borderTopLeftRadius));
    if (style.borderTopLeftRadius.includes('%')) count(radiusCounts, 999);
    else if (radius >= 0 && radius <= 200) count(radiusCounts, radius);

    const borderWidth = Math.round(px(style.borderTopWidth));
    if (borderWidth > 0 && borderWidth <= 20) count(borderWidthCounts, borderWidth);

    if (style.boxShadow && style.boxShadow !== 'none') count(shadowCounts, style.boxShadow);

    // Motion.
    //
    // Durations and timing functions are read as matched pairs, and a timing
    // function is only recorded when its own duration is greater than zero.
    //
    // This matters more than it looks. Every element in a document reports a
    // computed transition-timing-function of "ease" whether or not it has a
    // transition, so counting them all means the CSS default wins by sheer
    // volume and the handful of elements carrying the site's real curve are
    // drowned out. Pairing with the duration counts only declared motion.
    for (const [durationProperty, easingProperty] of [
      ['transitionDuration', 'transitionTimingFunction'],
      ['animationDuration', 'animationTimingFunction'],
    ]) {
      const durations = String(style[durationProperty]).split(',');
      // Split on commas that are not inside the brackets of a cubic-bezier.
      const easings = String(style[easingProperty]).split(/,(?![^(]*\))/);

      for (let i = 0; i < durations.length; i++) {
        const ms = Math.round(Number.parseFloat(durations[i].trim()) * 1000);
        if (!Number.isFinite(ms) || ms <= 0 || ms > 5000) continue;

        count(durationCounts, ms);

        // A shorthand may list fewer timing functions than durations, in
        // which case CSS repeats the list, so the index wraps.
        const easing = easings.length > 0 ? easings[i % easings.length].trim() : '';
        if (easing) count(easingCounts, easing);
      }
    }
  }

  // Custom properties declared on the root. Chromium exposes these when the
  // computed style declaration is iterated, which is the only route that
  // survives a cross origin stylesheet.
  const customProperties = {};
  try {
    const rootStyle = window.getComputedStyle(document.documentElement);
    for (const property of Array.from(rootStyle)) {
      if (property.startsWith('--')) {
        const value = rootStyle.getPropertyValue(property).trim();
        if (value && value.length <= 120) customProperties[property] = value;
      }
    }
  } catch {
    // Enumerating custom properties is a convenience, never a requirement.
  }

  // Loaded webfonts, plus the URLs they were fetched from.
  const loadedFonts = [];
  try {
    for (const face of document.fonts) {
      loadedFonts.push({ family: face.family, weight: face.weight, status: face.status });
    }
  } catch {
    // Some pages block access to the font set.
  }

  let fontUrls = [];
  try {
    fontUrls = performance
      .getEntriesByType('resource')
      .filter((entry) => /\.(woff2?|ttf|otf)(\?|$)/i.test(entry.name))
      .map((entry) => entry.name)
      .slice(0, 20);
  } catch {
    // Resource timing may be unavailable on a cross origin redirect chain.
  }

  // How many stylesheets could not be read, which is what limits custom
  // property names. Reported so the user knows why a field is thin.
  let blockedStylesheets = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      void sheet.cssRules.length;
    } catch {
      blockedStylesheets += 1;
    }
  }

  /** Turn a frequency map into a plain sorted array. */
  function toSorted(map) {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => ({ value: entry[0], weight: entry[1] }));
  }

  return {
    title: document.title || '',
    finalUrl: location.href,
    documentHeight: Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0
    ),
    rootBackground: window.getComputedStyle(document.documentElement).backgroundColor,
    bodyBackground: document.body ? window.getComputedStyle(document.body).backgroundColor : null,
    bodyColour: document.body ? window.getComputedStyle(document.body).color : null,
    backgrounds: toSorted(backgroundWeights),
    texts: toSorted(textWeights),
    colourSelectors: Object.fromEntries(colourSelectors),
    typeSamples,
    spacing: toSorted(spacingCounts),
    radii: toSorted(radiusCounts),
    borderWidths: toSorted(borderWidthCounts),
    shadows: toSorted(shadowCounts),
    durations: toSorted(durationCounts),
    easings: toSorted(easingCounts),
    customProperties,
    loadedFonts,
    fontUrls,
    blockedStylesheets,
    elementCount: elements.length,
  };
}
