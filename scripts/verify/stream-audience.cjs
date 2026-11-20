/* Verifies that live SSE frames are routed to the right workspace only. */
const path = require('path');
const hub = require(path.join(__dirname, '..', '..', 'server', 'src', 'services', 'liveStreams.js'));

let passed = 0;
let failed = 0;
const check = (name, ok) => {
  if (ok) { passed += 1; console.log(`PASS  ${name}`); } else { failed += 1; console.log(`FAIL  ${name}`); }
};

function fakeViewer(id, scope, userId) {
  const frames = [];
  const res = {
    writableEnded: false,
    destroyed: false,
    writableLength: 0,
    write(frame) { frames.push(String(frame)); return true; },
    end() { this.writableEnded = true; }
  };
  const client = { id, kind: 'log', res, since: Date.now(), alive: true, pingedAt: Date.now(), scope, userId };
  hub.logClients.set(id, client);
  return { frames, client };
}

const master = fakeViewer(9001, 'master', '');
const u1 = fakeViewer(9002, 'client', 'user_1');
const u2 = fakeViewer(9003, 'client', 'user_2');
const anon = fakeViewer(9004, 'client', 'anonymous');
const legacy = fakeViewer(9005, 'all', '');
const all = [master, u1, u2, anon, legacy];
const reset = () => all.forEach(v => { v.frames.length = 0; });
const got = (v, needle) => v.frames.join('').includes(needle);

// Progress of a client run owned by user_1
hub.broadcastEvent('progress', { sessionId: 's1', tag: 'P1' }, { isMaster: false, userId: 'user_1' });
check('client run progress reaches its owner', got(u1, 'P1'));
check('client run progress hidden from other client', !got(u2, 'P1'));
check('client run progress hidden from anonymous client', !got(anon, 'P1'));
check('client run progress hidden from Master', !got(master, 'P1'));
check('legacy viewer still receives everything', got(legacy, 'P1'));
reset();

// Master run
hub.broadcastEvent('active_point', { sessionId: 'm1', tag: 'M1' }, { isMaster: true, userId: 'master' });
check('master run reaches Master', got(master, 'M1'));
check('master run hidden from every client', !got(u1, 'M1') && !got(u2, 'M1') && !got(anon, 'M1'));
reset();

// Anonymous client run
hub.broadcastEvent('progress', { sessionId: 'a1', tag: 'A1' }, { isMaster: false, userId: 'anonymous' });
check('anonymous run reaches anonymous client', got(anon, 'A1'));
check('anonymous run hidden from named client and Master', !got(u1, 'A1') && !got(master, 'A1'));
reset();

// System frame (no audience)
hub.broadcastEvent('heartbeat', { tag: 'SYS' }, null);
check('system frame reaches everyone', all.every(v => got(v, 'SYS')));
reset();

// Vendor batches are filtered per row
const entries = [
  { data: JSON.stringify({ vendor: { id: 'v1' }, tag: 'V_U1' }), vendor: { id: 'v1', owner: 'user_1' } },
  { data: JSON.stringify({ vendor: { id: 'v2' }, tag: 'V_M' }), vendor: { id: 'v2', owner: 'master' } }
];
const audienceOf = v => (v.owner === 'master' ? { isMaster: true, userId: 'master' } : { isMaster: false, userId: v.owner });
hub.broadcastVendorBatch(entries, () => false, audienceOf);
check('vendor of user_1 reaches user_1 only', got(u1, 'V_U1') && !got(u2, 'V_U1') && !got(master, 'V_U1'));
check('master vendor reaches Master only', got(master, 'V_M') && !got(u1, 'V_M') && !got(u2, 'V_M'));
check('legacy viewer receives both vendors', got(legacy, 'V_U1') && got(legacy, 'V_M'));

// Per-session viewer receives progress for its session
const sessionFrames = [];
hub.sessionClients.set('watch1', new Map([[9100, {
  id: 9100, kind: 'session', sessionId: 'watch1', alive: true,
  res: { writableEnded: false, destroyed: false, writableLength: 0, write(f) { sessionFrames.push(String(f)); return true; }, end() {} }
}]]));
hub.broadcastEvent('progress', { sessionId: 'watch1', tag: 'WATCH' }, { isMaster: false, userId: 'user_1' });
check('session viewer receives that session progress', sessionFrames.join('').includes('WATCH'));
hub.broadcastEvent('progress', { sessionId: 'other', tag: 'NOPE' }, { isMaster: false, userId: 'user_1' });
check('session viewer ignores other sessions', !sessionFrames.join('').includes('NOPE'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
