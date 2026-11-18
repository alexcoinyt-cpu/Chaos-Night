// Rooms: background art, physics flavour, static props. Add a room = add an object here.
import { G } from './game.js';
import { P } from './physics.js';
const { Bodies, Body } = Matter;
const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
function floorBand(c, W, H, fy, top, bot, line) { if (fy > H) return; c.fillStyle = grad(c, 0, fy, 0, H, [[0, top], [1, bot]]); c.fillRect(0, fy, W, H - fy); c.fillStyle = line; c.fillRect(0, fy, W, 3); }
const rect = (c, x, y, w, h, col, r = 0) => { c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fill(); };
const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
function stat(x, y, w, h, o = {}) { const b = Bodies.rectangle(x, y, w, h, Object.assign({ isStatic: true, friction: 0.6, restitution: 0.2, label: 'deco' }, o)); b.color = o.color || '#6b4a3a'; return b; }

export const ROOMS = {
  living: { id: 'living', name: 'Cozy Living Room', icon: '🛋️', price: 0, phys: { g: 1, floorFriction: 0.9, bounce: 0.1, air: 1 },
    drawBg(c, W, H, fy, t) { c.fillStyle = grad(c, 0, 0, 0, fy, [[0, '#f7d9a8'], [1, '#e8b985']]); c.fillRect(0, 0, W, Math.max(fy, 0)); c.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 0; x < W; x += 46) c.fillRect(x, 0, 22, Math.max(0, fy)); const s = G.cam.s;
      rect(c, W * 0.58, fy - 330 * s, 140 * s, 150 * s, '#8fd3f4', 8); c.strokeStyle = '#7a4a2a'; c.lineWidth = 6 * s; c.strokeRect(W * 0.58, fy - 330 * s, 140 * s, 150 * s); c.beginPath(); c.moveTo(W * 0.58 + 70 * s, fy - 330 * s); c.lineTo(W * 0.58 + 70 * s, fy - 180 * s); c.stroke(); circle(c, W * 0.58 + 40 * s, fy - 290 * s, 18 * s, '#fff8'); 
      rect(c, W * 0.04, fy - 150 * s, 150 * s, 110 * s, '#b0586a', 20 * s); rect(c, W * 0.02, fy - 110 * s, 40 * s, 80 * s, '#9a4458', 14 * s); rect(c, W * 0.04 + 130 * s, fy - 110 * s, 30 * s, 80 * s, '#9a4458', 14 * s);
      rect(c, W * 0.88, fy - 250 * s, 6 * s, 220 * s, '#6b4a3a'); circle(c, W * 0.88 + 3 * s, fy - 262 * s, 28 * s, '#ffe9a8'); floorBand(c, W, H, fy, '#b97a48', '#8a5530', '#6b4020'); c.strokeStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < W; x += 60 * s) { c.beginPath(); c.moveTo(x, fy); c.lineTo(x - 20 * s, H); c.stroke(); } },
    build() { return [stat(P.W / 2 - 100, -22, 140, 44, { color: '#8a5530' })]; } },
  junkyard: { id: 'junkyard', name: 'Junkyard of Dreams', icon: '🛞', price: 250, phys: { g: 1.05, floorFriction: 0.6, bounce: 0.05, air: 1 },
    drawBg(c, W, H, fy, t) { const s = G.cam.s; c.fillStyle = grad(c, 0, 0, 0, fy, [[0, '#ffb26b'], [1, '#e7d3a2']]); c.fillRect(0, 0, W, Math.max(fy, 0)); circle(c, W * 0.75, fy - 260 * s, 50 * s, '#fff3c2');
      for (let i = 0; i < 6; i++) { const x = (i * 0.2 + 0.03) * W, h = (80 + (i * 53 % 70)) * s; rect(c, x, fy - h, 70 * s, h, ['#8a7a6a', '#6e6a74', '#9a6a52'][i % 3], 6); circle(c, x + 36 * s, fy - h - 4 * s, 26 * s, '#3a3a40'); circle(c, x + 36 * s, fy - h - 4 * s, 10 * s, '#aaa'); }
      c.strokeStyle = '#7a7a82'; c.lineWidth = 2; for (let x = 0; x < W; x += 24 * s) { c.beginPath(); c.moveTo(x, fy - 120 * s); c.lineTo(x + 24 * s, fy - 60 * s); c.moveTo(x + 24 * s, fy - 120 * s); c.lineTo(x, fy - 60 * s); c.stroke(); } floorBand(c, W, H, fy, '#8a7a5a', '#5c4f38', '#3d3424'); },
    build() { const a = stat(-P.W / 2 + 120, -18, 200, 18, { color: '#7a5a3a', angle: 0.3 }), b = stat(P.W / 2 - 90, -30, 150, 18, { color: '#6a4a3a', angle: -0.35 }); return [a, b]; } },
  space: { animated: true, id: 'space', name: 'Space Station Snack Bay', icon: '🛰️', price: 400, phys: { g: 0.16, floorFriction: 0.5, bounce: 0.35, air: 0.35 },
    drawBg(c, W, H, fy, t) { const s = G.cam.s; c.fillStyle = '#0c0b24'; c.fillRect(0, 0, W, H); for (let i = 0; i < 70; i++) { const x = (i * 97.3) % W, y = (i * 53.1 + t * 3 * (1 + i % 3)) % Math.max(10, fy); c.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.14})`; c.fillRect(x, y, 2, 2); }
      circle(c, W * 0.75, fy - 400 * s, 70 * s, '#3b7bd8'); circle(c, W * 0.72, fy - 410 * s, 30 * s, '#5fbf6a'); rect(c, 0, fy - 520 * s, W, 24 * s, '#4a4a66'); rect(c, 0, fy - 20 * s, W, 20 * s, '#4a4a66');
      c.strokeStyle = '#6a6a8a'; c.lineWidth = 4 * s; c.strokeRect(W * 0.1, fy - 480 * s, W * 0.8, 430 * s); floorBand(c, W, H, fy, '#5a5a7a', '#33334a', '#8a8aaa'); },
    build() { return []; } },
  underwater: { animated: true, id: 'underwater', name: 'Splashy Seabed', icon: '🐠', price: 350, phys: { g: 0.22, floorFriction: 0.8, bounce: 0.1, air: 5 },
    drawBg(c, W, H, fy, t) { const s = G.cam.s; c.fillStyle = grad(c, 0, 0, 0, fy, [[0, '#4cc3e8'], [1, '#14527a']]); c.fillRect(0, 0, W, Math.max(fy, 0)); c.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(i * W / 4 + Math.sin(t + i) * 20, 0); c.lineTo(i * W / 4 + 60, 0); c.lineTo(i * W / 4 - 40, fy); c.lineTo(i * W / 4 - 100, fy); c.fill(); }
      c.strokeStyle = '#2fa86a'; c.lineWidth = 8 * s; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const x = (i + 0.4) * W / 8; c.beginPath(); c.moveTo(x, fy); c.bezierCurveTo(x + Math.sin(t * 1.5 + i) * 18 * s, fy - 40 * s, x - Math.sin(t * 1.5 + i) * 18 * s, fy - 80 * s, x + Math.sin(t + i) * 14 * s, fy - (90 + (i % 3) * 25) * s); c.stroke(); }
      floorBand(c, W, H, fy, '#e8d49a', '#b89a5a', '#c9b078'); },
    ambient(dt) { if (Math.random() < dt * 3) G.fx.bubbles((Math.random() - 0.5) * P.W, -10, 1); },
    build() { const r = stat(-P.W / 2 + 80, -30, 120, 60, { color: '#7a7a8a' }); return [r]; } },
  carnival: { animated: true, id: 'carnival', name: 'Carnival of Mild Peril', icon: '🎪', price: 450, phys: { g: 0.95, floorFriction: 0.5, bounce: 0.65, air: 0.9 },
    drawBg(c, W, H, fy, t) { const s = G.cam.s; c.fillStyle = grad(c, 0, 0, 0, fy, [[0, '#7a5be0'], [1, '#ff9ac8']]); c.fillRect(0, 0, W, Math.max(fy, 0));
      for (let i = 0; i < 14; i++) rect(c, i * W / 14, fy - 420 * s, W / 14, 420 * s, i % 2 ? '#fff3' : '#ff4f7b33');
      c.strokeStyle = '#fff'; c.lineWidth = 3 * s; c.beginPath(); c.arc(W * 0.7, fy - 330 * s, 110 * s, 0, 7); c.stroke(); for (let a = 0; a < 6; a++) { const ang = a * 1.047 + t * 0.4; c.beginPath(); c.moveTo(W * 0.7, fy - 330 * s); c.lineTo(W * 0.7 + Math.cos(ang) * 110 * s, fy - 330 * s + Math.sin(ang) * 110 * s); c.stroke(); circle(c, W * 0.7 + Math.cos(ang) * 110 * s, fy - 330 * s + Math.sin(ang) * 110 * s, 12 * s, ['#ffd54a', '#6ee7b7', '#7ad7f0'][a % 3]); }
      for (let i = 0; i < 12; i++) circle(c, (i + 0.5) * W / 12, fy - 440 * s + Math.sin(i) * 10 * s, 5 * s, ['#ffd54a', '#fff', '#ff7eb6'][i % 3]); floorBand(c, W, H, fy, '#ffd36b', '#d99a2b', '#fff'); },
    build() { const body = Bodies.circle(-P.W / 2 + 100, -26, 26, { isStatic: true, restitution: 1.15, label: 'deco' }); body.color = '#ff4f7b'; const body2 = Bodies.circle(P.W / 2 - 100, -26, 26, { isStatic: true, restitution: 1.15, label: 'deco' }); body2.color = '#7ad7f0'; return [body, body2]; } },
  haunted: { animated: true, id: 'haunted', name: 'Haunted-ish Mansion', icon: '👻', price: 500, phys: { g: 1, floorFriction: 0.8, bounce: 0.15, air: 1 },
    drawBg(c, W, H, fy, t) { const s = G.cam.s; c.fillStyle = grad(c, 0, 0, 0, fy, [[0, '#2a1a4a'], [1, '#52337a']]); c.fillRect(0, 0, W, Math.max(fy, 0)); circle(c, W * 0.25, fy - 380 * s, 40 * s, '#fff7c9'); circle(c, W * 0.25 + 12 * s, fy - 390 * s, 36 * s, '#2a1a4a');
      rect(c, W * 0.6, fy - 360 * s, 110 * s, 170 * s, '#3b2860', 50 * s); c.strokeStyle = '#8f6fd0'; c.lineWidth = 4 * s; c.strokeRect(W * 0.6 + 8 * s, fy - 340 * s, 94 * s, 140 * s);
      for (let i = 0; i < 3; i++) { const gx = ((t * 14 + i * 190) % (W + 120)) - 60, gy = fy - (250 + i * 70) * s + Math.sin(t * 2 + i) * 12 * s; c.globalAlpha = .55; c.fillStyle = '#fff'; c.beginPath(); c.arc(gx, gy, 24 * s, Math.PI, 0); c.lineTo(gx + 24 * s, gy + 30 * s); for (let k = 3; k >= -3; k--) c.lineTo(gx + k * 8 * s, gy + (30 + (k % 2 ? 8 : 0)) * s); c.fill(); c.fillStyle = '#222'; circle(c, gx - 8 * s, gy, 3 * s, '#222'); circle(c, gx + 8 * s, gy, 3 * s, '#222'); c.globalAlpha = 1; }
      floorBand(c, W, H, fy, '#4a3a5a', '#2a2036', '#8f6fd0'); c.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < W; x += 80 * s) c.fillRect(x, fy, 40 * s, H - fy); },
    ambient(dt) { this._t = (this._t || 8) - dt; if (this._t < 0) { this._t = 14 + Math.random() * 10; G.react.say('Boo! ...to you too, ghost. Rude.', { mood: 'shock', gap: 0 }); G.audio.play('squeak2'); G.fx.shake(3); } },
    build() { return [stat(-P.W / 2 + 90, -26, 130, 52, { color: '#5a3a2a' })]; } },
};
export const ROOM_LIST = Object.values(ROOMS);
export function setRoom(id) {
  const r = ROOMS[id] || ROOMS.living; (P.roomStatics || []).forEach(b => P.removeStatic(b));
  P.roomStatics = r.build().map(b => P.addStatic(b)); G.room = r; P.applyRoom(r);
}
