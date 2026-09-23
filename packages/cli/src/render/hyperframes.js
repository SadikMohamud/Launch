// Rendering through the HyperFrames CLI.
//
// HyperFrames owns capture, encoding and media seeking. Launch owns what is
// composed and how the result is named, verified and reported. The version is
// pinned so a film re-renders identically months later, which an unpinned
// "latest" would not guarantee.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { LaunchError, EXIT } from '../errors.js';

const require = createRequire(import.meta.url);

/**
 * The pinned HyperFrames release.
 *
 * Moving this is a deliberate act: a new release can change rendered output,
 * so it is bumped, re-rendered and eyeballed rather than floated. It is a
 * normal dependency in package.json, so this constant and that entry must
 * agree.
 */
export const HYPERFRAMES_VERSION = '0.8.64';

/**
 * Locate the renderer's JavaScript entry point.
 *
 * The obvious approach, spawning npx, does not work: on Windows npx is a
 * .cmd shim, and Node refuses to spawn .bat or .cmd files without a shell.
 * Turning the shell on to get around that would mean building a command
 * string from generated paths, which is precisely the injection surface this
 * CLI is meant not to have. Resolving the package and running its entry
 * script with our own Node binary avoids the shell entirely, and pins the
 * version through package.json rather than through a network fetch.
 */
function rendererEntry() {
  try {
    const manifestPath = require.resolve('hyperframes/package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const relative = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.hyperframes;
    if (!relative) return undefined;

    const entry = path.join(path.dirname(manifestPath), relative);
    return fs.existsSync(entry) ? { entry, version: manifest.version } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Run a HyperFrames subcommand inside a project directory.
 *
 * Arguments are always an array. Nothing derived from user input is ever
 * interpolated into a command string.
 *
 * @param {string[]} args
 * @param {{ cwd: string, onLine?: (line: string) => void, timeoutMs?: number }} options
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
function runHyperframes(args, { cwd, onLine, timeoutMs = 20 * 60_000 }) {
  return new Promise((resolve, reject) => {
    const renderer = rendererEntry();

    if (!renderer) {
      reject(new LaunchError(
        'The renderer is not installed.',
        { exitCode: EXIT.DEPENDENCY, fix: 'Reinstall Launch, or run: npm install' }
      ));
      return;
    }

    // Our own Node binary runs the renderer's entry script. No shell, so no
    // argument is ever parsed as a command.
    const child = spawn(process.execPath, [renderer.entry, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new LaunchError(
        `The renderer did not finish within ${Math.round(timeoutMs / 60_000)} minutes.`,
        { exitCode: EXIT.TARGET, fix: 'Try a shorter film with --duration, or --quality draft.' }
      ));
    }, timeoutMs);

    /** Forward whole lines so progress can be reported as it happens. */
    const consume = (chunk, into) => {
      const text = String(chunk);
      if (into === 'out') stdout += text;
      else stderr += text;

      if (!onLine) return;
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) onLine(trimmed);
      }
    };

    child.stdout.on('data', (chunk) => consume(chunk, 'out'));
    child.stderr.on('data', (chunk) => consume(chunk, 'err'));

    child.on('error', (cause) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new LaunchError(
        'The renderer could not be started.',
        { exitCode: EXIT.DEPENDENCY, fix: 'Check Node and npx are installed, then run launch doctor.', cause }
      ));
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

/**
 * Validate the generated composition before rendering it.
 *
 * This is not optional politeness. A lint error switches off the layout and
 * contrast audits, and several failures it catches are silent at render time:
 * a video without an id renders as a frozen frame, and an asset path that
 * traverses above the project root resolves to a 404.
 */
export async function checkProject(projectDir, { onLine } = {}) {
  const result = await runHyperframes(['check'], { cwd: projectDir, onLine, timeoutMs: 10 * 60_000 });

  if (result.code !== 0) {
    const detail = extractFindings(`${result.stdout}\n${result.stderr}`);
    throw new LaunchError(
      `The generated composition failed validation.${detail ? `\n${detail}` : ''}`,
      {
        exitCode: EXIT.TARGET,
        fix: 'This is a bug in Launch, not in the target site. Rerun with --debug to keep the composition for inspection.',
      }
    );
  }

  return result;
}

/** Pull the error lines out of a check report for the failure message. */
function extractFindings(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => /^\s*✗/.test(line))
    .slice(0, 6)
    .map((line) => `  ${line.trim()}`)
    .join('\n');
}

/**
 * Render the project to an MP4.
 *
 * @param {object} args
 * @param {string} args.projectDir
 * @param {string} args.outputFile
 * @param {'draft'|'final'} args.quality
 * @param {number} args.fps
 * @param {(percent: number, stage: string) => void} [args.onProgress]
 */
export async function renderProject({ projectDir, outputFile, quality, fps, onProgress = () => {} }) {
  // HyperFrames quality names differ from ours: draft is for iteration and
  // delivery is the final encode.
  const level = quality === 'draft' ? 'draft' : 'delivery';

  const result = await runHyperframes(
    ['render', '--quality', level, '--fps', String(fps), '--output', outputFile],
    {
      cwd: projectDir,
      onLine(line) {
        // Progress arrives as "  ██████░░░  45%  Capturing frames".
        const match = /(\d{1,3})%\s+(.+)$/.exec(line);
        if (match) onProgress(Number(match[1]), match[2].trim());
      },
    }
  );

  if (result.code !== 0) {
    throw new LaunchError(
      'The render failed.',
      {
        exitCode: EXIT.TARGET,
        fix: 'Rerun with --debug to keep the composition and see the renderer output.',
        cause: new Error(`${result.stdout}\n${result.stderr}`.slice(-2000)),
      }
    );
  }

  return { outputFile: path.resolve(projectDir, outputFile) };
}

/** Report whether the pinned renderer can start at all, for launch doctor. */
export async function probeHyperframes(cwd = process.cwd()) {
  try {
    const result = await runHyperframes(['--version'], { cwd, timeoutMs: 180_000 });
    const version = result.stdout.trim().split(/\r?\n/).pop();
    return { ok: result.code === 0, version: version || HYPERFRAMES_VERSION };
  } catch {
    return { ok: false, version: undefined };
  }
}
