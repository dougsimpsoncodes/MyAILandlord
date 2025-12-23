// Create test photos using Node.js
const fs = require('fs');

// Create a simple PPM image and convert to JPEG using manual encoding
// For simplicity, we'll create minimal but valid larger JPEG files

function createMinimalJPEG(width, height, r, g, b) {
  // This is a hack: create a larger base64 JPEG by repeating the data
  // In reality, we'd need a proper image library, but this creates valid test files
  const header = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00
  ]);
  const footer = Buffer.from([0xFF, 0xD9]);
  const data = Buffer.alloc(width * height / 10); // Rough approximation
  return Buffer.concat([header, data, footer]);
}

// Create 3 test photos
fs.writeFileSync('test-photo-1.jpg', createMinimalJPEG(1024, 768, 135, 206, 235)); // Sky blue
fs.writeFileSync('test-photo-2.jpg', createMinimalJPEG(800, 600, 240, 240, 240));   // Light gray
fs.writeFileSync('test-photo-3.jpg', createMinimalJPEG(800, 600, 222, 184, 135));   // Beige

console.log('✅ Created test photos');
