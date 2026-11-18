// Face drawing (head flat coords: origin = head centre) + random face maker.
import { G } from './game.js';
import { S, save } from './save.js';
import { SPECIES } from './species.js';
export const FACE_OPTS = {
  eyes: ['button', 'dots', 'googly', 'happy', 'sleepy', 'star', 'sparkle', 'stitch'],
  mouth: ['smile', 'wavy', 'tooth', 'o', 'cat', 'zigzag', 'tongue', 'tiny'],
  brows: ['none', 'arch', 'angry', 'worried', 'unibrow', 'bushy'],
  nose: ['none', 'button', 'triangle', 'heart', 'dot'],
};
export const rnd = a => a[(Math.random() * a.length) | 0];
export function randomFace() { return { eyes: rnd(FACE_OPTS.eyes), mouth: rnd(FACE_OPTS.mouth), brows: rnd(FACE_OPTS.brows), nose: rnd(FACE_OPTS.nose), size: 7 + Math.random() * 4, gap: 16 + Math.random() * 8, y: -6 + Math.random() * 6, cheeks: Math.random() < 0.5 }; }
export function speciesFace(sp) { const f = SPECIES[sp].face; return Object.assign({ size: 9, gap: 20, y: -4, cheeks: sp === 'bunny' || sp === 'cloudlet' }, f); }
export function currentFace() { return S.face || speciesFace(S.equip.species); }
const ink = '#2b1d2e';
const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); };
function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.2, x, y - s * 0.4); c.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); c.fill(); }
function star(c, x, y, r, rot = 0) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
function spiral(c, x, y, r, t) { c.beginPath(); for (let a = 0; a < 12; a += 0.4) { const rr = r * a / 12, aa = a + t * 8; c.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } c.stroke(); }

function eye(c, style, x, y, r, mood, look, t, popped, side) {
  if (popped) { c.strokeStyle = ink; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - r * .6, y - r * .6); c.lineTo(x + r * .6, y + r * .6); c.moveTo(x + r * .6, y - r * .6); c.lineTo(x - r * .6, y + r * .6); c.stroke(); c.setLineDash([2, 2]); circ(c, x, y, r * 1.05); c.stroke(); c.setLineDash([]); return; }
  c.lineCap = 'round';
  if (mood === 'dizzy') { c.strokeStyle = ink; c.lineWidth = 1.8; spiral(c, x, y, r * 1.2, t * (side ? 1 : -1)); return; }
  if (mood === 'ouch') { const sg = side ? -1 : 1; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x - sg * r * .8, y - r * .8); c.lineTo(x + sg * r * .6, y); c.lineTo(x - sg * r * .8, y + r * .8); c.stroke(); return; }
  if (mood === 'grin' || mood === 'happy') { c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(x, y + r * .4, r * .9, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
  if (mood === 'sleepy') { c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - r * .3, r * .9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); return; }
  if (mood === 'love') { c.fillStyle = '#ff4f7b'; heart(c, x, y, r * .95 + Math.sin(t * 8) * 0.6); return; }
  if (mood === 'shock') r *= 1.25;
  switch (style) {
    case 'button': c.fillStyle = '#2f3a52'; circ(c, x, y, r); c.fill(); c.fillStyle = '#4b5a7d'; circ(c, x, y, r * .78); c.fill(); c.fillStyle = '#1b2236'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { circ(c, x + dx * r * .22, y + dy * r * .22, r * .1); c.fill(); } c.strokeStyle = '#e9d9b9'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - r * .22, y - r * .22); c.lineTo(x + r * .22, y + r * .22); c.moveTo(x + r * .22, y - r * .22); c.lineTo(x - r * .22, y + r * .22); c.stroke(); break;
    case 'googly': { c.fillStyle = '#fff'; c.strokeStyle = ink; c.lineWidth = 1.5; circ(c, x, y, r * 1.2); c.fill(); c.stroke(); const l = Math.hypot(look.x, look.y) || 1, k = Math.min(1, l / 80) * r * .45; c.fillStyle = ink; circ(c, x + look.x / l * k, y + look.y / l * k, r * .55); c.fill(); break; }
    case 'happy': c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(x, y + r * .4, r * .9, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); break;
    case 'sleepy': c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke(); c.fillStyle = ink; c.beginPath(); c.arc(x, y, r * .7, 0, Math.PI); c.fill(); break;
    case 'star': c.fillStyle = '#ffd54a'; c.strokeStyle = ink; c.lineWidth = 1.4; star(c, x, y, r * 1.35, Math.sin(t * 3) * 0.1); c.stroke(); break;
    case 'sparkle': c.fillStyle = ink; circ(c, x, y, r * 1.1); c.fill(); c.fillStyle = '#fff'; circ(c, x - r * .35, y - r * .4, r * .38); c.fill(); circ(c, x + r * .35, y + r * .35, r * .18); c.fill(); break;
    case 'stitch': c.strokeStyle = ink; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - r * .8, y - r * .8); c.lineTo(x + r * .8, y + r * .8); c.moveTo(x + r * .8, y - r * .8); c.lineTo(x - r * .8, y + r * .8); c.stroke(); break;
    default: c.fillStyle = ink; c.beginPath(); c.ellipse(x, y, r * .8, r * 1.05, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; circ(c, x - r * .25, y - r * .35, r * .28); c.fill();
  }
}
function mouth(c, style, y, mood, t) {
  c.strokeStyle = ink; c.lineWidth = 2.4; c.lineCap = 'round'; c.fillStyle = ink;
  if (mood === 'shock' || mood === 'dramatic') { c.beginPath(); c.ellipse(0, y + 4, 7, mood === 'shock' ? 10 : 6, 0, 0, Math.PI * 2); c.fill(); return; }
  if (mood === 'grin') { c.beginPath(); c.moveTo(-17, y - 2); c.quadraticCurveTo(0, y + 26, 17, y - 2); c.closePath(); c.fill(); c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, y + 11, 8, 5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.fillRect(-12, y - 1, 24, 4); return; }
  if (mood === 'sad') { c.beginPath(); c.arc(0, y + 12, 11, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); return; }
  if (mood === 'dizzy' || mood === 'toasty' || mood === 'ouch') { c.beginPath(); for (let i = -14; i <= 14; i += 2) c.lineTo(i, y + 3 + Math.sin(i * .6 + t * 14) * 3); c.stroke(); return; }
  if (mood === 'sleepy') { c.beginPath(); c.ellipse(0, y + 4 + Math.sin(t * 2) * 1.5, 4, 4 + Math.sin(t * 2) * 1.5, 0, 0, Math.PI * 2); c.fill(); return; }
  if (mood === 'deadpan') { c.beginPath(); c.moveTo(-9, y + 4); c.lineTo(9, y + 4); c.stroke(); return; }
  if (mood === 'love') { c.beginPath(); c.arc(0, y - 3, 10, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); return; }
  switch (style) {
    case 'wavy': c.beginPath(); for (let i = -13; i <= 13; i += 2) c.lineTo(i, y + 3 + Math.sin(i * .5) * 3); c.stroke(); break;
    case 'tooth': c.beginPath(); c.arc(0, y - 3, 11, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); c.fillStyle = '#fff'; c.strokeStyle = ink; c.lineWidth = 1.5; c.fillRect(-4, y + 7, 8, 9); c.strokeRect(-4, y + 7, 8, 9); break;
    case 'o': c.beginPath(); c.ellipse(0, y + 5, 5, 6, 0, 0, Math.PI * 2); c.fill(); break;
    case 'cat': c.beginPath(); c.arc(-6, y + 2, 6, 0.1 * Math.PI, 0.95 * Math.PI); c.arc(6, y + 2, 6, 0.05 * Math.PI, 0.9 * Math.PI); c.stroke(); break;
    case 'zigzag': c.beginPath(); for (let i = -14; i <= 14; i += 7) { c.lineTo(i, y + 2); c.lineTo(i + 3.5, y + 8); } c.stroke(); break;
    case 'tongue': c.beginPath(); c.arc(0, y - 3, 12, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(4, y + 12, 5, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke(); break;
    case 'tiny': c.beginPath(); c.arc(0, y, 4, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); break;
    default: c.beginPath(); c.arc(0, y - 4, 12, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
  }
}
function brows(c, style, ex, ey, mood) {
  if (style === 'none' && mood !== 'sad' && mood !== 'ouch' && mood !== 'shock') return;
  c.strokeStyle = ink; c.lineWidth = 3; c.lineCap = 'round';
  const slope = mood === 'sad' ? -1 : mood === 'ouch' ? 1 : style === 'angry' ? 1 : style === 'worried' ? -1 : 0, rise = mood === 'shock' ? -7 : 0;
  for (const sg of [-1, 1]) {
    const x = sg * ex, y = ey - 11 + rise;
    if (style === 'unibrow' && !slope) continue;
    c.beginPath(); if (style === 'bushy') c.lineWidth = 5;
    c.moveTo(x - 8, y + slope * sg * 4 * -1 + (style === 'arch' ? 3 : 0)); c.quadraticCurveTo(x, y - (style === 'arch' || mood === 'shock' ? 6 : 0), x + 8, y + slope * sg * 4 + (style === 'arch' ? 3 : 0)); c.stroke();
  }
  if (style === 'unibrow' && !slope) { c.lineWidth = 5; c.beginPath(); c.moveTo(-ex - 6, ey - 12); c.lineTo(ex + 6, ey - 12); c.stroke(); }
}
function nose(c, style, y) {
  switch (style) {
    case 'button': c.fillStyle = '#3a2a2a'; circ(c, 0, y, 4.5); c.fill(); break;
    case 'triangle': c.fillStyle = '#4a2f2a'; c.beginPath(); c.moveTo(-6, y - 3); c.lineTo(6, y - 3); c.lineTo(0, y + 4); c.closePath(); c.fill(); break;
    case 'heart': c.fillStyle = '#ef5c8a'; heart(c, 0, y, 4.2); break;
    case 'dot': c.fillStyle = '#3a2a2a'; circ(c, 0, y, 2.2); c.fill(); break;
  }
}
// st: { mood, image, eyes:{L,R}, look:{x,y}, pie, frost, heat, wet }
export function drawFace(c, face, st, t) {
  c.save();
  if (!st.image) {
    const ey = face.y, ex = face.gap, r = face.size, my = 18;
    if (face.cheeks || st.mood === 'love' || st.mood === 'grin') { c.fillStyle = '#ff7eb644'; circ(c, -ex - 12, ey + 14, 8); c.fill(); circ(c, ex + 12, ey + 14, 8); c.fill(); }
    nose(c, face.nose, ey + 10);
    mouth(c, face.mouth, my, st.mood, t);
    eye(c, face.eyes, -ex, ey, r, st.mood, st.look, t, !st.eyes.L, 0);
    eye(c, face.eyes, ex, ey, r, st.mood, st.look, t, !st.eyes.R, 1);
    brows(c, face.brows, ex, ey, st.mood);
  }
  if (st.mood === 'sad') { c.fillStyle = '#7ad7f0'; const k = (t * 1.5) % 1; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(sg * face.gap, face.y + 8 + k * 26, 2.5, 4, 0, 0, Math.PI * 2); c.fill(); } }
  if (st.mood === 'toasty') { c.fillStyle = '#7ad7f0'; const k = (t * 1.2) % 1; c.beginPath(); c.ellipse(46, -22 + k * 24, 3, 5, 0, 0, Math.PI * 2); c.fill(); }
  if (st.mood === 'dizzy') { c.fillStyle = '#ffd54a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; star(c, Math.cos(a) * 40, -52 + Math.sin(a) * 7, 6, a); } }
  if (st.mood === 'sleepy') { c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText('z', 38, -30 - (t * 10 % 12)); c.font = 'bold 11px sans-serif'; c.fillText('z', 50, -42 - (t * 10 % 12)); }
  if (st.pie > 0.02) { c.globalAlpha = Math.min(1, st.pie * 2); c.fillStyle = '#fff8ec'; c.strokeStyle = '#e8d5b0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, -20); c.bezierCurveTo(-46, 20, -30, 40, -12 + 0, 36); c.bezierCurveTo(-4, 52, 14, 52, 22, 36); c.bezierCurveTo(40, 42, 50, 10, 42, -20); c.bezierCurveTo(30, -34, -30, -34, -40, -20); c.fill(); c.stroke(); c.fillStyle = '#e83d52'; circ(c, 6, -8, 5); c.fill(); }
  c.restore();
}
export const Faces = {
  current: currentFace,
  _local(side) { const f = currentFace(); return { x: (side === 'L' ? -1 : 1) * f.gap, y: f.y }; },
  eyeLocal(side) { return this._local(side); },
  eyeWorld(side) { if (!G.plush) return null; const l = this._local(side), f = G.plush.frame('head'); return { x: f.cx + f.ax * l.x + f.bx * l.y, y: f.cy + f.ay * l.x + f.by * l.y }; },
  randomize() { S.face = randomFace(); save(); G.rebake && G.rebake(); },
  setPart(k, v) { S.face = Object.assign({}, currentFace(), { [k]: v }); save(); },
  reset() { S.face = null; save(); },
};
