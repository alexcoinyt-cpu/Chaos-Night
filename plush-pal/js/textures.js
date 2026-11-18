// Bakes each part's texture: fabric, pattern, stitching, custom images. Variants: normal / toasty / frosty.
import { LAYOUT, FLAT_BOX, TS } from './plush.js';
import { SPECIES } from './species.js';
import { S } from './save.js';

export const images = new Map();           // imgId -> HTMLImageElement (loaded from local data URLs)
export function loadImage(id, url) { return new Promise(res => { const im = new Image(); im.onload = () => { images.set(id, im); res(im); }; im.onerror = () => res(null); im.src = url; }); }
export const Tex = { parts: {} };

export function silhouette(c, shape, w, h, inset = 1) {
  c.beginPath();
  if (shape === 'head') c.roundRect(inset, inset, w - 2 * inset, h - 2 * inset, [w * 0.46, w * 0.46, w * 0.4, w * 0.4]);
  else if (shape === 'torso') c.roundRect(inset, inset, w - 2 * inset, h - 2 * inset, [w * 0.3, w * 0.3, w * 0.36, w * 0.36]);
  else c.roundRect(inset, inset, w - 2 * inset, h - 2 * inset, w * 0.5);
}
export function partRect(id) { const d = LAYOUT[id]; return { x: d.cx - d.w / 2, y: d.cy - d.h / 2, w: d.w, h: d.h }; }
// which assignment (if any) applies to a part, and the region (flat coords) its transform is relative to
export function assignFor(id) {
  const k = { head: 'face', torso: 'torso', armL: 'arms', armR: 'arms', legL: 'legs', legR: 'legs' }[id];
  const a = S.skin[k];
  if (a && images.get(a.imgId)) return { a, region: partRect(id) };
  const w = S.skin.whole; if (w && images.get(w.imgId)) return { a: w, region: FLAT_BOX };
  return null;
}
// image-in-region math shared with the crop tool. tx = {x,y (centre, 0..1 of region), s (zoom, 1 = cover), r (radians), f (flip)}
export function drawImageInRegion(c, img, tx, region, ox = 0, oy = 0) {
  const cover = Math.max(region.w / img.width, region.h / img.height) * tx.s;
  c.save(); c.translate(region.x - ox + tx.x * region.w, region.y - oy + tx.y * region.h); c.rotate(tx.r || 0); c.scale(tx.f ? -cover : cover, cover);
  c.drawImage(img, -img.width / 2, -img.height / 2); c.restore();
}
function mk(w, h) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h); return cv; }

function bakePart(id, sp) {
  const d = LAYOUT[id], S_ = SPECIES[sp], w = d.w, h = d.h, cv = mk(w * TS, h * TS), c = cv.getContext('2d');
  c.scale(TS, TS);
  c.save(); silhouette(c, d.shape, w, h); c.clip();
  // base fabric with puffy shading
  const g = c.createRadialGradient(w * 0.4, h * 0.3, 4, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, lighten(S_.main, 0.16)); g.addColorStop(0.7, S_.main); g.addColorStop(1, darken(S_.main, 0.18));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  pattern(c, S_, d, w, h);
  if (d.shape === 'torso') { c.fillStyle = S_.belly; c.beginPath(); c.ellipse(w / 2, h * 0.56, w * 0.31, h * 0.34, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = darken(S_.belly, 0.12); c.lineWidth = 1.2; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]); }
  if (d.shape === 'head') { c.fillStyle = S_.belly; c.beginPath(); c.ellipse(w / 2, h * 0.68, w * 0.26, h * 0.2, 0, 0, Math.PI * 2); c.fill(); }
  if (d.shape === 'limb') { c.fillStyle = S_.pad; c.globalAlpha = 0.9; c.beginPath(); c.ellipse(w / 2, h - w * 0.5, w * 0.27, w * 0.24, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; for (const dx of [-0.17, 0, 0.17]) { c.beginPath(); c.arc(w / 2 + dx * w, h - w * 0.82, 2.4, 0, 7); c.fill(); } }
  const as = assignFor(id);
  if (as) { const im = images.get(as.a.imgId); drawImageInRegion(c, im, as.a.tx, as.region, partRect(id).x, partRect(id).y); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, 0, w, h); }
  weave(c, w, h);
  c.restore();
  // outline + stitch line
  silhouette(c, d.shape, w, h); c.strokeStyle = darken(S_.main, 0.4); c.lineWidth = 2; c.stroke();
  c.save(); silhouette(c, d.shape, w - 9, h - 9, 1); c.translate(4.5, 4.5); c.setLineDash([4, 3.5]); c.strokeStyle = as ? 'rgba(255,248,230,0.85)' : 'rgba(255,248,230,0.55)'; c.lineWidth = 1.4; c.stroke(); c.restore();
  const toast = variant(cv, 'rgba(58,28,10,0.74)'), frost = variant(cv, 'rgba(170,222,255,0.58)', true);
  return { base: cv, toast, frost };
}
function variant(src, col, speck) {
  const cv = mk(src.width, src.height), c = cv.getContext('2d'); c.drawImage(src, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
  if (speck) { c.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * cv.width, Math.random() * cv.height, 3, 3); }
  else { c.fillStyle = 'rgba(255,140,40,0.25)'; for (let i = 0; i < 30; i++) c.fillRect(Math.random() * cv.width, Math.random() * cv.height, 6, 6); }
  return cv;
}
function pattern(c, S_, d, w, h) {
  c.save(); c.fillStyle = S_.accent; c.strokeStyle = S_.accent;
  switch (S_.pattern) {
    case 'stripes': c.globalAlpha = 0.45; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(w * 0.22, i * h / 4 + 6); c.lineTo(0, i * h / 4 + 10); c.fill(); c.beginPath(); c.moveTo(w, i * h / 4 + 3); c.lineTo(w * 0.78, i * h / 4 + 9); c.lineTo(w, i * h / 4 + 13); c.fill(); } break;
    case 'spots': c.globalAlpha = 0.4; for (const [x, y, r] of [[.2, .25, 7], [.8, .35, 9], [.3, .75, 8], [.75, .8, 6], [.5, .1, 5]]) { c.beginPath(); c.arc(x * w, y * h, r, 0, 7); c.fill(); } break;
    case 'ribs': c.globalAlpha = 0.28; c.lineWidth = 3; for (const x of [.22, .4, .6, .78]) { c.beginPath(); c.moveTo(w / 2, 0); c.quadraticCurveTo(x * w * 1.4 - w * .2, h / 2, w / 2, h); c.stroke(); } break;
    case 'hstripes': c.fillStyle = S_.accent; c.globalAlpha = 0.9; for (let y = 6; y < h; y += 18) c.fillRect(0, y, w, 7); break;
  }
  c.restore();
}
function weave(c, w, h) { c.save(); c.globalAlpha = 0.07; c.strokeStyle = '#000'; c.lineWidth = 0.5; for (let i = 0; i < w; i += 3) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); } for (let j = 0; j < h; j += 3) { c.beginPath(); c.moveTo(0, j); c.lineTo(w, j); c.stroke(); } c.restore(); }
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function lighten(c, a) { const [r, g, b] = hex(c); return `rgb(${r + (255 - r) * a | 0},${g + (255 - g) * a | 0},${b + (255 - b) * a | 0})`; }
function darken(c, a) { const [r, g, b] = hex(c); return `rgb(${r * (1 - a) | 0},${g * (1 - a) | 0},${b * (1 - a) | 0})`; }
export const shade = { lighten, darken };
export function bakeAll(species) { for (const id of Object.keys(LAYOUT)) Tex.parts[id] = bakePart(id, species); }
export function bakeOne(species, id) { Tex.parts[id] = bakePart(id, species); }
