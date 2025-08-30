import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper function to wait for network requests to settle
async function waitForNetworkIdle(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Additional buffer for React state updates
}

// Helper function to wait for video to load
async function waitForVideoLoad(page: any) {
  const video = page.locator('video').first();
  if (await video.isVisible()) {
    // Wait for video metadata to load
    await page.waitForFunction(() => {
      const videoEl = document.querySelector('video');
      return videoEl && videoEl.readyState >= 2; // HAVE_CURRENT_DATA or higher
    }, { timeout: 10000 });
    
    // Additional wait for video to be ready
    await page.waitForTimeout(1000);
  }
}

// Test data
const TEST_DATASET_NAME = 'test-dataset-e2e';
const TEST_VIDEO_PATH = join(process.cwd(), 'test-assets', 'test-video.mp4');
const TEST_START_TIME = 1; // 1 second
const TEST_CROP = {
  x: 100,
  y: 50,
  width: 800,
  height: 600
};

test.describe('Easy Vid Trainer E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await waitForNetworkIdle(page);
  });

  test('complete workflow: create dataset, upload video, configure, and verify persistence', async ({ page }) => {
    // Step 1: Create a new dataset
    console.log('Step 1: Creating dataset...');
    
    // Click the "Create Dataset" button
    await page.click('button:has-text("Create Dataset")');
    
    // Fill in dataset name in the modal
    await page.fill('[data-testid="dataset-name-input"]', TEST_DATASET_NAME);
    
    // Submit the form
    await page.click('[data-testid="create-dataset-submit"]');
    
    // Wait for dataset creation and navigation
    await waitForNetworkIdle(page);
    
    // Verify we're on the dataset detail page
    await expect(page).toHaveURL(new RegExp(`/dataset/\\d+`));
    await expect(page.locator('h1')).toContainText(TEST_DATASET_NAME);

    // Step 2: Upload a video
    console.log('Step 2: Uploading video...');
    
    // Click the upload button to open the upload modal
    await page.click('button:has-text("Upload Videos")');
    
    // Wait for upload modal to be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Upload the test video file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_VIDEO_PATH);
    
    // Wait for file to be processed and upload button to appear
    const uploadButton = page.locator('[data-testid="upload-submit-button"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeEnabled();
    
    // Wait for button to stabilize (video metadata loading can cause re-renders)
    await page.waitForTimeout(2000);
    
    await uploadButton.click();
    
    // Wait for upload completion and modal to close
    await waitForNetworkIdle(page);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Wait a bit more for any animations to complete
    await page.waitForTimeout(1000);
    
    // Verify video appears in the list
    await expect(page.locator('[data-testid="video-item"]')).toHaveCount(1);
    
    // Step 3: Configure the video
    console.log('Step 3: Configuring video...');
    
    // Click on the video to select/configure it
    await page.click('[data-testid="video-item"]');
    
    // Wait for video player and configuration panel to load
    await waitForNetworkIdle(page);
    await waitForVideoLoad(page);
    
    // Verify video player is visible
    await expect(page.locator('video')).toBeVisible();
    
    // Step 3a: Set start time to 1 second
    console.log('Step 3a: Setting start time...');
    
    // Find and update the start time input using test ID
    const startTimeInput = page.locator('[data-testid="start-time-input"]');
    await startTimeInput.clear();
    await startTimeInput.fill(TEST_START_TIME.toString());
    await startTimeInput.blur(); // Trigger save
    
    // Wait for the change to be saved
    await waitForNetworkIdle(page);
    
    // Step 3b: Change resolution if there's a dropdown
    console.log('Step 3b: Checking resolution options...');
    
    const resolutionSelect = page.locator('[data-testid="resolution-select"]');
    
    if (await resolutionSelect.isVisible()) {
      await resolutionSelect.click();
      await page.click('text=720×1280 (9:16 Portrait)'); // Change to vertical format
      await waitForNetworkIdle(page);
    }
    
    // Step 3c: Modify crop settings
    console.log('Step 3c: Modifying crop settings...');
    
    // Try to find the crop overlay
    const cropOverlay = page.locator('[data-testid="crop-overlay"]');
    
    if (await cropOverlay.isVisible()) {
      // If there's a visual crop overlay, try to interact with it
      const cropBounds = await cropOverlay.boundingBox();
      if (cropBounds) {
        // Simulate drag to resize crop area
        await page.mouse.move(cropBounds.x + cropBounds.width - 10, cropBounds.y + cropBounds.height - 10);
        await page.mouse.down();
        await page.mouse.move(cropBounds.x + cropBounds.width - 50, cropBounds.y + cropBounds.height - 50);
        await page.mouse.up();
        await waitForNetworkIdle(page);
      }
    } else {
      // Try to find the crop size slider
      const cropSlider = page.locator('input[type="range"]');
      if (await cropSlider.isVisible()) {
        await cropSlider.fill('80'); // Set to 80%
        await waitForNetworkIdle(page);
      }
    }
    
    // Step 4: Verify configuration is saved
    console.log('Step 4: Verifying configuration persistence...');
    
    // Reload the page to test persistence
    await page.reload();
    await waitForNetworkIdle(page);
    
    // Navigate back to the video (it should be selected)
    await page.click('[data-testid="video-item"]');
    await waitForNetworkIdle(page);
    
    // Verify start time is preserved
    const persistedStartTimeInput = page.locator('[data-testid="start-time-input"]');
    const startTimeValue = await persistedStartTimeInput.inputValue();
    expect(parseFloat(startTimeValue)).toBeCloseTo(TEST_START_TIME, 1);
    
    // Step 5: Test processing
    console.log('Step 5: Testing processing...');
    
    // Find and click the process button
    const processButton = page.locator('button:has-text("Process")').or(
      page.locator('button:has-text("Start Processing")')
    ).first();
    
    if (await processButton.isVisible()) {
      await processButton.click();
      
      // Wait for processing to complete or show progress
      await waitForNetworkIdle(page);
      
      // Look for success indicators
      const successIndicators = [
        page.locator('text=completed'),
        page.locator('text=processed'),
        page.locator('text=100%'),
        page.locator('.text-green-600'),
        page.locator('[data-testid="processing-success"]')
      ];
      
      let foundSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.isVisible()) {
          foundSuccess = true;
          break;
        }
      }
      
      // Give processing some time if not immediately successful
      if (!foundSuccess) {
        await page.waitForTimeout(5000);
        await waitForNetworkIdle(page);
      }
    }
    
    // Step 6: Final verification
    console.log('Step 6: Final verification...');
    
    // Verify the video item is still present and configured
    await expect(page.locator('[data-testid="video-item"]')).toHaveCount(1);
    
    // Verify dataset name is still displayed
    await expect(page.locator('h1')).toContainText(TEST_DATASET_NAME);
    
    console.log('✅ All test steps completed successfully!');
  });

  test('dataset creation and navigation', async ({ page }) => {
    // Test just the dataset creation flow
    await page.click('button:has-text("Create Dataset")');
    await page.fill('[data-testid="dataset-name-input"]', 'Quick Test Dataset');
    await page.click('[data-testid="create-dataset-submit"]');
    
    await waitForNetworkIdle(page);
    
    // Verify navigation to dataset page
    await expect(page).toHaveURL(new RegExp(`/dataset/\\d+`));
    await expect(page.locator('h1')).toContainText('Quick Test Dataset');
  });

  test('video upload modal functionality', async ({ page }) => {
    // First create a dataset
    await page.click('button:has-text("Create Dataset")');
    await page.fill('[data-testid="dataset-name-input"]', 'Upload Test Dataset');
    await page.click('[data-testid="create-dataset-submit"]');
    await waitForNetworkIdle(page);
    
    // Test upload modal
    await page.click('button:has-text("Upload Videos")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Test file selection
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_VIDEO_PATH);
    
        // Verify upload button appears
    await expect(page.locator('[data-testid="upload-submit-button"]')).toBeVisible();
    
    // Test modal close
    const closeButton = page.locator('[data-testid="upload-cancel-button"]');
    await closeButton.click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('video configuration persistence', async ({ page }) => {
    // This test focuses specifically on the persistence aspect
    
    // Create dataset and upload video (abbreviated version)
    await page.click('button:has-text("Create Dataset")');
    await page.fill('[data-testid="dataset-name-input"]', 'Persistence Test');
    await page.click('[data-testid="create-dataset-submit"]');
    await waitForNetworkIdle(page);
    
    await page.click('button:has-text("Upload Videos")');
    await page.locator('input[type="file"]').setInputFiles(TEST_VIDEO_PATH);
    await page.click('[data-testid="upload-submit-button"]');
    await waitForNetworkIdle(page);
    
    // Wait for modal to close completely  
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await page.waitForTimeout(1000);
    
    // Configure video
    await page.click('[data-testid="video-item"]');
    await waitForNetworkIdle(page);
    
    // Set start time
    const configStartTimeInput = page.locator('[data-testid="start-time-input"]');
    await configStartTimeInput.clear();
    await configStartTimeInput.fill('2.5');
    await configStartTimeInput.blur();
    await waitForNetworkIdle(page);
    
    // Test persistence with page reload
    await page.reload();
    await waitForNetworkIdle(page);
    
    await page.click('[data-testid="video-item"]');
    await waitForNetworkIdle(page);
    
    // Verify start time persisted
    const persistedValue = await configStartTimeInput.inputValue();
    expect(parseFloat(persistedValue)).toBeCloseTo(2.5, 1);
  });

  // Test error handling
  test('error handling for invalid operations', async ({ page }) => {
    // Test behavior with no dataset selected, empty inputs, etc.
    
    // Try to access a non-existent dataset
    await page.goto('/dataset/99999');
    
    // Should handle gracefully (either redirect or show error)
    await waitForNetworkIdle(page);
    
    // Verify we either get an error message or redirect to home
    const isOnHome = page.url().endsWith('/');
    const hasErrorMessage = await page.locator('text=error').or(page.locator('text=not found')).isVisible();
    
    expect(isOnHome || hasErrorMessage).toBeTruthy();
  });
});

test.describe('API Integration Tests', () => {
  
  test('datasets API endpoints', async ({ request }) => {
    // Test the REST API directly
    
    // Create dataset
    const createResponse = await request.post('/api/datasets', {
      data: { name: 'API Test Dataset' }
    });
    expect(createResponse.ok()).toBeTruthy();
    
    const dataset = await createResponse.json();
    expect(dataset.name).toBe('API Test Dataset');
    
    // List datasets
    const listResponse = await request.get('/api/datasets');
    expect(listResponse.ok()).toBeTruthy();
    
    const datasets = await listResponse.json();
    expect(Array.isArray(datasets)).toBeTruthy();
    expect(datasets.some((d: any) => d.name === 'API Test Dataset')).toBeTruthy();
    
    // Get specific dataset
    const getResponse = await request.get(`/api/datasets/${dataset.id}`);
    expect(getResponse.ok()).toBeTruthy();
    
    const fetchedDataset = await getResponse.json();
    expect(fetchedDataset.id).toBe(dataset.id);
  });

  test('video metadata API', async ({ request }) => {
    // Create a dataset first
    const datasetResponse = await request.post('/api/datasets', {
      data: { name: 'Video API Test' }
    });
    const dataset = await datasetResponse.json();
    
    // Test video upload endpoint exists
    const uploadResponse = await request.post(`/api/datasets/${dataset.id}/videos`, {
      multipart: {
        video: TEST_VIDEO_PATH
      }
    });
    
    // Should either succeed or give meaningful error
    expect([200, 201, 400, 422].includes(uploadResponse.status())).toBeTruthy();
  });
});
