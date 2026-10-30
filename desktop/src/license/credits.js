/**
 * credits.js (desktop shell)
 *
 * Read-only view of the engine's credit ledger.
 *
 * The engine owns the ledger because it is the only process that stores leads,
 * and a lead is what a credit buys. The shell only needs the balance to decide
 * what to show in the top bar and whether a licence window should open.
 *
 * If the ledger does not exist yet (first launch, engine not started), the
 * registry anchor is consulted so a returning user with an empty data folder is
 * not told they have another 1,000 credits.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const config = require('../config');
const paths = require('../paths');

const LEDGER_FILE = path.join(paths.dataDir, 'credits.json');
const ANCHOR_KEY = 'HKCU\\Software\\Scraper';

function readLedger() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    const period = parsed.period || {};
    const allowance = Number(period.allowance) || 0;
    const periodUsed = Number(period.used) || 0;
    const granted = Number(parsed.granted) || 0;
    const used = Number(parsed.used) || 0;

    return {
      granted,
      used,
      freeLeft: Math.max(0, granted - used),
      plan: {
        allowance,
        used: periodUsed,
        left: Math.max(0, allowance - periodUsed),
        endsAt: period.endsAt || null
      },
      left: Math.max(0, granted - used) + Math.max(0, allowance - periodUsed),
      source: parsed.grantSource || 'ledger',
      grantedAt: parsed.grantedAt || null
    };
  } catch (e) {
    return null;
  }
}

function readAnchor() {
  if (process.platform !== 'win32') return null;

  try {
    const out = execFileSync('reg', ['query', ANCHOR_KEY], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true
    });

    const values = {};
    for (const line of out.split(/\r?\n/)) {
      const match = line.match(/^\s{2,}(Granted|Used|GrantedAt)\s+REG_\w+\s+(.*)$/);
      if (match) values[match[1]] = match[2].trim();
    }

    const granted = Number(values.Granted) || 0;
    if (!granted) return null;

    const used = Math.min(Number(values.Used) || 0, granted);
    return {
      granted,
      used,
      freeLeft: Math.max(0, granted - used),
      plan: { allowance: 0, used: 0, left: 0, endsAt: null },
      left: Math.max(0, granted - used),
      source: 'anchor',
      grantedAt: Number(values.GrantedAt) || null
    };
  } catch (e) {
    return null;
  }
}

/**
 * No ledger, no anchor: this is a fresh install. The engine will create the
 * real grant on first boot; report what it is about to receive.
 */
function pendingGrant() {
  return {
    granted: config.FREE_CREDITS,
    used: 0,
    freeLeft: config.FREE_CREDITS,
    plan: { allowance: 0, used: 0, left: 0, endsAt: null },
    left: config.FREE_CREDITS,
    source: 'pending',
    grantedAt: null
  };
}

function status() {
  return readLedger() || readAnchor() || pendingGrant();
}

module.exports = { status, LEDGER_FILE };
