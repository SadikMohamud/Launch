// Unit tests for token shaping.
//
// These run against fixture census objects rather than a live browser, so the
// clustering and role assignment rules are pinned independently of any site.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contrastRatio,
  relativeLuminance,
  saturation,
  easingFamily,
  median,
  mode,
  pickInk,
  buildColourTokens,
  buildTypeTokens,
  buildMotionTokens,
  buildSpaceTokens,
  shapeTokens,
} from '../../src/capture/shape.js';

test('contrast ratio matches the WCAG reference values', () => {
  assert.equal(Number(contrastRatio('#ffffff', '#000000').toFixed(2)), 21);
  assert.equal(Number(contrastRatio('#ffffff', '#ffffff').toFixed(2)), 1);
  // The canonical 4.5:1 boundary colour on white.
  assert.ok(contrastRatio('#767676', '#ffffff') >= 4.5);
});

test('relative luminance orders colours correctly', () => {
  assert.ok(relativeLuminance('#ffffff') > relativeLuminance('#808080'));
  assert.ok(relativeLuminance('#808080') > relativeLuminance('#000000'));
});

test('saturation separates a brand colour from a neutral', () => {
  assert.ok(saturation('#c4623a') > 0.3);
  assert.equal(saturation('#808080'), 0);
});

test('pickInk rejects a text colour that matches the canvas', () => {
  // This is the luminaryhouse.co.uk case: the most used text colour is white
  // because headings sit over imagery, while the page background is also
  // white. Taking the most used colour outright renders white on white.
  const texts = [
    { value: '#ffffff', weight: 900 },
    { value: '#000000', weight: 400 },
  ];
  const warnings = [];
  assert.equal(pickInk(texts, '#ffffff', warnings), '#000000');
});

test('pickInk falls back to a legible colour when nothing contrasts', () => {
  const warnings = [];
  assert.equal(pickInk([{ value: '#fdfdfd', weight: 10 }], '#ffffff', warnings), '#000000');
  assert.equal(pickInk([{ value: '#010101', weight: 10 }], '#000000', warnings), '#ffffff');
  assert.equal(warnings.length, 2, 'each fallback is reported');
});

test('pickInk keeps the most used colour when it is legible', () => {
  assert.equal(pickInk([{ value: '#222222', weight: 10 }], '#ffffff'), '#222222');
});

test('colour tokens never produce an illegible ink and canvas pair', () => {
  const { tokens } = buildColourTokens({
    backgrounds: [{ value: '#ffffff', weight: 5000 }],
    texts: [{ value: '#ffffff', weight: 900 }, { value: '#111111', weight: 500 }],
    colourSelectors: {},
  });

  assert.notEqual(tokens.ink, tokens.canvas);
  assert.ok(tokens.inkOnCanvasContrast >= 4.5, `got ${tokens.inkOnCanvasContrast}`);
});

test('colour tokens pick a saturated accent over a neutral', () => {
  const { tokens } = buildColourTokens({
    backgrounds: [{ value: '#ffffff', weight: 5000 }, { value: '#eeeeee', weight: 800 }],
    texts: [{ value: '#111111', weight: 900 }, { value: '#c4623a', weight: 120 }],
    colourSelectors: {},
  });

  assert.equal(tokens.accent.hex, '#c4623a');
  assert.ok(tokens.accent.contrastOnCanvas >= 3);
  assert.equal(tokens.palette.find((entry) => entry.hex === '#c4623a').role, 'accent');
});

test('a monochrome page reports its accent fallback rather than inventing one', () => {
  const { tokens, warnings } = buildColourTokens({
    backgrounds: [{ value: '#ffffff', weight: 5000 }],
    texts: [{ value: '#000000', weight: 900 }],
    colourSelectors: {},
  });

  assert.equal(tokens.accent.hex, '#000000');
  assert.ok(warnings.some((warning) => /accent/i.test(warning)));
});

test('scheme is derived from the canvas luminance', () => {
  const dark = buildColourTokens({
    backgrounds: [{ value: '#0d0b0a', weight: 100 }],
    texts: [{ value: '#faf8f4', weight: 100 }],
    colourSelectors: {},
  });
  assert.equal(dark.tokens.scheme, 'dark');

  const light = buildColourTokens({
    backgrounds: [{ value: '#ffffff', weight: 100 }],
    texts: [{ value: '#111111', weight: 100 }],
    colourSelectors: {},
  });
  assert.equal(light.tokens.scheme, 'light');
});

test('type scale is ranked largest first and given roles', () => {
  const { tokens } = buildTypeTokens({
    typeSamples: [
      { tag: 'h1', fontSize: 72, lineHeight: 76, weight: 400, letterSpacing: -1.4, family: '"Canela", serif', area: 90000, sample: 'Considered spaces' },
      { tag: 'p', fontSize: 17, lineHeight: 27, weight: 400, letterSpacing: 0, family: '"Sohne", sans-serif', area: 40000, sample: 'We design and build' },
      { tag: 'p', fontSize: 17, lineHeight: 27, weight: 400, letterSpacing: 0, family: '"Sohne", sans-serif', area: 40000, sample: 'More body text' },
    ],
    loadedFonts: [{ family: 'Canela', weight: '400', status: 'loaded' }],
    fontUrls: ['https://example.com/canela.woff2'],
  });

  assert.equal(tokens.scale[0].px, 72);
  assert.equal(tokens.scale[0].role, 'display');
  assert.equal(tokens.scale[1].px, 17);
  assert.equal(tokens.scale[1].nodeCount, 2, 'samples of the same size are grouped');
  assert.equal(tokens.families[0].primary, 'Canela');
  assert.equal(tokens.families[0].loaded, true);
});

test('a page with no text reports that rather than failing', () => {
  const { tokens, warnings } = buildTypeTokens({ typeSamples: [] });
  assert.deepEqual(tokens.scale, []);
  assert.ok(warnings.some((warning) => /no text/i.test(warning)));
});

test('easing families are classified from their control points', () => {
  assert.equal(easingFamily('cubic-bezier(0.16, 1, 0.3, 1)'), 'out-strong');
  assert.equal(easingFamily('ease-in-out'), 'in-out-soft');
  assert.equal(easingFamily('linear'), 'linear');
  assert.equal(easingFamily('ease-in'), 'in');
  assert.equal(easingFamily('cubic-bezier(0.34, 1.56, 0.64, 1)'), 'overshoot');
  assert.equal(easingFamily('cubic-bezier(0.36, -0.4, 0.64, 1)'), 'anticipate');
  assert.equal(easingFamily('not-an-easing'), 'custom-curve');
});

test('motion tokens carry the dominant easing through', () => {
  const { tokens } = buildMotionTokens({
    easings: [
      { value: 'cubic-bezier(0.16, 1, 0.3, 1)', weight: 22 },
      { value: 'ease-out', weight: 3 },
    ],
    durations: [{ value: 400, weight: 10 }, { value: 200, weight: 6 }, { value: 800, weight: 2 }],
  });

  assert.equal(tokens.primaryEasing.value, 'cubic-bezier(0.16, 1, 0.3, 1)');
  assert.equal(tokens.primaryEasing.family, 'out-strong');
  assert.equal(tokens.medianDurationMs, 400);
});

test('a page with no motion gets a stated default rather than a silent one', () => {
  const { tokens, warnings } = buildMotionTokens({ easings: [], durations: [] });
  assert.ok(tokens.primaryEasing.value.startsWith('cubic-bezier'));
  assert.equal(tokens.medianDurationMs, 400);
  assert.ok(warnings.some((warning) => /no transition easings/i.test(warning)));
});

test('the spacing base unit recovers the grid the page was built on', () => {
  const space = buildSpaceTokens({
    spacing: [{ value: 8 }, { value: 16 }, { value: 24 }, { value: 40 }, { value: 64 }],
  });
  assert.equal(space.baseUnitPx, 8);
});

test('median and mode behave on even and odd length inputs', () => {
  assert.equal(median([1, 2, 3]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), 0);
  assert.equal(mode([400, 400, 700]), 400);
});

test('shapeTokens produces the documented schema and reports blocked stylesheets', () => {
  const tokens = shapeTokens(
    {
      title: 'Example',
      finalUrl: 'https://example.com/',
      documentHeight: 4200,
      elementCount: 512,
      backgrounds: [{ value: '#ffffff', weight: 100 }],
      texts: [{ value: '#111111', weight: 50 }],
      colourSelectors: {},
      typeSamples: [{ tag: 'h1', fontSize: 48, lineHeight: 52, weight: 700, letterSpacing: 0, family: 'Inter', area: 1000, sample: 'Hello' }],
      spacing: [{ value: 16 }],
      radii: [{ value: 4 }],
      borderWidths: [{ value: 1 }],
      shadows: [],
      durations: [{ value: 300 }],
      easings: [{ value: 'ease-out', weight: 4 }],
      customProperties: { '--brand': '#c4623a' },
      loadedFonts: [],
      fontUrls: [],
      blockedStylesheets: 3,
    },
    {
      capturedAt: '2026-09-23T14:02:11.884Z',
      engine: { name: 'launch', version: '1.0.0', chromium: '153.0.0.0' },
      requestedTarget: 'https://example.com',
      viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
      loadMs: 1200,
      media: { stills: [] },
    }
  );

  assert.equal(tokens.schemaVersion, 1);
  for (const key of ['source', 'colour', 'type', 'space', 'shape', 'motion', 'media', 'warnings']) {
    assert.ok(Object.hasOwn(tokens, key), `missing ${key}`);
  }
  assert.equal(tokens.source.title, 'Example');
  assert.equal(tokens.colour.customProperties['--brand'], '#c4623a');
  assert.ok(tokens.warnings.some((warning) => /3 cross origin stylesheets/.test(warning)));
});
