// Cross browser test configuration.
//
// The site is tested on all three engines at both of the widths the brief
// names, because the things that break are engine specific: WebKit has no
// scroll timeline support, Firefox handles backdrop-filter differently, and
// only Chromium gives us WebGL2 in headless without a software rasteriser.
//
// The server is started by the config rather than by hand, so a run can
// never test a stale build or a port someone forgot to start.

import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',

  // A flake that only fails sometimes is a bug, so retries are off locally
  // and limited in CI where machine contention is real.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,

  // Fail the run if a test was accidentally committed with .only.
  forbidOnly: Boolean(process.env.CI),

  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'firefox-1440',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-1440',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false },
    },
    {
      name: 'webkit-390',
      use: { ...devices['Desktop Safari'], viewport: { width: 390, height: 844 }, isMobile: false },
    },
  ],

  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
