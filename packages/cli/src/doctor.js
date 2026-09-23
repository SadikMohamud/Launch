// launch doctor
//
// Checks every dependency the renderer needs and prints a pass or fail line
// for each, with the exact fix command for the user's operating system. It
// never attempts a repair on its own: a diagnostic that silently changes the
// machine is not a diagnostic.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { resolveFfmpeg, resolveFfprobe, installHint } from './ffmpeg.js';
import { EXIT } from './errors.js';

/** Node major version the CLI requires. */
const MIN_NODE_MAJOR = 20;

/** Disk space a long render needs for its intermediate frames, in bytes. */
const REQUIRED_FREE_BYTES = 3 * 1024 * 1024 * 1024;

/** Build one result row. */
function result(name, ok, detail, fix) {
  return { name, ok, detail, fix };
}

/** Node must be new enough for the APIs the CLI uses. */
function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  const ok = major >= MIN_NODE_MAJOR;
  return result(
    'Node.js',
    ok,
    `v${process.versions.node}`,
    ok ? undefined : `Launch needs Node ${MIN_NODE_MAJOR} or higher. Install the current LTS from https://nodejs.org`
  );
}

/** FFmpeg, bundled or on PATH, proven by actually running it. */
async function checkFfmpeg() {
  try {
    const found = await resolveFfmpeg();
    const version = found.version.replace(/^ffmpeg version /, '').split(' ')[0];
    return result('FFmpeg', true, `${version} (${found.source})`);
  } catch {
    return result('FFmpeg', false, 'not found', installHint('ffmpeg'));
  }
}

/** ffprobe, used to verify renders. */
async function checkFfprobe() {
  try {
    const found = await resolveFfprobe();
    const version = found.version.replace(/^ffprobe version /, '').split(' ')[0];
    return result('ffprobe', true, `${version} (${found.source})`);
  } catch {
    return result('ffprobe', false, 'not found', installHint('ffmpeg'));
  }
}

/**
 * Chromium must be installed and must actually launch. A present executable
 * that cannot start, which is the usual shape of the missing system library
 * problem on Ubuntu, has to fail this check rather than pass it.
 */
async function checkChromium() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const version = browser.version();
    await browser.close();
    return result('Chromium', true, version);
  } catch (error) {
    await browser?.close().catch(() => {});
    const message = String(error?.message ?? '');

    // Ubuntu reports missing shared libraries rather than a missing browser,
    // and the fix for that is a different command.
    const missingLibs = /error while loading shared libraries|libnss3|Host system is missing/i.test(message);
    const fix = missingLibs && process.platform === 'linux'
      ? 'Install Chromium\'s system libraries with: npx playwright install --with-deps chromium'
      : 'Install the browser with: npx playwright install chromium';

    return result('Chromium', false, missingLibs ? 'installed but will not start' : 'not installed', fix);
  }
}

/** The output folder must be creatable and writable. */
async function checkOutputWritable(outDir) {
  const target = path.resolve(outDir ?? 'launch-output');
  try {
    await fs.mkdir(target, { recursive: true });
    const probeFile = path.join(target, `.launch-write-probe-${process.pid}`);
    await fs.writeFile(probeFile, 'probe');
    await fs.rm(probeFile);
    return result('Output folder', true, target);
  } catch (error) {
    return result(
      'Output folder',
      false,
      `${target} is not writable`,
      process.platform === 'win32'
        ? 'Choose a different folder with --out, or run from a folder you own.'
        : `Fix permissions with: chmod u+w "${path.dirname(target)}"`
    );
  }
}

/**
 * Intermediate frames are written to disk before encoding, so a long render
 * genuinely needs several gigabytes free. Running out halfway through is a
 * miserable failure mode, so it is checked up front.
 */
async function checkDiskSpace(outDir) {
  const target = path.resolve(outDir ?? 'launch-output');
  try {
    const dir = fsSync.existsSync(target) ? target : path.dirname(target);
    const stats = await fs.statfs(dir);
    const free = stats.bavail * stats.bsize;
    const freeGb = (free / 1024 ** 3).toFixed(1);
    const ok = free >= REQUIRED_FREE_BYTES;
    return result(
      'Disk space',
      ok,
      `${freeGb} GB free`,
      ok ? undefined : `A long render needs about 3 GB for intermediate frames. Free up space or use --out on another drive.`
    );
  } catch {
    // statfs is not available everywhere. An unknown result is reported as a
    // pass with a caveat rather than a spurious failure.
    return result('Disk space', true, 'could not be measured on this platform');
  }
}

/** Available parallelism, which sets how many render workers we can run. */
function checkCores() {
  const cores = os.cpus().length;
  return result('CPU cores', true, `${cores} (render workers: ${Math.max(1, Math.min(6, cores - 1))})`);
}

/**
 * Run every check and return the rows plus an overall exit code.
 *
 * @param {{ out?: string }} [options]
 */
export async function runDoctor({ out } = {}) {
  const rows = [
    checkNode(),
    await checkFfmpeg(),
    await checkFfprobe(),
    await checkChromium(),
    await checkOutputWritable(out),
    await checkDiskSpace(out),
    checkCores(),
  ];

  const failed = rows.filter((row) => !row.ok);
  return { rows, ok: failed.length === 0, exitCode: failed.length === 0 ? EXIT.OK : EXIT.DEPENDENCY };
}

/** Render the doctor report for a terminal. */
export function formatDoctor({ rows, ok }) {
  const width = Math.max(...rows.map((row) => row.name.length));
  const lines = ['', 'Launch doctor', ''];

  for (const row of rows) {
    const mark = row.ok ? 'pass' : 'FAIL';
    lines.push(`  [${mark}] ${row.name.padEnd(width)}  ${row.detail}`);
    if (!row.ok && row.fix) lines.push(`         ${' '.repeat(width)}  ${row.fix}`);
  }

  lines.push('');
  lines.push(ok ? '  Everything is ready.' : '  Fix the items above, then run launch doctor again.');
  lines.push('');
  return lines.join('\n');
}
