// Pixel colour sampling.
//
// A style census reads the stylesheet, which is not the same thing as reading
// the page. A site whose hero is a full bleed video or photograph carries
// almost all of its colour in pixels, so a CSS only palette reports a white
// canvas and no accent for a page that actually reads as magenta and black.
//
// FFmpeg is already a dependency, so it is used to downscale a still to a
// small grid of raw RGB bytes. That needs no image decoding library, works
// identically on every platform, and the area filter averages each cell so
// the result reflects coverage rather than sampling noise.

import { resolveFfmpeg } from '../ffmpeg.js';
import { spawn } from 'node:child_process';

/** Grid the still is reduced to. 32x32 is 3072 bytes and plenty of signal. */
const GRID = 32;

/** Colours are quantised to this many steps per channel before counting. */
const QUANTISE_STEPS = 12;

/**
 * Run FFmpeg and collect raw stdout bytes rather than text.
 *
 * @returns {Promise<Buffer>}
 */
function runRaw(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks = [];
    let stderr = '';

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

/** Convert a channel triplet to a hex string. */
function toHex(r, g, b) {
  const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** HSL saturation from RGB channels, on a 0 to 1 scale. */
function channelSaturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/**
 * Sample the dominant colours of an image file.
 *
 * Colours are quantised before counting so that a photographic gradient
 * collapses into a handful of representative entries instead of a thousand
 * near identical ones. Each reported colour is the true average of the
 * pixels in its bucket, not the quantised midpoint, so the result stays
 * faithful to the image.
 *
 * @param {string} file  a PNG or JPEG on disk
 * @param {number} [limit]  how many colours to return
 * @returns {Promise<{ hex: string, coverage: number, saturation: number }[]>}
 */
export async function samplePixels(file, limit = 10) {
  const ffmpeg = await resolveFfmpeg();

  let raw;
  try {
    raw = await runRaw(ffmpeg.path, [
      '-v', 'error',
      '-i', file,
      // Area scaling averages each source region, so the grid reflects how
      // much of the image each colour actually covers.
      '-vf', `scale=${GRID}:${GRID}:flags=area`,
      '-frames:v', '1',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      'pipe:1',
    ]);
  } catch {
    // Sampling is an enhancement. A still that cannot be read must not stop
    // the run, because the CSS palette is still available.
    return [];
  }

  const expected = GRID * GRID * 3;
  if (raw.length < expected) return [];

  // Bucket by quantised colour, accumulating true channel sums per bucket.
  const buckets = new Map();
  const step = 256 / QUANTISE_STEPS;

  for (let i = 0; i < expected; i += 3) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];

    const key =
      `${Math.floor(r / step)}-${Math.floor(g / step)}-${Math.floor(b / step)}`;

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const total = (expected / 3) || 1;

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((bucket) => {
      const r = bucket.r / bucket.count;
      const g = bucket.g / bucket.count;
      const b = bucket.b / bucket.count;
      return {
        hex: toHex(r, g, b),
        coverage: Number((bucket.count / total).toFixed(4)),
        saturation: Number(channelSaturation(r, g, b).toFixed(4)),
      };
    });
}
