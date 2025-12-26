import { test } from '@playwright/test';

test('debug login page selectors', async ({ page }) => {
  await page.goto('http://localhost:8081/login');
  await page.waitForTimeout(3000);

  // Find ALL inputs on the page
  const allInputs = await page.locator('input').count();
  console.log(`Found ${allInputs} input elements`);

  for (let i = 0; i < allInputs; i++) {
    const input = page.locator('input').nth(i);
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    const name = await input.getAttribute('name');
    console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, name=${name}`);
  }

  // Find ALL buttons
  const allButtons = await page.locator('button').count();
  console.log(`\nFound ${allButtons} button elements`);

  for (let i = 0; i < allButtons; i++) {
    const button = page.locator('button').nth(i);
    const text = await button.textContent();
    console.log(`Button ${i}: text="${text}"`);
  }

  await page.screenshot({ path: '/tmp/debug-login.png' });
});
