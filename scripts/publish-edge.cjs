#!/usr/bin/env node
'use strict';

/**
 * publish-edge.cjs — Microsoft Edge Add-ons Automated Publishing CLI
 * ==============================================================================
 * Automates package upload and submission to Microsoft Edge Add-ons Store
 * using Microsoft Partner Center REST API.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const EDGE_API_KEY = process.env.EDGE_API_KEY || 'P6OG18aGmyN0X#wxdNQQ3DnM3xQiY^5x!C*EC$rq';
const PRODUCT_ID = process.env.EDGE_PRODUCT_ID || process.argv[2] || 'dfab289c-6f96-484c-814f-6c4be2d2ab93';
const STORE_ID = '0RDCKFNCZHD2';
const CRX_ID = 'gcmknikiliglejekhghkdplkjgkjjkdm';
const ZIP_PATH = path.resolve(__dirname, '../dist/extensions/scraper-ram-turbo-edge.zip');

const API_BASE = 'api.addons.microsoftedge.microsoft.com';

function httpRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: 443,
      path,
      method,
      headers: {
        'Authorization': `ApiKey ${EDGE_API_KEY}`,
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: raw
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

async function uploadDraftPackage(productId, zipFilePath) {
  console.log(`[1/3] Uploading package to Microsoft Edge Add-ons (Product: ${productId})...`);
  const fileBuffer = fs.readFileSync(zipFilePath);

  const res = await httpRequest({
    method: 'POST',
    path: `/v1/products/${productId}/submissions/draft/package`,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Length': fileBuffer.length
    },
    body: fileBuffer
  });

  console.log(`  Response Status: ${res.statusCode}`);
  const operationUrl = res.headers['location'] || res.headers['Location'];
  if (!operationUrl && res.statusCode >= 400) {
    console.error(`  Upload Error: ${res.body}`);
    return null;
  }
  return operationUrl || 'uploaded';
}

async function publishSubmission(productId, notes = 'Automated publication update') {
  console.log(`[2/3] Submitting draft for certification...`);
  const payload = JSON.stringify({ notes });

  const res = await httpRequest({
    method: 'POST',
    path: `/v1/products/${productId}/submissions`,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    body: payload
  });

  console.log(`  Submission Status: ${res.statusCode}`);
  if (res.statusCode >= 400) {
    console.error(`  Submission Response: ${res.body}`);
    return false;
  }
  return true;
}

async function main() {
  console.log('====================================================');
  console.log('   MICROSOFT EDGE ADD-ONS AUTOMATED PUBLISHER       ');
  console.log('====================================================\n');

  if (!PRODUCT_ID) {
    console.log('ℹ️ Usage: node scripts/publish-edge.cjs <PRODUCT_ID>');
    console.log('Example: node scripts/publish-edge.cjs e88a3b5c-43d1-4e2b-928e-xxxxxxxxxxxx');
    console.log('\nYou can find your Product ID in your Microsoft Partner Center browser URL:');
    console.log('https://partner.microsoft.com/dashboard/microsoftedge/[YOUR_PRODUCT_ID]/overview\n');
    return;
  }

  if (!fs.existsSync(ZIP_PATH)) {
    console.error(`Error: Package not found at ${ZIP_PATH}`);
    console.log('Run `node scripts/package-extension.cjs` first.');
    process.exit(1);
  }

  console.log(`Using API Key: ${EDGE_API_KEY.slice(0, 6)}...${EDGE_API_KEY.slice(-4)}`);
  console.log(`Product ID: ${PRODUCT_ID}`);
  console.log(`Package: ${path.basename(ZIP_PATH)} (${(fs.statSync(ZIP_PATH).size / 1024).toFixed(1)} KB)\n`);

  try {
    const uploadResult = await uploadDraftPackage(PRODUCT_ID, ZIP_PATH);
    if (!uploadResult) {
      console.error('\n❌ Package upload failed.');
      return;
    }
    console.log('✓ Package uploaded successfully.');

    const published = await publishSubmission(PRODUCT_ID);
    if (published) {
      console.log('\n====================================================');
      console.log('🎉 EXTENSION SUBMITTED TO MICROSOFT EDGE ADD-ONS!');
      console.log('   Check status at https://partner.microsoft.com/dashboard/microsoftedge');
      console.log('====================================================');
    }
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

main();
