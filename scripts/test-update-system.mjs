#!/usr/bin/env node
/**
 * Test script to verify update system configuration
 * This checks if the update infrastructure is properly set up
 */

import https from 'https';
import { readFileSync } from 'fs';

const OWNER = 'Roueple';
const REPO = 'first-aid';

// Read current version from package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const CURRENT_VERSION = packageJson.version;

console.log('🔍 Testing FIRST-AID Update System\n');
console.log(`Current Version: ${CURRENT_VERSION}`);
console.log(`Repository: ${OWNER}/${REPO}\n`);

// Check if GitHub repo is accessible
async function checkGitHubRepo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}`,
      method: 'GET',
      headers: {
        'User-Agent': 'FIRST-AID-Update-Test'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const repo = JSON.parse(body);
          resolve({
            success: true,
            private: repo.private,
            name: repo.full_name
          });
        } else {
          resolve({
            success: false,
            error: `HTTP ${res.statusCode}: ${body}`
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Check latest release
async function checkLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'FIRST-AID-Update-Test'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const release = JSON.parse(body);
          resolve({
            success: true,
            version: release.tag_name,
            published: release.published_at,
            assets: release.assets.map(a => ({
              name: a.name,
              size: (a.size / 1024 / 1024).toFixed(2) + ' MB',
              downloads: a.download_count
            }))
          });
        } else if (res.statusCode === 404) {
          resolve({
            success: false,
            error: 'No releases found'
          });
        } else {
          resolve({
            success: false,
            error: `HTTP ${res.statusCode}: ${body}`
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Check if latest.yml exists
async function checkLatestYml() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'FIRST-AID-Update-Test'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const release = JSON.parse(body);
          const latestYml = release.assets.find(a => a.name === 'latest.yml');
          resolve({
            success: !!latestYml,
            found: !!latestYml,
            url: latestYml?.browser_download_url
          });
        } else {
          resolve({ success: false, found: false });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    // Test 1: Check GitHub repo access
    console.log('📡 Test 1: Checking GitHub repository access...');
    const repoCheck = await checkGitHubRepo();
    if (repoCheck.success) {
      console.log(`✅ Repository accessible: ${repoCheck.name}`);
      console.log(`   Private: ${repoCheck.private ? 'Yes (requires GH_TOKEN)' : 'No'}`);
    } else {
      console.log(`❌ Repository not accessible: ${repoCheck.error}`);
      return;
    }

    console.log('');

    // Test 2: Check latest release
    console.log('📦 Test 2: Checking latest release...');
    const releaseCheck = await checkLatestRelease();
    if (releaseCheck.success) {
      console.log(`✅ Latest release found: ${releaseCheck.version}`);
      console.log(`   Published: ${new Date(releaseCheck.published).toLocaleString()}`);
      console.log(`   Assets:`);
      releaseCheck.assets.forEach(asset => {
        console.log(`   - ${asset.name} (${asset.size}, ${asset.downloads} downloads)`);
      });
      
      // Compare versions
      const latestVersion = releaseCheck.version.replace('v', '');
      if (latestVersion === CURRENT_VERSION) {
        console.log(`\n✅ Current version matches latest release`);
      } else {
        console.log(`\n⚠️  Version mismatch:`);
        console.log(`   Current: ${CURRENT_VERSION}`);
        console.log(`   Latest:  ${latestVersion}`);
      }
    } else {
      console.log(`❌ ${releaseCheck.error}`);
    }

    console.log('');

    // Test 3: Check latest.yml
    console.log('📄 Test 3: Checking latest.yml (required for auto-update)...');
    const ymlCheck = await checkLatestYml();
    if (ymlCheck.found) {
      console.log(`✅ latest.yml found`);
      console.log(`   URL: ${ymlCheck.url}`);
    } else {
      console.log(`❌ latest.yml not found (auto-update will not work)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 Summary:');
    console.log('='.repeat(60));
    
    if (repoCheck.success && releaseCheck.success && ymlCheck.found) {
      console.log('✅ Update system is properly configured!');
      console.log('\nTo publish a new update:');
      console.log('1. Update version: npm version patch/minor/major');
      console.log('2. Build: npm run build');
      console.log('3. Package: npm run dist:win');
      console.log('4. Publish: node scripts/publish-release.mjs');
      console.log('\nUsers will receive the update automatically.');
    } else {
      console.log('⚠️  Update system has issues that need to be fixed.');
      if (!releaseCheck.success) {
        console.log('   - No releases published yet');
      }
      if (!ymlCheck.found) {
        console.log('   - Missing latest.yml file');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
