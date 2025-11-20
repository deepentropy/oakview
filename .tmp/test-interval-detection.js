import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    if (msg.text().includes('🔍')) {
      console.log(msg.text());
    }
  });
  
  await page.goto('http://localhost:5175');
  
  // Wait for data to load
  await page.waitForTimeout(3000);
  
  // Try loading KLAR (4-minute file)
  const symbolInput = page.locator('input[placeholder="Search symbol"]').first();
  await symbolInput.click();
  await symbolInput.fill('KLAR');
  await page.keyboard.press('Enter');
  
  // Wait for detection logs
  await page.waitForTimeout(2000);
  
  console.log('\n--- Test complete ---');
  
  await browser.close();
})();
