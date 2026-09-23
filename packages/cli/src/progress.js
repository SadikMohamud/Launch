// Terminal progress reporting.
//
// Interactive terminals get a single rewritten line carrying frame counts and
// elapsed time. Anything else, including CI logs and redirected output, gets
// plain appended lines, because carriage returns in a log file produce an
// unreadable mess. With --json nothing is printed at all, so stdout carries
// only the result document.

import process from 'node:process';

/** Format a duration in seconds with one decimal place. */
export function formatElapsed(ms) {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

/** Format a byte count for humans. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

/**
 * Create a reporter.
 *
 * @param {{ quiet?: boolean }} [options]
 */
export function createReporter({ quiet = false } = {}) {
  const started = Date.now();
  const interactive = Boolean(process.stderr.isTTY) && !process.env.CI;
  let lastLineLength = 0;
  let lastPercentText = '';

  /** Write a line that replaces itself, where the terminal supports it. */
  function transient(text) {
    if (quiet) return;

    if (!interactive) return;

    const padded = text.padEnd(lastLineLength, ' ');
    lastLineLength = text.length;
    process.stderr.write(`\r${padded}`);
  }

  /** Write a line that stays. */
  function line(text) {
    if (quiet) return;

    if (interactive && lastLineLength > 0) {
      process.stderr.write(`\r${' '.repeat(lastLineLength)}\r`);
      lastLineLength = 0;
    }

    process.stderr.write(`${text}\n`);
  }

  return {
    started,

    /** Announce a stage of the pipeline. */
    stage(name, detail) {
      line(`  ${name}${detail ? `  ${detail}` : ''}`);
    },

    /** Report progress through a counted stage. */
    frames(label, done, total) {
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      const text = `  ${label}  ${done}/${total} frames  ${percent}%  ${formatElapsed(Date.now() - started)}`;

      // Non interactive output would otherwise print one line per update, so
      // it is throttled to the quarter marks.
      if (interactive) transient(text);
      else if (done === total || percent % 25 === 0) line(text);
    },

    /** Report a percentage reported by an external renderer. */
    percent(label, value, stage) {
      const text = `  ${label}  ${String(value).padStart(3)}%  ${stage ?? ''}`;

      if (interactive) {
        transient(`${text}  ${formatElapsed(Date.now() - started)}`);
        return;
      }

      // A renderer reports a running frame counter, so the stage text differs
      // on every update even while the percentage stands still. Throttling on
      // the percentage alone is what keeps a log to one line per step.
      const key = `${label}${value}`;
      if (key === lastPercentText) return;
      lastPercentText = key;
      line(`${text}  ${formatElapsed(Date.now() - started)}`);
    },

    /** Clear any transient line before the process writes its result. */
    done() {
      if (!quiet && interactive && lastLineLength > 0) {
        process.stderr.write(`\r${' '.repeat(lastLineLength)}\r`);
        lastLineLength = 0;
      }
    },

    line,
    elapsedMs: () => Date.now() - started,
  };
}
