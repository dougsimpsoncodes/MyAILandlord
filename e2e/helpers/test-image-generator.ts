/**
 * Test Image Generator Helper
 *
 * Generates mock image files for Playwright tests.
 * Creates valid JPEG files that can be used for upload testing.
 */

import { Buffer } from 'buffer';

export interface TestImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

/**
 * Generate a minimal valid JPEG file for testing
 * Returns a Buffer containing a valid JPEG image
 */
export function generateTestImage(options: TestImageOptions = {}): Buffer {
  const {
    width = 800,
    height = 600,
    format = 'jpeg',
  } = options;

  // Minimal valid JPEG file (1x1 pixel red square)
  // This is a base64 encoded JPEG that can be decoded to a Buffer
  const minimalJPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy' +
    'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA' +
    'AhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEB' +
    'AQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
    'base64'
  );

  // For testing purposes, we return the minimal JPEG
  // In a real scenario, you might use a library like 'canvas' to generate actual images
  return minimalJPEG;
}

/**
 * Generate test image data that can be used with Playwright's setInputFiles
 */
export function generateTestImageFile(filename: string, options: TestImageOptions = {}) {
  const buffer = generateTestImage(options);

  return {
    name: filename,
    mimeType: options.format === 'png' ? 'image/png' : 'image/jpeg',
    buffer,
  };
}

/**
 * Create multiple test image files
 */
export function generateMultipleTestImages(count: number, prefix = 'test-photo'): Array<{
  name: string;
  mimeType: string;
  buffer: Buffer;
}> {
  const images = [];
  for (let i = 1; i <= count; i++) {
    images.push(generateTestImageFile(`${prefix}-${i}.jpg`));
  }
  return images;
}

/**
 * Generate a large test image file (for testing file size limits)
 */
export function generateLargeTestImage(sizeInMB: number): Buffer {
  // Create a buffer of the specified size
  const sizeInBytes = sizeInMB * 1024 * 1024;
  const buffer = Buffer.alloc(sizeInBytes);

  // Fill with JPEG header and some data
  const header = generateTestImage();
  header.copy(buffer, 0);

  return buffer;
}

/**
 * Generate invalid image file (for testing validation)
 */
export function generateInvalidImageFile(filename: string): {
  name: string;
  mimeType: string;
  buffer: Buffer;
} {
  return {
    name: filename,
    mimeType: 'image/jpeg',
    buffer: Buffer.from('This is not a valid image file'),
  };
}
