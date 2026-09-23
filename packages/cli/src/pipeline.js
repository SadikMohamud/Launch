// The render pipeline.
//
// Capture the target, download the media it owns, generate a HyperFrames
// project from its tokens and content, validate that project, render it, and
// write the poster alongside. Intermediates live in a temporary working
// directory that is removed afterwards unless --debug asks to keep it.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { capture } from './capture/index.js';
import { downloadMedia } from './capture/media.js';
import { writeProject } from './compose/project.js';
import { checkProject, renderProject, HYPERFRAMES_VERSION } from './render/hyperframes.js';
import { startDevServer } from './local-server.js';
import { resolveTarget, outputTimestamp } from './validate.js';
import { resolveFfmpeg, run as runBinary } from './ffmpeg.js';
import { LaunchError, EXIT } from './errors.js';
import { formatBytes, formatElapsed } from './progress.js';

/** Create the working directory for one run. */
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
 * Write the poster image.
 *
 * The frame is lifted from the finished film rather than rendered again.
 * That means it carries the film's H.264 compression, which is a real but
 * small cost, and it guarantees the poster matches a frame the viewer will
 * actually see. The JPEG is written at near lossless quality so nothing
 * further is lost on top.
 */
async function writePoster({ videoFile, posterFile, atSeconds }) {
  const ffmpeg = await resolveFfmpeg();

  await runBinary(ffmpeg.path, [
    '-y',
    '-v', 'error',
    '-ss', String(atSeconds),
    '-i', videoFile,
    '-frames:v', '1',
    '-q:v', '2',
    posterFile,
  ]);

  return posterFile;
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
    // Capture: tokens, content and stills.
    const { tokens, content } = await capture({
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

    // Create the output folder early, so a permission problem surfaces in
    // seconds rather than after a full render.
    await fs.mkdir(options.out, { recursive: true }).catch((cause) => {
      throw new LaunchError(
        `Could not create the output folder ${options.out}.`,
        { exitCode: EXIT.OUTPUT, fix: 'Choose another folder with --out.', cause }
      );
    });

    const stamp = outputTimestamp();
    const baseName = `${target.slug}-${stamp}`;
    const tokensFile = path.join(options.out, `${baseName}.tokens.json`);

    await fs.writeFile(
      tokensFile,
      `${JSON.stringify({ ...tokens, content: summariseContent(content) }, null, 2)}\n`,
      'utf8'
    );

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

    // Media: the site's own hero film and photography. This is what makes a
    // scene look designed rather than like a screen recording.
    const projectAssets = path.join(workDir, 'project', 'assets');
    await fs.mkdir(projectAssets, { recursive: true });

    reporter.stage('media', 'downloading the site\'s own film and photography');
    const media = await downloadMedia(content, projectAssets);

    // A captured still is copied in as the fallback for the opening scene,
    // so a site with no usable video still gets a hero.
    const heroStill = path.join(projectAssets, 'hero-still.png');
    await fs.copyFile(path.join(workDir, 'stills', 'hero.png'), heroStill).catch(() => {});
    media.heroStill = 'assets/hero-still.png';

    // Any site image that failed to download is replaced by a section still,
    // so the case study scenes always have a plate to sit on.
    if (media.images.length === 0) {
      const stills = await fs.readdir(path.join(workDir, 'stills'));
      for (const name of stills.filter((file) => file.startsWith('section-')).slice(0, 2)) {
        await fs.copyFile(path.join(workDir, 'stills', name), path.join(projectAssets, name));
        media.images.push(name);
      }
    }

    for (const warning of media.warnings) reporter.line(`  note: ${warning}`);

    reporter.stage(
      'media',
      `${media.heroVideo ? 'hero film' : 'no hero film'}, ${media.images.length} image${media.images.length === 1 ? '' : 's'}`
    );

    // Compose: generate the HyperFrames project.
    const project = await writeProject({
      tokens,
      content,
      media,
      options,
      workDir,
      hyperframesVersion: HYPERFRAMES_VERSION,
    });

    reporter.stage(
      'compose',
      `${project.scenes.length} scenes, ${project.totalSeconds}s: ${project.scenes.map((scene) => scene.type).join(', ')}`
    );

    // Validate before rendering. Several failures this catches are silent at
    // render time rather than loud, so skipping it is not a shortcut.
    reporter.stage('check', 'validating the composition');
    await checkProject(project.projectDir);

    // Render.
    const videoName = `${baseName}.mp4`;
    await renderProject({
      projectDir: project.projectDir,
      outputFile: videoName,
      quality: options.quality,
      fps: options.fps,
      onProgress: (percent, stage) => reporter.percent('render ', percent, stage),
    });

    reporter.done();

    // Move the film out of the working directory into the output folder.
    const videoFile = path.join(options.out, videoName);
    await fs.copyFile(path.join(project.projectDir, videoName), videoFile);

    // Poster, taken from the settled moment of the opening scene unless the
    // user named a different time.
    const posterFile = path.join(options.out, `${baseName}.jpg`);
    const posterAt = options.posterAt ?? Math.min(project.totalSeconds - 0.2, project.scenes[0].durationSeconds * 0.8);
    await writePoster({ videoFile, posterFile, atSeconds: posterAt });

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
      durationSeconds: project.totalSeconds,
      scenes: project.scenes.map((scene) => scene.type),
      sizeBytes: stats.size,
      sizeHuman: formatBytes(stats.size),
      warnings: [...tokens.warnings, ...media.warnings],
      elapsedMs: reporter.elapsedMs(),
      elapsedHuman: formatElapsed(reporter.elapsedMs()),
    };
  } finally {
    stopServer?.();
    await cleanUp(workDir, options.debug, reporter);
  }
}

/**
 * Reduce the extracted content to what belongs in the tokens report.
 *
 * The full content object carries every measured text node, which is far too
 * much to hand a user. This keeps what was actually used in the film.
 */
function summariseContent(content) {
  return {
    brand: content.brand,
    title: content.title,
    headline: content.headline,
    statements: (content.statements ?? []).map((entry) => entry.text),
    lists: (content.lists ?? []).map((entry) => entry.items),
    stats: content.stats ?? [],
    cta: content.cta,
    mediaFound: {
      videos: (content.media?.videos ?? []).length,
      images: (content.media?.images ?? []).length,
    },
  };
}
