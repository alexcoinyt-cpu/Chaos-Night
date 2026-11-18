'use strict';
/** HTTP + Socket.IO entry point. In-memory only: nothing is ever written to disk. */
const path = require('path');
const os = require('os');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const CONFIG = require('../config');
const { Room } = require('./room');
const { cleanText } = require('./util');

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_ROOMS = 300;

function createApp() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 1.5e6, cors: { origin: false } });
  const rooms = new Map();

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss:",
    });
    next();
  });
  app.get('/health', (req, res) => res.json({ ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()) }));
  app.get('/config.json', (req, res) => res.json({ name: CONFIG.GAME_NAME, tagline: CONFIG.TAGLINE, avatars: CONFIG.AVATARS }));
  app.get('/tv', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'tv.html')));
  // Photos/drawings are only served once they have been shown in a stage.
  app.get('/asset/:code/:id', (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    const a = room && room.assets.get(req.params.id);
    if (!a || !a.shown) return res.status(404).end();
    res.set({ 'Content-Type': a.mime, 'Cache-Control': 'private, max-age=600' });
    res.send(a.buf);
  });
  app.use(express.static(path.join(__dirname, '..', 'public')));

  function newCode() {
    for (let i = 0; i < 200; i++) {
      let c = '';
      for (let j = 0; j < 4; j++) c += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
      if (!rooms.has(c)) return c;
    }
    return null;
  }
  const validAvatar = (a) => (CONFIG.AVATARS.includes(a) ? a : CONFIG.AVATARS[0]);

  io.on('connection', (socket) => {
    let room = null; let player = null;
    // Tiny per-socket rate limit (60 events / 5s).
    let bucket = 0; setInterval(() => { bucket = 0; }, 5000).unref();
    const guard = (fn) => (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : () => {};
      if (++bucket > 60) return ack({ ok: false, error: 'Slow down!' });
      try { if (room) room.touch(); fn(args[0], ack); } catch (e) { console.error('[socket error]', e); ack({ ok: false, error: 'Server error' }); }
    };

    socket.on('room:create', guard((d, ack) => {
      d = d && typeof d === 'object' ? d : {};
      const name = cleanText(d.name, 16);
      if (!name) return ack({ ok: false, error: 'Pick a name first.' });
      if (rooms.size >= MAX_ROOMS) return ack({ ok: false, error: 'Server is full, try later.' });
      const code = newCode();
      if (!code) return ack({ ok: false, error: 'Could not make a room.' });
      room = new Room(io, code, (r) => rooms.delete(r.code));
      rooms.set(code, room);
      player = room.addPlayer(name, validAvatar(d.avatar));
      socket.join(code);
      room.attach(player, socket.id);
      ack({ ok: true, code, token: player.token, playerId: player.id });
    }));

    socket.on('room:join', guard((d, ack) => {
      d = d && typeof d === 'object' ? d : {};
      const r = rooms.get(String(d.code || '').toUpperCase().slice(0, 4));
      if (!r) return ack({ ok: false, error: 'No room with that code.' });
      let p = r.findByToken(d.token);
      const name = cleanText(d.name, 16);
      if (!p) {
        if (!name) return ack({ ok: false, error: 'Pick a name first.' });
        if (r.isBanned(name, d.token)) return ack({ ok: false, error: 'You were removed from this room.' });
        p = r.findDisconnectedByName(name);               // rejoin by name
        if (!p) {
          if (r.players.size >= CONFIG.MAX_PLAYERS) return ack({ ok: false, error: 'Room is full.' });
          p = r.addPlayer(name, validAvatar(d.avatar));
        }
      }
      room = r; player = p;
      socket.join(r.code);
      r.attach(p, socket.id);
      ack({ ok: true, code: r.code, token: p.token, playerId: p.id, name: p.name });
    }));

    socket.on('tv:join', guard((d, ack) => {
      const r = rooms.get(String((d && d.code) || '').toUpperCase().slice(0, 4));
      if (!r) return ack({ ok: false, error: 'No room with that code.' });
      room = r; player = null;
      socket.join(r.code);
      r.attachTv(socket.id);
      ack({ ok: true, code: r.code });
    }));

    socket.on('submit', guard((d, ack) => {
      if (!room || !player) return ack({ ok: false });
      const err = room.handleSubmit(player, d);
      ack({ ok: !err, error: err || undefined });
    }));
    socket.on('reroll', guard((d, ack) => {
      if (room && player && d) room.handleReroll(player, d.stageId);
      ack({ ok: true });
    }));
    socket.on('pool:add', guard((d, ack) => {
      if (!room || !player || !d || typeof d !== 'object') return ack({ ok: false });
      const err = room.addToPool(player, d.type, d.type === 'photo' ? d.dataUrl : d.text);
      ack({ ok: !err, error: err || undefined });
    }));
    socket.on('host', guard((d, ack) => {
      if (!room || !player) return ack({ ok: false });
      if (d && d.action === 'photos') {
        if (player.id !== room.hostId) return ack({ ok: false, error: 'Only the host can do that.' });
        return ack({ ok: true, photos: room.photoList() });
      }
      const err = room.handleHost(player, d);
      ack({ ok: !err, error: err || undefined });
    }));
    socket.on('disconnect', () => { if (room) room.detach(socket.id); });
  });

  // Delete rooms with no activity for ~30 minutes (also frees photos from memory).
  const janitor = setInterval(() => {
    const now = Date.now();
    for (const r of [...rooms.values()]) {
      const nobody = r.connectedCount() === 0 && r.tvs.size === 0;
      if (now - r.lastActive > CONFIG.ROOM_IDLE_MS || (nobody && now - r.lastActive > CONFIG.ROOM_IDLE_MS / 3)) r.close();
    }
  }, 60 * 1000);
  janitor.unref();

  return { app, server, io, rooms, close: () => { clearInterval(janitor); for (const r of rooms.values()) r.close(); io.close(); } };
}

function lanUrls(port) {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(`http://${i.address}:${port}`);
  }
  return out;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { server } = createApp();
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n${CONFIG.GAME_NAME} is running!`);
    console.log(`  Local:   http://localhost:${port}`);
    for (const u of lanUrls(port)) console.log(`  Network: ${u}   (TV screen: ${u}/tv)`);
    console.log('');
  });
}

module.exports = { createApp };
