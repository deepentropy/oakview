import { test, expect } from '@playwright/test';

test.describe('CSV Example - Legend Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/examples/csv-example/');
    // Wait for initialization
    await page.waitForTimeout(2000);
  });

  test('legend shows correct symbol and interval', async ({ page }) => {
    // Get the oak-view element
    const oakView = page.locator('oak-view');
    await expect(oakView).toBeVisible();

    // Wait for data to load (CSV loading is async)
    await page.waitForTimeout(3000);

    // Access shadow DOM to check legend
    const legend = await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      if (!chart) return null;
      
      const chartShadow = chart.shadowRoot;
      const legendSymbol = chartShadow.querySelector('.legend-symbol');
      const legendTimeframe = chartShadow.querySelector('.legend-timeframe');
      
      return {
        symbol: legendSymbol?.textContent,
        interval: legendTimeframe?.textContent
      };
    });

    console.log('Initial legend:', legend);
    
    // Should show QQQ @ 60 after data loads
    expect(legend).toBeTruthy();
    expect(legend.symbol).toBe('QQQ');
    expect(legend.interval).toBe('60');
  });

  test('legend updates when interval changes', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000);

    // Get initial legend state
    const initialLegend = await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      return {
        symbol: chartShadow.querySelector('.legend-symbol')?.textContent,
        interval: chartShadow.querySelector('.legend-timeframe')?.textContent
      };
    });

    console.log('Initial legend:', initialLegend);

    // Click interval dropdown
    const intervalButton = await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      const btn = chartShadow.querySelector('.interval-button');
      btn?.click();
      return btn ? true : false;
    });

    expect(intervalButton).toBe(true);
    await page.waitForTimeout(500);

    // Select 2H interval
    await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      const options = chartShadow.querySelectorAll('.interval-option');
      
      // Find 120 (2H) option
      for (const option of options) {
        if (option.textContent.includes('2H') || option.getAttribute('data-interval') === '120') {
          option.click();
          break;
        }
      }
    });

    await page.waitForTimeout(2000);

    // Check updated legend
    const updatedLegend = await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      return {
        symbol: chartShadow.querySelector('.legend-symbol')?.textContent,
        interval: chartShadow.querySelector('.legend-timeframe')?.textContent
      };
    });

    console.log('Updated legend:', updatedLegend);
    
    // Legend should update to show new interval
    expect(updatedLegend.interval).toBe('120');
  });

  test('legend updates when symbol changes', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Open symbol search
    await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      const searchInput = chartShadow.querySelector('.symbol-search');
      searchInput?.click();
    });

    await page.waitForTimeout(500);

    // Type SPX
    await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      const searchInput = chartShadow.querySelector('.symbol-search');
      searchInput.value = 'SPX';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.waitForTimeout(500);

    // Select SPX from results
    await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      const results = chartShadow.querySelectorAll('.search-result');
      
      for (const result of results) {
        if (result.textContent.includes('SPX')) {
          result.click();
          break;
        }
      }
    });

    await page.waitForTimeout(2000);

    // Check updated legend
    const updatedLegend = await page.evaluate(() => {
      const oakview = document.querySelector('oak-view');
      const chart = oakview.shadowRoot.querySelector('oakview-internal-chart');
      const chartShadow = chart.shadowRoot;
      return {
        symbol: chartShadow.querySelector('.legend-symbol')?.textContent,
        interval: chartShadow.querySelector('.legend-timeframe')?.textContent
      };
    });

    console.log('Updated legend after symbol change:', updatedLegend);
    
    // Legend should show SPX
    expect(updatedLegend.symbol).toBe('SPX');
  });
});
