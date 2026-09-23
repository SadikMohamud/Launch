// Chromium lifecycle for both capture and rendering.
//
// Every browser the CLI opens goes through here so the launch flags stay in
// one place. Those flags are not cosmetic: without the backgrounding flags,
// parallel render workers have their occluded renderers throttled by
// Chromium and page.screenshot fails outright with "Unable to capture
// screenshot" partway through a render.

import { chromium } from 'playwright';
import { dependencyError } from '../errors.js';

/**
 * Flags applied to every Chromium instance.
 *
 * - The three backgrounding flags keep occluded parallel workers producing
 *   frames instead of being throttled to a stop.
 * - force-color-profile pins colour management so a render is identical on
 *   a wide gamut laptop panel and a headless CI runner.
 * - disable-dev-shm-usage avoids the small /dev/shm inside Docker and the
 *   GitHub Actions Ubuntu runner, which otherwise crashes the tab.
 * - hide-scrollbars keeps a scrollbar gutter out of captured stills.
 */
export const CHROMIUM_ARGS = [
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--force-color-profile=srgb',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--mute-audio',
];

/**
 * Launch Chromium, turning the two failure modes users actually hit into
 * messages that name the fix.
 *
 * @returns {Promise<import('playwright').Browser>}
 */
export async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  } catch (cause) {
    const message = String(cause?.message ?? '');

    if (/Executable doesn't exist|please run the following command/i.test(message)) {
      throw dependencyError(
        'Chromium is not installed.',
        'Install it with: npx playwright install chromium',
        cause
      );
    }

    if (/shared libraries|Host system is missing|libnss3/i.test(message)) {
      throw dependencyError(
        'Chromium is installed but will not start, because system libraries are missing.',
        'Install them with: npx playwright install --with-deps chromium',
        cause
      );
    }

    throw dependencyError('Chromium could not be started.', 'Run launch doctor for details.', cause);
  }
}

/**
 * Open a page with a frozen clock.
 *
 * Freezing matters for capture as well as for rendering: a target site with
 * a carousel or a countdown would otherwise produce a different still on
 * every run. The clock cannot be paused at an instant already in the past,
 * so it is pinned marginally ahead of the loaded page's own reading.
 *
 * @param {import('playwright').Browser} browser
 * @param {{ width: number, height: number }} viewport
 * @param {{ deviceScaleFactor?: number, freeze?: boolean }} [options]
 */
export async function openPage(browser, viewport, { deviceScaleFactor = 1, freeze = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor,
    reducedMotion: 'no-preference',
    // A realistic locale keeps date and number formatting on target sites
    // stable rather than inheriting whatever the runner happens to use.
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });

  if (freeze) await context.clock.install();

  const page = await context.newPage();
  return { context, page };
}

/**
 * Stop the clock once a page has finished loading and settling.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {import('playwright').Page} page
 */
export async function freezeClock(context, page) {
  const now = await page.evaluate(() => Date.now());
  await context.clock.pauseAt(now + 10_000);
}

/** Close a browser without letting a teardown failure mask a real error. */
export async function closeQuietly(target) {
  try {
    await target?.close();
  } catch {
    // A browser that has already gone is not a problem worth reporting.
  }
}
