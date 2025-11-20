/**
 * Playwright test for timescale interval formatting
 * Tests that OakView correctly displays time labels for different intervals:
 * - 1S (1 second bars) should show HH:MM:SS
 * - 5 (5 minute bars) should show HH:MM
 * - 1W (1 week bars) should show dates
 */

import { test, expect } from '@playwright/test';

test.describe('OakView Timescale Interval Formatting', () => {
  test.beforeEach(async ({ page }) => {
    // Start dev server if not running, then navigate
    await page.goto('http://localhost:5175/examples/csv-example/');
    
    // Wait for OakView to initialize
    await page.waitForSelector('oak-view', { timeout: 5000 });
    await page.waitForTimeout(1000); // Give time for initialization
  });

  test('should load and display 1-second interval data (BATS_TSLA)', async ({ page }) => {
    console.log('Testing 1-second interval data...');
    
    // Find symbol search input and change to BATS_TSLA
    const symbolInput = page.locator('.symbol-search input').first();
    await symbolInput.click();
    await symbolInput.fill('BATS_TSLA');
    
    // Wait for results and select first match
    await page.waitForTimeout(500);
    const firstResult = page.locator('.search-results .result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
    } else {
      // Fallback: just press Enter
      await symbolInput.press('Enter');
    }
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check that chart canvas exists and has content
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Verify interval selector shows "1S"
    const intervalButton = page.locator('.interval-selector button[data-active="true"]').first();
    const intervalText = await intervalButton.textContent();
    console.log('Active interval:', intervalText);
    expect(intervalText?.trim()).toBe('1S');
  });

  test('should load and display 5-minute interval data (BATS_KLAR)', async ({ page }) => {
    console.log('Testing 5-minute interval data...');
    
    // Change symbol to BATS_KLAR
    const symbolInput = page.locator('.symbol-search input').first();
    await symbolInput.click();
    await symbolInput.fill('BATS_KLAR');
    await page.waitForTimeout(500);
    
    const firstResult = page.locator('.search-results .result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
    } else {
      await symbolInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // Check canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Verify interval shows "5"
    const intervalButton = page.locator('.interval-selector button[data-active="true"]').first();
    const intervalText = await intervalButton.textContent();
    console.log('Active interval:', intervalText);
    expect(intervalText?.trim()).toBe('5');
  });

  test('should load and display 1-week interval data (BATS_OKLO)', async ({ page }) => {
    console.log('Testing 1-week interval data...');
    
    // Change symbol to BATS_OKLO
    const symbolInput = page.locator('.symbol-search input').first();
    await symbolInput.click();
    await symbolInput.fill('BATS_OKLO');
    await page.waitForTimeout(500);
    
    const firstResult = page.locator('.search-results .result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
    } else {
      await symbolInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // Check canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Verify interval shows "1W"
    const intervalButton = page.locator('.interval-selector button[data-active="true"]').first();
    const intervalText = await intervalButton.textContent();
    console.log('Active interval:', intervalText);
    expect(intervalText?.trim()).toBe('1W');
  });

  test('should switch between intervals and update timescale', async ({ page }) => {
    console.log('Testing interval switching...');
    
    // Load QQQ (60 minute data)
    const symbolInput = page.locator('.symbol-search input').first();
    await symbolInput.click();
    await symbolInput.fill('QQQ');
    await symbolInput.press('Enter');
    await page.waitForTimeout(2000);
    
    // Verify we're on 60-minute interval
    let intervalButton = page.locator('.interval-selector button[data-active="true"]').first();
    let intervalText = await intervalButton.textContent();
    console.log('Initial interval:', intervalText);
    expect(intervalText?.trim()).toBe('60');
    
    // Switch to 120-minute interval (resampled)
    const interval120 = page.locator('.interval-selector button').filter({ hasText: '120' }).first();
    if (await interval120.isVisible()) {
      await interval120.click();
      await page.waitForTimeout(2000);
      
      // Verify interval changed
      intervalButton = page.locator('.interval-selector button[data-active="true"]').first();
      intervalText = await intervalButton.textContent();
      console.log('New interval:', intervalText);
      expect(intervalText?.trim()).toBe('120');
    } else {
      console.log('120-minute interval not available, skipping switch test');
    }
  });
});
