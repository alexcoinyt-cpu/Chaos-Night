'use strict';
/**
 * Room = one party. Owns players, settings, content pools, the current "stage",
 * and the game loop that runs mode plugins through the ctx helpers.
 *
 * Stage kinds the generic client understands:
 *   intro | write | choose | reveal | scores | final
 */
const CONFIG = require('../config');
const registry = require('./registry');
const content = require('./content');
const { shuffle, pick, sample, newId, newToken, cleanText, parseImageDataUrl } = require('./util');

class GameAborted extends Error {}

const TIMER_MULT = { short: 0.65, normal: 1, long: 1.6, fast: 0.03 }; // "fast" is hidden, for tests
const OPTIONS = {
  spice: ['clean', 'normal', 'unhinged'],
  timer: ['short', 'normal', 'long', 'fast'],
  photoSource: ['bank', 'uploads', 'mix'],
  display: ['auto', 'tv', 'phone'],
};
const LIMITS = {
  name: 16, text: 140, poolItems: 40, poolPerPlayer: 10,
  photos: 16, photosPerPlayer: 4, photoBytes: 450 * 1024, drawBytes: 300 * 1024,
  maxPlayers: CONFIG.MAX_PLAYERS,
};
const NOBODY_ABORT_MS = 60 * 1000;
const FALLBACK_LINES = [
  'I got distracted by a sandwich.', 'My brain left the chat.', 'No comment, my lawyer is a pigeon.',
  'Ran out of time, blame the goat.', 'Banana. Just banana.', 'Sorry, I was busy being mysterious.',
];

class Room {
  constructor(io, code, onClose) {
    this.io = io; this.code = code; this.onClose = onClose;
    this.createdAt = Date.now(); this.lastActive = Date.now();
    this.players = new Map(); this.order = []; this.hostId = null;
    this.tvs = new Set(); this.banned = new Set();
    this.settings = { spice: 'normal', timer: TIMER_MULT[process.env.CHAOS_TIMER] ? process.env.CHAOS_TIMER : 'normal', photoSource: 'mix', display: 'auto', rounds: 2 };
    this.phase = 'lobby'; this.stage = null; this.paused = false;
    this.seenModes = new Set(); this.currentMode = null;
    this.user = { prompts: [], scenarios: [], names: [] };
    this.assets = new Map(); this.used = {};
    this.abort = false; this.closed = false; this.stageCounter = 0; this.snap = new Map();
    this.idleSince = null; this._emitPending = false;
    this.ticker = setInterval(() => this._tick(), 250);
    if (this.ticker.unref) this.ticker.unref();
  }

  // ---------------------------------------------------------------- players
  touch() { this.lastActive = Date.now(); }
  connectedPlayers() { return this.order.map((id) => this.players.get(id)).filter((p) => p && p.connected); }
  connectedCount() { return this.connectedPlayers().length; }
  pub(p) { return { id: p.id, name: p.name, avatar: p.avatar, score: p.score }; }

  uniqueName(name) {
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; i < 99; i++) {
      const n = `${name.slice(0, LIMITS.name - 3)} ${i}`;
      if (!taken.has(n.toLowerCase())) return n;
    }
    return name + newId().slice(0, 3);
  }

  addPlayer(name, avatar) {
    const p = {
      id: newId('p_'), token: newToken(), name: this.uniqueName(name), avatar,
      score: 0, stats: {}, connected: false, socketId: null, disconnectedAt: Date.now(),
    };
    this.players.set(p.id, p); this.order.push(p.id);
    if (!this.hostId) this.hostId = p.id;
    return p;
  }
  findByToken(token) { return typeof token === 'string' && [...this.players.values()].find((p) => p.token === token); }
  findDisconnectedByName(name) {
    const n = name.toLowerCase();
    return [...this.players.values()].find((p) => !p.connected && p.name.toLowerCase() === n);
  }
  isBanned(name, token) { return this.banned.has('n:' + name.toLowerCase()) || (token && this.banned.has('t:' + token)); }

  attach(p, socketId) {
    if (p.socketId && p.socketId !== socketId) this.io.to(p.socketId).emit('replaced');
    p.socketId = socketId; p.connected = true; this.idleSince = null; this.touch();
    this.emit(); this._check();
  }
  attachTv(socketId) { this.tvs.add(socketId); this.touch(); this.emit(); }
  detach(socketId) {
    if (this.tvs.delete(socketId)) { this.emit(); return; }
    const p = [...this.players.values()].find((x) => x.socketId === socketId);
    if (!p) return;
    p.connected = false; p.socketId = null; p.disconnectedAt = Date.now();
    this.emit(); this._check();
  }
  kick(id) {
    const p = this.players.get(id);
    if (!p || id === this.hostId) return false;
    this.banned.add('n:' + p.name.toLowerCase()); this.banned.add('t:' + p.token);
    if (p.socketId) this.io.to(p.socketId).emit('kicked');
    this.players.delete(id); this.order = this.order.filter((x) => x !== id);
    if (this.stage) { this.stage.participants.delete(id); }
    this.emit(); this._check();
    return true;
  }
  toast(text) { this._broadcast('toast', { text }); }
  _broadcast(ev, data) {
    for (const p of this.players.values()) if (p.socketId) this.io.to(p.socketId).emit(ev, data);
    for (const id of this.tvs) this.io.to(id).emit(ev, data);
  }

  // --------------------------------------------------------------- settings
  displayResolved() {
    const d = this.settings.display;
    return d === 'auto' ? (this.tvs.size > 0 ? 'tv' : 'phone') : d;
  }
  applySettings(patch) {
    if (!patch || typeof patch !== 'object') return;
    for (const k of Object.keys(OPTIONS)) if (OPTIONS[k].includes(patch[k])) this.settings[k] = patch[k];
    const r = Number(patch.rounds);
    if (Number.isInteger(r) && r >= 1 && r <= 5) this.settings.rounds = r;
    this.emit();
  }

  // ------------------------------------------------------------------ pools
  addAsset(mime, buf, kind, by) {
    const id = newId('a_');
    this.assets.set(id, { mime, buf, kind, by, shown: false });
    return id;
  }
  photoAssets() { return [...this.assets.entries()].filter(([, a]) => a.kind === 'photo'); }

  /** Player adds to a shared pool from the lobby. Returns an error string or null. */
  addToPool(player, type, payload) {
    if (type === 'photo') {
      const img = parseImageDataUrl(payload, LIMITS.photoBytes);
      if (!img) return 'That photo is not a valid image (or is too big).';
      const photos = this.photoAssets();
      if (photos.length >= LIMITS.photos) return 'This room has enough photos already.';
      if (photos.filter(([, a]) => a.by === player.id).length >= LIMITS.photosPerPlayer) return 'You have added the max number of photos.';
      this.addAsset(img.mime, img.buf, 'photo', player.id);
      this.emit(); return null;
    }
    const key = { prompt: 'prompts', scenario: 'scenarios', name: 'names' }[type];
    if (!key) return 'Unknown type.';
    const text = cleanText(payload, type === 'name' ? 40 : LIMITS.text);
    if (text.length < 3) return 'Write a bit more.';
    const list = this.user[key];
    if (list.length >= LIMITS.poolItems) return 'That pool is full.';
    if (list.filter((x) => x.by === player.id).length >= LIMITS.poolPerPlayer) return 'You added the max for now.';
    if (list.some((x) => x.text.toLowerCase() === text.toLowerCase())) return 'Already in there!';
    list.push({ id: 'u:' + key + ':' + newId(), text, by: player.id, user: true });
    this.emit(); return null;
  }

  _poolList(name, spice = this.settings.spice) {
    switch (name) {
      case 'figures': return content.figures;
      case 'scenes': return content.scenes;
      case 'prompts': return [...this.user.prompts, ...content.textBank('prompts', spice)];
      case 'scenarios': return [...this.user.scenarios, ...content.textBank('scenarios', spice)];
      case 'mostlikely': return content.textBank('mostlikely', spice);
      case 'drawprompts': return content.textBank('drawprompts', spice);
      case 'names': return [...this.user.names, ...content.fallbackNames.map((t, i) => ({ id: 'nm:' + i, text: t }))];
      case 'photos': return this.photoAssets().map(([id, a]) => ({ id, asset: id, by: a.by }));
      default: return [];
    }
  }
  /** Draw a not-yet-used item (player-added items first). Photos never repeat; others recycle. */
  _draw(name) {
    const used = this.used[name] || (this.used[name] = new Set());
    const list = this._poolList(name);
    let fresh = list.filter((x) => !used.has(x.id));
    if (!fresh.length) {
      if (name === 'photos' || !list.length) return null;
      used.clear(); fresh = list;
    }
    const mine = fresh.filter((x) => x.user);
    const it = pick(mine.length ? mine : fresh);
    used.add(it.id);
    if (name === 'photos') { const a = this.assets.get(it.asset); if (a) a.shown = true; }
    return it;
  }
  _poolSize(name) {
    const used = this.used[name] || new Set();
    return this._poolList(name).filter((x) => !used.has(x.id)).length;
  }

  // ------------------------------------------------------------------ views
  emit() {
    if (this._emitPending || this.closed) return;
    this._emitPending = true;
    setImmediate(() => { this._emitPending = false; this._emitNow(); });
  }
  _emitNow() {
    for (const p of this.players.values()) {
      if (p.connected && p.socketId) this.io.to(p.socketId).emit('state', this.view({ kind: 'player', player: p }));
    }
    for (const id of this.tvs) this.io.to(id).emit('state', this.view({ kind: 'tv' }));
  }
  view(viewer) {
    const p = viewer.player;
    return {
      code: this.code, phase: this.phase, paused: this.paused, settings: this.settings,
      display: this.displayResolved(), tvCount: this.tvs.size, hostId: this.hostId,
      players: this.order.map((id) => this.players.get(id)).filter(Boolean).map((x) => ({
        ...this.pub(x), connected: x.connected, host: x.id === this.hostId,
      })),
      you: p ? { id: p.id, name: p.name, avatar: p.avatar, score: p.score, host: p.id === this.hostId } : null,
      modes: registry.publicList(),
      currentMode: this.currentMode ? { id: this.currentMode.id, name: this.currentMode.name, emoji: this.currentMode.emoji } : null,
      pool: {
        prompts: this.user.prompts.length, scenarios: this.user.scenarios.length,
        names: this.user.names.length, photos: this.photoAssets().length,
      },
      stage: this._stageView(viewer),
    };
  }
  _stageView(viewer) {
    const s = this.stage;
    if (!s) return null;
    const isTv = viewer.kind === 'tv';
    const p = viewer.player;
    const now = Date.now();
    const v = {
      id: s.id, kind: s.kind, title: s.title, instruction: s.instruction, over: s.done,
      remainingMs: s.ms ? (this.paused ? s.remaining : Math.max(0, s.deadline - now)) : null,
      totalMs: s.ms || null, sfx: s.sfx || null,
      waiting: s.needsInput && !s.done
        ? [...s.participants].map((id) => this.players.get(id)).filter((x) => x && x.connected && !s.submissions.has(x.id)).map((x) => x.name)
        : [],
    };
    // Shared content: always for the TV; for phones only when there is no TV (phone-only mode).
    if (isTv || this.displayResolved() === 'phone') v.shared = s.shared;
    if (p) {
      const part = s.participants.has(p.id);
      v.participant = part;
      v.submitted = s.submissions.has(p.id);
      v.mine = part ? s.mines[p.id] || null : null;
      v.rerollsLeft = s.reroll && part ? s.rerolls.get(p.id) : 0;
      v.job = part ? s.job : s.spectatorJob || 'You join from the next stage';
    }
    return v;
  }

  // --------------------------------------------------------- stage mechanics
  ms(seconds) { return Math.max(this.settings.timer === 'fast' ? 300 : 3000, Math.round(seconds * 1000 * TIMER_MULT[this.settings.timer])); }

  _runStage(def) {
    if (this.abort || this.closed) return Promise.reject(new GameAborted());
    return new Promise((resolve) => {
      const ms = def.ms || 0;
      const s = {
        id: ++this.stageCounter, kind: def.kind, title: def.title || '', instruction: def.instruction || '',
        job: def.job || '', spectatorJob: def.spectatorJob, shared: def.shared || {}, mines: def.mines || {},
        participants: new Set((def.participants || []).map((p) => p.id)), submissions: new Map(),
        needsInput: !!def.needsInput, ms, deadline: ms ? Date.now() + ms : 0, remaining: ms,
        grace: this.settings.timer === 'fast' ? 0 : 1200, done: false, resolve,
        rerolls: new Map(), reroll: def.reroll, sfx: def.sfx, options: def.options, disabled: def.disabled || {}, vetoable: !!def.vetoable,
      };
      if (s.reroll) for (const id of s.participants) s.rerolls.set(id, 2);
      this._markShown(s.shared);
      this.stage = s;
      this.emit(); this._check();
    });
  }
  /** Any {asset: id} in shared content becomes publicly fetchable. */
  _markShown(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'asset' && typeof v === 'string') { const a = this.assets.get(v); if (a) a.shown = true; }
      else if (v && typeof v === 'object') this._markShown(v);
    }
  }
  _finish() {
    const s = this.stage;
    if (!s || s.done) return;
    s.done = true; this.emit(); s.resolve(s);
  }
  /** Finish early when every connected participant has answered. */
  _check() {
    const s = this.stage;
    if (!s || s.done || this.paused || !s.needsInput || this.connectedCount() === 0) return;
    const pending = [...s.participants].filter((id) => !s.submissions.has(id) && this.players.get(id) && this.players.get(id).connected);
    if (!pending.length) this._finish();
  }
  _tick() {
    const now = Date.now();
    const host = this.players.get(this.hostId);
    if (host && !host.connected && now - host.disconnectedAt > CONFIG.HOST_GRACE_MS) {
      const next = this.connectedPlayers()[0];
      if (next) { this.hostId = next.id; this.toast(`${next.name} is now the host`); this.emit(); }
    }
    const s = this.stage;
    if (s && !s.done && !this.paused && s.ms && now >= s.deadline + s.grace) this._finish();
    if (this.connectedCount() === 0) {
      if (!this.idleSince) this.idleSince = now;
      else if (this.phase === 'playing' && !this.abort && now - this.idleSince > NOBODY_ABORT_MS) this._abortGame();
    } else this.idleSince = null;
  }
  _abortGame() { this.abort = true; this.paused = false; this._finish(); }

  handleSubmit(player, msg) {
    const s = this.stage;
    if (!msg || typeof msg !== 'object') return 'Bad request';
    if (!s || s.done || this.paused || msg.stageId !== s.id || !s.needsInput) return 'Too late!';
    if (!s.participants.has(player.id) || s.submissions.has(player.id)) return 'Already in.';
    const data = msg.data && typeof msg.data === 'object' ? msg.data : {};
    let out;
    if (s.kind === 'intro') out = true;
    else if (s.kind === 'write') {
      const fields = s.mines[player.id].fields;
      const arr = Array.isArray(data.fields) ? data.fields : [];
      out = []; let any = false;
      fields.forEach((f, i) => {
        if (f.type === 'draw') {
          const img = parseImageDataUrl(arr[i], LIMITS.drawBytes);
          out[i] = img ? this.addAsset(img.mime, img.buf, 'draw', player.id) : '';
        } else out[i] = cleanText(arr[i], f.max);
        if (out[i]) any = true;
      });
      if (!any) return 'Write something first!';
    } else if (s.kind === 'choose') {
      const choice = typeof data.choice === 'string' ? data.choice : '';
      const dis = s.disabled[player.id] || new Set();
      if (!s.options.some((o) => o.id === choice) || dis.has(choice)) return 'Invalid choice';
      const vetoes = s.vetoable && Array.isArray(data.vetoes)
        ? data.vetoes.filter((x) => typeof x === 'string' && x !== choice && s.options.some((o) => o.id === x)).slice(0, 20) : [];
      out = { choice, vetoes };
    } else return 'Nothing to submit';
    s.submissions.set(player.id, out);
    this.emit(); this._check();
    return null;
  }
  handleReroll(player, stageId) {
    const s = this.stage;
    if (!s || s.done || this.paused || s.id !== stageId || s.kind !== 'write' || !s.reroll) return;
    if (!s.participants.has(player.id) || s.submissions.has(player.id)) return;
    const left = s.rerolls.get(player.id) || 0;
    if (left <= 0) return;
    const next = s.reroll(this.pub(player), s.mines[player.id]);
    if (!next) return;
    s.mines[player.id] = this._normMine(next);
    s.rerolls.set(player.id, left - 1);
    this.emit();
  }
  _normMine(m) {
    const fields = (m.fields && m.fields.length ? m.fields : [{}]).slice(0, 4).map((f) => ({
      type: f.type === 'draw' ? 'draw' : 'text', label: f.label || '', placeholder: f.placeholder || '',
      max: Math.min(Number(f.max) || LIMITS.text, 400),
    }));
    return { ...m, fields };
  }

  // ---------------------------------------------------------- host controls
  handleHost(player, msg) {
    if (player.id !== this.hostId) return 'Only the host can do that.';
    if (!msg || typeof msg !== 'object') return 'Bad request';
    switch (msg.action) {
      case 'mode': case 'shuffle': {
        if (this.phase !== 'lobby') return 'A game is already running.';
        let queue;
        if (msg.action === 'shuffle') queue = shuffle(registry.list().filter((m) => m.minPlayers <= this.connectedCount()));
        else {
          const m = registry.get(msg.modeId);
          if (!m) return 'Unknown mode';
          queue = [m];
        }
        if (!queue.length) return 'Not enough players for any mode yet.';
        const need = Math.min(...queue.map((m) => m.minPlayers));
        if (this.connectedCount() < need) return `Need at least ${need} players for that mode.`;
        this._play(queue);
        return null;
      }
      case 'skip': this._finish(); return null;
      case 'pause':
        if (!this.paused && this.stage) {
          this.paused = true;
          if (this.stage.ms) this.stage.remaining = Math.max(0, this.stage.deadline - Date.now());
          this.emit();
        }
        return null;
      case 'resume':
        if (this.paused) {
          this.paused = false;
          if (this.stage && this.stage.ms) this.stage.deadline = Date.now() + this.stage.remaining;
          this.emit(); this._check();
        }
        return null;
      case 'settings': this.applySettings(msg.settings); return null;
      case 'removePhoto': {
        const a = this.assets.get(msg.id);
        if (a && a.kind === 'photo') { this.assets.delete(msg.id); this.emit(); }
        return null;
      }
      case 'kick': return this.kick(msg.playerId) ? null : 'Cannot kick that player.';
      case 'end': if (this.phase === 'playing') this._abortGame(); return null;
      case 'lobby': if (this.phase === 'final') this._finish(); return null;
      default: return 'Unknown action';
    }
  }
  photoList() {
    return this.photoAssets().map(([id, a]) => ({
      id, by: (this.players.get(a.by) || {}).name || '?',
      dataUrl: `data:${a.mime};base64,${a.buf.toString('base64')}`,
    }));
  }

  // -------------------------------------------------------------- game loop
  async _play(queue) {
    this.phase = 'playing'; this.abort = false; this.snap = new Map(); this.used = {};
    for (const p of this.players.values()) { p.score = 0; p.stats = {}; }
    this.emit();
    try {
      for (const mode of queue) {
        if (this.abort || this.closed) break;
        if (this.connectedCount() < mode.minPlayers) { this.toast(`Skipped ${mode.name}: not enough players`); continue; }
        await this._runMode(mode);
      }
    } catch (e) {
      if (!(e instanceof GameAborted)) { console.error('[game error]', e); this.toast('Oops, that mode crashed. Wrapping up.'); }
    }
    if (this.closed) return;
    this.abort = false; this.paused = false;
    try { await this._final(); } catch (e) { if (!(e instanceof GameAborted)) console.error(e); }
    this.stage = null; this.phase = 'lobby'; this.currentMode = null; this.emit();
  }
  async _runMode(mode) {
    this.currentMode = mode; this.emit();
    if (!this.seenModes.has(mode.id)) {
      this.seenModes.add(mode.id);
      await this._runStage({
        kind: 'intro', title: `${mode.emoji} ${mode.name}`, instruction: mode.instructions, job: 'Read the rules',
        shared: { emoji: mode.emoji, name: mode.name, instruction: mode.instructions, example: mode.example },
        participants: this.connectedPlayers(), needsInput: true, ms: this.ms(25), sfx: 'whoosh',
      });
    }
    await mode.run(this._ctx(mode));
    await this._scores();
  }
  _rows() {
    return [...this.players.values()].sort((a, b) => b.score - a.score).map((p) => ({
      ...this.pub(p), delta: p.score - (this.snap.get(p.id) || 0), connected: p.connected,
    }));
  }
  async _scores(title = 'Scoreboard') {
    const rows = this._rows();
    for (const p of this.players.values()) this.snap.set(p.id, p.score);
    await this._runStage({ kind: 'scores', title, job: 'Eyes on the scores', shared: { rows }, ms: this.ms(7), sfx: 'ding' });
  }
  async _final() {
    this.phase = 'final'; this.currentMode = null;
    const rows = this._rows();
    const awards = [];
    const best = (key) => {
      let top = null;
      for (const p of this.players.values()) { const v = p.stats[key] || 0; if (v > 0 && (!top || v > top.v)) top = { p, v }; }
      return top;
    };
    if (rows.length && rows[0].score > 0) awards.push({ title: 'Champion', emoji: '🏆', name: rows[0].name, avatar: rows[0].avatar, detail: `${rows[0].score} points` });
    for (const [key, title, emoji, unit] of [
      ['fooled', 'Best Liar', '🤥', 'players fooled'], ['detective', 'Best Detective', '🕵️', 'correct guesses'],
      ['funny', 'Funniest', '😂', 'votes'], ['agree', 'Hive Mind', '🐝', 'times in sync'],
    ]) {
      const t = best(key);
      if (t) awards.push({ title, emoji, name: t.p.name, avatar: t.p.avatar, detail: `${t.v} ${unit}` });
    }
    await this._runStage({ kind: 'final', title: 'Final Results', job: 'Eyes on the winners', shared: { rows, awards }, ms: 0, sfx: 'win' });
  }

  // -------------------------------------------------------------- mode API
  _ctx(mode) {
    const room = this;
    const live = () => { if (room.abort || room.closed) throw new GameAborted(); };
    return {
      mode: { id: mode.id, name: mode.name, emoji: mode.emoji },
      get settings() { return { ...room.settings }; },
      get rounds() { return room.settings.rounds; },
      players: () => room.connectedPlayers().map((p) => room.pub(p)),
      player: (id) => { const p = room.players.get(id); return p ? room.pub(p) : null; },
      pool: {
        draw: (name) => room._draw(name),
        list: (name) => room._poolList(name),
        size: (name) => room._poolSize(name),
      },
      shuffle, pick, sample,
      isAborted: () => room.abort || room.closed,
      award(id, pts) { const p = room.players.get(id); if (p) p.score = Math.max(0, p.score + Math.round(pts)); },
      stat(id, key, n = 1) { const p = room.players.get(id); if (p) p.stats[key] = (p.stats[key] || 0) + n; },
      dropAsset(id) { if (room.assets.get(id) && room.assets.get(id).kind === 'draw') room.assets.delete(id); },
      async write(spec) { live(); return room._write(spec); },
      async choose(spec) { live(); return room._choose(spec); },
      async reveal(spec) { live(); return room._reveal(spec); },
      async showScores(title) { live(); return room._scores(title); },
    };
  }

  /**
   * ctx.write: private writing stage. Returns { [playerId]: { fields:[...], auto:bool, mine } }.
   * spec: { title, instruction, job, shared, per(player)=>mine, reroll(player,mine)=>mine, fallback(player,mine,i)=>text, seconds, players }
   * mine: { prompt, hint, bio, truth, fields:[{type:'text'|'draw', label, max}] }
   */
  async _write(spec) {
    const players = spec.players || this.connectedPlayers();
    const mines = {};
    for (const p of players) mines[p.id] = this._normMine((spec.per && spec.per(p)) || {});
    const stage = await this._runStage({
      kind: 'write', title: spec.title, instruction: spec.instruction, job: spec.job || "You're writing",
      spectatorJob: spec.spectatorJob, shared: spec.shared, mines, participants: players, needsInput: true,
      ms: this.ms(spec.seconds || 60), reroll: spec.reroll, sfx: 'whoosh',
    });
    const out = {};
    for (const p of players) {
      const mine = stage.mines[p.id];
      const sub = stage.submissions.get(p.id);
      const fields = sub ? sub.slice() : [];
      mine.fields.forEach((f, i) => {
        if (f.type === 'text' && !fields[i]) {
          fields[i] = cleanText(spec.fallback ? spec.fallback(p, mine, i) : pick(FALLBACK_LINES), f.max);
        }
        if (fields[i] === undefined) fields[i] = '';
      });
      out[p.id] = { fields, auto: !sub, mine };
    }
    return out;
  }

  /**
   * ctx.choose: voting. Returns { [voterId]: optionId|null } (plus non-enumerable .vetoes).
   * spec: { title, instruction, job, spectatorJob, shared, options:[{id,text,sub,avatar,scene,asset}],
   *         voters, disabled(player)=>[ids], vetoable, seconds }
   */
  async _choose(spec) {
    const voters = spec.voters || this.connectedPlayers();
    const options = spec.options.map((o) => ({ ...o, id: String(o.id) }));
    const disabled = {}; const mines = {};
    for (const p of voters) {
      disabled[p.id] = new Set(spec.disabled ? spec.disabled(p).map(String) : []);
      mines[p.id] = {
        vetoable: !!spec.vetoable,
        options: options.map((o) => ({ id: o.id, text: o.text, sub: o.sub, avatar: o.avatar, disabled: disabled[p.id].has(o.id) })),
      };
    }
    const stage = await this._runStage({
      kind: 'choose', title: spec.title, instruction: spec.instruction, job: spec.job || "You're voting",
      spectatorJob: spec.spectatorJob || 'Watching the votes roll in 👀', shared: { ...spec.shared, options },
      mines, participants: voters, needsInput: true, ms: this.ms(spec.seconds || 25), options, disabled,
      vetoable: spec.vetoable, sfx: 'whoosh',
    });
    const out = {}; const vetoes = {};
    for (const p of voters) {
      const sub = stage.submissions.get(p.id);
      out[p.id] = sub ? sub.choice : null; vetoes[p.id] = sub ? sub.vetoes : [];
    }
    Object.defineProperty(out, 'vetoes', { value: vetoes, enumerable: false });
    return out;
  }

  /** ctx.reveal: show shared content (heading, prompt, image, items[]) for a few seconds. */
  async _reveal(spec) {
    await this._runStage({
      kind: 'reveal', title: spec.title, instruction: spec.instruction, job: 'Eyes on the screen 👀',
      shared: spec.shared, ms: this.ms(spec.seconds || 8), sfx: spec.sfx || 'ding',
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true; this.abort = true;
    clearInterval(this.ticker);
    this._broadcast('closed', {});
    this._finish();
    this.assets.clear(); this.players.clear(); this.tvs.clear();
    if (this.onClose) this.onClose(this);
  }
}

module.exports = { Room, LIMITS };
