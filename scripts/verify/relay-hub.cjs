'use strict';

/**
 * relay-hub.cjs — proves the zero-knowledge relay contract.
 *
 *   node scripts/verify/relay-hub.cjs
 *
 * Checks:
 *   1. a heartbeat makes a user "connected"
 *   2. requestBlindRelayFetch issues a signed, session-bound ticket
 *   3. pullPendingTickets hands that ticket to the extension
 *   4. a correct result resolves the promise
 *   5. the same ticket cannot be replayed (410 semantics)
 *   6. a tampered signature is rejected
 *   7. an expired ticket is rejected
 *   8. an unknown ticket is rejected
 *   9. a disconnected user is refused before a ticket is even made
 *  10. the ticket is bound to its session
 */

process.env.EXTENSION_RELAY_SECRET = process.env.EXTENSION_RELAY_SECRET || 'test-secret-relay';

const path = require('path');
const hub = require(path.resolve(__dirname, '../../server/src/services/extensionRelayHub.js'));

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  const userId = 'usr_test_relay';

  console.log('\n[1] connection');
  check('no extension before heartbeat', hub.hasActiveExtension(userId) === false);

  hub.registerHeartbeat({ userId, version: '1.1.0', ramGb: 16, cpuCores: 8, capabilities: ['fetch', 'render'] });
  check('connected after heartbeat', hub.hasActiveExtension(userId) === true);
  check('capabilities recorded', hub.capabilitiesOf(userId).includes('render'));

  console.log('\n[2] ticket issue');
  const pending = hub.requestBlindRelayFetch(userId, 'https://example.com/a', {
    sessionId: 'cmd_test_1',
    mode: 'fetch',
    timeoutMs: 5000
  });

  const tickets = hub.pullPendingTickets(userId, 4);
  check('one ticket queued', tickets.length === 1, `got ${tickets.length}`);
  const ticket = tickets[0];
  check('ticket has an id', Boolean(ticket?.ticketId));
  check('ticket is session-bound', ticket?.sessionId === 'cmd_test_1');
  check('ticket has a signature', typeof ticket?.signature === 'string' && ticket.signature.length === 64);

  console.log('\n[3] signature');
  const good = hub.verifyTicketSignature(ticket, ticket.signature);
  check('correct signature verifies', good === true);

  const flipped = (ticket.signature[0] === 'a' ? 'b' : 'a') + ticket.signature.slice(1);
  check('tampered signature rejected', hub.verifyTicketSignature(ticket, flipped) === false);

  const otherSession = { ...ticket, sessionId: 'cmd_other' };
  check(
    'session swap rejected',
    hub.verifyTicketSignature(otherSession, ticket.signature) === false
  );

  console.log('\n[4] resolve');
  const bad = hub.resolveTicketResult({
    ticketId: ticket.ticketId,
    signature: flipped,
    ok: true,
    status: 200,
    rawBody: 'x'
  });
  check('bad signature does not resolve', bad.status === 'invalid_signature', bad.status);

  const resolved = hub.resolveTicketResult({
    ticketId: ticket.ticketId,
    signature: ticket.signature,
    ok: true,
    status: 200,
    contentType: 'text/html',
    rawBody: '<html>ok</html>'
  });
  check('good result resolves', resolved.status === 'ok', resolved.status);

  const outcome = await pending;
  check('promise carries the body', outcome.ok === true && outcome.rawBody === '<html>ok</html>');
  check('promise records the mode', outcome.mode === 'fetch');

  console.log('\n[5] replay');
  const replay = hub.resolveTicketResult({
    ticketId: ticket.ticketId,
    signature: ticket.signature,
    ok: true,
    rawBody: 'again'
  });
  check('second use is a replay', replay.status === 'replayed', replay.status);

  console.log('\n[6] unknown ticket');
  const unknown = hub.resolveTicketResult({ ticketId: 'tkt_does_not_exist', signature: '00' });
  check('unknown ticket rejected', unknown.status === 'unknown_ticket', unknown.status);

  console.log('\n[7] expired ticket');
  const expiredPromise = hub.requestBlindRelayFetch(userId, 'https://example.com/exp', {
    sessionId: 'cmd_test_2',
    timeoutMs: 2000
  });
  const [expiredTicket] = hub.pullPendingTickets(userId, 1);
  const expiredResult = hub.resolveTicketResult({
    ticketId: expiredTicket.ticketId,
    signature: expiredTicket.signature,
    ok: true,
    rawBody: 'late'
  });
  // Not expired yet, so this should succeed; then we force expiry by clock.
  check('fresh ticket still valid', expiredResult.status === 'ok', expiredResult.status);
  await expiredPromise;

  const stale = {
    ticketId: 'tkt_stale',
    userId,
    sessionId: 'cmd_x',
    mode: 'fetch',
    targetUrl: 'https://example.com',
    method: 'GET',
    expiresAt: Date.now() - 1000
  };
  stale.signature = hub.signTicket(stale);
  check('expired ticket fails verification', hub.verifyTicketSignature(stale, stale.signature) === false);

  console.log('\n[8] disconnected user');
  hub.registerHeartbeat({ userId: 'usr_gone', installed: false });
  const refused = await hub.requestBlindRelayFetch('usr_gone', 'https://example.com');
  check('refused with extension_not_connected', refused.code === 'extension_not_connected', refused.code);

  console.log('\n[9] stats');
  const stats = hub.getStats(userId);
  check('stats report connected', stats.connected === true);
  check('stats count the relay', stats.relayedTotal >= 1, String(stats.relayedTotal));

  const diag = hub.getRelayDiagnostics();
  check('diagnostics count replays', diag.ticketsReplayed >= 1, String(diag.ticketsReplayed));

  console.log('\n[10] packaging');
  const dir = hub.resolveExtensionDir();
  check('extension directory resolves', Boolean(dir), dir || 'not found');
  if (dir) {
    const zip = hub.buildExtensionZipBuffer();
    check('zip starts with PK', zip[0] === 0x50 && zip[1] === 0x4b);
    check('zip is non-trivial', zip.length > 1000, `${zip.length} bytes`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
