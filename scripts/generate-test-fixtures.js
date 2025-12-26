#!/usr/bin/env node
/**
 * Generate test fixtures for E2E tests
 * Creates simple test images using Canvas
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const fixturesDir = path.join(__dirname, '../e2e/fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Generate a simple test image
function generateTestImage(filename, text, color = '#4A90E2') {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 800, 600);

  // Border
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 800, 600);

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 400, 300);

  // Timestamp
  ctx.font = '24px Arial';
  ctx.fillText(new Date().toISOString(), 400, 400);

  // Save as JPEG
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  const filepath = path.join(fixturesDir, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`✅ Generated: ${filepath}`);
}

// Generate test images
console.log('🎨 Generating test fixtures...\n');

generateTestImage('test-kitchen-photo.jpg', 'Test Kitchen Photo', '#4A90E2');
generateTestImage('test-fridge-photo.jpg', 'Test Fridge Photo', '#2ECC71');
generateTestImage('test-property-photo.jpg', 'Test Property Photo', '#E67E22');

console.log('\n✅ All test fixtures generated!');
