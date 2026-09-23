// Unit tests for argument and target validation.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {
  resolveTarget,
  slugFromUrl,
  slugFromPath,
  sanitiseSlug,
  outputTimestamp,
  normaliseOptions,
  FORMATS,
} from '../../src/validate.js';

test('accepts http and https URLs', () => {
  for (const url of ['https://example.com', 'http://example.com/path?q=1']) {
    const target = resolveTarget(url);
    assert.equal(target.kind, 'url');
  }
});

test('rejects every scheme other than http and https', () => {
  const blocked = [
    'file:///etc/passwd',
    'file://C:/Windows/System32/config/SAM',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com',
    'chrome://settings',
    'view-source:https://example.com',
  ];

  for (const target of blocked) {
    assert.throws(
      () => resolveTarget(target),
      (error) => error.exitCode === 2 && /not supported|not a valid URL/.test(error.message),
      `expected ${target} to be rejected`
    );
  }
});

test('rejects a malformed URL rather than treating it as a path', () => {
  assert.throws(() => resolveTarget('https://'), /not a valid URL/);
});

test('resolves an existing directory as a path target', () => {
  const target = resolveTarget(os.tmpdir());
  assert.equal(target.kind, 'path');
  assert.equal(target.dir, path.resolve(os.tmpdir()));
});

test('rejects a path that does not exist', () => {
  assert.throws(() => resolveTarget('./definitely-not-a-real-folder-9f3a'), /No such folder/);
});

test('rejects a file where a folder is required', () => {
  const file = path.join(os.tmpdir(), `launch-test-${process.pid}.txt`);
  fs.writeFileSync(file, 'x');
  try {
    assert.throws(() => resolveTarget(file), /is a file, not a folder/);
  } finally {
    fs.rmSync(file);
  }
});

test('treats a Windows drive path as a path, not a "c:" URL scheme', () => {
  // A drive letter followed by a colon is indistinguishable from a single
  // letter URL scheme, so this ordering has to be pinned by a test.
  const target = resolveTarget(process.platform === 'win32' ? os.tmpdir() : '/tmp');
  assert.equal(target.kind, 'path');

  if (process.platform === 'win32') {
    assert.match(os.tmpdir(), /^[a-zA-Z]:[\\/]/, 'the fixture must actually be a drive path');
  }
});

test('still rejects file:// on Windows, where it also starts with a letter', () => {
  assert.throws(() => resolveTarget('file://C:/Windows/win.ini'), /not supported/);
});

test('derives a filename safe slug from a URL host', () => {
  assert.equal(slugFromUrl('https://www.luminaryhouse.co.uk/about'), 'luminaryhouse-co-uk');
  assert.equal(slugFromUrl('https://Example.COM'), 'example-com');
});

test('derives a slug from the final path segment', () => {
  assert.equal(slugFromPath('/projects/My Site'), 'my-site');
});

test('transliterates non-ASCII characters out of slugs', () => {
  assert.equal(sanitiseSlug('Café Münster 2026!'), 'cafe-munster-2026');
  assert.equal(sanitiseSlug('日本語'), 'launch', 'an unmappable name still yields a usable slug');
  assert.equal(sanitiseSlug('---'), 'launch');
});

test('slugs never exceed a safe filename length', () => {
  assert.ok(sanitiseSlug('a'.repeat(300)).length <= 64);
});

test('builds a sortable timestamp with no illegal filename characters', () => {
  const stamp = outputTimestamp(new Date(2026, 8, 23, 14, 2, 11));
  assert.equal(stamp, '20260923-140211');
  assert.doesNotMatch(stamp, /[:\\/*?"<>|]/);
});

test('every format maps to concrete frame dimensions', () => {
  for (const [name, dimensions] of Object.entries(FORMATS)) {
    assert.ok(dimensions.width > 0 && dimensions.height > 0, `${name} needs dimensions`);
    assert.equal(dimensions.width % 2, 0, 'H.264 requires even dimensions');
    assert.equal(dimensions.height % 2, 0, 'H.264 requires even dimensions');
  }
});

test('normalises defaults', () => {
  const options = normaliseOptions({});
  assert.equal(options.format, 'landscape');
  assert.equal(options.fps, 60);
  assert.equal(options.quality, 'final');
  assert.equal(options.long, false);
  assert.deepEqual(options.dimensions, FORMATS.landscape);
});

test('rejects out of range and unknown option values', () => {
  assert.throws(() => normaliseOptions({ format: 'widescreen' }), /Unknown format/);
  assert.throws(() => normaliseOptions({ fps: 24 }), /Unknown frame rate/);
  assert.throws(() => normaliseOptions({ quality: 'ultra' }), /Unknown quality/);
  assert.throws(() => normaliseOptions({ duration: 4 }), /between 8 and 90/);
  assert.throws(() => normaliseOptions({ duration: 120 }), /between 8 and 90/);
  assert.throws(() => normaliseOptions({ duration: 'soon' }), /between 8 and 90/);
  assert.throws(() => normaliseOptions({ timeout: 10 }), /between 1000 and 300000/);
  assert.throws(() => normaliseOptions({ posterAt: -1 }), /zero or greater/);
});

test('accepts the full range of valid option values', () => {
  assert.equal(normaliseOptions({ format: 'vertical' }).dimensions.width, 1080);
  assert.equal(normaliseOptions({ fps: 30 }).fps, 30);
  assert.equal(normaliseOptions({ quality: 'draft' }).quality, 'draft');
  assert.equal(normaliseOptions({ duration: 8 }).duration, 8);
  assert.equal(normaliseOptions({ duration: 90 }).duration, 90);
  assert.equal(normaliseOptions({ long: true }).long, true);
});

test('resolves the output folder to an absolute path', () => {
  assert.ok(path.isAbsolute(normaliseOptions({}).out));
  assert.ok(path.isAbsolute(normaliseOptions({ out: 'films' }).out));
});
