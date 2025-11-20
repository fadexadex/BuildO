#!/usr/bin/env node

/**
 * Setup script to download and install Circom compiler
 * Automatically detects platform and downloads the appropriate binary
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CIRCOM_VERSION = '2.2.3';
const GITHUB_RELEASE_URL = `https://github.com/iden3/circom/releases/download/v${CIRCOM_VERSION}`;

// Determine platform and architecture
const platform = process.platform; // 'win32', 'darwin', 'linux'
const arch = process.arch; // 'x64', 'arm64', etc.

// Map platform to binary name
const getBinaryInfo = () => {
  switch (platform) {
    case 'win32':
      return {
        url: `${GITHUB_RELEASE_URL}/circom-windows-amd64.exe`,
        filename: 'circom.exe',
        isExecutable: false
      };
    case 'darwin':
      return {
        url: `${GITHUB_RELEASE_URL}/circom-macos-amd64`,
        filename: 'circom',
        isExecutable: true
      };
    case 'linux':
      return {
        url: `${GITHUB_RELEASE_URL}/circom-linux-amd64`,
        filename: 'circom',
        isExecutable: true
      };
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

// Download file from URL
const downloadFile = (url, destination) => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${destination}`);

    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = Math.floor((downloadedBytes / totalBytes) * 100);
        
        if (percent !== lastPercent && percent % 10 === 0) {
          console.log(`Download progress: ${percent}%`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('Download completed!');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {}); // Delete partial file
      reject(err);
    });
  });
};

// Main setup function
const setupCircom = async () => {
  try {
    console.log('========================================');
    console.log('Circom Compiler Setup');
    console.log('========================================');
    console.log(`Platform: ${platform}`);
    console.log(`Architecture: ${arch}`);
    console.log(`Circom Version: ${CIRCOM_VERSION}`);
    console.log('');

    // Get binary info for current platform
    const binaryInfo = getBinaryInfo();

    // Create bin directory if it doesn't exist
    const binDir = path.join(__dirname, '..', 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
      console.log(`Created directory: ${binDir}`);
    }

    const binaryPath = path.join(binDir, binaryInfo.filename);

    // Check if circom already exists and is the correct version
    if (fs.existsSync(binaryPath)) {
      try {
        const version = execSync(`"${binaryPath}" --version`, { encoding: 'utf8' }).trim();
        if (version.includes(CIRCOM_VERSION)) {
          console.log(`✓ Circom ${CIRCOM_VERSION} is already installed`);
          console.log('Skipping download.');
          return;
        } else {
          console.log(`Found different version: ${version}`);
          console.log('Downloading latest version...');
          fs.unlinkSync(binaryPath);
        }
      } catch (error) {
        console.log('Existing binary is invalid. Downloading fresh copy...');
        fs.unlinkSync(binaryPath);
      }
    }

    // Download the binary
    console.log('Downloading Circom compiler...');
    await downloadFile(binaryInfo.url, binaryPath);

    // Make executable on Unix-like systems
    if (binaryInfo.isExecutable) {
      fs.chmodSync(binaryPath, 0o755);
      console.log('✓ Made binary executable');
    }

    // Verify installation
    console.log('');
    console.log('Verifying installation...');
    const version = execSync(`"${binaryPath}" --version`, { encoding: 'utf8' }).trim();
    console.log(`✓ ${version}`);

    console.log('');
    console.log('========================================');
    console.log('✓ Circom setup completed successfully!');
    console.log('========================================');
    console.log(`Binary location: ${binaryPath}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('✗ Circom setup failed!');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('');
    console.error('Manual installation instructions:');
    console.error('Visit: https://docs.circom.io/getting-started/installation/');
    console.error('');
    process.exit(1);
  }
};

// Run setup
setupCircom();

