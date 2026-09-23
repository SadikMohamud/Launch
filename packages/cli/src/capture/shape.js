// Turning a raw style census into design tokens.
//
// This module is deliberately pure. It takes the object the browser produced
// and returns the tokens JSON, with no browser and no filesystem involved, so
// every clustering and role assignment decision can be unit tested directly.

/** Parse a hex colour into its channels. */
export function hexToRgb(hex) {
  const value = String(hex).replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

/**
 * WCAG relative luminance. Used both for contrast ratios and for deciding
 * whether a page reads as light or dark.
 */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (raw) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours, from 1 to 21. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Saturation on the HSL scale, from 0 to 1. An accent colour is picked partly
 * on this, because a brand colour is almost always the most saturated thing
 * on an otherwise neutral page.
 */
export function saturation(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/**
 * Choose the canvas, ink and accent colours, and build the weighted palette.
 *
 * Canvas is the most painted background. Ink is the most used text colour.
 * Accent is the most saturated remaining colour that carries enough contrast
 * against the canvas to be legible when used for a rule or a label.
 */
export function buildColourTokens(raw) {
  const warnings = [];

  const backgrounds = raw.backgrounds ?? [];
  const texts = raw.texts ?? [];

  const canvas = backgrounds[0]?.value ?? '#ffffff';

  // Ink is the most used text colour that is actually legible on the canvas.
  //
  // Picking the most used text colour outright gives the wrong answer on any
  // page that sets white headings over dark imagery while keeping a white
  // page background: the winner then matches the canvas and the film would be
  // rendered white on white. Contrast is therefore a filter, not a report.
  const ink = pickInk(texts, canvas, warnings);

  // Everything seen, merged and normalised into a single weighted list.
  const combined = new Map();
  for (const entry of backgrounds) combined.set(entry.value, (combined.get(entry.value) ?? 0) + entry.weight);
  for (const entry of texts) combined.set(entry.value, (combined.get(entry.value) ?? 0) + entry.weight);

  const totalWeight = Array.from(combined.values()).reduce((sum, weight) => sum + weight, 0) || 1;

  const palette = Array.from(combined.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([hex, weight]) => ({
      hex,
      coverage: Number((weight / totalWeight).toFixed(4)),
      role: hex === canvas ? 'canvas' : hex === ink ? 'ink' : 'support',
      sampleSelectors: raw.colourSelectors?.[hex] ?? [],
    }));

  // The accent is scored on saturation first and usage second, so a small
  // but vivid brand colour beats a large expanse of near grey.
  const accentCandidates = palette
    .filter((entry) => entry.hex !== canvas && entry.hex !== ink)
    .map((entry) => ({
      ...entry,
      saturation: saturation(entry.hex),
      contrastOnCanvas: contrastRatio(entry.hex, canvas),
    }))
    .filter((entry) => entry.saturation > 0.15 && entry.contrastOnCanvas >= 3)
    .sort((a, b) => b.saturation * Math.log1p(b.coverage * 100) - a.saturation * Math.log1p(a.coverage * 100));

  let accent = accentCandidates[0];
  if (!accent) {
    // A strictly monochrome page has no accent to find. Falling back to the
    // ink colour keeps every downstream scene legible, and the fallback is
    // recorded rather than presented as a discovery.
    accent = { hex: ink, contrastOnCanvas: contrastRatio(ink, canvas) };
    warnings.push('No sufficiently saturated accent colour met a 3:1 contrast ratio. Falling back to the text colour.');
  } else {
    const entry = palette.find((item) => item.hex === accent.hex);
    if (entry) entry.role = 'accent';
  }

  return {
    tokens: {
      scheme: relativeLuminance(canvas) < 0.35 ? 'dark' : 'light',
      canvas,
      ink,
      accent: {
        hex: accent.hex,
        contrastOnCanvas: Number(accent.contrastOnCanvas.toFixed(2)),
      },
      inkOnCanvasContrast: Number(contrastRatio(ink, canvas).toFixed(2)),
      palette,
      customProperties: raw.customProperties ?? {},
    },
    warnings,
  };
}

/**
 * Choose the text colour, preferring the most used one that stays legible.
 *
 * The thresholds follow WCAG: 4.5:1 is the AA body text ratio and 3:1 is the
 * AA large text ratio. If nothing on the page clears either, the page is
 * relying on imagery for contrast, and plain black or white is chosen by the
 * canvas luminance so downstream scenes remain readable.
 *
 * @param {{ value: string, weight: number }[]} texts  text colours by usage
 * @param {string} canvas                              the page background
 * @param {string[]} warnings                          collected for the report
 */
export function pickInk(texts, canvas, warnings = []) {
  for (const threshold of [4.5, 3]) {
    const found = texts.find((entry) => contrastRatio(entry.value, canvas) >= threshold);
    if (found) {
      if (threshold === 3) {
        warnings.push('The most used text colour only meets the large text contrast ratio against the page background.');
      }
      return found.value;
    }
  }

  const fallback = relativeLuminance(canvas) > 0.5 ? '#000000' : '#ffffff';
  warnings.push(
    `No text colour on the page contrasts with the background at 3:1 or better. Using ${fallback} so the output stays legible.`
  );
  return fallback;
}

/**
 * Cluster the observed type samples into a scale.
 *
 * Sizes are grouped to the nearest pixel and ranked by total painted area, so
 * the display face is whatever actually dominates the page rather than
 * whatever happens to sit in an h1.
 */
export function buildTypeTokens(raw) {
  const samples = raw.typeSamples ?? [];
  const warnings = [];

  if (samples.length === 0) {
    return {
      tokens: { families: [], scale: [] },
      warnings: ['No text was found on the page, so no typographic scale could be measured.'],
    };
  }

  // Families, ranked by the area they cover.
  const familyAreas = new Map();
  for (const sample of samples) {
    familyAreas.set(sample.family, (familyAreas.get(sample.family) ?? 0) + sample.area);
  }
  const totalArea = Array.from(familyAreas.values()).reduce((sum, area) => sum + area, 0) || 1;

  const orderedFamilies = Array.from(familyAreas.entries()).sort((a, b) => b[1] - a[1]);

  const families = orderedFamilies.slice(0, 4).map(([stack, area], index) => {
    const primary = String(stack).split(',')[0].replace(/["']/g, '').trim();
    const loaded = (raw.loadedFonts ?? []).some(
      (face) => String(face.family).replace(/["']/g, '').toLowerCase() === primary.toLowerCase()
    );
    return {
      primary,
      stack,
      role: index === 0 ? 'display' : index === 1 ? 'body' : 'support',
      nodeCount: samples.filter((sample) => sample.family === stack).length,
      areaShare: Number((area / totalArea).toFixed(4)),
      webfontUrls: raw.fontUrls ?? [],
      loaded,
    };
  });

  if (families.length > 0 && !families.some((family) => family.loaded) && (raw.fontUrls ?? []).length > 0) {
    warnings.push('Webfonts were requested but none reported as loaded. The capture may show fallback typefaces.');
  }

  // The scale, grouped by rounded size and ranked by the largest first.
  const sizeGroups = new Map();
  for (const sample of samples) {
    const key = Math.round(sample.fontSize);
    if (!sizeGroups.has(key)) sizeGroups.set(key, []);
    sizeGroups.get(key).push(sample);
  }

  const scale = Array.from(sizeGroups.entries())
    .map(([px, group]) => {
      const dominant = group.reduce((best, item) => (item.area > best.area ? item : best), group[0]);
      return {
        px,
        lineHeightPx: Math.round(median(group.map((item) => item.lineHeight))),
        weight: mode(group.map((item) => item.weight)),
        letterSpacingPx: Number(median(group.map((item) => item.letterSpacing)).toFixed(2)),
        family: dominant.family,
        nodeCount: group.length,
        totalArea: Math.round(group.reduce((sum, item) => sum + item.area, 0)),
        sampleText: dominant.sample,
      };
    })
    .sort((a, b) => b.px - a.px);

  // Role names are assigned from the ranked sizes, which is more reliable
  // than trusting heading tags on a page that styles divs as headings.
  const roles = ['display', 'headline', 'subhead', 'body', 'caption'];
  for (let i = 0; i < scale.length; i++) {
    scale[i].role = i < roles.length ? roles[i] : 'detail';
  }

  return { tokens: { families, scale: scale.slice(0, 8) }, warnings };
}

/** Spacing rhythm and the base unit the page appears to be built on. */
export function buildSpaceTokens(raw) {
  const spacing = (raw.spacing ?? []).map((entry) => entry.value);
  const rhythm = (raw.spacing ?? [])
    .slice(0, 8)
    .map((entry) => entry.value)
    .sort((a, b) => a - b);

  // The base unit is the largest value from 4 to 16 that divides most of the
  // observed spacing cleanly, which recovers the grid a designer worked to.
  //
  // Ties are broken towards the larger unit on purpose. A page built on an
  // 8px grid is also perfectly divisible by 4, and reporting 4 would describe
  // the arithmetic rather than the design. Candidates are ordered ascending,
  // so accepting an equal score lets the largest explanation win.
  let baseUnit = 8;
  let bestScore = 0;
  for (const candidate of [4, 5, 6, 8, 10, 12, 16]) {
    const score = spacing.filter((value) => value % candidate === 0).length;
    if (score > 0 && score >= bestScore) {
      bestScore = score;
      baseUnit = candidate;
    }
  }

  return {
    baseUnitPx: baseUnit,
    rhythmPx: rhythm,
  };
}

/** Corner radii, border widths and shadows, as observed. */
export function buildShapeTokens(raw) {
  return {
    radiiPx: (raw.radii ?? []).slice(0, 5).map((entry) => entry.value).sort((a, b) => a - b),
    borderWidthsPx: (raw.borderWidths ?? []).slice(0, 3).map((entry) => entry.value),
    shadows: (raw.shadows ?? []).slice(0, 3).map((entry) => entry.value),
  };
}

/**
 * The motion signature. This is what makes an output film feel like the site
 * it came from, so the dominant easing and typical duration are carried
 * through into every scene rather than being replaced by a house default.
 */
export function buildMotionTokens(raw) {
  const warnings = [];
  const easings = (raw.easings ?? []).filter((entry) => entry.value && entry.value !== 'linear');
  const durations = (raw.durations ?? []).map((entry) => entry.value);

  const primary = easings[0]?.value ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  if (easings.length === 0) {
    warnings.push('No transition easings were found on the page. A neutral ease out is used instead.');
  }

  const medianDuration = durations.length > 0 ? Math.round(median(durations)) : 400;

  return {
    tokens: {
      primaryEasing: {
        value: primary,
        family: easingFamily(primary),
        count: easings[0]?.weight ?? 0,
      },
      easings: easings.slice(0, 6).map((entry) => ({
        value: entry.value,
        family: easingFamily(entry.value),
        count: entry.weight,
      })),
      medianDurationMs: medianDuration,
      durationsMs: (raw.durations ?? []).slice(0, 6).map((entry) => entry.value).sort((a, b) => a - b),
    },
    warnings,
  };
}

/**
 * Classify an easing into a family, which is what the scene system reasons
 * about when it decides how emphatic a transition should feel.
 */
export function easingFamily(easing) {
  const value = String(easing).trim();
  if (value === 'linear') return 'linear';
  if (value === 'ease-in') return 'in';
  if (value === 'ease-out') return 'out-soft';
  if (value === 'ease-in-out') return 'in-out-soft';
  if (value === 'ease') return 'out-soft';

  const match = value.match(/cubic-bezier\(([^)]+)\)/);
  if (!match) return 'custom-curve';

  const [x1, y1, x2, y2] = match[1].split(',').map((part) => Number(part.trim()));
  if (![x1, y1, x2, y2].every(Number.isFinite)) return 'custom-curve';

  // A control point above 1 overshoots the target, which reads as a spring.
  if (y1 > 1 || y2 > 1) return 'overshoot';
  // A negative control point pulls back before moving, which reads as anticipation.
  if (y1 < 0 || y2 < 0) return 'anticipate';
  // A late, high second control point is the signature of a strong ease out.
  if (x2 < 0.5 && y2 > 0.9) return 'out-strong';
  if (x1 > 0.5) return 'in-out-strong';
  return 'out-soft';
}

/** Median of a numeric list. */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Most frequent value in a list, with the first seen winning a tie. */
export function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = values[0];
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Assemble the complete tokens document.
 *
 * @param {object} raw     the object returned by the in page collector
 * @param {object} meta    capture metadata that only Node knows
 * @returns {object} the tokens JSON, matching the documented schema
 */
export function shapeTokens(raw, meta) {
  const colour = buildColourTokens(raw);
  const type = buildTypeTokens(raw);
  const motion = buildMotionTokens(raw);

  const warnings = [...colour.warnings, ...type.warnings, ...motion.warnings];

  if (raw.blockedStylesheets > 0) {
    warnings.push(
      `${raw.blockedStylesheets} cross origin stylesheet${raw.blockedStylesheets === 1 ? '' : 's'} could not be enumerated, so custom property names may be incomplete.`
    );
  }

  return {
    schemaVersion: 1,
    capturedAt: meta.capturedAt,
    engine: meta.engine,
    source: {
      requestedTarget: meta.requestedTarget,
      finalUrl: raw.finalUrl,
      title: raw.title,
      viewport: meta.viewport,
      documentHeightPx: raw.documentHeight,
      elementCount: raw.elementCount,
      loadMs: meta.loadMs,
    },
    colour: colour.tokens,
    type: type.tokens,
    space: buildSpaceTokens(raw),
    shape: buildShapeTokens(raw),
    motion: motion.tokens,
    media: meta.media ?? { stills: [] },
    warnings,
  };
}
