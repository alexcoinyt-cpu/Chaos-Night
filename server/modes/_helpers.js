'use strict';
// Small helpers shared by several modes (files starting with "_" are not loaded as modes).

/** Count votes: choices is { voterId: optionId|null } -> { optionId: [voterIds] } */
function tally(choices, optionIds) {
  const t = {};
  for (const id of optionIds) t[id] = [];
  for (const [voter, opt] of Object.entries(choices)) if (opt && t[opt]) t[opt].push(voter);
  return t;
}
const names = (players) => Object.fromEntries(players.map((p) => [p.id, p]));
const list = (ids, byId) => ids.map((i) => (byId[i] ? byId[i].name : '?')).join(', ');

module.exports = { tally, names, list };
