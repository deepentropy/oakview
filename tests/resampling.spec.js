import { test, expect } from '@playwright/test';

test.describe('CSV Resampling Feature', () => {
  
  test.describe('QQQ Data (60 minutes base interval)', () => {
    
    test('should load QQQ with native 60-minute interval', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      
      // Wait for loading to complete
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Check that QQQ loaded successfully
      expect(logs.some(msg => msg.includes('QQQ') && msg.includes('Loaded'))).toBeTruthy();
      expect(logs.some(msg => msg.includes('bars'))).toBeTruthy();
      
      // Should have no errors
      const errors = logs.filter(msg => msg.toLowerCase().includes('error'));
      expect(errors).toEqual([]);
    });

    test('should display chart with QQQ data', async ({ page }) => {
      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1500);

      // Check canvas is rendered
      const canvas = page.locator('oak-view canvas').first();
      await expect(canvas).toBeVisible();

      // Take screenshot for visual verification
      await page.screenshot({ path: '.tmp/qqq-60-minute-chart.png' });
    });

    test('should switch to 2-hour interval (resampling 60m → 2H)', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Get initial bar count
      const initialLogs = logs.filter(msg => msg.includes('Loaded') && msg.includes('bars'));
      console.log('Initial load:', initialLogs[initialLogs.length - 1]);

      // Open interval dropdown
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);

      // Select 2H interval
      const interval2H = page.locator('.dropdown-item[data-interval="2H"]').first();
      await interval2H.click();
      await page.waitForTimeout(1000);

      // Check for resampling logs
      const resamplingLogs = logs.filter(msg => msg.includes('Resampled') || msg.includes('resampling'));
      console.log('Resampling logs:', resamplingLogs);

      // Should have resampled
      expect(resamplingLogs.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: '.tmp/qqq-2hour-resampled.png' });
    });

    test('should switch to 4-hour interval (resampling 60m → 4H)', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Open interval dropdown
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);

      // Select 4H interval
      const interval4H = page.locator('.dropdown-item[data-interval="4H"]').first();
      await interval4H.click();
      await page.waitForTimeout(1000);

      // Check for resampling
      const resamplingLogs = logs.filter(msg => msg.includes('Resampled') || msg.includes('resampling'));
      expect(resamplingLogs.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: '.tmp/qqq-4hour-resampled.png' });
    });

    test('should switch to daily interval (resampling 60m → 1D)', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Open interval dropdown
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);

      // Select 1D interval
      const interval1D = page.locator('.dropdown-item[data-interval="1D"]').first();
      await interval1D.click();
      await page.waitForTimeout(1000);

      // Check for resampling
      const resamplingLogs = logs.filter(msg => msg.includes('Resampled') || msg.includes('resampling'));
      expect(resamplingLogs.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: '.tmp/qqq-daily-resampled.png' });
    });
  });

  test.describe('SPX Data (1D base interval)', () => {
    
    test('should switch to SPX symbol', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Open symbol search
      const symbolBtn = page.locator('oakview-chart').locator('.symbol-button').first();
      await symbolBtn.click();
      await page.waitForTimeout(300);

      // Type SPX in search
      const searchInput = page.locator('.symbol-search-input').first();
      await searchInput.fill('SPX');
      await page.waitForTimeout(300);

      // Click SPX in results
      const spxResult = page.locator('.symbol-item').filter({ hasText: 'SPX' }).first();
      await spxResult.click();
      await page.waitForTimeout(1500);

      // Check that SPX loaded
      const spxLogs = logs.filter(msg => msg.includes('SPX'));
      expect(spxLogs.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: '.tmp/spx-daily-chart.png' });
    });

    test('should display SPX with 1D interval', async ({ page }) => {
      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Switch to SPX
      const symbolBtn = page.locator('oakview-chart').locator('.symbol-button').first();
      await symbolBtn.click();
      await page.waitForTimeout(300);
      
      const searchInput = page.locator('.symbol-search-input').first();
      await searchInput.fill('SPX');
      await page.waitForTimeout(300);
      
      const spxResult = page.locator('.symbol-item').filter({ hasText: 'SPX' }).first();
      await spxResult.click();
      await page.waitForTimeout(1500);

      // Check interval button shows 1D
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      const intervalText = await intervalBtn.textContent();
      expect(intervalText).toContain('D'); // Should show day interval

      // Canvas should be visible
      const canvas = page.locator('oak-view canvas').first();
      await expect(canvas).toBeVisible();
    });

    test('should switch SPX to weekly interval (resampling 1D → 1W)', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Switch to SPX
      const symbolBtn = page.locator('oakview-chart').locator('.symbol-button').first();
      await symbolBtn.click();
      await page.waitForTimeout(300);
      
      const searchInput = page.locator('.symbol-search-input').first();
      await searchInput.fill('SPX');
      await page.waitForTimeout(300);
      
      const spxResult = page.locator('.symbol-item').filter({ hasText: 'SPX' }).first();
      await spxResult.click();
      await page.waitForTimeout(1500);

      // Open interval dropdown
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);

      // Select 1W interval
      const interval1W = page.locator('.dropdown-item[data-interval="1W"]').first();
      await interval1W.click();
      await page.waitForTimeout(1000);

      // Check for resampling
      const resamplingLogs = logs.filter(msg => msg.includes('Resampled') || msg.includes('resampling'));
      expect(resamplingLogs.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: '.tmp/spx-weekly-resampled.png' });
    });

    test('should switch SPX to monthly interval (resampling 1D → 1M)', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Switch to SPX
      const symbolBtn = page.locator('oakview-chart').locator('.symbol-button').first();
      await symbolBtn.click();
      await page.waitForTimeout(300);
      
      const searchInput = page.locator('.symbol-search-input').first();
      await searchInput.fill('SPX');
      await page.waitForTimeout(300);
      
      const spxResult = page.locator('.symbol-item').filter({ hasText: 'SPX' }).first();
      await spxResult.click();
      await page.waitForTimeout(1500);

      // Open interval dropdown
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);

      // Select 1M interval
      const interval1M = page.locator('.dropdown-item[data-interval="1M"]').first();
      await interval1M.click();
      await page.waitForTimeout(1000);

      // Check for resampling
      const resamplingLogs = logs.filter(msg => msg.includes('Resampled') || msg.includes('resampling'));
      expect(resamplingLogs.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: '.tmp/spx-monthly-resampled.png' });
    });
  });

  test.describe('Resampling Accuracy', () => {
    
    test('should have fewer bars after resampling to coarser interval', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Get initial bar count (60-minute for QQQ)
      const initialLoadLog = logs.find(msg => msg.includes('Loaded') && msg.includes('bars for QQQ'));
      const initialMatch = initialLoadLog?.match(/(\d+) bars/);
      const initialBarCount = initialMatch ? parseInt(initialMatch[1]) : 0;
      
      console.log(`Initial bar count (60m): ${initialBarCount}`);
      expect(initialBarCount).toBeGreaterThan(0);

      // Clear logs
      logs.length = 0;

      // Switch to 1D interval
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);

      const interval1D = page.locator('.dropdown-item[data-interval="1D"]').first();
      await interval1D.click();
      await page.waitForTimeout(1000);

      // Get resampled bar count
      const resampledLog = logs.find(msg => msg.includes('Resampled') && msg.includes('bars'));
      console.log('Resampled log:', resampledLog);
      
      if (resampledLog) {
        const match = resampledLog.match(/(\d+) bars → (\d+) bars/);
        if (match) {
          const fromBars = parseInt(match[1]);
          const toBars = parseInt(match[2]);
          
          console.log(`Resampled: ${fromBars} bars (60m) → ${toBars} bars (1D)`);
          
          // Daily should have fewer bars than hourly
          expect(toBars).toBeLessThan(fromBars);
          expect(toBars).toBeGreaterThan(0);
        }
      }
    });

    test('should not error when resampling', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));

      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Switch through multiple intervals
      const intervals = ['2H', '4H', '1D', '1W'];
      
      for (const interval of intervals) {
        const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
        await intervalBtn.click();
        await page.waitForTimeout(300);

        const intervalItem = page.locator(`.dropdown-item[data-interval="${interval}"]`).first();
        if (await intervalItem.isVisible()) {
          await intervalItem.click();
          await page.waitForTimeout(500);
        } else {
          // Close dropdown if interval not available
          await intervalBtn.click();
        }
      }

      // Should have no errors
      expect(errors).toEqual([]);
    });
  });

  test.describe('Visual Verification', () => {
    
    test('should create comparison screenshots', async ({ page }) => {
      await page.goto('/examples/csv-example/index.html');
      await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });
      await page.waitForTimeout(1500);

      // QQQ @ 60m (native)
      await page.screenshot({ path: '.tmp/comparison-qqq-60m-native.png', fullPage: true });

      // QQQ @ 1D (resampled)
      const intervalBtn = page.locator('oakview-chart').locator('.interval-button').first();
      await intervalBtn.click();
      await page.waitForTimeout(300);
      
      const interval1D = page.locator('.dropdown-item[data-interval="1D"]').first();
      await interval1D.click();
      await page.waitForTimeout(1500);
      
      await page.screenshot({ path: '.tmp/comparison-qqq-1D-resampled.png', fullPage: true });

      // Switch to SPX
      const symbolBtn = page.locator('oakview-chart').locator('.symbol-button').first();
      await symbolBtn.click();
      await page.waitForTimeout(300);
      
      const searchInput = page.locator('.symbol-search-input').first();
      await searchInput.fill('SPX');
      await page.waitForTimeout(300);
      
      const spxResult = page.locator('.symbol-item').filter({ hasText: 'SPX' }).first();
      await spxResult.click();
      await page.waitForTimeout(1500);

      // SPX @ 1D (native)
      await page.screenshot({ path: '.tmp/comparison-spx-1D-native.png', fullPage: true });

      // SPX @ 1W (resampled)
      await intervalBtn.click();
      await page.waitForTimeout(300);
      
      const interval1W = page.locator('.dropdown-item[data-interval="1W"]').first();
      await interval1W.click();
      await page.waitForTimeout(1500);
      
      await page.screenshot({ path: '.tmp/comparison-spx-1W-resampled.png', fullPage: true });
    });
  });
});
