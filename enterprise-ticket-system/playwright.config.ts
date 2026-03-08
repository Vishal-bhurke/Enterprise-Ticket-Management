import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

// Load .env file so local secrets (SUPABASE_SERVICE_KEY, etc.) are available
// in tests without being committed to git.
dotenvConfig();

export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  timeout: 60_000, // 60s — accommodates Supabase cold-start (~5-15s first request)
  retries: process.env['CI'] ? 2 : 1,
  workers: 1, // Sequential — share single Supabase project
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'],
  ],
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:4200',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    // 1. E2E browser tests run first — browser navigations warm up Supabase
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    // 2. Database tests (use Supabase JS client, not browser)
    {
      name: 'database',
      testDir: './tests/database',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e'], // runs after e2e
    },
    // 3. API tests (Playwright request context) run LAST — Supabase already warm
    {
      name: 'api',
      testDir: './tests/api',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['database'], // runs after database
    },
  ],
});
