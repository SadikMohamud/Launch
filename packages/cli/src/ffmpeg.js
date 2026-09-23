// Resolution and invocation of the FFmpeg and ffprobe executables.
//
// The bundled binaries from ffmpeg-static and ffprobe-static are preferred so
// that a fresh install needs nothing already on the machine. Those packages
// do not ship a working build for every platform, notably musl based Linux
// and some ARM targets, so a system executable on PATH is used as a fallback.
// Every invocation passes an argument array. No user input is ever
// interpolated into a shell string.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dependencyError } from './errors.js';

const require = createRequire(import.meta.url);

/** Cached resolutions, so repeated probes do not re-spawn processes. */
let cachedFfmpeg;
let cachedFfprobe;

/**
 * Load a bundled binary path without letting a missing optional package
 * take down the CLI. Both packages export the path as their default value.
 */
function bundledPath(moduleName) {
  try {
    const loaded = require(moduleName);
    const value = typeof loaded === 'string' ? loaded : loaded?.path ?? loaded?.default;
    return typeof value === 'string' && fs.existsSync(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Run a candidate executable with -version to prove it actually runs. A path
 * existing on disk is not proof: a musl host will happily hold a glibc binary
 * that fails the moment it is executed.
 *
 * @returns {Promise<string|undefined>} the first line of version output
 */
function probeVersion(binary) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(binary, ['-version'], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      resolve(undefined);
      return;
    }

    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('error', () => resolve(undefined));
    child.on('close', (code) => {
      resolve(code === 0 && out ? out.split('\n')[0].trim() : undefined);
    });
  });
}

/**
 * Find a usable executable, preferring the bundled build.
 *
 * @param {string} moduleName  the npm package carrying the bundled binary
 * @param {string} commandName the name to look for on PATH as a fallback
 * @returns {Promise<{ path: string, source: 'bundled'|'system', version: string }>}
 */
async function resolveBinary(moduleName, commandName) {
  const bundled = bundledPath(moduleName);
  if (bundled) {
    const version = await probeVersion(bundled);
    if (version) return { path: bundled, source: 'bundled', version };
  }

  const version = await probeVersion(commandName);
  if (version) return { path: commandName, source: 'system', version };

  return undefined;
}

/** Resolve FFmpeg, throwing a dependency error with a per platform fix. */
export async function resolveFfmpeg() {
  if (cachedFfmpeg) return cachedFfmpeg;

  const found = await resolveBinary('ffmpeg-static', 'ffmpeg');
  if (!found) {
    throw dependencyError(
      'FFmpeg could not be found or would not run.',
      installHint('ffmpeg')
    );
  }

  cachedFfmpeg = found;
  return found;
}

/** Resolve ffprobe, used for verification and by launch doctor. */
export async function resolveFfprobe() {
  if (cachedFfprobe) return cachedFfprobe;

  const found = await resolveBinary('ffprobe-static', 'ffprobe');
  if (!found) {
    throw dependencyError(
      'ffprobe could not be found or would not run.',
      installHint('ffmpeg')
    );
  }

  cachedFfprobe = found;
  return found;
}

/** The exact install command for the user's operating system. */
export function installHint(tool) {
  if (tool !== 'ffmpeg') return '';
  if (process.platform === 'win32') return 'Install it with: winget install Gyan.FFmpeg';
  if (process.platform === 'darwin') return 'Install it with: brew install ffmpeg';
  return 'Install it with: sudo apt install -y ffmpeg';
}

/**
 * Run a binary with an argument array and collect its output.
 *
 * @param {string} binary
 * @param {string[]} args
 * @param {{ onStderr?: (chunk: string) => void }} [options]
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export function run(binary, args, { onStderr } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      stderr += text;
      onStderr?.(text);
    });

    child.on('error', (cause) => reject(
      dependencyError(`Could not run ${binary}.`, installHint('ffmpeg'), cause)
    ));

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      // FFmpeg's own diagnostics are far more useful than an exit code, so
      // the tail of stderr is carried into the error rather than discarded.
      reject(new Error(`${binary} exited with code ${code}\n${stderr.slice(-1200)}`));
    });
  });
}

/**
 * Read a media file's stream and format metadata as structured JSON. Used by
 * the end to end test and by anything that needs to verify a render.
 */
export async function probe(file) {
  const ffprobe = await resolveFfprobe();
  const { stdout } = await run(ffprobe.path, [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    file,
  ]);
  return JSON.parse(stdout);
}
