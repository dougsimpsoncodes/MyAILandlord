import { Page, FileChooser } from '@playwright/test';
import path from 'path';

/**
 * File upload helper for Playwright E2E tests
 * Provides utilities for testing file upload functionality
 */

export class UploadHelper {
  constructor(private page: Page) {}

  /**
   * Upload a single photo file
   * @param filePath - Path to the file (absolute or relative to fixtures directory)
   * @param inputSelector - Optional selector for file input element
   */
  async uploadPhoto(filePath: string, inputSelector?: string): Promise<boolean> {
    try {
      // Resolve file path relative to fixtures directory if not absolute
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '../fixtures', filePath);

      // Set up file chooser handler
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser'),
        // Click upload button or input
        inputSelector
          ? this.page.locator(inputSelector).click()
          : this.page.locator('input[type="file"], button:has-text("Upload"), button:has-text("Add Photo")').first().click()
      ]);

      await fileChooser.setFiles(resolvedPath);

      // Wait for upload to complete
      await this.page.waitForTimeout(1000);

      return true;
    } catch (error) {
      console.error('Photo upload failed:', error);
      return false;
    }
  }

  /**
   * Upload multiple photos
   * @param filePaths - Array of file paths
   * @param inputSelector - Optional selector for file input element
   */
  async uploadMultiplePhotos(filePaths: string[], inputSelector?: string): Promise<boolean> {
    try {
      // Resolve all file paths
      const resolvedPaths = filePaths.map(filePath =>
        path.isAbsolute(filePath)
          ? filePath
          : path.join(__dirname, '../fixtures', filePath)
      );

      // Set up file chooser handler
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser'),
        // Click upload button or input
        inputSelector
          ? this.page.locator(inputSelector).click()
          : this.page.locator('input[type="file"][multiple], button:has-text("Upload"), button:has-text("Add Photos")').first().click()
      ]);

      await fileChooser.setFiles(resolvedPaths);

      // Wait for uploads to complete
      await this.page.waitForTimeout(2000);

      return true;
    } catch (error) {
      console.error('Multiple photo upload failed:', error);
      return false;
    }
  }

  /**
   * Upload audio file
   * @param filePath - Path to the audio file
   * @param inputSelector - Optional selector for file input element
   */
  async uploadAudio(filePath: string, inputSelector?: string): Promise<boolean> {
    try {
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '../fixtures', filePath);

      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser'),
        inputSelector
          ? this.page.locator(inputSelector).click()
          : this.page.locator('input[type="file"][accept*="audio"], button:has-text("Record"), button:has-text("Upload Audio")').first().click()
      ]);

      await fileChooser.setFiles(resolvedPath);

      // Wait for upload to complete
      await this.page.waitForTimeout(1500);

      return true;
    } catch (error) {
      console.error('Audio upload failed:', error);
      return false;
    }
  }

  /**
   * Check if file preview is displayed
   * @param fileName - Name of the file to check for
   */
  async hasFilePreview(fileName?: string): Promise<boolean> {
    try {
      if (fileName) {
        return await this.page.locator(`img[alt*="${fileName}"], [data-testid*="preview"], .file-preview:has-text("${fileName}")`).isVisible({ timeout: 5000 });
      }

      // Check for any preview
      return await this.page.locator('[data-testid*="preview"], .file-preview, img[alt*="preview"]').isVisible({ timeout: 5000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Check upload progress indicator
   */
  async hasUploadProgress(): Promise<boolean> {
    try {
      return await this.page.locator('[role="progressbar"], .upload-progress, [data-testid*="progress"]').isVisible({ timeout: 3000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for upload to complete
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForUploadComplete(timeout = 10000): Promise<boolean> {
    try {
      // Wait for progress indicator to disappear or success message
      await this.page.waitForSelector('[role="progressbar"], .upload-progress', { state: 'hidden', timeout });
      return true;
    } catch (error) {
      // Check for success indicator
      return await this.page.locator('text=/uploaded|success|complete/i').isVisible({ timeout: 2000 }).catch(() => false);
    }
  }

  /**
   * Check for upload error
   */
  async hasUploadError(): Promise<{ hasError: boolean; errorMessage?: string }> {
    try {
      const errorElement = this.page.locator('[role="alert"], .error-message, [data-testid*="error"]:has-text(/upload|file/i)').first();
      const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasError) {
        const errorMessage = await errorElement.textContent();
        return { hasError: true, errorMessage: errorMessage || undefined };
      }

      return { hasError: false };
    } catch (error) {
      return { hasError: false };
    }
  }

  /**
   * Remove uploaded file (if UI supports it)
   * @param index - Index of file to remove (0-based)
   */
  async removeUploadedFile(index = 0): Promise<boolean> {
    try {
      const removeButtons = this.page.locator('button[aria-label*="remove" i], button[aria-label*="delete" i], button:has-text("×")');
      const button = removeButtons.nth(index);

      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        await this.page.waitForTimeout(500);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Count number of uploaded files displayed
   */
  async getUploadedFileCount(): Promise<number> {
    try {
      const previews = this.page.locator('[data-testid*="preview"], .file-preview, .uploaded-file');
      return await previews.count();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Test file size validation
   * @param oversizedFilePath - Path to file that exceeds size limit
   */
  async testFileSizeValidation(oversizedFilePath: string): Promise<boolean> {
    try {
      const success = await this.uploadPhoto(oversizedFilePath);
      if (!success) return false;

      // Wait for error message
      await this.page.waitForTimeout(1000);
      const { hasError } = await this.hasUploadError();
      return hasError;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test file type validation
   * @param invalidFilePath - Path to file with invalid type
   */
  async testFileTypeValidation(invalidFilePath: string): Promise<boolean> {
    try {
      const success = await this.uploadPhoto(invalidFilePath);
      if (!success) return false;

      // Wait for error message
      await this.page.waitForTimeout(1000);
      const { hasError } = await this.hasUploadError();
      return hasError;
    } catch (error) {
      return false;
    }
  }

  /**
   * Simulate drag and drop file upload
   * @param filePath - Path to file
   * @param dropZoneSelector - Selector for drop zone element
   */
  async dragAndDropFile(filePath: string, dropZoneSelector: string): Promise<boolean> {
    try {
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '../fixtures', filePath);

      // Read file as buffer
      const buffer = await this.page.evaluate(() => null); // Placeholder for actual implementation

      // Get drop zone
      const dropZone = this.page.locator(dropZoneSelector).first();

      // Simulate drag and drop
      await dropZone.dispatchEvent('drop', {
        dataTransfer: {
          files: [{ name: path.basename(filePath), type: 'image/jpeg' }],
        },
      });

      await this.page.waitForTimeout(1000);
      return true;
    } catch (error) {
      console.error('Drag and drop failed:', error);
      return false;
    }
  }
}

/**
 * Test data generators for upload tests
 */
export class UploadTestData {
  /**
   * Get path to test photo fixture
   */
  static getTestPhotoPath(index = 1): string {
    return `test-photo-${index}.jpg`;
  }

  /**
   * Get path to test audio fixture
   */
  static getTestAudioPath(): string {
    return 'test-audio.mp3';
  }

  /**
   * Get path to oversized file for testing validation
   */
  static getOversizedFilePath(): string {
    return 'test-large-file.jpg';
  }

  /**
   * Get path to invalid file type for testing validation
   */
  static getInvalidFilePath(): string {
    return 'test-file.txt';
  }
}
