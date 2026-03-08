#!/usr/bin/env bash
# run-full-test.sh
# Runs the complete Playwright test suite, generates reports, and notifies admins.
# Usage: bash tests/run-full-test.sh
# Or: npm run test:all

set -e

echo "============================================"
echo "  Enterprise Ticket System — Full Test Run  "
echo "============================================"
echo ""
echo "Base URL: ${PLAYWRIGHT_BASE_URL:-http://localhost:4200}"
echo ""

# Ensure test-results directory exists
mkdir -p test-results
mkdir -p playwright-report

# Run Playwright tests
echo "[1/2] Running Playwright test suite..."
npx playwright test \
  --config playwright.config.ts \
  --reporter=html \
  --reporter=json \
  || echo "[WARN] Some tests failed — continuing to notification step"

echo ""
echo "[2/2] Writing results to Supabase and notifying admins..."
npx ts-node tests/notify-admin.ts

echo ""
echo "============================================"
echo "  Test run complete. See playwright-report/"
echo "  Run 'npm run test:e2e:report' to open HTML report"
echo "============================================"
