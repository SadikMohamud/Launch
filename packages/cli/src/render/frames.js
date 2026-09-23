// Parallel frame rendering.
//
// Because every frame is a pure function of the timeline position, frames can
// be produced in any order and on any worker. That is the whole reason this
// stage can be parallelised at all, and it is why the composition runtime is
// forbidden from carrying state between frames.
//
// Measured on a 12 core machine at 1920x1080: a single worker writing PNG
// costs about 690ms per frame, a single worker writing JPEG about 69ms, and
// six workers writing JPEG about 28ms. PNG is not merely slower, it also
// exhausts capture at six workers and fails outright, so JPEG intermediates
// are the only configuration that renders a long film in reasonable time.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, openPage, freezeClock, closeQuietly } from '../capture/browser.js';
import { evaluateWithTimeout } from '../capture/settle.js';
import { LaunchError, EXIT } from '../errors.js';

/** Intermediate frame quality. High enough that the H.264 encode dominates. */
const FRAME_QUALITY = 95;

/** Draft renders trade quality for speed while iterating. */
const DRAFT_QUALITY = 78;

/**
 * Decide how many browsers to run.
 *
 * One core is left for the Node process and the encoder, and the pool is
 * capped at six because beyond that the gain flattens while memory use keeps
 * climbing. Each worker holds a full Chromium.
 */
export function workerCount(requested) {
  if (Number.isFinite(requested) && requested > 0) return Math.floor(requested);
  return Math.max(1, Math.min(6, os.cpus().length - 1));
}

/** Zero padded frame filename, so FFmpeg reassembles them in timeline order. */
export function frameName(index) {
  return `f_${String(index).padStart(6, '0')}.jpg`;
}

/**
 * Open one render worker on the composition, ready to be seeked.
 */
async function openWorker(compositionUrl, dimensions) {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, dimensions, { deviceScaleFactor: 1 });

  await page.goto(compositionUrl, { waitUntil: 'load' });

  // The runtime paints frame zero and then sets this flag, so waiting on it
  // guarantees no worker ever captures an unstyled frame.
  await page.waitForFunction(() => window.__launchReady === true, undefined, { timeout: 30_000 });

  // Fonts and images must be decoded before the first capture, or early
  // frames would show a different layout from later ones. Both waits are
  // bounded: a decode promise on an image that never loads stays pending
  // forever rather than rejecting, which would hang the whole render.
  await evaluateWithTimeout(page, () => document.fonts.ready, 10_000);
  await evaluateWithTimeout(page, () => Promise.all(
    Array.from(document.images)
      .filter((image) => !image.complete)
      .map((image) => image.decode().catch(() => {}))
  ), 15_000);

  await freezeClock(context, page);

  return { browser, page };
}

/**
 * Render every frame of the timeline into a directory of numbered JPEGs.
 *
 * @param {object} args
 * @param {string} args.compositionFile  path to the composition HTML
 * @param {object} args.timeline
 * @param {string} args.framesDir
 * @param {{ width: number, height: number }} args.dimensions
 * @param {'draft'|'final'} args.quality
 * @param {number} [args.workers]
 * @param {(done: number, total: number) => void} [args.onProgress]
 * @returns {Promise<{ frameCount: number, msPerFrame: number, workers: number }>}
 */
export async function renderFrames({
  compositionFile,
  timeline,
  framesDir,
  dimensions,
  quality,
  workers: requestedWorkers,
  onProgress = () => {},
}) {
  await fs.mkdir(framesDir, { recursive: true });

  const compositionUrl = pathToFileURL(compositionFile).href;
  const count = workerCount(requestedWorkers);
  const jpegQuality = quality === 'draft' ? DRAFT_QUALITY : FRAME_QUALITY;
  const { frameCount, fps } = timeline;

  const started = Date.now();
  let completed = 0;

  const pool = [];
  try {
    for (let i = 0; i < count; i++) {
      pool.push(await openWorker(compositionUrl, dimensions));
    }

    // Frames are interleaved across workers rather than split into blocks, so
    // a heavier passage of the timeline is shared by every worker instead of
    // landing entirely on one of them.
    await Promise.all(pool.map(async ({ page }, workerIndex) => {
      for (let n = workerIndex; n < frameCount; n += count) {
        await page.evaluate((ms) => window.__seek(ms), (n * 1000) / fps);
        await page.screenshot({
          path: path.join(framesDir, frameName(n)),
          type: 'jpeg',
          quality: jpegQuality,
        });

        completed += 1;
        if (completed % 10 === 0 || completed === frameCount) onProgress(completed, frameCount);
      }
    }));
  } finally {
    await Promise.all(pool.map(({ browser }) => closeQuietly(browser)));
  }

  // A missing frame would make FFmpeg silently end the sequence early, which
  // would produce a short film rather than an error, so the count is checked.
  const written = (await fs.readdir(framesDir)).filter((name) => name.endsWith('.jpg')).length;
  if (written !== frameCount) {
    throw new LaunchError(
      `Only ${written} of ${frameCount} frames were rendered.`,
      { exitCode: EXIT.OUTPUT, fix: 'Check free disk space, then try again. Run launch doctor for a full check.' }
    );
  }

  const elapsed = Date.now() - started;
  return { frameCount, msPerFrame: elapsed / frameCount, workers: count };
}

/**
 * Capture the poster as its own screenshot at the chosen time.
 *
 * Extracting a frame from the encoded video would inherit the H.264
 * compression. Capturing it directly keeps the poster sharp.
 */
export async function renderPoster({ compositionFile, timeline, dimensions, posterFile }) {
  const compositionUrl = pathToFileURL(compositionFile).href;
  const worker = await openWorker(compositionUrl, dimensions);

  try {
    await worker.page.evaluate((ms) => window.__seek(ms), timeline.posterAtMs);
    await worker.page.screenshot({ path: posterFile, type: 'jpeg', quality: 90 });
  } finally {
    await closeQuietly(worker.browser);
  }

  return posterFile;
}
