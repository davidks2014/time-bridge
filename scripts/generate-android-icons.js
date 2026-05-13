const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const source = './assets/icon-only.png';
const foreground = './assets/icon-foreground.png';

const sizes = [
  { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48 },
  { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72 },
  { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96 },
  { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144 },
  { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
];

async function generate() {
  for (const { dir, size } of sizes) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(source).resize(size, size).toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(source).resize(size, size).toFile(path.join(dir, 'ic_launcher_round.png'));
    await sharp(foreground).resize(size, size).toFile(path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`Generated ${size}x${size} icons in ${dir}`);
  }
  // Play Store hi-res icon
  fs.mkdirSync('./store-listing/android', { recursive: true });
  await sharp(source).resize(512, 512).toFile('./store-listing/android/icon-512.png');
  console.log('Generated Play Store 512x512 icon');
}

generate().catch(console.error);
