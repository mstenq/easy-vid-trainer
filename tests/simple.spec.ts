import { test, expect } from '@playwright/test';

test.describe('Simple Tests', () => {
  test('basic navigation test', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Bun + React');
  });
  
  test('page loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if the page has basic content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check if React app has loaded by looking for the root div
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});
