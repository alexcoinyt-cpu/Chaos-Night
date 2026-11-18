'use strict';
// Loads the editable JSON content banks from /data.
const fs = require('fs');
const path = require('path');

const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));

const figures = load('figures.json').map((f, i) => ({ ...f, id: 'fig' + i }));
const scenes = load('scenes.json');
const banks = {
  prompts: load('prompts.json'),        // Who Said It? [{text, tag}]
  mostlikely: load('mostlikely.json'),  // [{text, tag}]
  drawprompts: load('drawprompts.json'),
  scenarios: load('scenarios.json'),
};
const fallbackNames = load('names.json'); // Hot Take fallback list (strings)

// Which tags each spice level allows.
const SPICE = { clean: ['clean'], normal: ['clean', 'normal'], unhinged: ['normal', 'unhinged'] };

function textBank(name, spice) {
  const allow = SPICE[spice] || SPICE.normal;
  return banks[name]
    .map((x, i) => ({ id: name + ':' + i, text: x.text, tag: x.tag || 'clean' }))
    .filter((x) => allow.includes(x.tag));
}

module.exports = { figures, scenes, fallbackNames, textBank };
