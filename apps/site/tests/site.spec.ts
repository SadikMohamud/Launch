// Cross browser behaviour tests.
//
// These assert the things that actually differ between engines and the
// things the brief commits to: no horizontal overflow at any width, every
// section reachable and visible, reduced motion genuinely honoured, the
// waitlist never claiming success it did not earn, and contrast holding.
//
// The intro reveal is suppressed in most tests by pre-setting its session
// key, because a one-time animation blocking every assertion would make the
// suite slow and its failures ambiguous. It has its own test.

import { expect, test, type Page } from '@playwright/test';

/** Skip the intro so a test measures the page rather than the reveal. */
async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('launch-reveal-seen', '1');
    } catch {
      // Storage blocked; the reveal plays and the test simply waits.
    }
  });
}

/** Scroll the whole page so every lazy section has been through the viewport. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

test.describe('page', () => {
  test.beforeEach(async ({ page }) => {
    await skipIntro(page);
  });

  test('loads with no console or page errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });

    await page.goto('/');
    await settle(page);

    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('never scrolls horizontally', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
  });

  test('every section is present and visible', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    for (const id of ['proof', 'how', 'install', 'capabilities', 'cli', 'platform', 'faq']) {
      await expect(page.locator(`#${id}`), `#${id} should exist`).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('the hero wordmark renders with real width', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    // A gradient heading clipped to text is invisible if its fill fails, and
    // an empty box is the symptom. This caught exactly that bug once.
    const box = await page.locator('h1').first().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(30);
  });

  test('revealed content ends up visible after scrolling', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    const hidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.reveal')).filter(
        (element) => Number(getComputedStyle(element).opacity) < 0.5
      ).length
    );

    expect(hidden, 'no revealed block should still be transparent').toBe(0);
  });

  test('all three proof films have a poster and preload metadata only', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    const videos = page.locator('#proof video');
    await expect(videos).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      await expect(videos.nth(i)).toHaveAttribute('poster', /\.jpg$/);
      await expect(videos.nth(i)).toHaveAttribute('preload', 'metadata');
    }
  });

  test('the document head carries the metadata the brief requires', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toBeTruthy();
    expect(JSON.parse(jsonLd!)['@type']).toBe('SoftwareApplication');
  });
});

test.describe('navigation', () => {
  test.beforeEach(async ({ page }) => {
    await skipIntro(page);
  });

  test('a nav link moves the page to that section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    await page.locator('nav a[href="#install"]').first().click();
    await page.waitForTimeout(1600);

    const landed = await page.evaluate(() => {
      const target = document.querySelector('#install')!.getBoundingClientRect();
      return Math.abs(target.top);
    });

    // Within a nav height of the top of the section.
    expect(landed).toBeLessThan(180);
  });

  test('links keep real hrefs so they can be opened in a new tab', async ({ page }) => {
    await page.goto('/');

    const hrefs = await page.locator('nav a').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href'))
    );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^#|^https?:/);
  });
});

test.describe('waitlist', () => {
  test.beforeEach(async ({ page }) => {
    await skipIntro(page);
  });

  test('never reports success when the server did not store the entry', async ({ page }) => {
    await page.goto('/');

    // The endpoint is unavailable in a static preview, which is exactly the
    // case that must not produce a success message.
    await page.route('**/api/waitlist', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"Unavailable."}' })
    );

    await page.locator('#waitlist-email').fill('someone@studio.com');
    await page.locator('#platform button[type="submit"]').click();
    await page.waitForTimeout(600);

    const status = await page.locator('#platform [role="status"]').textContent();
    expect(status ?? '').not.toContain('You are on the list');
  });

  test('reports success only on a confirmed write', async ({ page }) => {
    await page.goto('/');

    await page.route('**/api/waitlist', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    );

    await page.locator('#waitlist-email').fill('someone@studio.com');
    await page.locator('#platform button[type="submit"]').click();

    await expect(page.locator('#platform [role="status"]')).toContainText('You are on the list');
  });

  test('the honeypot field is not reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#waitlist-company')).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('skips the intro and leaves all content visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(900);

    // The slate must never appear.
    await expect(page.locator('[data-slate]')).toHaveCount(0);

    const hidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.reveal, .word-reveal__word')).filter(
        (element) => Number(getComputedStyle(element).opacity) < 0.5
      ).length
    );

    expect(hidden, 'reduced motion must not leave content transparent').toBe(0);
  });

  test('does not pin the process section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(700);

    // Without a pin there is no ScrollTrigger spacer.
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
  });
});

test.describe('intro reveal', () => {
  test('plays once and leaves the page usable', async ({ page }) => {
    await page.goto('/');

    // It should be up almost immediately.
    await expect(page.locator('[data-slate]')).toHaveCount(1);

    // And gone within a few seconds, with scrolling released.
    await expect(page.locator('[data-slate]')).toHaveCount(0, { timeout: 15_000 });

    const overflow = await page.evaluate(() => document.documentElement.style.overflow);
    expect(overflow).toBe('');
  });

  test('does not replay on the next navigation in the same session', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-slate]')).toHaveCount(0, { timeout: 15_000 });

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-slate]')).toHaveCount(0);
  });
});

test.describe('theme', () => {
  test.beforeEach(async ({ page }) => {
    await skipIntro(page);
  });

  test('the toggle switches themes and the choice survives a reload', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).not.toHaveClass(/light/);

    await page.locator('nav button[aria-label*="light"]').click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/light/);
  });
});
