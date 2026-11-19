'use strict';

/**
 * create-user.js
 *
 * Provision a workspace user without touching the running engine.
 *
 *   node scripts/create-user.js --email you@example.com --password "..." \
 *        --role master --name "Manoj"
 *
 *   node scripts/create-user.js --email client@example.com --password "..." \
 *        --role client --client-id usr_abc123 --name "Client Co"
 *
 * Writes data/users.json (scrypt hash, never plaintext). Google Sign-In later
 * matches the same record by email, so one row serves both login methods.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('../src/config/paths');

const USERS_FILE = path.join(DATA_DIR, 'users.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  const tmp = `${USERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
  fs.renameSync(tmp, USERS_FILE);
}

const args = parseArgs(process.argv.slice(2));
const email = String(args.email || '').trim().toLowerCase();
const password = args.password === true ? '' : String(args.password || '');
const role = String(args.role || 'client').toLowerCase();
const name = args.name && args.name !== true ? String(args.name) : email.split('@')[0];
const clientId = args['client-id'] && args['client-id'] !== true
  ? String(args['client-id'])
  : (role === 'master' ? 'master' : `usr_${crypto.randomBytes(6).toString('hex')}`);

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/create-user.js --email you@example.com --password "..." --role master|client [--name "Name"] [--client-id usr_xxx]');
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error('A password of at least 8 characters is required.');
  process.exit(1);
}
if (!['master', 'client', 'admin'].includes(role)) {
  console.error('Role must be master, client or admin.');
  process.exit(1);
}

const users = readUsers();
const existing = users.findIndex(u => String(u.email || '').toLowerCase() === email);

const record = {
  id: existing >= 0 ? users[existing].id : `usr_${crypto.randomBytes(6).toString('hex')}`,
  email,
  name,
  role,
  clientId,
  passwordHash: hashPassword(password),
  updatedAt: new Date().toISOString(),
  createdAt: existing >= 0 ? users[existing].createdAt : new Date().toISOString()
};

if (existing >= 0) users[existing] = record;
else users.push(record);

writeUsers(users);

console.log(`${existing >= 0 ? 'Updated' : 'Created'} ${role} user`);
console.log(`  email     ${email}`);
console.log(`  clientId  ${clientId}`);
console.log(`  file      ${USERS_FILE}`);
