'use strict';
// Auto-loads every game mode in /server/modes (files starting with "_" are ignored).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'modes');
const modes = new Map();

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.js') || file.startsWith('_')) continue;
  const m = require(path.join(dir, file));
  const need = ['id', 'name', 'emoji', 'order', 'description', 'instructions', 'example', 'minPlayers', 'run'];
  const missing = need.filter((k) => m[k] === undefined);
  if (missing.length) { console.warn(`[modes] ${file} skipped, missing: ${missing.join(', ')}`); continue; }
  modes.set(m.id, m);
}

const list = () => [...modes.values()].sort((a, b) => a.order - b.order);
const get = (id) => modes.get(id);
const publicList = () => list().map(({ id, name, emoji, description, minPlayers }) => ({ id, name, emoji, description, minPlayers }));

module.exports = { list, get, publicList };
