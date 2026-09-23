// Capture stage.
//
// Opens the target, waits for it to settle, freezes it, extracts design
// tokens, and saves the stills the scene system will use as its material.
// The target site is treated as a source of material, never as something we
// try to film in real time, because a page we do not control cannot be made
// deterministic.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { launchBrowser, openPage, freezeClock, closeQuietly } from './browser.js';
import { collectInPage } from './tokens.js';
import { collectContentInPage } from './content.js';
import { shapeTokens } from './shape.js';
import { evaluateWithTimeout } from './settle.js';
import { samplePixels } from './pixels.js';
import { LaunchError, EXIT } from '../errors.js';

/**
 * Bounds for the optional settling steps. These are generous enough that a
 * slow but working page still settles properly, and short enough that a page
 * which never settles does not stall the run.
 */
const FONTS_TIMEOUT_MS = 10_000;
const SCROLL_TIMEOUT_MS = 20_000;
const DECODE_TIMEOUT_MS = 10_000;

/** Viewport used for the desktop capture. */
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** Viewport used for the mobile capture, matching a common phone width. */
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/**
 * Full page stills are capped, because a 30,000 pixel tall marketing page
 * produces an image no scene can use and costs a great deal of memory.
 */
const MAX_FULLPAGE_HEIGHT = 12_000;

/**
 * Hide fixed cookie and consent overlays before capturing.
 *
 * This is conservative on purpose: it only touches elements that are both
 * fixed or sticky positioned and self identify as consent UI. A promo film
 * with a cookie banner across the hero is not usable, but guessing more
 * aggressively would start removing real page content.
 */
function dismissConsentOverlays() {
  const pattern = /cookie|consent|gdpr|privacy-banner|cmp-/i;
  let hidden = 0;

  for (const element of document.querySelectorAll('div, section, aside, dialog')) {
    const style = window.getComputedStyle(element);
    if (style.position !== 'fixed' && style.position !== 'sticky') continue;

    const identity = `${element.id} ${typeof element.className === 'string' ? element.className : ''}`;
    if (!pattern.test(identity)) continue;

    element.style.setProperty('display', 'none', 'important');
    hidden += 1;
  }

  // A consent library often locks scrolling on the document as well.
  if (hidden > 0) {
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    document.body.style.setProperty('overflow', 'auto', 'important');
  }

  return hidden;
}

/**
 * Wait for the page to stop moving.
 *
 * Network idle alone is not enough: fonts swap after it, and lazily loaded
 * images decode after that. Each wait is bounded so a page that never goes
 * quiet still produces a capture rather than hanging.
 */
async function waitForSettled(page, { timeout, waitFor }) {
  if (waitFor) {
    try {
      await page.waitForSelector(waitFor, { timeout, state: 'visible' });
    } catch (cause) {
      throw new LaunchError(
        `Timed out waiting for "${waitFor}" to appear on the page.`,
        { exitCode: EXIT.TARGET, fix: 'Check the selector, or raise the wait with --timeout.', cause }
      );
    }
  }

  // Every wait below is bounded. Each one is a promise that can stay pending
  // forever on a real site rather than rejecting, so a catch alone would not
  // save us. See settle.js for why each one hangs.

  // Fonts settling is what stops a capture showing fallback typefaces.
  await evaluateWithTimeout(page, () => document.fonts.ready, FONTS_TIMEOUT_MS);

  // Trigger lazy loading by walking the page, then return to the top. The
  // scroll is instant rather than smooth so it costs no wall clock time.
  await evaluateWithTimeout(page, async () => {
    const step = window.innerHeight;
    const height = document.body.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }, SCROLL_TIMEOUT_MS);

  // Give decoded images a moment to paint after the scroll pass. A lazily
  // loaded or dead image never settles its decode promise at all.
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 10_000) }).catch(() => {});
  await evaluateWithTimeout(page, () => Promise.all(
    Array.from(document.images)
      .filter((image) => !image.complete)
      .map((image) => image.decode().catch(() => {}))
  ), DECODE_TIMEOUT_MS);
}

/**
 * Navigate to the target and report the failure in terms the user can act on.
 */
async function navigate(page, url, timeout) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    if (response && !response.ok() && response.status() >= 400) {
      throw new LaunchError(
        `The page returned HTTP ${response.status()}.`,
        { exitCode: EXIT.TARGET, fix: 'Check the URL is correct and publicly reachable.' }
      );
    }

    return response;
  } catch (cause) {
    if (cause instanceof LaunchError) throw cause;

    const message = String(cause?.message ?? '');

    if (/ERR_NAME_NOT_RESOLVED|getaddrinfo/i.test(message)) {
      throw new LaunchError(
        `Could not find that host. The domain did not resolve.`,
        { exitCode: EXIT.TARGET, fix: 'Check the spelling of the URL and your network connection.', cause }
      );
    }

    if (/ERR_CONNECTION_REFUSED/i.test(message)) {
      throw new LaunchError(
        'The connection was refused.',
        { exitCode: EXIT.TARGET, fix: 'Check the site is running and the port is correct.', cause }
      );
    }

    if (/Timeout|exceeded/i.test(message)) {
      throw new LaunchError(
        `The page did not load within ${Math.round(timeout / 1000)} seconds.`,
        { exitCode: EXIT.TARGET, fix: 'Raise the limit with --timeout 60000, or use --wait-for to name an element.', cause }
      );
    }

    throw new LaunchError('The page could not be loaded.', { exitCode: EXIT.TARGET, cause });
  }
}

/**
 * Capture a target and write its tokens and stills.
 *
 * @param {object} args
 * @param {string} args.url            the http or https URL to capture
 * @param {string} args.requestedTarget what the user typed, for the report
 * @param {string} args.workDir        where stills are written
 * @param {object} args.options        normalised CLI options
 * @param {(stage: string, detail?: string) => void} [args.onProgress]
 * @returns {Promise<{ tokens: object, stillsDir: string }>}
 */
export async function capture({ url, requestedTarget, workDir, options, onProgress = () => {} }) {
  const stillsDir = path.join(workDir, 'stills');
  await fs.mkdir(stillsDir, { recursive: true });

  const browser = await launchBrowser();
  const started = Date.now();

  try {
    onProgress('capture', 'opening the page');
    const { context, page } = await openPage(browser, DESKTOP_VIEWPORT, { deviceScaleFactor: 2 });

    await navigate(page, url, options.timeout);
    await waitForSettled(page, { timeout: options.timeout, waitFor: options.waitFor });
    await page.evaluate(dismissConsentOverlays).catch(() => {});
    await freezeClock(context, page);

    const loadMs = Date.now() - started;

    onProgress('capture', 'reading design tokens');
    const raw = await page.evaluate(collectInPage);

    onProgress('capture', 'reading page content');
    const content = await page.evaluate(collectContentInPage);

    onProgress('capture', 'saving stills');
    const stills = [];

    // Hero: the first viewport, at 2x, which is the sharpest material the
    // scene system has to work with.
    const heroFile = path.join(stillsDir, 'hero.png');
    await page.screenshot({ path: heroFile, type: 'png' });
    stills.push({ file: path.relative(workDir, heroFile), role: 'hero', atScrollY: 0 });

    // Full page, capped, used by the scrolling pan scene.
    const fullFile = path.join(stillsDir, 'fullpage.png');
    await page.screenshot({
      path: fullFile,
      type: 'png',
      fullPage: true,
      clip: raw.documentHeight > MAX_FULLPAGE_HEIGHT
        ? { x: 0, y: 0, width: DESKTOP_VIEWPORT.width, height: MAX_FULLPAGE_HEIGHT }
        : undefined,
    });
    stills.push({ file: path.relative(workDir, fullFile), role: 'fullpage', atScrollY: 0 });

    // Section stills, sampled down the page, used by the detail scenes.
    const sectionCount = Math.min(3, Math.max(1, Math.floor(raw.documentHeight / DESKTOP_VIEWPORT.height) - 1));
    for (let index = 0; index < sectionCount; index++) {
      const scrollY = Math.round(((index + 1) * raw.documentHeight) / (sectionCount + 1));
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(120);

      const sectionFile = path.join(stillsDir, `section-${index + 1}.png`);
      await page.screenshot({ path: sectionFile, type: 'png' });
      stills.push({ file: path.relative(workDir, sectionFile), role: 'section', atScrollY: scrollY });
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await context.close();

    // Mobile hero, captured in its own context so the desktop capture is
    // never disturbed by a viewport change.
    const mobile = await openPage(browser, MOBILE_VIEWPORT, { deviceScaleFactor: 2 });
    try {
      await navigate(mobile.page, url, options.timeout);
      await waitForSettled(mobile.page, { timeout: options.timeout, waitFor: options.waitFor });
      await mobile.page.evaluate(dismissConsentOverlays).catch(() => {});

      const mobileFile = path.join(stillsDir, 'mobile-hero.png');
      await mobile.page.screenshot({ path: mobileFile, type: 'png' });
      stills.push({ file: path.relative(workDir, mobileFile), role: 'hero-mobile', atScrollY: 0 });
    } catch {
      // A mobile capture is a nice to have. The vertical format falls back
      // to a crop of the desktop hero when it is missing.
    } finally {
      await mobile.context.close().catch(() => {});
    }

    // The hero still is sampled for colour, so the palette reflects what the
    // page looks like rather than only what its stylesheet declares.
    const pixelPalette = await samplePixels(heroFile, 10);

    const tokens = shapeTokens(raw, {
      capturedAt: new Date().toISOString(),
      engine: {
        name: 'launch',
        version: process.env.npm_package_version ?? '1.0.0',
        chromium: browser.version(),
      },
      requestedTarget,
      viewport: { ...DESKTOP_VIEWPORT, deviceScaleFactor: 2 },
      loadMs,
      pixelPalette,
      media: { stills },
    });

    return { tokens, content, stillsDir };
  } finally {
    await closeQuietly(browser);
  }
}
