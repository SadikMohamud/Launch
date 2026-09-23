// H.264 encoding.
//
// The argument list here is not arbitrary. Each part was verified against
// both the bundled FFmpeg (6.1.1, which is what a fresh install receives) and
// a current system FFmpeg (9.0.2), because the two disagree:
//
//   - scale's out_primaries and out_transfer options do not exist in 6.x at
//     all, so a filter chain using them fails with "Option not found".
//   - passing -color_primaries and -color_trc as output options tags the
//     stream correctly on 6.x but is dropped on 9.x.
//
// The h264_metadata bitstream filter writes the VUI directly and produces
// identical, correctly tagged output on both, so it is always applied.
//
// JPEG frames carry full range JFIF levels. Without the explicit range
// conversion the encode emits deprecated yuvj420p, which shifts levels in
// some players, so the conversion to limited range bt709 is not optional.

import path from 'node:path';
import { resolveFfmpeg, run } from '../ffmpeg.js';
import { frameName } from './frames.js';

/** Encoder settings per quality preset. */
const PRESETS = {
  final: { preset: 'slow', crf: '18' },
  draft: { preset: 'veryfast', crf: '26' },
};

/**
 * Build the FFmpeg argument array.
 *
 * Exposed separately from the run so the exact arguments can be asserted in a
 * unit test without spawning an encoder.
 *
 * @param {object} args
 * @returns {string[]}
 */
export function buildEncodeArgs({ framesDir, fps, quality, outputFile }) {
  const { preset, crf } = PRESETS[quality] ?? PRESETS.final;

  return [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-stats',

    // Input: the numbered JPEG sequence, read at the target frame rate.
    '-framerate', String(fps),
    '-i', path.join(framesDir, frameName(0).replace(/\d{6}/, '%06d')),

    // Convert full range JPEG levels to limited range bt709.
    '-vf', 'scale=in_range=full:out_range=limited:out_color_matrix=bt709',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-color_range', 'tv',

    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', crf,
    '-profile:v', 'high',
    '-level', '4.2',
    '-pix_fmt', 'yuv420p',

    // Put the moov atom first so the first frame decodes immediately when the
    // file is streamed, rather than after the whole file has downloaded.
    '-movflags', '+faststart',
    '-r', String(fps),

    // Force the colour VUI, which is the only approach that tags correctly on
    // both the bundled and current FFmpeg releases.
    '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0',

    outputFile,
  ];
}

/**
 * Encode the rendered frames into an MP4.
 *
 * @param {object} args
 * @param {string} args.framesDir
 * @param {number} args.fps
 * @param {'draft'|'final'} args.quality
 * @param {string} args.outputFile
 * @param {number} args.frameCount
 * @param {(done: number, total: number) => void} [args.onProgress]
 */
export async function encode({ framesDir, fps, quality, outputFile, frameCount, onProgress = () => {} }) {
  const ffmpeg = await resolveFfmpeg();
  const args = buildEncodeArgs({ framesDir, fps, quality, outputFile });

  const started = Date.now();

  await run(ffmpeg.path, args, {
    onStderr(chunk) {
      // FFmpeg reports progress on stderr as "frame=  123 fps=...".
      const match = /frame=\s*(\d+)/.exec(chunk);
      if (match) onProgress(Math.min(Number(match[1]), frameCount), frameCount);
    },
  });

  return { elapsedMs: Date.now() - started, ffmpeg };
}
