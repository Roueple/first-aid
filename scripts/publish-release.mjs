#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createReadStream } from 'fs';
import https from 'https';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const OWNER = 'Roueple';
const REPO = 'first-aid';
const VERSION = '1.0.1';
const TAG = `v${VERSION}`;

if (!GITHUB_TOKEN) {
  console.error('Error: GH_TOKEN environment variable not set');
  process.exit(1);
}

const releaseNotes = `Keyboard shortcuts fix - Enabled standard Windows shortcuts in Felix chat`;

async function createRelease() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      tag_name: TAG,
      name: `v${VERSION}`
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases`,
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'FIRST-AID-Release-Script',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to create release: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function uploadAsset(releaseId, filePath, fileName) {
  const stats = await import('fs').then(fs => fs.promises.stat(filePath));
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uploads.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?name=${fileName}`,
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'FIRST-AID-Release-Script',
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to upload asset: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    const fileStream = createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function deleteRelease(tag) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/tags/${tag}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'FIRST-AID-Release-Script'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const release = JSON.parse(body);
          // Delete the release
          const deleteOptions = {
            hostname: 'api.github.com',
            path: `/repos/${OWNER}/${REPO}/releases/${release.id}`,
            method: 'DELETE',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'User-Agent': 'FIRST-AID-Release-Script'
            }
          };
          
          const delReq = https.request(deleteOptions, (delRes) => {
            if (delRes.statusCode === 204) {
              resolve(true);
            } else {
              reject(new Error(`Failed to delete release: ${delRes.statusCode}`));
            }
          });
          delReq.on('error', reject);
          delReq.end();
        } else {
          resolve(false); // Release doesn't exist
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('Checking for existing release...');
    const deleted = await deleteRelease(TAG);
    if (deleted) {
      console.log('✓ Deleted existing release');
    }

    console.log(`\nCreating release ${TAG}...`);
    const release = await createRelease();
    console.log(`✓ Release created: ${release.html_url}`);

    console.log('\nUploading installer...');
    await uploadAsset(release.id, `release/FIRST-AID-Setup-${VERSION}.exe`, `FIRST-AID-Setup-${VERSION}.exe`);
    console.log('✓ Installer uploaded');

    console.log('\nUploading latest.yml...');
    await uploadAsset(release.id, 'release/latest.yml', 'latest.yml');
    console.log('✓ latest.yml uploaded');

    console.log('\n✅ Release published successfully!');
    console.log(`View at: ${release.html_url}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
