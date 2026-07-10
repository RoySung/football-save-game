const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Error: "sharp" library is not installed. Please run "npm install" first.');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '../public/assets');
const BACKUP_DIR = path.join(__dirname, '../public/assets_backup');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_DIR}`);
}

const assets = [
  { name: 'bg_stadium.png', type: 'image', maxWidth: 1280 },
  { name: 'football.png', type: 'image', maxWidth: 256 },
  { name: 'goalkeeper_sheet.png', type: 'sheet', width: 1024, height: 1024 },
  { name: 'striker_sheet.png', type: 'sheet', width: 1024, height: 1024 },
  { name: 'logo.png', type: 'image', maxWidth: 512 },
  { name: 'logo_angry.png', type: 'image', maxWidth: 512 },
  { name: 'logo_shock.png', type: 'image', maxWidth: 512 }
];

async function run() {
  for (const asset of assets) {
    const srcPath = path.join(ASSETS_DIR, asset.name);
    const backupPath = path.join(BACKUP_DIR, asset.name);

    if (!fs.existsSync(srcPath) && !fs.existsSync(backupPath)) {
      console.warn(`Warning: Asset not found: ${asset.name}`);
      continue;
    }

    // Backup the file if it hasn't been backed up yet
    if (!fs.existsSync(backupPath) && fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, backupPath);
      console.log(`Backed up ${asset.name} to assets_backup/`);
    }

    // Always read from backup if it exists, otherwise read from src
    const inputPath = fs.existsSync(backupPath) ? backupPath : srcPath;

    console.log(`Processing ${asset.name}...`);
    try {
      const image = sharp(inputPath);

      // We overwrite the original in ASSETS_DIR
      if (asset.type === 'sheet') {
        await image
          .resize(asset.width, asset.height)
          .png({ compressionLevel: 9, effort: 8 })
          .toFile(srcPath);
      } else {
        await image
          .resize({ width: asset.maxWidth, withoutEnlargement: true })
          .png({ compressionLevel: 9, effort: 8 })
          .toFile(srcPath);
      }

      const origStats = fs.statSync(inputPath);
      const newStats = fs.statSync(srcPath);
      const savings = ((origStats.size - newStats.size) / 1024 / 1024).toFixed(2);
      const percent = ((1 - newStats.size / origStats.size) * 100).toFixed(1);
      console.log(`✓ ${asset.name}: ${(origStats.size / 1024 / 1024).toFixed(2)} MB -> ${(newStats.size / 1024 / 1024).toFixed(2)} MB (-${savings} MB, -${percent}%)`);
    } catch (err) {
      console.error(`Error processing ${asset.name}:`, err.message);
    }
  }
}

run().then(() => console.log('Asset compression completed.'));
