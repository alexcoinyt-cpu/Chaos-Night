import { G } from '../game.js';
import { Fx } from '../effects.js';
import { K } from '../toolkit.js';
import { P } from '../physics.js';
import { stat } from '../save.js';
const T = o => Object.assign({ cat: 'elements', cost: 0, level: 1, type: 'tap', sounds: [], lines: [] }, o);
const inCone = (n, from, p, r) => Math.hypot(n.position.x - p.x, n.position.y - p.y) < r;
export const elements = [
  T({ id: 'flame', name: 'Flamethrower', icon: '🔥', type: 'hold', hint: 'Hold to toast him. Smoke puffs, fabric browns.', lines: ['Toasty.', 'Smells like Tuesday.', 'Medium rare cotton, please.'],
    effect(G, p) {
      if (p.first) G.audio.loop('flame', true);
      const from = { x: p.x - 130, y: p.y + 70 }, dir = K.dir(from, p); G.cursor = { emoji: '🔥', size: 40, rot: 0 };
      for (let i = 0; i < 2; i++) Fx.fire(from.x + dir.x * 10, from.y + dir.y * 10, dir.x * 8 + K.R(-1, 1), dir.y * 8 + K.R(-1, 1));
      let hot = 0; for (const n of G.plush.nodes) if (inCone(n, from, p, 75)) { hot++; K.vel(n, dir.x * 0.1, dir.y * 0.1 - 0.02); }
      if (hot) { const s = G.plush.status, was = s.heat; s.heat = Math.min(1, s.heat + p.dt * 0.5); if (Math.random() < 0.25) Fx.smoke(p.x, p.y - 20, 1); if (was < 1 && s.heat >= 1) { stat('toasted'); G.econ.checkAch(); } K.mood('toasty', 1); G.econ.reward(1, { at: { x: p.x, y: p.y - 40 }, min: 99, chain: p.first }); G.lastAction = G.time; }
    }, end(G) { G.audio.loop('flame', false); G.cursor = null; } }),
  T({ id: 'ice', name: 'Ice Gun', icon: '🧊', level: 2, cost: 70, type: 'hold', hint: 'Hold to freeze him solid. Brrr.', lines: ['Brrr-eakfast.', 'I am a popsicle with feelings.', 'Cool. Literally. Stop. Please.'],
    effect(G, p) {
      if (p.first) G.audio.loop('wind', true);
      const from = { x: p.x - 130, y: p.y + 70 }, dir = K.dir(from, p); G.cursor = { emoji: '🧊', size: 40, rot: 0 };
      for (let i = 0; i < 2; i++) Fx.ice(from.x + dir.x * 10, from.y + dir.y * 10, dir.x * 8 + K.R(-1, 1), dir.y * 8 + K.R(-1, 1));
      let hot = 0; for (const n of G.plush.nodes) if (inCone(n, from, p, 75)) hot++;
      if (hot) { const s = G.plush.status, was = s.frost; s.frost = Math.min(1, s.frost + p.dt * 0.45); if (was < 1 && s.frost >= 1) { stat('frozen'); G.econ.checkAch(); Fx.text(p.x, p.y - 50, 'FROZEN!', { color: '#bfeaff', size: 24 }); G.audio.play('clink'); } if (s.frost > 0.4) G.react.setMood('frozen', 1.5); G.lastAction = G.time; }
    }, end(G) { G.audio.loop('wind', false); G.cursor = null; } }),
  T({ id: 'lightning', name: 'Lightning Zap', icon: '⚡', level: 2, cost: 80, hint: 'Tap to zap. Frizz, sparks, static.', lines: ['BZZZ-ing! My hair! I have no hair!', 'Static! Everything is static!', 'Somebody sneezed in my wiring.'], mood: 'dizzy',
    effect(G, p) {
      const top = K.top(), pts = [{ x: p.x + K.R(-30, 30), y: top }]; const n = 9; for (let i = 1; i < n; i++) pts.push({ x: p.x + (i / n) * 0 + K.R(-40, 40) * (1 - i / n), y: top + (p.y - top) * i / n }); pts.push({ x: p.x, y: p.y });
      G.audio.play('zap'); Fx.flash('#fff', 0.7); Fx.shake(14); Fx.spark(p.x, p.y, 24, { col: '#fff7a8' }); Fx.stuff(p.x, p.y, 5, { speed: 5, fromPlush: false });
      Fx.actor({ ttl: 0.35, front: true, draw(c, a) { c.globalAlpha = 1 - a.t / 0.35; c.strokeStyle = '#fff7a8'; c.lineWidth = 8; c.lineJoin = 'round'; c.shadowColor = '#7ad7f0'; c.shadowBlur = 20; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); } });
      K.hit(p.x, p.y, 110, 4, { up: 3, tear: 0.2, tag: 'zap' }); G.plush.status.glow = 1; G.plush.status.heat = Math.min(1, G.plush.status.heat + 0.15);
      Fx.actor({ ttl: 0.9, update(dt) { for (const q of G.plush.nodes) K.vel(q, K.R(-0.6, 0.6), K.R(-0.6, 0.2)); if (Math.random() < 0.5) Fx.spark(G.plush.center().x + K.R(-50, 50), G.plush.center().y + K.R(-60, 40), 1, { col: '#fff7a8' }); } });
    } }),
  T({ id: 'tornado', name: 'Tornado', icon: '🌪️', level: 3, cost: 120, hint: 'Tap to spawn a swirling twister for 4 seconds.', lines: ['We are not in the living room anymore.', 'Spin, spin, spin. Existential spin.', 'Is this what a sock feels like?'],
    effect(G, p) { G.audio.loop('wind', true); K.field({ x: p.x, y: -4, r: 230, ttl: 4.2, front: true,
      node(n, dx, dy, d, dt, a) { const k = 1 - d / a.r; K.vel(n, (-dy / (d || 1)) * 0.55 * k - dx * 0.002, (dx / (d || 1)) * 0.35 * k - 0.62 * k); },
      props(b, dx, dy, d, dt, a) { Matter.Body.setVelocity(b, { x: b.velocity.x + -dy / (d || 1) * 0.5, y: b.velocity.y - 0.35 * (1 - d / a.r) }); },
      move(a, dt) { a.x += Math.sin(a.t * 1.3) * 40 * dt; if (Math.random() < 0.5) Fx.add({ type: 'dust', x: a.x + K.R(-60, 60), y: -K.R(0, 260), vx: K.R(-3, 3), vy: -1, life: 0.6, size: 4, col: '#fff', alpha: 0.5, drag: 1 }); },
      draw(c, a) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; for (let i = 0; i < 12; i++) { const y = -i * 26, w = 20 + i * 9, off = Math.sin(a.t * 9 + i * 0.9) * 12; c.beginPath(); c.ellipse(a.x + off, y, w, 8, 0, 0, 7); c.stroke(); } },
    }).onEnd = () => G.audio.loop('wind', false); } }),
  T({ id: 'leaf', name: 'Leaf Blower', icon: '🍃', level: 1, cost: 0, type: 'hold', hint: 'Hold: a stream of wind aimed at your finger.', lines: ['Whoosh! My ears have turned inside out.', 'Leaf blowers: the true enemy of dignity.', 'I am the leaf now.'],
    effect(G, p) { if (p.first) G.audio.loop('wind', true); const side = p.x > K.C().x ? -1 : 1, from = { x: p.x + side * -1 * 0 + (side < 0 ? 160 : -160), y: p.y + 20 }, dir = K.dir(from, p); G.cursor = { emoji: '🍃', size: 36, rot: 0 };
      for (let i = 0; i < 2; i++) Fx.glyph(from.x + dir.x * 30, from.y + dir.y * 30, '🍂', 1, { vx: dir.x * 9, vy: dir.y * 9 - 0.4, g: 0.02, life: 0.7, size: 16 });
      for (const n of G.plush.nodes) { const d = Math.hypot(n.position.x - p.x, n.position.y - p.y); if (d < 130) K.vel(n, dir.x * 0.75 * (1 - d / 170), dir.y * 0.75 * (1 - d / 170) - 0.05); } G.lastAction = G.time; },
    end(G) { G.audio.loop('wind', false); G.cursor = null; } }),
  T({ id: 'rain', name: 'Personal Raincloud', icon: '☁️', level: 2, cost: 60, hint: 'A grumpy cloud follows him for 7 seconds. Soggy!', lines: ['Of course it is raining. It is always raining on me.', 'Cotton is very absorbent. Unfortunately.', 'Glug. Splish. Sigh.'], mood: 'sad',
    effect(G) { G.audio.loop('rain', true); Fx.actor({ ttl: 7, front: true, update(dt, a) { const c = G.plush.center(); a.x = c.x; a.y = c.y - 230; for (let i = 0; i < 3; i++) Fx.add({ type: 'spark', x: a.x + K.R(-60, 60), y: a.y + 20, vx: 0, vy: 9, life: 0.35, size: 2, col: '#7ad7f0', g: 0.2 }); const s = G.plush.status; s.wet = Math.min(1, s.wet + dt * 0.3); if (a.t > 0.5 && a.t < 0.55) K.mood('sad', 6); G.lastAction = G.time - 1; },
      draw(c, a) { if (a.x === undefined) return; c.font = '120px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('☁️', a.x + Math.sin(a.t * 3) * 6, a.y); c.font = '34px sans-serif'; c.fillText('😠', a.x, a.y + 6); }, onEnd() { G.audio.loop('rain', false); } }); } }),
];
