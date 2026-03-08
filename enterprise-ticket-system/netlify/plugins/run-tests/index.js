/**
 * Netlify post-deploy plugin: run-tests
 *
 * Fires after successful deployment (onSuccess hook).
 * Installs Playwright, runs all E2E/API/DB tests,
 * then runs notify-admin.ts to store results in Supabase.
 *
 * Tests NEVER block deployment — failures are logged and notified via in-app alert.
 */
const { execSync } = require('child_process');
const path = require('path');

module.exports = {
  onSuccess: async ({ constants, utils }) => {
    const baseUrl = process.env.URL || 'http://localhost:4200';
    const projectDir = path.resolve(__dirname, '../../..');

    console.log(`[run-tests] Deployment URL: ${baseUrl}`);
    console.log(`[run-tests] Running test suite against deployed application...`);

    try {
      // Install Playwright browser (Chromium only)
      execSync('npx playwright install chromium --with-deps', {
        stdio: 'inherit',
        cwd: projectDir,
      });

      // Run all Playwright tests
      execSync(
        `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --config playwright.config.ts`,
        {
          stdio: 'inherit',
          cwd: projectDir,
          env: {
            ...process.env,
            PLAYWRIGHT_BASE_URL: baseUrl,
          },
        }
      );

      console.log('[run-tests] All tests passed!');
    } catch (error) {
      // NEVER fail the deploy — tests are post-deploy only
      console.error('[run-tests] Some tests failed. Proceeding to notification step...');
    }

    // Always run notify-admin regardless of test outcome
    try {
      execSync('npx ts-node tests/notify-admin.ts', {
        stdio: 'inherit',
        cwd: projectDir,
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: baseUrl,
        },
      });
    } catch (notifyError) {
      console.error('[run-tests] Failed to send admin notification:', notifyError.message);
    }
  },
};
