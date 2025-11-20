/**
 * Playwright test for OakView timeframe handling
 * Tests different data intervals: 1 second, 5 minutes, 60 minutes, 1 week, 1 day
 */

import { test, expect } from '@playwright/test';

test.describe('OakView Timeframe Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start dev server and navigate to CSV example
    await page.goto('http://localhost:5175/examples/csv-example/');
    
    // Wait for the loading overlay to disappear
    await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 10000 });
    
    // Also wait for chart canvas to be visible
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
  });

  test('should load 1-second TSLA data', async ({ page }) => {
    // Change symbol to BATS_TSLA
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'TSLA');
    await page.click('text=BATS_TSLA');
    
    // Wait for chart to update
    await page.waitForTimeout(1000);
    
    // Check legend shows correct symbol and interval
    const legend = await page.textContent('[data-legend]');
    expect(legend).toContain('BATS_TSLA');
    expect(legend).toContain('1');
    
    // Verify chart has data
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should load 5-minute KLAR data', async ({ page }) => {
    // Change symbol to BATS_KLAR
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'KLAR');
    await page.click('text=BATS_KLAR');
    
    // Wait for chart to update
    await page.waitForTimeout(1000);
    
    // Check legend shows correct symbol and interval
    const legend = await page.textContent('[data-legend]');
    expect(legend).toContain('BATS_KLAR');
    expect(legend).toContain('5');
  });

  test('should load 1-week OKLO data', async ({ page }) => {
    // Change symbol to BATS_OKLO
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'OKLO');
    await page.click('text=BATS_OKLO');
    
    // Wait for chart to update
    await page.waitForTimeout(1000);
    
    // Check legend shows correct symbol and interval
    const legend = await page.textContent('[data-legend]');
    expect(legend).toContain('BATS_OKLO');
    expect(legend).toContain('1W');
  });

  test('should resample 1-second data to higher timeframes', async ({ page }) => {
    // Load BATS_TSLA (1 second data)
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'TSLA');
    await page.click('text=BATS_TSLA');
    await page.waitForTimeout(1000);
    
    // Change to 60-second (1 minute) interval
    await page.click('[data-interval-selector]');
    await page.click('text=1m');
    await page.waitForTimeout(1000);
    
    // Verify interval changed in legend
    const legend = await page.textContent('[data-legend]');
    expect(legend).toContain('60'); // 60 seconds = 1 minute
    
    // Chart should still have data (resampled)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should show correct timescale for sub-minute data', async ({ page }) => {
    // Load 1-second TSLA data
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'TSLA');
    await page.click('text=BATS_TSLA');
    await page.waitForTimeout(1000);
    
    // Check that timescale shows seconds/milliseconds
    // The timescale should show times like "14:30:05" or "14:30:05.000"
    const timescale = page.locator('[data-timescale]');
    await expect(timescale).toBeVisible();
    
    // Take screenshot for visual verification
    await page.screenshot({ path: '.tmp/1-second-timescale.png' });
  });

  test('should handle multiple charts with different intervals', async ({ page }) => {
    // Switch to 2x1 layout
    await page.click('[data-layout="2x1"]');
    await page.waitForTimeout(500);
    
    // Set first chart to TSLA (1 second)
    const chart1 = page.locator('oakview-internal-chart').first();
    await chart1.click();
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'TSLA');
    await page.click('text=BATS_TSLA');
    await page.waitForTimeout(1000);
    
    // Set second chart to KLAR (5 minutes)
    const chart2 = page.locator('oakview-internal-chart').nth(1);
    await chart2.click();
    await page.click('[data-symbol-search]');
    await page.fill('[data-symbol-search] input', 'KLAR');
    await page.click('text=BATS_KLAR');
    await page.waitForTimeout(1000);
    
    // Both charts should be visible with data
    await expect(chart1.locator('canvas')).toBeVisible();
    await expect(chart2.locator('canvas')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: '.tmp/multi-timeframe-layout.png' });
  });
});
