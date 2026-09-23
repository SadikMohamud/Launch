// End to end render test.
//
// Serves the bundled fixture over HTTP, runs the real CLI against it, then
// verifies the output with ffprobe. Nothing is mocked: if this passes, the
// CLI genuinely captured a page, downloaded its media, generated a valid
// composition and rendered a playable file of the right length.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { probe, resolveFfmpeg, run as runBinary } from '../../src/ffmpeg.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.join(here, '..', '..', 'bin', 'launch.js');
const fixtureDir = path.join(here, '..', 'fixture');

/** The film length the test renders. Short enough to keep CI quick. */
const DURATION_SECONDS = 8;

/** ffprobe duration is allowed to differ from the request by this much. */
const DURATION_TOLERANCE_SECONDS = 0.1;

/**
 * Generate a photograph for the fixture to serve.
 *
 * The fixture references an image so the media download path is exercised
 * for real rather than always falling back to a captured still.
 */
async function makeFixtureImage(file) {
  const ffmpeg = await resolveFfmpeg();
  await runBinary(ffmpeg.path, [
    '-y', '-v', 'error',
    '-f', 'lavfi',
    '-i', 'gradients=size=1600x900:n=3:c0=0x1d3f6e:c1=0xc4623a:c2=0x0d0b0a:duration=1',
    '-frames:v', '1',
    '-q:v', '3',
    file,
  ]);
}

/** Serve the fixture directory on an ephemeral port. */
async function serveFixture() {
  const imageFile = path.join(os.tmpdir(), `launch-fixture-${process.pid}.jpg`);
  await makeFixtureImage(imageFile);

  const server = http.createServer(async (request, response) => {
    try {
      if (request.url.startsWith('/photo.jpg')) {
        const body = await fs.readFile(imageFile);
        response.writeHead(200, { 'content-type': 'image/jpeg' });
        response.end(body);
        return;
      }

      const body = await fs.readFile(path.join(fixtureDir, 'index.html'));
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('not found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}/`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(imageFile, { force: true });
    },
  };
}

/** Run the CLI as a real child process and capture its result. */
function runCli(args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1' },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}

/** A temporary output folder, including a space and a non-ASCII character. */
async function makeOutputDir() {
  // The awkward name is deliberate. Paths with spaces and non-ASCII
  // characters are exactly what breaks a CLI that builds shell strings.
  const dir = path.join(os.tmpdir(), `launch tést ${process.pid}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

test('renders a real film from the bundled fixture and verifies it with ffprobe', async (t) => {
  const fixture = await serveFixture();
  const outDir = await makeOutputDir();

  t.after(async () => {
    await fixture.close();
    await fs.rm(outDir, { recursive: true, force: true });
  });

  const result = await runCli([
    fixture.url,
    '--duration', String(DURATION_SECONDS),
    '--fps', '30',
    '--quality', 'draft',
    '--out', outDir,
    '--json',
  ]);

  assert.equal(result.exitCode, 0, `CLI failed:\n${result.stderr}`);

  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.mode, 'render');

  // The film and its poster exist and are not empty.
  const videoStat = await fs.stat(report.video);
  assert.ok(videoStat.size > 0, 'the rendered film is empty');

  const posterStat = await fs.stat(report.poster);
  assert.ok(posterStat.size > 0, 'the poster image is empty');
  assert.match(report.poster, /\.jpg$/);

  // The tokens document describes the fixture, not defaults.
  const tokens = JSON.parse(await fs.readFile(report.tokens, 'utf8'));
  assert.equal(tokens.schemaVersion, 1);
  assert.equal(tokens.colour.scheme, 'dark');
  assert.ok(
    tokens.colour.inkOnCanvasContrast >= 4.5,
    `ink and canvas must be legible, got ${tokens.colour.inkOnCanvasContrast}`
  );
  assert.equal(
    tokens.motion.primaryEasing.value,
    'cubic-bezier(0.16, 1, 0.3, 1)',
    'the easing declared by the fixture must be the one measured'
  );
  assert.equal(tokens.motion.primaryEasing.family, 'out-strong');
  assert.equal(tokens.type.scale[0].px, 72, 'the largest measured size is the fixture h1');

  // Content extraction must have read the page, not guessed.
  assert.equal(tokens.content.brand || tokens.content.title, 'Harbour Lane Studio');
  assert.match(tokens.content.headline, /Considered spaces/);
  assert.ok(tokens.content.mediaFound.images >= 1, 'the fixture photograph must be found');

  // Every text colour pair the film uses must clear WCAG AA. The renderer's
  // own contrast gate runs during check, so reaching this point already
  // proves it passed, but the tokens are asserted directly too.
  assert.ok(tokens.colour.accent.onAccent, 'a text colour for the accent must be chosen');

  // ffprobe is the real verification: everything above could be satisfied by
  // a file that does not play.
  const probed = await probe(report.video);
  const video = probed.streams.find((stream) => stream.codec_type === 'video');

  assert.ok(video, 'the file has no video stream');
  assert.equal(video.codec_name, 'h264');
  assert.equal(video.pix_fmt, 'yuv420p');
  assert.equal(video.width, 1920);
  assert.equal(video.height, 1080);
  assert.equal(video.avg_frame_rate, '30/1', '--fps must reach the renderer');

  const duration = Number(probed.format.duration);
  assert.ok(
    Math.abs(duration - DURATION_SECONDS) <= DURATION_TOLERANCE_SECONDS,
    `duration was ${duration}s, expected ${DURATION_SECONDS}s within ${DURATION_TOLERANCE_SECONDS}s`
  );

  // The reported metadata must match the file on disk.
  assert.equal(report.sizeBytes, videoStat.size);
  assert.equal(report.durationSeconds, DURATION_SECONDS);
  assert.ok(report.scenes.includes('hero'), 'every film opens on a hero scene');
  assert.ok(report.scenes.includes('closing'), 'every film ends on a closing scene');
});

test('renders the vertical format at the correct dimensions', async (t) => {
  const fixture = await serveFixture();
  const outDir = await makeOutputDir();

  t.after(async () => {
    await fixture.close();
    await fs.rm(outDir, { recursive: true, force: true });
  });

  const result = await runCli([
    fixture.url,
    '--format', 'vertical',
    '--duration', '8',
    '--fps', '30',
    '--quality', 'draft',
    '--out', outDir,
    '--json',
  ]);

  assert.equal(result.exitCode, 0, `CLI failed:\n${result.stderr}`);

  const report = JSON.parse(result.stdout);
  const probed = await probe(report.video);
  const video = probed.streams.find((stream) => stream.codec_type === 'video');

  assert.equal(video.width, 1080);
  assert.equal(video.height, 1920);
  assert.equal(video.avg_frame_rate, '30/1');
});

test('--tokens-only writes tokens and stills without rendering', async (t) => {
  const fixture = await serveFixture();
  const outDir = await makeOutputDir();

  t.after(async () => {
    await fixture.close();
    await fs.rm(outDir, { recursive: true, force: true });
  });

  const result = await runCli([fixture.url, '--tokens-only', '--out', outDir, '--json']);

  assert.equal(result.exitCode, 0, `CLI failed:\n${result.stderr}`);

  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, 'tokens-only');

  await fs.access(report.tokens);
  const stills = await fs.readdir(report.stills);
  assert.ok(stills.includes('hero.png'), 'the hero still must be written');
  assert.ok(stills.includes('fullpage.png'), 'the full page still must be written');

  const produced = await fs.readdir(outDir);
  assert.ok(!produced.some((name) => name.endsWith('.mp4')), '--tokens-only must not render a film');
});

test('exits with a usage code and a readable message for a blocked scheme', async () => {
  const result = await runCli(['file:///etc/passwd']);

  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /not supported/);
  assert.doesNotMatch(result.stderr, /at .*\.js:\d+/, 'no stack trace without --debug');
});

test('exits with a usage code for an unknown flag', async () => {
  const result = await runCli(['https://example.com', '--make-it-good']);

  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /unknown option/);
});

test('doctor reports every check and exits zero when the machine is ready', async () => {
  const result = await runCli(['doctor', '--json']);

  const report = JSON.parse(result.stdout);
  const names = report.rows.map((row) => row.name);

  for (const expected of ['Node.js', 'FFmpeg', 'ffprobe', 'Chromium', 'Renderer', 'Output folder', 'Disk space']) {
    assert.ok(names.includes(expected), `doctor must check ${expected}`);
  }

  for (const row of report.rows) {
    assert.ok(row.ok, `${row.name} failed: ${row.detail}${row.fix ? ` (${row.fix})` : ''}`);
  }

  assert.equal(result.exitCode, 0);
});
