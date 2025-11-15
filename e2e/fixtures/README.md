# Test Fixtures

This directory contains test files for E2E testing.

## Files

- `test-photo-1.jpg` - Sample photo for upload testing (1KB)
- `test-photo-2.jpg` - Second sample photo (1KB)
- `test-photo-3.jpg` - Third sample photo (1KB)
- `test-audio.mp3` - Sample audio file for upload testing (1KB)
- `test-large-file.jpg` - Oversized file for validation testing (10MB placeholder)
- `test-file.txt` - Invalid file type for validation testing

## Generating Test Files

These files are minimal placeholders. For real testing, replace with actual image/audio files.

To generate placeholder files:
```bash
# Create small test images (1x1 pixel)
convert -size 1x1 xc:white test-photo-1.jpg
convert -size 1x1 xc:blue test-photo-2.jpg
convert -size 1x1 xc:red test-photo-3.jpg

# Create empty audio file
dd if=/dev/zero of=test-audio.mp3 bs=1024 count=1

# Create large file
dd if=/dev/zero of=test-large-file.jpg bs=1048576 count=10

# Create text file
echo "This is a test file" > test-file.txt
```
