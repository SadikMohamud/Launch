// Error types and exit codes for the Launch CLI.
//
// Every failure the user can reasonably cause is reported as a LaunchError
// carrying a plain English message and a fix hint. Stack traces are only
// printed when --debug is passed, because a stack trace tells a user with a
// blocked execution policy nothing useful about their execution policy.

/** Exit codes. Zero is success, everything else is a distinct failure class. */
export const EXIT = {
  OK: 0,
  USAGE: 2,          // bad flags or an invalid target
  TARGET: 3,         // the target could not be reached or rendered
  DEPENDENCY: 4,     // FFmpeg, Chromium or Node is missing or unusable
  OUTPUT: 5,         // the output folder is not writable, or disk is full
  INTERRUPTED: 130,  // Ctrl+C, matching the shell convention
};

/**
 * An error we expect and can explain. Anything else is a bug and will be
 * reported as one, with an invitation to rerun using --debug.
 */
export class LaunchError extends Error {
  /**
   * @param {string} message  what went wrong, in plain English
   * @param {object} [options]
   * @param {number} [options.exitCode]  one of EXIT
   * @param {string} [options.fix]       the exact command or step that fixes it
   * @param {Error}  [options.cause]     the underlying error, shown with --debug
   */
  constructor(message, { exitCode = EXIT.TARGET, fix, cause } = {}) {
    super(message, { cause });
    this.name = 'LaunchError';
    this.exitCode = exitCode;
    this.fix = fix;
  }
}

/** Convenience constructor for the usage class of failure. */
export function usageError(message, fix) {
  return new LaunchError(message, { exitCode: EXIT.USAGE, fix });
}

/** Convenience constructor for a missing or broken dependency. */
export function dependencyError(message, fix, cause) {
  return new LaunchError(message, { exitCode: EXIT.DEPENDENCY, fix, cause });
}
