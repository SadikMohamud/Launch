// Local project support.
//
// When the target is a folder rather than a URL, the development server for
// that project is started, waited for, captured, and then shut down. Shutting
// it down reliably is the hard part: a package manager script sits between us
// and the real server process, so killing the child we spawned leaves the
// server orphaned and holding its port. The whole process tree is therefore
// terminated, on every platform and on every exit path including Ctrl+C.

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { LaunchError, EXIT } from './errors.js';

/** Scripts to try, in order of how likely they are to be a dev server. */
const SCRIPT_PREFERENCE = ['dev', 'start', 'serve', 'preview'];

/** How long to wait for a dev server to announce itself. */
const START_TIMEOUT_MS = 90_000;

/** Matches the URL a dev server prints when it is ready. */
const URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::(\d+))?\/?\S*/i;

/**
 * Work out how to start the project.
 *
 * @param {string} dir
 * @returns {Promise<{ script: string, command: string, args: string[] }>}
 */
export async function detectDevCommand(dir) {
  const manifestPath = path.join(dir, 'package.json');

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    throw new LaunchError(
      `No package.json found in ${dir}.`,
      {
        exitCode: EXIT.USAGE,
        fix: 'Point Launch at a project folder with a package.json, or pass the URL of a running site instead.',
      }
    );
  }

  const scripts = manifest.scripts ?? {};
  const script = SCRIPT_PREFERENCE.find((name) => typeof scripts[name] === 'string');

  if (!script) {
    throw new LaunchError(
      `No development server script found in ${path.basename(dir)}/package.json.`,
      {
        exitCode: EXIT.USAGE,
        fix: `Add one of these scripts: ${SCRIPT_PREFERENCE.join(', ')}. Or start the site yourself and pass its URL.`,
      }
    );
  }

  // npm ships as a shell script on POSIX and a .cmd shim on Windows, so the
  // executable name differs. Arguments are always passed as an array, never
  // interpolated into a command string.
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  return { script, command, args: ['run', script] };
}

/**
 * Terminate a process and everything it started.
 *
 * On Windows the tree is killed through taskkill, because a package manager
 * shim spawns the real server as a grandchild that does not die with its
 * parent. On POSIX the negated pid signals the whole process group, which is
 * why the child is spawned detached in the first place.
 */
function killTree(child) {
  if (!child || child.killed || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      child.kill('SIGKILL');
    }
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
    // Escalate if the tree is still alive shortly afterwards.
    setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Already gone, which is the outcome we wanted.
      }
    }, 3000).unref();
  } catch {
    child.kill('SIGKILL');
  }
}

/**
 * Poll a URL until it answers, so capture never starts against a port that is
 * open but not yet serving.
 */
async function waitForResponse(url, deadline) {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.status < 500) return true;
    } catch {
      // Not up yet. A dev server refuses connections until it is listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

/**
 * Start the project's development server and wait until it serves.
 *
 * @param {string} dir
 * @param {(stage: string, detail?: string) => void} [onProgress]
 * @returns {Promise<{ url: string, stop: () => void }>}
 */
export async function startDevServer(dir, onProgress = () => {}) {
  const { script, command, args } = await detectDevCommand(dir);
  onProgress('server', `starting "npm run ${script}"`);

  const child = spawn(command, args, {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
    // A process group on POSIX is what makes the whole tree killable later.
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none', FORCE_COLOR: '0' },
  });

  let settled = false;
  let stopped = false;

  /** Idempotent shutdown, safe to call from several exit paths at once. */
  const stop = () => {
    if (stopped) return;
    stopped = true;
    killTree(child);
    process.off('exit', stop);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  };

  const onSignal = () => {
    stop();
    process.exit(EXIT.INTERRUPTED);
  };

  // The server must not outlive this process, however this process ends.
  process.once('exit', stop);
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  const deadline = Date.now() + START_TIMEOUT_MS;

  const url = await new Promise((resolve, reject) => {
    let output = '';

    const inspect = (chunk) => {
      output += String(chunk);
      if (settled) return;

      const match = URL_PATTERN.exec(output);
      if (!match) return;

      settled = true;
      // Normalise to an origin: a dev server may print a path or a trailing
      // slash, and the capture stage wants the site root.
      try {
        const parsed = new URL(match[0]);
        resolve(parsed.origin);
      } catch {
        resolve(match[0]);
      }
    };

    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);

    child.on('error', (cause) => {
      stop();
      reject(new LaunchError(
        `Could not start the development server with "npm run ${script}".`,
        { exitCode: EXIT.TARGET, fix: 'Check that dependencies are installed with npm install.', cause }
      ));
    });

    child.on('exit', (code) => {
      if (settled) return;
      stop();
      reject(new LaunchError(
        `The development server exited with code ${code} before it started serving.`,
        {
          exitCode: EXIT.TARGET,
          fix: `Run "npm run ${script}" in ${dir} to see the error.`,
        }
      ));
    });

    setTimeout(() => {
      if (settled) return;
      settled = true;
      stop();
      reject(new LaunchError(
        `The development server did not report a URL within ${START_TIMEOUT_MS / 1000} seconds.`,
        {
          exitCode: EXIT.TARGET,
          fix: 'Start the server yourself and pass its URL to Launch instead.',
        }
      ));
    }, START_TIMEOUT_MS).unref();
  });

  onProgress('server', `waiting for ${url}`);

  if (!await waitForResponse(url, deadline)) {
    stop();
    throw new LaunchError(
      `The development server announced ${url} but never answered a request.`,
      { exitCode: EXIT.TARGET, fix: 'Start the server yourself and pass its URL to Launch instead.' }
    );
  }

  return { url, stop };
}
