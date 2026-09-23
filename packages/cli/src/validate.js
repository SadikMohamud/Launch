// Validation of everything the user can type.
//
// The CLI accepts exactly two kinds of target: an http or https URL, and a
// path to a local directory. Every other scheme is rejected outright rather
// than passed to a browser, because file:, data: and javascript: targets
// would let a crafted argument read local files or execute script in the
// capture context.

import fs from 'node:fs';
import path from 'node:path';
import { usageError } from './errors.js';

/** Schemes the capture browser is ever allowed to navigate to. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * Work out whether the target is a URL or a local directory, and reject
 * anything that is neither.
 *
 * @param {string} raw  the positional argument, or "." when omitted
 * @returns {{ kind: 'url', url: string, slug: string }
 *          | { kind: 'path', dir: string, slug: string }}
 */
export function resolveTarget(raw) {
  const value = String(raw ?? '.').trim();

  if (value === '') {
    throw usageError('No target given.', 'Pass a URL or a project folder, for example: launch https://example.com');
  }

  // A Windows absolute path begins with a drive letter followed by a colon,
  // which is indistinguishable from a single letter URL scheme. Drive paths
  // are therefore matched first, or "C:\Users\me\site" would be rejected as
  // an unsupported "c:" scheme.
  if (/^[a-zA-Z]:[\\/]/.test(value)) {
    return resolvePathTarget(value);
  }

  // Anything else carrying a scheme is treated as a URL, so a mistyped
  // "file://" is refused rather than silently resolved as a folder name.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return resolveUrlTarget(value);
  }

  return resolvePathTarget(value);
}

/** Validate a URL target and derive its output slug. */
function resolveUrlTarget(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw usageError(
      `"${value}" is not a valid URL.`,
      'URLs must be complete, for example: https://example.com'
    );
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw usageError(
      `The "${parsed.protocol}" scheme is not supported. Launch only opens http and https URLs.`,
      'Pass an https URL, or a path to a local project folder.'
    );
  }

  return { kind: 'url', url: parsed.href, slug: slugFromUrl(parsed) };
}

/** Validate a local directory target and derive its output slug. */
function resolvePathTarget(value) {
  const dir = path.resolve(value);

  let stat;
  try {
    stat = fs.statSync(dir);
  } catch {
    throw usageError(
      `No such folder: ${dir}`,
      'Check the path, or pass a URL instead.'
    );
  }

  if (!stat.isDirectory()) {
    throw usageError(
      `${dir} is a file, not a folder.`,
      'Point Launch at the project folder that contains package.json.'
    );
  }

  return { kind: 'path', dir, slug: slugFromPath(dir) };
}

/**
 * Turn a URL into a filename safe slug. The host carries the identity, so
 * "https://luminaryhouse.co.uk/about" becomes "luminaryhouse-co-uk".
 */
export function slugFromUrl(url) {
  const parsed = typeof url === 'string' ? new URL(url) : url;
  return sanitiseSlug(parsed.hostname.replace(/^www\./, ''));
}

/** Turn a directory path into a filename safe slug from its final segment. */
export function slugFromPath(dir) {
  return sanitiseSlug(path.basename(path.resolve(dir)));
}

/**
 * Reduce arbitrary text to lowercase ASCII, digits and hyphens.
 *
 * Non-ASCII characters are transliterated away rather than preserved,
 * because the slug becomes a filename and must survive every filesystem
 * the CLI runs on. The full original is kept in the tokens JSON.
 */
export function sanitiseSlug(input) {
  const slug = String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug || 'launch';
}

/**
 * Build the timestamp used in output filenames. Local time, sortable, and
 * free of characters that are illegal in Windows filenames.
 *
 * @param {Date} [now]
 * @returns {string} for example "20260923-140211"
 */
export function outputTimestamp(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/** Frame dimensions for each supported aspect ratio. */
export const FORMATS = {
  landscape: { width: 1920, height: 1080, label: '16:9' },
  vertical: { width: 1080, height: 1920, label: '9:16' },
  square: { width: 1080, height: 1080, label: '1:1' },
};

/**
 * Validate and normalise every flag. Commander has already rejected unknown
 * flags by this point, so this handles values rather than names.
 */
export function normaliseOptions(raw) {
  const format = String(raw.format ?? 'landscape').toLowerCase();
  if (!Object.hasOwn(FORMATS, format)) {
    throw usageError(
      `Unknown format "${raw.format}".`,
      `Use one of: ${Object.keys(FORMATS).join(', ')}`
    );
  }

  const fps = Number(raw.fps ?? 60);
  if (fps !== 30 && fps !== 60) {
    throw usageError(`Unknown frame rate "${raw.fps}".`, 'Use --fps 30 or --fps 60.');
  }

  const quality = String(raw.quality ?? 'final').toLowerCase();
  if (quality !== 'draft' && quality !== 'final') {
    throw usageError(`Unknown quality "${raw.quality}".`, 'Use --quality draft or --quality final.');
  }

  // Duration defaults come from the preset and are only overridden when the
  // user asks for a specific length.
  let duration = raw.duration === undefined ? undefined : Number(raw.duration);
  if (duration !== undefined) {
    if (!Number.isFinite(duration) || duration < 8 || duration > 90) {
      throw usageError(
        `Duration must be between 8 and 90 seconds, got "${raw.duration}".`,
        'For example: --duration 24'
      );
    }
  }

  const timeout = Number(raw.timeout ?? 30_000);
  if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 300_000) {
    throw usageError(
      `Timeout must be between 1000 and 300000 milliseconds, got "${raw.timeout}".`,
      'For example: --timeout 60000'
    );
  }

  let posterAt = raw.posterAt === undefined ? undefined : Number(raw.posterAt);
  if (posterAt !== undefined && (!Number.isFinite(posterAt) || posterAt < 0)) {
    throw usageError(
      `Poster time must be zero or greater, got "${raw.posterAt}".`,
      'For example: --poster-at 2.5'
    );
  }

  return {
    format,
    dimensions: FORMATS[format],
    fps,
    quality,
    duration,
    timeout,
    posterAt,
    long: Boolean(raw.long),
    tokensOnly: Boolean(raw.tokensOnly),
    waitFor: raw.waitFor ? String(raw.waitFor) : undefined,
    out: path.resolve(String(raw.out ?? 'launch-output')),
    json: Boolean(raw.json),
    debug: Boolean(raw.debug),
  };
}
