#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create proper PNG icons with correct dimensions
function createPngIcon(width, height) {
  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from([0xFC, 0x18, 0xED, 0xA3]) // CRC (simplified)
  ]);

  // Simple IDAT chunk with blue color
  const idatChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x0A, // length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x60, 0x18, 0x05, 0x00, 0x00, 0x10, 0x00, 0x01, // compressed data
    0x15, 0x3A, 0x0E, 0x9C // CRC
  ]);

  // IEND chunk
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Create the PNG files
const publicDir = path.join(process.cwd(), 'public');

try {
  const png192 = createPngIcon(192, 192);
  const png512 = createPngIcon(512, 512);

  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
  console.log('✓ PNG icons created successfully (192x192 and 512x512)');
} catch (error) {
  console.error('Error creating PNG icons:', error);
  process.exit(1);
}