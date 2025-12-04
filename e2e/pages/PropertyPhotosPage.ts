import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PropertyPhotosPage - Page Object for Property Photos screen (Step 2 of 8)
 *
 * Handles exterior property photo uploads.
 */
export class PropertyPhotosPage extends BasePage {
  // Photo grid
  readonly photoGrid: Locator;
  readonly photoThumbnails: Locator;
  readonly photoPlaceholders: Locator;

  // Upload actions
  readonly addPhotoButton: Locator;
  readonly takePhotoButton: Locator;
  readonly uploadFromGalleryButton: Locator;

  // Photo options
  readonly deletePhotoButton: Locator;
  readonly viewPhotoButton: Locator;

  // Progress
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly stepIndicator: Locator;

  // Navigation
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly skipButton: Locator;

  // Loading states
  readonly uploadProgress: Locator;

  constructor(page: Page) {
    super(page);

    // Photo display
    this.photoGrid = page.locator('[data-testid="photo-grid"], .photo-grid');
    this.photoThumbnails = page.locator('[data-testid="photo-thumbnail"], .photo-thumbnail, img[src*="blob:"]');
    this.photoPlaceholders = page.locator('[data-testid="photo-placeholder"], .photo-placeholder');

    // Upload
    this.addPhotoButton = page.getByRole('button', { name: /add photo|upload/i });
    this.takePhotoButton = page.getByRole('button', { name: /take photo|camera/i });
    this.uploadFromGalleryButton = page.getByRole('button', { name: /gallery|choose|select/i });

    // Photo management
    this.deletePhotoButton = page.locator('[data-testid="delete-photo"], [aria-label*="delete"]');
    this.viewPhotoButton = page.locator('[data-testid="view-photo"], [aria-label*="view"]');

    // Progress
    this.progressBar = page.locator('[role="progressbar"], [data-testid="progress-bar"]');
    this.progressText = page.getByText(/% complete|\d of \d steps/i);
    this.stepIndicator = page.getByText(/step 2/i);

    // Navigation
    this.continueButton = page.getByRole('button', { name: /continue|next/i });
    this.backButton = page.locator('[data-testid="back-button"], [aria-label="Back"]');
    this.skipButton = page.getByRole('button', { name: /skip/i });

    // Loading
    this.uploadProgress = page.locator('[data-testid="upload-progress"], .upload-progress');
  }

  async goto(): Promise<void> {
    await this.page.goto('/property-photos');
    await this.waitForLoad();
  }

  async isDisplayed(): Promise<boolean> {
    try {
      // Check for photo upload UI or step indicator
      const hasPhotos = await this.addPhotoButton.isVisible({ timeout: 5000 });
      const hasStep = await this.stepIndicator.isVisible({ timeout: 1000 }).catch(() => false);
      return hasPhotos || hasStep;
    } catch {
      return false;
    }
  }

  /**
   * Get count of uploaded photos
   */
  async getPhotoCount(): Promise<number> {
    return await this.photoThumbnails.count();
  }

  /**
   * Click Add Photo button (triggers file picker on web)
   */
  async clickAddPhoto(): Promise<void> {
    await this.addPhotoButton.click();
  }

  /**
   * Upload a photo via file input
   * On web, this handles the file input directly
   */
  async uploadPhoto(filePath: string): Promise<void> {
    // For web, find the hidden file input and set files directly
    const fileInput = this.page.locator('input[type="file"]');

    // If file input isn't visible, clicking add photo should create it
    if (!(await fileInput.isVisible({ timeout: 1000 }).catch(() => false))) {
      await this.clickAddPhoto();
      await this.page.waitForTimeout(500);
    }

    await fileInput.setInputFiles(filePath);
    await this.waitForUploadComplete();
  }

  /**
   * Upload photo via file chooser event
   */
  async uploadPhotoViaChooser(filePath: string): Promise<void> {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.clickAddPhoto(),
    ]);

    await fileChooser.setFiles(filePath);
    await this.waitForUploadComplete();
  }

  /**
   * Wait for upload to complete
   */
  async waitForUploadComplete(timeout = 30000): Promise<void> {
    try {
      if (await this.uploadProgress.isVisible({ timeout: 1000 })) {
        await this.uploadProgress.waitFor({ state: 'hidden', timeout });
      }
    } catch {
      // Upload may have completed quickly
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Delete a photo by index
   */
  async deletePhoto(index: number): Promise<void> {
    const thumbnail = this.photoThumbnails.nth(index);
    await thumbnail.hover();

    const deleteBtn = thumbnail.locator('[data-testid="delete-photo"], [aria-label*="delete"]');
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
    } else {
      // Try parent element
      await this.deletePhotoButton.nth(index).click();
    }

    await this.waitForLoadingComplete();
  }

  /**
   * Continue to next step
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Skip photo upload
   */
  async skip(): Promise<void> {
    if (await this.skipButton.isVisible({ timeout: 1000 })) {
      await this.skipButton.click();
      await this.waitForLoadingComplete();
    } else {
      // If no skip button, just continue
      await this.clickContinue();
    }
  }

  /**
   * Go back to previous step
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.waitForLoadingComplete();
  }
}
