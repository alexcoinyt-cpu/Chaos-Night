'use strict';
/**
 * Bot test: starts the server, connects 5 simulated phones + a TV, and plays a full game of
 * EVERY mode found in server/modes. Also exercises photo upload, reroll, disconnect/rejoin,
 * duplicate names, bad input, a silent (lazy) player, phone-only vs TV mode, and host hand-over.
 * Run: npm test
 */
process.env.CHAOS_HOST_GRACE_MS = '1500';
const assert = require('assert');
const http = require('http');
const { io } = require('socket.io-client');
const { createApp } = require('../server/index');
const registry = require('../server/registry');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const fails = [];
function check(cond, msg) { if (cond) log('   ✓', msg); else { log('   ✗ FAIL:', msg); fails.push(msg); } }

class Client {
  constructor(url, name, { lazy = false, tv = false } = {}) {
    this.name = name; this.lazy = lazy; this.isTv = tv; this.url = url;
    this.state = null; this.seen = new Set(); this.kinds = new Set(); this.done = new Set();
    this.rerolled = false; this.sharedOnPhone = false; this.stageLog = [];
    this.photoAsset = null;
  }
  connect() {
    this.sock = io(this.url, { transports: ['websocket'], forceNew: true });
    this.sock.on('state', (s) => this.onState(s));
    return new Promise((res) => this.sock.on('connect', res));
  }
  emit(ev, data) { return new Promise((res) => this.sock.emit(ev, data, res)); }
  async create() { const r = await this.emit('room:create', { name: this.name, avatar: '😀' }); assert(r.ok, 'create'); Object.assign(this, r); return r; }
  async join(code, name = this.name, token) { const r = await this.emit('room:join', { code, name, avatar: '🐸', token }); if (r.ok) Object.assign(this, r); return r; }
  async tvJoin(code) { return this.emit('tv:join', { code }); }
  onState(s) {
    this.state = s;
    const st = s.stage;
    if (!st) return;
    if (!this.isTv && s.display === 'tv' && st.shared) this.sharedOnPhone = true;
    if (this.isTv) { this.kinds.add(st.kind); if (st.shared && st.shared.image && st.shared.image.asset) this.photoAsset = st.shared.image.asset; }
    if (this.lazy || this.isTv || this.paused) return;
    if (!st.participant || st.submitted || st.over || s.paused) return;
    const key = st.id; if (this.done.has(key)) return;
    this.done.add(key);
    setTimeout(() => this.respond(st), 20 + Math.random() * 60);
  }
  respond(st) {
    const id = st.id;
    if (st.kind === 'intro') return this.sock.emit('submit', { stageId: id, data: {} }, () => {});
    if (st.kind === 'write') {
      if (st.rerollsLeft > 0 && !this.rerolled && this.name === 'Bot2') {
        this.rerolled = true; this.done.delete(id);
        return this.sock.emit('reroll', { stageId: id }, () => {});
      }
      const fields = st.mine.fields.map((f, i) => (f.type === 'draw' ? PNG : `${this.name} says thing ${i} <b>${'x'.repeat(i * 5)}</b>`));
      return this.sock.emit('submit', { stageId: id, data: { fields } }, () => {});
    }
    if (st.kind === 'choose') {
      const opts = st.mine.options.filter((o) => !o.disabled);
      if (!opts.length) return;
      const choice = opts[Math.floor(Math.random() * opts.length)].id;
      const vetoes = st.mine.vetoable ? opts.filter((o) => o.id !== choice).slice(0, 1).map((o) => o.id) : undefined;
      return this.sock.emit('submit', { stageId: id, data: { choice, vetoes } }, () => {});
    }
  }
  close() { this.sock.close(); }
}

async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(30); }
  throw new Error('Timed out waiting for: ' + what);
}
const getJson = (url) => new Promise((res, rej) => http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res({ status: r.statusCode, body: d, type: r.headers['content-type'] })); }).on('error', rej));

(async () => {
  const app = createApp();
  await new Promise((r) => app.server.listen(0, r));
  const port = app.server.address().port; const url = `http://127.0.0.1:${port}`;
  log(`Server on ${url}`);
  const modes = registry.list();
  log(`Modes found: ${modes.map((m) => m.id).join(', ')}`);

  log('\n# Basic HTTP');
  check((await getJson(url + '/health')).status === 200, '/health responds');
  check((await getJson(url + '/tv')).status === 200, '/tv serves the TV page');
  check((await getJson(url + '/')).status === 200, '/ serves the phone page');

  log('\n# Lobby');
  const host = new Client(url, 'Host'); await host.connect(); const room = await host.create();
  check(/^[A-Z]{4}$/.test(room.code), `room code is 4 letters (${room.code})`);
  const bots = [];
  for (let i = 1; i <= 3; i++) { const b = new Client(url, 'Bot' + i); await b.connect(); const r = await b.join(room.code); check(r.ok, `Bot${i} joined`); bots.push(b); }
  const lazy = new Client(url, 'Lazy', { lazy: true }); await lazy.connect(); await lazy.join(room.code);
  const dup = new Client(url, 'Bot1'); await dup.connect(); const dr = await dup.join(room.code, 'Bot1');
  check(dr.ok && dr.name !== 'Bot1', `duplicate name gets suffix (${dr.name})`);
  dup.lazy = true;
  const nope = new Client(url, 'Nope'); await nope.connect();
  check(!(await nope.join('ZZZZ')).ok, 'bad room code rejected');

  // Phone-only mode (no TV yet)
  await waitFor(() => host.state && host.state.players.length === 6, 2000, 'players in lobby');
  check(host.state.display === 'phone', 'no TV connected => phone-only display');
  const tv = new Client(url, 'TV', { tv: true }); await tv.connect(); check((await tv.tvJoin(room.code)).ok, 'TV joined');
  await waitFor(() => host.state.display === 'tv', 2000, 'display switches to tv');
  check(true, 'TV connected => TV display mode');

  log('\n# Input validation / abuse');
  check(!(await bots[0].emit('host', { action: 'shuffle' })).ok, 'non-host cannot use host actions');
  check(!(await host.emit('host', { action: 'nonsense' })).ok, 'unknown host action rejected');
  check(!(await host.emit('submit', { stageId: 999, data: null })).ok, 'submit with no stage rejected');
  check(!(await bots[0].emit('pool:add', { type: 'photo', dataUrl: 'data:text/html;base64,PGI+' })).ok, 'non-image upload rejected');
  check(!(await bots[0].emit('pool:add', { type: 'photo', dataUrl: 'data:image/png;base64,AAAA' })).ok, 'fake PNG rejected');
  await bots[0].emit('room:create', 'garbage');
  await bots[0].emit('pool:add', null);
  check(!(await host.emit('host', { action: 'mode', modeId: 'nonexistent' })).ok, 'unknown mode rejected');

  log('\n# Pools & photo upload');
  check((await bots[0].emit('pool:add', { type: 'photo', dataUrl: PNG })).ok, 'valid photo accepted');
  check((await bots[1].emit('pool:add', { type: 'prompt', text: 'What would a llama order at a drive-through?' })).ok, 'prompt added');
  check((await bots[1].emit('pool:add', { type: 'scenario', text: "You're in the woods and a wolf walks up wearing glasses. What do you do?" })).ok, 'scenario added');
  check((await bots[2].emit('pool:add', { type: 'name', text: 'The Mayor of Pigeon Town' })).ok, 'name added');
  check(!(await bots[2].emit('pool:add', { type: 'name', text: 'The Mayor of Pigeon Town' })).ok, 'duplicate pool item rejected');
  const photos = await host.emit('host', { action: 'photos' });
  check(photos.ok && photos.photos.length === 1, 'host can list photos');
  check((await host.emit('host', { action: 'settings', settings: { timer: 'fast', rounds: 1, photoSource: 'uploads', spice: 'unhinged' } })).ok, 'host sets settings');
  await waitFor(() => host.state.settings.timer === 'fast' && host.state.settings.rounds === 1, 2000, 'settings applied');
  check(!(await host.emit('host', { action: 'settings', settings: { timer: 'bogus', rounds: 99 } })).error, 'bogus settings ignored safely');
  check(host.state.settings.timer === 'fast' && host.state.settings.rounds === 1, 'bogus settings did not change anything');

  log('\n# Not enough players check');
  // (6 connected here; just make sure mode min-players logic is present)
  check(modes.every((m) => m.minPlayers >= 2), 'all modes declare minPlayers');

  const players = [host, ...bots, dup];   // these respond; lazy never does
  players.forEach((p) => { p.done = new Set(); });
  let firstMode = true;

  for (const mode of modes) {
    log(`\n# Mode: ${mode.name} (${mode.id})`);
    tv.kinds = new Set(); tv.photoAsset = null;
    host.kinds = new Set();
    for (const b of [...bots, dup, host]) { b.done = new Set(); b.rerolled = b.name === 'Bot2' ? false : true; }
    const t0 = Date.now();
    const kindsSeen = new Set();
    const watcher = setInterval(() => { if (host.state && host.state.stage) kindsSeen.add(host.state.stage.kind); }, 20);
    let dropped = false; let skipped = false;
    // Mid-game chaos: Bot3 disconnects and rejoins; host skips one stage once.
    const chaos = setInterval(async () => {
      const st = host.state && host.state.stage;
      if (!st) return;
      if (firstMode && !dropped && st.kind === 'write') {
        dropped = true; const b = bots[2]; const tok = b.token;
        b.sock.close(); await sleep(150);
        await b.connect(); const r = await b.join(room.code, 'Bot3', tok); b.done = new Set();
        check(r.ok && r.playerId === b.playerId, 'Bot3 rejoined with token mid-game (same player)');
      }
    }, 40);
    await host.emit('host', { action: 'mode', modeId: mode.id });
    try {
      await waitFor(() => host.state.stage && host.state.stage.kind === 'final', 90000, `${mode.id} reaches final`);
    } catch (e) { log('   ✗', e.message, JSON.stringify(host.state.stage && { k: host.state.stage.kind, t: host.state.stage.title })); fails.push(e.message); }
    clearInterval(watcher); clearInterval(chaos);
    log(`   finished in ${((Date.now() - t0) / 1000).toFixed(1)}s; stages seen on host: ${[...kindsSeen].join(', ')}`);
    check(kindsSeen.has('write') || kindsSeen.has('choose'), 'player stages happened');
    check(kindsSeen.has('reveal') && kindsSeen.has('scores'), 'reveal and scoreboard shown');
    if (firstMode || mode.id === modes[1].id) check(kindsSeen.has('intro'), 'intro shown on first appearance');
    const final = tv.state.stage;
    check(final && final.kind === 'final' && final.shared.rows.length === 6, 'TV shows final scoreboard with all 6 players');
    check(final && final.shared.rows[0].score > 0, `top score > 0 (${final && final.shared.rows[0].score})`);
    check(final && final.shared.awards.length > 0, `awards present: ${final && final.shared.awards.map((a) => a.title).join(', ')}`);
    check(!host.sharedOnPhone && !bots[0].sharedOnPhone, 'phones did not receive shared content in TV mode');
    if (mode.id === 'caption') {
      // uploads-only: the uploaded photo must have been used and be fetchable once shown
      check(!!tv.photoAsset, 'uploaded photo was used as the caption image');
      if (tv.photoAsset) { const a = await getJson(`${url}/asset/${room.code}/${tv.photoAsset}`); check(a.status === 200 && /image\//.test(a.type), 'shown photo is served with an image type'); }
    }
    await host.emit('host', { action: 'lobby' });
    await waitFor(() => !host.state.stage && host.state.phase === 'lobby', 3000, 'back to lobby');
    firstMode = false;
  }

  log('\n# Second play of a mode skips intro');
  { // play first mode again, intro should not appear
    const seen = new Set(); const w = setInterval(() => { if (host.state.stage) seen.add(host.state.stage.kind); }, 15);
    for (const b of [...bots, dup, host]) b.done = new Set();
    await host.emit('host', { action: 'mode', modeId: modes[0].id });
    await waitFor(() => host.state.stage && host.state.stage.kind === 'final', 60000, 'replay finishes');
    clearInterval(w); check(!seen.has('intro'), 'intro not repeated in same room');
    await host.emit('host', { action: 'lobby' }); await waitFor(() => !host.state.stage, 3000, 'lobby');
  }

  log('\n# Photo served after being shown');
  const photoMode = modes.find((m) => m.id === 'caption');
  if (photoMode) {
    const hidden = await getJson(`${url}/asset/${room.code}/${photos.photos[0].id}`);
    log('   (asset status after caption games:', hidden.status + ')');
    check(hidden.status === 200 || hidden.status === 404, 'asset route responds');
  }

  log('\n# Pause / skip / end');
  for (const b of [...bots, dup, host]) b.done = new Set();
  await host.emit('host', { action: 'shuffle' });
  await waitFor(() => host.state.stage, 3000, 'shuffle starts');
  await host.emit('host', { action: 'pause' });
  await waitFor(() => host.state.paused, 2000, 'paused');
  const sid = host.state.stage.id; await sleep(400);
  check(host.state.stage.id === sid, 'stage does not advance while paused');
  await host.emit('host', { action: 'resume' });
  await host.emit('host', { action: 'skip' });
  await sleep(200);
  await host.emit('host', { action: 'end' });
  await waitFor(() => host.state.stage && host.state.stage.kind === 'final', 8000, 'end game shows final');
  check(true, 'end game goes to final results');
  await host.emit('host', { action: 'lobby' }); await waitFor(() => !host.state.stage, 3000, 'lobby after end');

  log('\n# Phone-only mode shows shared content on phones');
  tv.close(); await waitFor(() => host.state.display === 'phone', 3000, 'TV gone => phone-only');
  await host.emit('host', { action: 'mode', modeId: modes[0].id });
  await waitFor(() => host.state.stage && host.state.stage.shared, 4000, 'phone receives shared content');
  check(true, 'phone-only: shared content delivered to phones');
  await host.emit('host', { action: 'end' }); await waitFor(() => host.state.stage && host.state.stage.kind === 'final', 8000, 'final');
  await host.emit('host', { action: 'lobby' }); await waitFor(() => !host.state.stage, 3000, 'lobby');

  log('\n# Rejoin by name after disconnect');
  const b1 = bots[0]; b1.sock.close(); await waitFor(() => host.state.players.find((p) => p.name === 'Bot1' && !p.connected), 2000, 'Bot1 shown offline');
  const nb = new Client(url, 'Bot1'); await nb.connect(); const rr = await nb.join(room.code, 'Bot1');
  check(rr.ok && rr.playerId === b1.playerId, 'rejoin by same name reuses the player');
  bots[0] = nb;

  log('\n# Kick');
  const kid = lazy.playerId;
  check((await host.emit('host', { action: 'kick', playerId: kid })).ok, 'host kicks a player');
  await waitFor(() => host.state.players.length === 5, 2000, 'player removed');

  log('\n# Host hand-over');
  host.sock.close();
  await waitFor(() => nb.state && nb.state.hostId !== host.playerId, 6000, 'host powers pass after grace period');
  check(true, 'host powers passed to next connected player');

  log('\n# Everyone leaves, rejoin still works');
  for (const c of [nb, bots[1], bots[2], dup]) c.sock.close();
  await sleep(300);
  const late = new Client(url, 'Late'); await late.connect();
  check((await late.join(room.code, 'Late')).ok, 'late joiner can enter room after everyone dropped');
  const h = await getJson(url + '/health'); check(JSON.parse(h.body).rooms === 1, 'health reports 1 room');

  app.close();
  log('\n' + (fails.length ? `FAILED (${fails.length}):\n - ` + fails.join('\n - ') : 'ALL BOT TESTS PASSED ✅'));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
