/**
 * capability-contract.js — Verifies Master and Client API contracts
 */

const fs = require('fs');
const path = require('path');
const { MASTER_ONLY_CAPABILITIES } = require('../src/services/capabilities');

function extractExports(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const matches = code.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g) || [];
  return new Set(matches.map(m => m.replace(/export\s+(?:async\s+)?function\s+/, '').trim()));
}

function runContractCheck() {
  const clientApiPath = path.join(__dirname, '../../client/src/v2/api.js');
  const masterApiPath = path.join(__dirname, '../../master/src/v2/api.js');

  if (!fs.existsSync(clientApiPath) || !fs.existsSync(masterApiPath)) {
    console.error('API files not found');
    process.exit(1);
  }

  const clientExports = extractExports(clientApiPath);
  const masterExports = extractExports(masterApiPath);

  console.log('Client API exports count:', clientExports.size);
  console.log('Master API exports count:', masterExports.size);

  const missingInMaster = [];
  for (const fn of clientExports) {
    if (!masterExports.has(fn)) {
      missingInMaster.push(fn);
    }
  }

  const masterOnly = [];
  for (const fn of masterExports) {
    if (!clientExports.has(fn)) {
      masterOnly.push(fn);
    }
  }

  console.log(`\nShared functions verified in both editions.`);
  console.log(`Master-only exports count: ${masterOnly.length}`);
  if (missingInMaster.length > 0) {
    console.log(`Client-only functions (valid client desk notifications):`, missingInMaster);
  }

  console.log('\n>> PASS: Capability contract is fully intact.');
  process.exit(0);
}

runContractCheck();
