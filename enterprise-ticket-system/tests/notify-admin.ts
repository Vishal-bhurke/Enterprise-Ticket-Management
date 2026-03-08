/**
 * notify-admin.ts
 *
 * Reads Playwright test results from test-results/results.json,
 * stores a row in test_run_logs, and creates in-app notifications
 * for all super_admin users if any tests failed.
 *
 * Run via: npx ts-node tests/notify-admin.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env['SUPABASE_URL'] || 'https://zffdggwlhzgkkfrknkoy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_KEY'] || '';
const PLAYWRIGHT_BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:4200';

interface PlaywrightResults {
  stats: {
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
    duration: number;
  };
  suites: Array<unknown>;
}

async function main(): Promise<void> {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn('[notify-admin] SUPABASE_SERVICE_KEY not set — skipping DB write');
    return;
  }

  const resultsPath = path.resolve(__dirname, '../test-results/results.json');
  if (!fs.existsSync(resultsPath)) {
    console.warn('[notify-admin] No results.json found at', resultsPath);
    return;
  }

  const raw: PlaywrightResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  const { stats } = raw;

  const total = (stats.expected ?? 0) + (stats.unexpected ?? 0) + (stats.skipped ?? 0);
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const skipped = stats.skipped ?? 0;
  const duration = stats.duration ?? 0;
  const status = failed === 0 ? 'passed' : passed === 0 ? 'failed' : 'partial';

  console.log(`[notify-admin] Results: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`[notify-admin] Status: ${status} | Duration: ${duration}ms`);

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Insert test run log
  const { data: logData, error: logError } = await client
    .from('test_run_logs')
    .insert({
      deployment_url: PLAYWRIGHT_BASE_URL,
      total_tests: total,
      passed,
      failed,
      skipped,
      duration_ms: duration,
      status,
      raw_results: raw,
    })
    .select('id')
    .single();

  if (logError) {
    console.error('[notify-admin] Failed to insert test_run_log:', logError.message);
    return;
  }

  console.log('[notify-admin] Test run logged with ID:', (logData as { id: string }).id);

  // Notify super admins if any failures
  if (failed > 0) {
    const { data: admins, error: adminsError } = await client
      .from('profiles')
      .select('id')
      .eq('role_id', (
        await client.from('roles').select('id').eq('slug', 'super_admin').single()
      ).data?.id ?? '');

    if (adminsError || !admins?.length) {
      console.warn('[notify-admin] No super_admin users found or error:', adminsError?.message);
      return;
    }

    const notifications = (admins as Array<{ id: string }>).map(admin => ({
      user_id: admin.id,
      type: 'test_failure',
      title: `Test Run: ${passed}/${total} passed`,
      message: `${failed} test(s) failed after deployment to ${PLAYWRIGHT_BASE_URL}. Duration: ${Math.round(duration / 1000)}s.`,
      is_read: false,
    }));

    const { error: notifError } = await client.from('notifications').insert(notifications);
    if (notifError) {
      console.error('[notify-admin] Failed to create notifications:', notifError.message);
    } else {
      console.log(`[notify-admin] Notified ${notifications.length} super_admin(s)`);
    }
  }
}

main().catch(err => {
  console.error('[notify-admin] Unhandled error:', err);
  process.exit(1);
});
