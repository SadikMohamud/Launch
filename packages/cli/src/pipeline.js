// The render pipeline.
//
// Resolve the target, capture it, compose a timeline, render the frames,
// encode the film and write the poster. Every intermediate lives in a
// temporary working directory that is removed afterwards unless --debug asks
// to keep it.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { capture } from './capture/index.js';
import { buildTimeline } from './compose/timeline.js';
import { writeComposition } from './compose/index.js';
import { renderFrames, renderPoster } from './render/frames.js';
import { encode } from './render/encode.js';
import { startDevServer } from './local-server.js';
import { resolveTarget, outputTimestamp } from './validate.js';
import { LaunchError, EXIT } from './errors.js';
import { formatBytes, formatElapsed } from './progress.js';

/**
 * Create the working directory for one run.
 *
 * It lives under the system temporary directory rather than beside the
 * output, so a half finished run never leaves frames in the user's project.
 */
async function createWorkDir(slug) {
  const dir = path.join(os.tmpdir(), `launch-${slug}-${process.pid}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Remove the working directory, never failing the run if cleanup fails. */
async function cleanUp(workDir, keep, reporter) {
  if (keep) {
    reporter.line(`  working files kept at ${workDir}`);
    return;
  }

  try {
    await fs.rm(workDir, { recursive: true, force: true });
  } catch {
    // A locked temporary file is not worth failing a successful render over.
  }
}

/**
 * Run the whole pipeline.
 *
 * @param {string} rawTarget  what the user typed
 * @param {object} options    normalised CLI options
 * @param {object} reporter   from createReporter
 * @returns {Promise<object>} the result document
 */
export async function runPipeline(rawTarget, options, reporter) {
  const target = resolveTarget(rawTarget);

  let url = target.kind === 'url' ? target.url : undefined;
  let stopServer;

  // A folder target needs its development server running before anything can
  // be captured, and shut down afterwards whatever happens.
  if (target.kind === 'path') {
    const server = await startDevServer(target.dir, (stage, detail) => reporter.stage(stage, detail));
    url = server.url;
    stopServer = server.stop;
    reporter.stage('server', `serving ${url}`);
  }

  const workDir = await createWorkDir(target.slug);

  try {
    // Capture.
    const { tokens } = await capture({
      url,
      requestedTarget: rawTarget,
      workDir,
      options,
      onProgress: (stage, detail) => reporter.stage(stage, detail),
    });

    reporter.stage(
      'tokens',
      `${tokens.colour.palette.length} colours, ${tokens.type.scale.length} type sizes, ` +
      `easing ${tokens.motion.primaryEasing.family}`
    );

    for (const warning of tokens.warnings) reporter.line(`  note: ${warning}`);

    // The output folder is created before any expensive work, so a permission
    // problem surfaces in seconds rather than after a full render.
    await fs.mkdir(options.out, { recursive: true }).catch((cause) => {
      throw new LaunchError(
        `Could not create the output folder ${options.out}.`,
        { exitCode: EXIT.OUTPUT, fix: 'Choose another folder with --out.', cause }
      );
    });

    const stamp = outputTimestamp();
    const baseName = `${target.slug}-${stamp}`;
    const tokensFile = path.join(options.out, `${baseName}.tokens.json`);

    await fs.writeFile(tokensFile, `${JSON.stringify(tokens, null, 2)}\n`, 'utf8');

    // --tokens-only stops here, having produced something genuinely useful.
    if (options.tokensOnly) {
      const stillsTarget = path.join(options.out, `${baseName}-stills`);
      await fs.cp(path.join(workDir, 'stills'), stillsTarget, { recursive: true });

      return {
        ok: true,
        mode: 'tokens-only',
        tokens: tokensFile,
        stills: stillsTarget,
        warnings: tokens.warnings,
        elapsedMs: reporter.elapsedMs(),
      };
    }

    // Compose.
    const timeline = buildTimeline(tokens, options);
    const compositionFile = await writeComposition({
      tokens,
      timeline,
      workDir,
      dimensions: options.dimensions,
    });

    reporter.stage(
      'compose',
      `${timeline.scenes.length} scenes, ${(timeline.totalMs / 1000).toFixed(1)}s, ` +
      `${timeline.frameCount} frames at ${timeline.fps}fps`
    );

    // Render.
    const framesDir = path.join(workDir, 'frames');
    const render = await renderFrames({
      compositionFile,
      timeline,
      framesDir,
      dimensions: options.dimensions,
      quality: options.quality,
      onProgress: (done, total) => reporter.frames('render ', done, total),
    });

    reporter.stage('render', `${render.msPerFrame.toFixed(1)}ms per frame across ${render.workers} workers`);

    // Encode.
    const videoFile = path.join(options.out, `${baseName}.mp4`);
    const posterFile = path.join(options.out, `${baseName}.jpg`);

    await encode({
      framesDir,
      fps: options.fps,
      quality: options.quality,
      outputFile: videoFile,
      frameCount: timeline.frameCount,
      onProgress: (done, total) => reporter.frames('encode ', done, total),
    });

    await renderPoster({
      compositionFile,
      timeline,
      dimensions: options.dimensions,
      posterFile,
    });

    reporter.done();

    const stats = await fs.stat(videoFile);

    return {
      ok: true,
      mode: 'render',
      video: videoFile,
      poster: posterFile,
      tokens: tokensFile,
      format: options.format,
      dimensions: `${options.dimensions.width}x${options.dimensions.height}`,
      fps: options.fps,
      durationSeconds: Number((timeline.totalMs / 1000).toFixed(3)),
      frameCount: timeline.frameCount,
      sizeBytes: stats.size,
      sizeHuman: formatBytes(stats.size),
      scenes: timeline.scenes.map((scene) => scene.type),
      warnings: tokens.warnings,
      elapsedMs: reporter.elapsedMs(),
      elapsedHuman: formatElapsed(reporter.elapsedMs()),
    };
  } finally {
    stopServer?.();
    await cleanUp(workDir, options.debug, reporter);
  }
}
