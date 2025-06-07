#!/usr/bin/env node

/**
 * Generate PWA Icons Script
 * Creates proper PWA icons for ClinicBoost
 */

const fs = require('fs');
const path = require('path');

// Simple SVG to create basic icons
const createSVGIcon = (size, color = '#3b82f6') => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" 
        fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">CB</text>
</svg>`;

// Create a simple PNG placeholder (base64 encoded 1x1 transparent PNG)
const createPNGPlaceholder = () => {
  // This is a minimal valid PNG file (1x1 transparent pixel)
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==',
    'base64'
  );
};

// Generate icons
const generateIcons = () => {
  const publicDir = path.join(process.cwd(), 'public');
  
  // Create SVG icons
  const svg192 = createSVGIcon(192);
  const svg512 = createSVGIcon(512);
  
  // For now, create placeholder PNG files
  // In a real scenario, you'd use a library like sharp or canvas to convert SVG to PNG
  const pngPlaceholder = createPNGPlaceholder();
  
  try {
    // Write SVG files for reference
    fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svg192);
    fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg512);
    
    // Write minimal PNG files (these should be replaced with proper icons)
    fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pngPlaceholder);
    fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pngPlaceholder);
    
    console.log('✓ PWA icons generated successfully');
    console.log('⚠️  Note: PNG files are placeholders. Use a proper image editor to create actual icons.');
    console.log('   SVG templates have been created in the public directory for reference.');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };
