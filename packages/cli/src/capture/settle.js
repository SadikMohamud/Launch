// Bounded waiting helpers.
//
// Several of the things we wait for on a target page are promises that can
// stay pending forever rather than rejecting:
//
//   - HTMLImageElement.decode() on an image that is lazily loaded, off
//     screen, or pointing at a dead URL never settles at all.
//   - document.fonts.ready does not resolve while a webfont request is still
//     outstanding behind a hung connection.
//   - a scroll pass that yields on requestAnimationFrame stalls if the page
//     puts itself in a state where frames stop being produced.
//
// A .catch() does nothing for any of these, because a pending promise is not
// a rejected one. Every such wait therefore has to be raced against a timer,
// or the CLI simply hangs with no output and no error.

/**
 * Race a promise against a deadline, resolving with a fallback rather than
 * rejecting, so an optional settling step can never fail the run.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} [fallback]
 * @returns {Promise<T|undefined>}
 */
export async function withTimeout(promise, ms, fallback = undefined) {
  let timer;

  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    // A rejection is treated the same as a timeout: the step was optional.
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Evaluate in the page with a bound on how long it may take.
 *
 * Note that this bounds how long Node waits, not how long the page runs. A
 * genuinely stuck evaluation keeps running inside the browser, which is why
 * the browser is always closed rather than reused after a timeout.
 *
 * @param {import('playwright').Page} page
 * @param {Function} fn
 * @param {number} ms
 * @param {unknown} [arg]
 */
export function evaluateWithTimeout(page, fn, ms, arg) {
  return withTimeout(page.evaluate(fn, arg), ms);
}
