#!/usr/bin/env node

/**
 * Download Powers of Tau ceremony file (2^15 - larger circuits)
 * Required for ZK proof generation with circuits up to 32k constraints
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Powers of Tau file info (2^15 - supports up to 32,768 constraints)
const PTAU_URLS = [
  'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau',
  'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau',
];

const WORKSPACE_DIR = path.join(__dirname, '..', 'zk-workspace');
const PTAU_DIR = path.join(WORKSPACE_DIR, 'ptau');
const PTAU_PATH = path.join(PTAU_DIR, 'powersOfTau28_hez_final_15.ptau');

// File size for reference: ~50 MB
const EXPECTED_SIZE = 50331648;

/**
 * Download file with progress tracking
 */
const downloadFile = (url, destination) => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${destination}`);
    console.log('');

    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(destination);
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      let lastPercent = 0;

      console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log('');

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = Math.floor((downloadedBytes / totalBytes) * 100);
        
        if (percent !== lastPercent) {
          const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(2);
          const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
          process.stdout.write(`\rProgress: ${percent}% (${downloadedMB}/${totalMB} MB)`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n');
        console.log('✓ Download completed!');
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        fs.unlink(destination, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destination)) {
        fs.unlink(destination, () => {});
      }
      reject(err);
    });
  });
};

/**
 * Try downloading from multiple sources
 */
const tryDownloadFromMirrors = async (urls, destination) => {
  let lastError = null;
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`Trying mirror ${i + 1}/${urls.length}: ${url}`);
    console.log('');
    
    try {
      await downloadFile(url, destination);
      return; // Success!
    } catch (error) {
      console.error(`Failed to download from mirror ${i + 1}: ${error.message}`);
      console.log('');
      lastError = error;
      
      // Clean up partial download
      if (fs.existsSync(destination)) {
        fs.unlinkSync(destination);
      }
      
      // Continue to next mirror
      if (i < urls.length - 1) {
        console.log('Trying next mirror...');
        console.log('');
      }
    }
  }
  
  // All mirrors failed
  throw new Error(`All download mirrors failed. Last error: ${lastError?.message}`);
};

/**
 * Main download function
 */
const downloadPtau = async () => {
  try {
    console.log('========================================');
    console.log('Powers of Tau Download (2^15)');
    console.log('========================================');
    console.log('For circuits with up to 32,768 constraints');
    console.log('');

    // Create directories if they don't exist
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
      console.log(`Created directory: ${WORKSPACE_DIR}`);
    }

    if (!fs.existsSync(PTAU_DIR)) {
      fs.mkdirSync(PTAU_DIR, { recursive: true });
      console.log(`Created directory: ${PTAU_DIR}`);
    }

    // Check if file already exists
    if (fs.existsSync(PTAU_PATH)) {
      const stats = fs.statSync(PTAU_PATH);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`✓ Powers of Tau file already exists: ${PTAU_PATH}`);
      console.log(`  Size: ${sizeMB} MB`);
      
      // Verify size (allow some variation)
      const sizeDiff = Math.abs(stats.size - EXPECTED_SIZE);
      const sizeThreshold = 1024 * 100; // 100 KB threshold
      
      if (sizeDiff < sizeThreshold * 10) {
        console.log('  File size is valid. Skipping download.');
        console.log('');
        console.log('========================================');
        console.log('✓ Setup complete!');
        console.log('========================================');
        return;
      } else {
        console.log('  Warning: File size differs significantly from expected size.');
        console.log('  Re-downloading...');
        console.log('');
        fs.unlinkSync(PTAU_PATH);
      }
    }

    // Download the file
    console.log('Starting download...');
    console.log('This may take several minutes depending on your connection.');
    console.log('');
    
    await tryDownloadFromMirrors(PTAU_URLS, PTAU_PATH);

    // Verify downloaded file
    const stats = fs.statSync(PTAU_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('');
    console.log('Verification:');
    console.log(`  Downloaded size: ${sizeMB} MB`);
    console.log(`  Expected size: ${(EXPECTED_SIZE / 1024 / 1024).toFixed(2)} MB`);
    
    const sizeDiff = Math.abs(stats.size - EXPECTED_SIZE);
    if (sizeDiff < 1024 * 1024) {
      console.log('  ✓ File size is correct');
    } else {
      console.log('  ⚠ Warning: File size differs from expected');
      console.log('  This may be okay if the Powers of Tau file was updated.');
    }

    console.log('');
    console.log('========================================');
    console.log('✓ Powers of Tau download completed!');
    console.log('========================================');
    console.log(`File location: ${PTAU_PATH}`);
    console.log('');
    console.log('You can now generate ZK proofs for circuits with up to 32k constraints!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('✗ Powers of Tau download failed!');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('');
    console.error('Manual download instructions:');
    console.error('Try downloading from one of these sources:');
    PTAU_URLS.forEach((url, i) => {
      console.error(`  ${i + 1}. ${url}`);
    });
    console.error('');
    console.error(`Then place the file at: ${PTAU_PATH}`);
    console.error('');
    console.error('Alternative: Use curl or wget:');
    console.error(`  curl -o "${PTAU_PATH}" "${PTAU_URLS[0]}"`);
    console.error('');
    process.exit(1);
  }
};

// Run download
downloadPtau();








