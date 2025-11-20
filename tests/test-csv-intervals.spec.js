import { test, expect } from '@playwright/test';

test.describe('CSV Example - Time Interval Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175/examples/csv-example/');
    await page.waitForSelector('oak-view', { timeout: 10000 });
    await page.waitForSelector('.chart-legend', { timeout: 10000 });
    await page.waitForTimeout(3000); // Allow data to load
  });

  test('should load BATS_TSLA 1-second data correctly', async ({ page }) => {
    // Verify chart loaded with BATS_TSLA
    const legend = page.locator('.chart-legend').first();
    await expect(legend).toContainText('BATS_TSLA');
    await expect(legend).toContainText('1');
    
    // Verify chart has canvas with data rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: '.tmp/tsla-1s-chart.png',
      fullPage: false 
    });
  });

  test('should display time scale with HH:MM format for sub-minute data', async ({ page }) => {
    // The chart should show 1-second TSLA data
    // Time axis should display time in HH:MM format
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Take screenshot to visually verify time format
    await page.screenshot({ 
      path: '.tmp/timescale-format.png',
      fullPage: false 
    });
  });

  test('should handle chart dimensions properly', async ({ page }) => {
    const oakView = page.locator('oak-view');
    const box = await oakView.boundingBox();
    
    // Verify chart takes up viewport
    expect(box.width).toBeGreaterThan(800);
    expect(box.height).toBeGreaterThan(400);
  });
});
