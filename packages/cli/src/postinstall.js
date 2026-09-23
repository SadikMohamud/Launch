// Post install notice.
//
// This deliberately downloads nothing. A package manager install should not
// pull a 130MB browser without warning, and a sandboxed or offline CI install
// would fail on it. Chromium is installed by the installer scripts, or by the
// user running the command printed below. launch doctor reports what is
// missing and how to fix it.

// Package managers set this when running lifecycle scripts non-interactively
// as part of a wider install, where extra output is just noise.
if (!process.env.CI && process.stdout.isTTY) {
  process.stdout.write(
    '\nLaunch installed. One more step before the first render:\n' +
    '  npx playwright install chromium\n' +
    'Then check everything is ready:\n' +
    '  launch doctor\n\n'
  );
}
