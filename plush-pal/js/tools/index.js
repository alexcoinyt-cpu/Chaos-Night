// Tool registry. Every tool is a config object:
// { id, name, icon, cat, cost, level, type:'tap'|'hold'|'global'|'place', hint, sounds:[], lines:[], effect(G,p), end(G) }
import { smash } from './smash.js';
import { slice } from './slice.js';
import { boom } from './boom.js';
import { elements } from './elements.js';
import { machines } from './machines.js';
import { silly } from './silly.js';
import { gentle } from './gentle.js';
import { scifi } from './scifi.js';
import { env } from './env.js';
export const CATS = [
  { id: 'smash', name: 'Smash', icon: '🔨' }, { id: 'slice', name: 'Slice', icon: '✂️' }, { id: 'boom', name: 'Boom', icon: '💥' },
  { id: 'elements', name: 'Elements', icon: '🔥' }, { id: 'machines', name: 'Machines', icon: '⚙️' }, { id: 'silly', name: 'Silly', icon: '🤡' },
  { id: 'gentle', name: 'Gentle', icon: '🤗' }, { id: 'scifi', name: 'Absurd', icon: '🛸' }, { id: 'env', name: 'Places', icon: '🏞️' },
];
export const HAND = { id: 'hand', name: 'Grab & Fling', icon: '✋', cat: 'smash', cost: 0, level: 1, type: 'hand', hint: 'Drag Dumpling to toss him. Pull limbs hard enough and seams will give.', sounds: [], lines: [] };
export const TOOLS = [HAND, ...smash, ...slice, ...boom, ...elements, ...machines, ...silly, ...gentle, ...scifi, ...env];
TOOLS.forEach(t => { t.sounds ||= []; t.lines ||= []; t.type ||= 'tap'; });
export const toolById = id => TOOLS.find(t => t.id === id);
