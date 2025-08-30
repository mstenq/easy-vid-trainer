import { test, expect } from '@playwright/test';
import { join } from 'path';

const TEST_VIDEO_PATH = join(process.cwd(), 'test-assets', 'test-video.mp4');

// Helper function to wait for network requests to settle
async function waitForNetworkIdle(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Upload Debug Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);
  });

  test('debug upload flow step by step', async ({ page }) => {
    console.log('🔧 Starting upload debug test...');
    
    // Step 1: Create dataset
    console.log('Step 1: Creating dataset...');
    await page.click('button:has-text("Create Dataset")');
    await page.fill('[data-testid="dataset-name-input"]', 'Debug Test Dataset');
    await page.click('[data-testid="create-dataset-submit"]');
    await waitForNetworkIdle(page);
    
    // Verify we're on dataset page
    await expect(page).toHaveURL(/\/dataset\/\d+/);
    console.log('✅ Dataset created and navigated');
    
    // Step 2: Open upload modal
    console.log('Step 2: Opening upload modal...');
    await page.click('button:has-text("Upload Videos")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    console.log('✅ Upload modal opened');
    
    // Step 3: Check file input
    console.log('Step 3: Locating file input...');
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    console.log('✅ File input found');
    
    // Step 4: Select file
    console.log('Step 4: Selecting test video file...');
    await fileInput.setInputFiles(TEST_VIDEO_PATH);
    console.log('✅ File selected');
    
    // Wait and check what happens
    await page.waitForTimeout(3000);
    
    // Step 5: Check if upload button appears
    console.log('Step 5: Looking for upload button...');
    const uploadButton = page.locator('[data-testid="upload-submit-button"]');
    const isVisible = await uploadButton.isVisible();
    const isEnabled = await uploadButton.isEnabled();
    const buttonText = await uploadButton.textContent();
    
    console.log(`Upload button - Visible: ${isVisible}, Enabled: ${isEnabled}, Text: "${buttonText}"`);
    
    if (isVisible && isEnabled) {
      console.log('✅ Upload button is ready, clicking...');
      await uploadButton.click();
      await waitForNetworkIdle(page);
      console.log('✅ Upload completed');
    } else {
      console.log('❌ Upload button not ready');
      
      // Check for errors
      const errorElements = page.locator('.text-destructive, [role="alert"], .error');
      const errorCount = await errorElements.count();
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent();
          console.log(`Error found: ${errorText}`);
        }
      }
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/upload-debug.png', fullPage: true });
      console.log('📸 Screenshot saved to test-results/upload-debug.png');
    }
  });
  
  test('check file format acceptance', async ({ page }) => {
    // Create dataset first
    await page.click('button:has-text("Create Dataset")');
    await page.fill('[data-testid="dataset-name-input"]', 'Format Test');
    await page.click('[data-testid="create-dataset-submit"]');
    await waitForNetworkIdle(page);
    
    // Open upload modal
    await page.click('button:has-text("Upload Videos")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Check dropzone attributes
    const dropzone = page.locator('[class*="border-dashed"]');
    await expect(dropzone).toBeVisible();
    
    console.log('✅ Dropzone is visible and ready for file drop');
    
    // Check file input accept attribute
    const fileInput = page.locator('input[type="file"]');
    const acceptAttr = await fileInput.getAttribute('accept');
    console.log(`File input accept attribute: ${acceptAttr}`);
  });
});
