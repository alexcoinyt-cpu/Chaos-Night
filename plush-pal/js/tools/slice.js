import { G } from '../game.js';
import { Fx } from '../effects.js';
import { K } from '../toolkit.js';
import { P } from '../physics.js';
const T = o => Object.assign({ cat: 'slice', cost: 0, level: 1, type: 'tap', sounds: [], lines: [] }, o);
const near = (x, y, r) => G.plush.nodes.some(n => Math.hypot(n.position.x - x, n.position.y - y) < r);
export const slice = [
  T({ id: 'chainsaw', name: 'Chainsaw of Mild Alarm', icon: '🪚', type: 'hold', hint: 'Hold and drag across him to cut along the line.', lines: ['Well, that is a draft.', 'I am now available in multiple pieces.', 'Mind the seams, please.'],
    effect(G, p) {
      if (p.first) G.audio.loop('saw', true); G.cursor = { emoji: '🪚', size: 64, rot: -0.3, wob: 3 };
      const a = { x: p.px, y: p.py }, b = { x: p.x, y: p.y }, j = () => (Math.random() - 0.5) * 7;
      K.cut(a, { x: b.x + j(), y: b.y + j() }, { width: 9, tag: 'chainsaw' }); K.cut({ x: b.x - 7, y: b.y - 7 }, { x: b.x + 7, y: b.y + 7 }, { width: 9, tag: 'chainsaw' });
      if (near(b.x, b.y, 30)) { Fx.spark(b.x, b.y, 1, { col: '#fff' }); if (Math.random() < 0.3) Fx.stuff(b.x, b.y, 1, { speed: 2 }); }
    }, end(G) { G.audio.loop('saw', false); G.cursor = null; } }),
  T({ id: 'sword', name: 'Dramatic Sword', icon: '⚔️', level: 2, cost: 50, type: 'hold', hint: 'Swipe across him. Very clean. Very dramatic.', lines: ['En garde! ...too late.', 'A clean cut. I am impressed and divided.', 'Zorro would be proud. And confused.'],
    effect(G, p) { G.cursor = { emoji: '⚔️', size: 60, rot: 0.6 }; const sp = Math.hypot(p.dx, p.dy); if (sp > 3) { const n = K.cut({ x: p.px, y: p.py }, { x: p.x, y: p.y }, { width: 4, push: 2.4, tag: 'sword' }); Fx.spark(p.x, p.y, 2, { col: '#e8f6ff' }); if (sp > 14 && Math.random() < 0.2) G.audio.play('whoosh', { vol: 0.35 }); if (n) { Fx.text(p.x, p.y - 30, 'SHING!', { color: '#cfe8ff', size: 20 }); } } },
    end(G) { G.cursor = null; } }),
  T({ id: 'lawnmower', name: 'Lawnmower Lenny', icon: '🚜', level: 3, cost: 90, hint: 'Lenny mows across at the height you tap.', lines: ['He is mowing me. I am the lawn now.', 'Lenny takes his job very seriously.', 'Fresh-cut Dumpling. Smells like cotton.'],
    effect(G, p) { const y = Math.min(-14, p.y), dir = p.x > 0 ? -1 : 1, x0 = dir > 0 ? K.left() : K.right(), W = G.cam.worldW + 160; G.audio.loop('saw', true);
      Fx.actor({ ttl: W / 620 + 0.2, front: true, x: x0, update(dt, a) { const nx = a.x + dir * 620 * dt; K.cut({ x: a.x + dir * 30, y }, { x: nx + dir * 30, y }, { width: 10, tag: 'mower' }); if (near(nx + dir * 30, y, 40)) { Fx.stuff(nx + dir * 30, y, 1, { speed: 3 }); Fx.shake(3); } Fx.add({ type: 'conf', x: nx, y: -2, vx: -dir * 3, vy: -3, g: 0.2, life: 0.8, size: 5, col: '#6bd36b', rot: 1, vr: 0.2 }); a.x = nx; },
        draw(c, a) { c.translate(a.x, y + 4); c.scale(-dir, 1); c.font = '110px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText('🚜', 0, 40); }, onEnd() { G.audio.loop('saw', false); } }); } }),
  T({ id: 'shredder', name: 'Paper Shredder', icon: '📄', level: 4, cost: 150, hint: 'Comb of blades sweeps down at your tap. Strips!', lines: ['I am now confetti. Accountants are crying.', 'Shredded. Not stirred.', 'Please do not read my insides.'],
    effect(G, p) { const top = K.top(), dur = 1.1; let prev = top; G.audio.loop('saw', true);
      Fx.actor({ ttl: dur + 0.3, front: true, update(dt, a) { const y = top + (-6 - top) * Math.min(1, a.t / dur); for (let k = -3; k <= 3; k++) K.cut({ x: p.x + k * 13, y: prev }, { x: p.x + k * 13, y }, { width: 5, tag: 'shred', quiet: true }); if (near(p.x, y, 120)) Fx.add({ type: 'conf', x: p.x + K.R(-50, 50), y, vx: K.R(-2, 2), vy: K.R(-4, 0), g: 0.15, life: 1.4, size: 5, col: '#fff', rot: 1, vr: 0.3 }); prev = y; },
        draw(c, a) { const y = top + (-6 - top) * Math.min(1, a.t / dur); c.fillStyle = '#7a8aa0'; c.beginPath(); c.roundRect(p.x - 52, y - 40, 104, 34, 8); c.fill(); c.fillStyle = '#d8e4f0'; for (let k = -3; k <= 3; k++) c.fillRect(p.x + k * 13 - 2, y - 8, 4, 14); c.fillStyle = '#fff'; c.font = '28px sans-serif'; c.textAlign = 'center'; c.fillText('📄', p.x, y - 48); }, onEnd() { G.audio.loop('saw', false); } }); } }),
  T({ id: 'scissors', name: 'Giant Scissors', icon: '✂️', level: 1, cost: 0, hint: 'Tap to snip through that spot.', lines: ['Snip snip. That tickled my existence.', 'Scissors are just two swords in a trench coat.', 'I told you to cut the ribbon, not me.'],
    effect(G, p) { const a = Math.random() < 0.5 ? K.R(-0.4, 0.4) : K.R(1.2, 1.9), dx = Math.cos(a) * 95, dy = Math.sin(a) * 95;
      K.strike({ emoji: '✂️', size: 100, from: { x: p.x - dx * 1.8, y: p.y - dy * 1.8 }, to: { x: p.x, y: p.y }, dur: 0.22, rot0: a + 0.9, rot1: a + 0.9, ease: 'out', linger: 0.3, onHit(at) { G.audio.play('snip'); const n = K.cut({ x: at.x - dx, y: at.y - dy }, { x: at.x + dx, y: at.y + dy }, { width: 7, tag: 'scissors' }); Fx.text(at.x, at.y - 40, 'SNIP!', { color: '#fff', size: 22 }); Fx.spark(at.x, at.y, 6, { col: '#e8f6ff' }); } }); } }),
  T({ id: 'cheese', name: 'Cheese Slicer Wire', icon: '🧀', level: 3, cost: 80, type: 'hold', hint: 'Drag DOWN: the wire slices level slabs.', lines: ['Say cheese! Oh no.', 'Thin slices. Very artisanal.', 'I am being portioned.'],
    effect(G, p) { G.cursor = { emoji: '🧀', size: 40, rot: 0, wire: 150 }; const y = p.y; if (Math.abs(p.dy) > 1.2) K.cut({ x: p.x - 150, y: p.py }, { x: p.x + 150, y }, { width: 3, tag: 'cheese', push: 1 }); },
    end(G) { G.cursor = null; } }),
  T({ id: 'pizza', name: 'Pizza Cutter', icon: '🍕', level: 2, cost: 40, type: 'hold', hint: 'Roll it along any path for clean thin cuts.', lines: ['Pepperoni? No, I am the pepperoni.', 'Extra cheese. Extra cotton.', 'I am a pizza now. Please eat me politely.'],
    effect(G, p) { G.cursor = { emoji: '🍕', size: 50, rot: 0.3 }; if (Math.hypot(p.dx, p.dy) > 2) { const n = K.cut({ x: p.px, y: p.py }, { x: p.x, y: p.y }, { width: 3, push: 1.2, tag: 'pizza' }); if (n) Fx.glyph(p.x, p.y, '🍕', 1, { size: 12 }); } }, end(G) { G.cursor = null; } }),
];
