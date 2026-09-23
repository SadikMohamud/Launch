// Media download.
//
// The scenes use the target site's own hero film and photography. Those live
// on the site's own CDN, so they are fetched to the working directory before
// the composition references them. Every download is bounded in size and
// time, and a failure is never fatal: the composition falls back to a
// captured still.

import fs from 'node:fs/promises';
import path from 'node:path';

/** Hard ceilings, so a stray 400MB source file cannot stall a render. */
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120_000;

/** Media types we are willing to write to disk. */
const ALLOWED_TYPES = /^(video\/(mp4|webm)|image\/(jpeg|png|webp|avif))$/i;

/** Pick a file extension from the response type, falling back to the URL. */
function extensionFor(contentType, url) {
  const byType = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
  }[String(contentType).split(';')[0].toLowerCase()];

  if (byType) return byType;

  const fromUrl = path.extname(new URL(url).pathname).toLowerCase();
  return /^\.(mp4|webm|jpg|jpeg|png|webp|avif)$/.test(fromUrl) ? fromUrl : '.bin';
}

/**
 * Download one asset.
 *
 * Failures always carry a reason. A media download that fails silently
 * downgrades the film to screenshots with no way for anyone to find out why,
 * which is exactly the kind of quiet degradation this CLI is meant not to do.
 *
 * @returns {Promise<{ file: string, bytes: number } | { reason: string }>}
 */
async function download(url, destinationDir, baseName, maxBytes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Some CDNs vary the response on these, and a bare fetch can be
        // refused where a browser-like request succeeds.
        accept: 'video/*,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) return { reason: `the server returned HTTP ${response.status}` };

    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!ALLOWED_TYPES.test(contentType)) {
      return { reason: `unsupported media type "${contentType || 'unknown'}"` };
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > maxBytes) {
      return { reason: `it is ${(declaredLength / 1024 / 1024).toFixed(0)}MB, over the ${(maxBytes / 1024 / 1024).toFixed(0)}MB limit` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return { reason: 'the response was empty' };
    if (buffer.length > maxBytes) {
      return { reason: `it is ${(buffer.length / 1024 / 1024).toFixed(0)}MB, over the ${(maxBytes / 1024 / 1024).toFixed(0)}MB limit` };
    }

    const file = path.join(destinationDir, `${baseName}${extensionFor(contentType, url)}`);
    await fs.writeFile(file, buffer);

    return { file, bytes: buffer.length };
  } catch (error) {
    const reason = error?.name === 'AbortError'
      ? `it did not finish within ${DOWNLOAD_TIMEOUT_MS / 1000} seconds`
      : String(error?.message ?? error);
    return { reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the site's own media into the working directory.
 *
 * @param {object} content   the extracted content document
 * @param {string} assetsDir where files are written
 * @param {{ maxImages?: number }} [options]
 * @returns {Promise<{ heroVideo?: string, images: string[], warnings: string[] }>}
 */
export async function downloadMedia(content, assetsDir, { maxImages = 3 } = {}) {
  await fs.mkdir(assetsDir, { recursive: true });

  const warnings = [];
  const result = { heroVideo: undefined, images: [] };

  // The hero film: the largest video on the page, which is almost always the
  // full bleed background the site leads with.
  const [video] = content.media?.videos ?? [];
  if (video) {
    const saved = await download(video.src, assetsDir, 'hero-film', MAX_VIDEO_BYTES);
    if (saved.file) {
      result.heroVideo = path.basename(saved.file);
    } else {
      warnings.push(
        `The site's hero video was not used because ${saved.reason}. A captured still is used instead.`
      );
    }
  }

  // Photography, largest first, skipping anything that fails.
  const candidates = (content.media?.images ?? []).slice(0, maxImages * 3);
  const imageFailures = [];

  for (const image of candidates) {
    if (result.images.length >= maxImages) break;
    const saved = await download(image.src, assetsDir, `photo-${result.images.length + 1}`, MAX_IMAGE_BYTES);
    if (saved.file) result.images.push(path.basename(saved.file));
    else imageFailures.push(saved.reason);
  }

  if (result.images.length === 0 && candidates.length > 0) {
    const [firstReason] = imageFailures;
    warnings.push(
      `None of the site's images were used${firstReason ? ` because ${firstReason}` : ''}. Captured stills are used instead.`
    );
  }

  return { ...result, warnings };
}
