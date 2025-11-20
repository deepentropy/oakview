import { test, expect } from '@playwright/test';

test.describe('CSV Example', () => {
  test('should load and display chart', async ({ page }) => {
    // Navigate to the CSV example
    await page.goto('/examples/csv-example/index.html');

    // Wait for loading overlay to disappear
    await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });

    // Check that oak-view element is present
    const oakView = page.locator('oak-view#chart');
    await expect(oakView).toBeVisible();

    // Check that symbol is set correctly
    await expect(oakView).toHaveAttribute('symbol', 'QQQ');

    // Check that theme is dark
    await expect(oakView).toHaveAttribute('theme', 'dark');

    // Check that layout is single
    await expect(oakView).toHaveAttribute('layout', 'single');
  });

  test('should render chart canvas', async ({ page }) => {
    await page.goto('/examples/csv-example/index.html');
    
    // Wait for loading to complete
    await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });

    // Wait a bit for chart to render
    await page.waitForTimeout(1000);

    // Check that canvas elements are rendered (lightweight-charts creates canvas)
    const canvases = page.locator('oak-view canvas');
    await expect(canvases.first()).toBeVisible();
  });

  test('should log successful initialization', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    await page.goto('/examples/csv-example/index.html');
    
    // Wait for loading to complete
    await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });

    // Check console logs
    expect(consoleMessages.some(msg => msg.includes('CSV example initialized successfully'))).toBeTruthy();
    expect(consoleMessages.some(msg => msg.includes('Loaded') && msg.includes('bars'))).toBeTruthy();
  });

  test('should not have JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/examples/csv-example/index.html');
    
    // Wait for loading to complete
    await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 10000 });

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    // Should have no errors
    expect(errors).toEqual([]);
  });

  test('should display loading spinner initially', async ({ page }) => {
    await page.goto('/examples/csv-example/index.html');

    // Loading overlay should be visible initially
    const loading = page.locator('#loading');
    
    // Check if loading is visible or already hidden (fast loading)
    const isVisible = await loading.isVisible();
    if (isVisible) {
      // If visible, check spinner is there
      await expect(page.locator('.spinner')).toBeVisible();
    }

    // Eventually should be hidden
    await expect(loading).toHaveClass(/hidden/, { timeout: 10000 });
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/examples/csv-example/index.html');
    await expect(page).toHaveTitle('OakView CSV Example');
  });
});
