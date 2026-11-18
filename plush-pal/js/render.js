// Canvas drawing: camera, background, textured-triangle plush mesh, face/outfit overlays, props, effects, bubble.
import { G } from './game.js';
import { P } from './physics.js';
import { S } from './save.js';
import { Tex, shade } from './textures.js';
import { DRAW_ORDER, NODE_R, TS } from './plush.js';
import { SPECIES, OUTFITS, outfitById, drawEars, drawTail } from './species.js';
import { Fx } from './effects.js';
import { drawFace, currentFace } from './faces.js';

export let canvas, ctx, dpr = 1, CW = 0, CH = 0;
export function initRender(cv) { canvas = cv; ctx = cv.getContext('2d'); resize(); addEventListener('resize', resize); }
export function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); CW = innerWidth; CH = innerHeight; canvas.width = CW * dpr; canvas.height = CH * dpr;
  const cam = G.cam; cam.w = CW; cam.h = CH; cam.s = Math.min(CW / 520, CH / 660); const dock = document.getElementById('dock'); const dockH = dock ? dock.offsetHeight : 150;
  cam.floorSY = CH - dockH - 14; cam.worldW = CW / cam.s; if (Math.abs(P.W - cam.worldW) > 2 && P.world) { P.setBounds(cam.worldW); G.room && G.room.build && import('./rooms.js').then(m => m.setRoom(G.room.id)); }
}
const sx = x => CW / 2 + (x - G.cam.x) * G.cam.s;
export const toWorld = (px, py) => ({ x: (px - CW / 2) / G.cam.s + G.cam.x, y: (py - G.cam.floorSY) / G.cam.s + G.cam.y });
export const toScreen = (x, y) => ({ x: sx(x), y: G.cam.floorSY + (y - G.cam.y) * G.cam.s });

export function updateCamera(dt) {
  const cam = G.cam, pl = G.plush; if (!pl) return; const c = pl.center(), vis = cam.floorSY / cam.s;
  let ty = 0; if (c.y < -vis * 0.5) ty = c.y + vis * 0.5; cam.y += (ty - cam.y) * Math.min(1, dt * 4);
  cam.shake = Math.max(0, cam.shake - dt * 30); cam.shx = (Math.random() - 0.5) * cam.shake; cam.shy = (Math.random() - 0.5) * cam.shake;
  G.altitude = Math.max(0, -c.y - 60);
}
// ----- textured triangle -----
function uvOf(p, i, j) { return [i === 0 ? 0 : i === p.C - 1 ? p.W : (p.m + i * p.spx) * TS, j === 0 ? 0 : j === p.R - 1 ? p.H : (p.m + j * p.spy) * TS]; }
function prep(p, t) {
  const a = uvOf(p, ...t.g[0]), b = uvOf(p, ...t.g[1]), c = uvOf(p, ...t.g[2]);
  t.vi = [t.g[0][0] * p.R + t.g[0][1], t.g[1][0] * p.R + t.g[1][1], t.g[2][0] * p.R + t.g[2][1]];
  const [u0, v0] = a, [u1, v1] = b, [u2, v2] = c; t.det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  t.vd = [v1 - v2, v2 - v0, v0 - v1]; t.ud = [u2 - u1, u0 - u2, u1 - u0]; t.e = [u1 * v2 - u2 * v1, u2 * v0 - u0 * v2, u0 * v1 - u1 * v0]; t.ok = true;
}
function drawMesh(c, pl, p, rv, img, alpha, cover) {
  if (alpha < 1) c.globalAlpha = alpha;
  for (const t of p.tris) {
    if (!t.c[0].alive || !t.c[1].alive || !t.c[2].alive) continue; if (!t.ok) prep(p, t);
    const [i0, i1, i2] = t.vi, x0 = rv[i0 * 2], y0 = rv[i0 * 2 + 1], x1 = rv[i1 * 2], y1 = rv[i1 * 2 + 1], x2 = rv[i2 * 2], y2 = rv[i2 * 2 + 1];
    if (cover) { cover[t.n[0]] = cover[t.n[1]] = cover[t.n[2]] = 1; }
    const mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3, e = 0.8; let ex, ey, l;
    c.save(); c.beginPath();
    ex = x0 - mx; ey = y0 - my; l = Math.hypot(ex, ey) || 1; c.moveTo(x0 + ex / l * e, y0 + ey / l * e);
    ex = x1 - mx; ey = y1 - my; l = Math.hypot(ex, ey) || 1; c.lineTo(x1 + ex / l * e, y1 + ey / l * e);
    ex = x2 - mx; ey = y2 - my; l = Math.hypot(ex, ey) || 1; c.lineTo(x2 + ex / l * e, y2 + ey / l * e);
    c.closePath(); c.clip();
    const id = 1 / t.det, vd = t.vd, ud = t.ud, E = t.e;
    c.transform((x0 * vd[0] + x1 * vd[1] + x2 * vd[2]) * id, (y0 * vd[0] + y1 * vd[1] + y2 * vd[2]) * id, (x0 * ud[0] + x1 * ud[1] + x2 * ud[2]) * id, (y0 * ud[0] + y1 * ud[1] + y2 * ud[2]) * id, (x0 * E[0] + x1 * E[1] + x2 * E[2]) * id, (y0 * E[0] + y1 * E[1] + y2 * E[2]) * id);
    c.drawImage(img, 0, 0); c.restore();
  }
  if (alpha < 1) c.globalAlpha = 1;
}
function vertsOf(pl, p) {
  const N = pl.nodes, g = p.grid, C = p.C, R = p.R, m = p.m, rv = p._rv || (p._rv = new Float32Array(C * R * 2));
  for (let i = 0; i < C; i++) for (let j = 0; j < R; j++) {
    const pos = N[g[i][j]].position; let x = pos.x, y = pos.y; const ox = i === 0 ? -m : i === C - 1 ? m : 0, oy = j === 0 ? -m : j === R - 1 ? m : 0;
    if (ox || oy) {
      const a = N[g[Math.min(i + 1, C - 1)][j]].position, b = N[g[Math.max(i - 1, 0)][j]].position; let ex = a.x - b.x, ey = a.y - b.y, l = Math.hypot(ex, ey) || 1; ex /= l; ey /= l;
      const a2 = N[g[i][Math.min(j + 1, R - 1)]].position, b2 = N[g[i][Math.max(j - 1, 0)]].position; let fx = a2.x - b2.x, fy = a2.y - b2.y; l = Math.hypot(fx, fy) || 1; fx /= l; fy /= l;
      x += ex * ox + fx * oy; y += ey * ox + fy * oy;
    }
    rv[(i * R + j) * 2] = x; rv[(i * R + j) * 2 + 1] = y;
  }
  return rv;
}
const cover = [];
function drawPart(c, pl, id) {
  const p = pl.parts[id], tx = Tex.parts[id]; if (!tx) return; const rv = vertsOf(pl, p); cover.length = 0;
  drawMesh(c, pl, p, rv, tx.base, 1, cover);
  const st = pl.status; if (st.heat > 0.02) drawMesh(c, pl, p, rv, tx.toast, Math.min(1, st.heat * 1.2)); if (st.frost > 0.02) drawMesh(c, pl, p, rv, tx.frost, Math.min(1, st.frost * 1.3));
  // scraps: nodes not covered by any triangle
  const sp = SPECIES[S.equip.species];
  for (const k of p.nodes) if (!cover[k]) { const q = pl.nodes[k].position; c.fillStyle = sp.main; c.strokeStyle = shade.darken(sp.main, 0.4); c.lineWidth = 1.5; c.beginPath(); c.arc(q.x, q.y, NODE_R * 0.95, 0, 7); c.fill(); c.stroke(); c.setLineDash([2, 2]); c.strokeStyle = '#fff8'; c.beginPath(); c.arc(q.x, q.y, NODE_R * 0.6, 0, 7); c.stroke(); c.setLineDash([]); }
  // torn (cut) edges: cotton fringe
  for (const r of p.cons) if (!r.alive && r.kind === 'str') {
    const A = pl.nodes[r.a].position, B = pl.nodes[r.b].position, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, k = Math.min(0.35, 7 / d);
    c.fillStyle = '#f3e9d4'; c.strokeStyle = '#d8c9a8'; c.lineWidth = 1; for (const [P0, sg] of [[A, 1], [B, -1]]) { c.beginPath(); c.arc(P0.x + sg * dx * k * 0.5, P0.y + sg * dy * k * 0.5, 3.6, 0, 7); c.fill(); c.stroke(); }
  }
}
function drawSeams(c, pl) {
  const N = pl.nodes;
  for (const s of pl.seams) for (const r of s.cons) {
    const A = N[r.a].position, B = N[r.b].position;
    if (r.alive) { if (s.ratio < 1.3) continue; const k = Math.min(1, Math.max(0, (s.ratio - 1.3) / 1.0)); c.strokeStyle = `rgb(${244 - k * 20},${236 - k * 150},${216 - k * 150})`; c.lineWidth = 2 - k * 0.6; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.setLineDash([]); }
    else if (s.torn) { c.strokeStyle = '#f4ecd8'; c.lineWidth = 1.5; for (const [P0, Q] of [[A, B], [B, A]]) { const dx = Q.x - P0.x, dy = Q.y - P0.y, d = Math.hypot(dx, dy) || 1; c.beginPath(); c.moveTo(P0.x, P0.y); c.quadraticCurveTo(P0.x + dx / d * 6 + dy / d * 4, P0.y + dy / d * 6 - dx / d * 4, P0.x + dx / d * 11, P0.y + dy / d * 11); c.stroke(); } }
  }
}
function withFrame(c, f, fn) { c.save(); c.transform(f.ax, f.ay, f.bx, f.by, f.cx, f.cy); fn(); c.restore(); }
function drawPlush(c, pl, t) {
  const sp = S.equip.species, hd = outfitById(S.equip.head), bd = outfitById(S.equip.body), tf = pl.frame('torso');
  withFrame(c, tf, () => { drawTail(c, sp, t); if (bd && bd.draw && bd.layer === 'back') bd.draw(c, t); });
  for (const id of DRAW_ORDER) {
    if (id === 'head') { const hf = pl.frame('head'); withFrame(c, hf, () => drawEars(c, sp, pl.earSpring.a)); }
    drawPart(c, pl, id);
    if (id === 'torso' && pl.stickers.length) { c.font = '26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (const st of pl.stickers) { const q = pl.nodes[st.i].position; c.fillText(st.ch || '⭐', q.x, q.y); } }
    if (id === 'armR') { drawSeams(c, pl); if (bd && bd.draw && bd.layer === 'front') withFrame(c, tf, () => bd.draw(c, t)); }
  }
  const hf = pl.frame('head'), R_ = G.react;
  withFrame(c, hf, () => {
    drawFace(c, currentFace(), { mood: R_.mood, image: G.faceImage, eyes: pl.eyes, look: pl.lookAt, pie: pl.status.pie, frost: pl.status.frost }, t);
    if (hd && hd.draw) hd.draw(c, t);
    if (pl.status.hat > 0) { c.save(); c.translate(-18, -26); c.rotate(-0.25); c.scale(0.5, 0.5); OUTFITS.find(o => o.id === 'tophat').draw(c); c.restore(); }
  });
}
// ----- props -----
function drawProps(c) {
  for (const p of P.props) {
    const b = p.body; c.save(); c.translate(b.position.x, b.position.y); c.rotate(b.angle);
    if (p.draw === 'button') { c.fillStyle = '#2f3a52'; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); c.fillStyle = '#4b5a7d'; c.beginPath(); c.arc(0, 0, 4.6, 0, 7); c.fill(); c.fillStyle = '#1b2236'; for (const [x, y] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { c.beginPath(); c.arc(x, y, 0.8, 0, 7); c.fill(); } }
    else if (typeof p.draw === 'function') p.draw(c, p);
    else if (p.emoji) { c.font = `${(p.size || 30) * (p.emojiScale || 1.15)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.emoji, 0, 2); }
    else if (p.color) { c.fillStyle = p.color; c.beginPath(); if (p.shape === 'rect') c.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 6); else c.arc(0, 0, p.r, 0, 7); c.fill(); }
    c.restore();
  }
  for (const b of P.statics) if (b.color) { c.fillStyle = b.color; c.beginPath(); b.vertices.forEach((v, i) => i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.stroke(); }
}
function wrap(c, text, maxW) { const w = text.split(' '), lines = []; let cur = ''; for (const x of w) { const t = cur ? cur + ' ' + x : x; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = x; } else cur = t; } lines.push(cur); return lines; }
function drawBubble(c) {
  const b = G.react.bubble; if (!b || !G.plush) return; const hp = G.plush.headPos(), s = toScreen(hp.x, hp.y - 95), k = Math.min(1, b.t * 8) * Math.min(1, (b.dur - b.t) * 4);
  c.save(); c.globalAlpha = k; c.font = '700 14px "Trebuchet MS",sans-serif'; const lines = wrap(c, b.text, 190), w = Math.min(210, Math.max(...lines.map(l => c.measureText(l).width)) + 22), h = lines.length * 18 + 14;
  const x = Math.max(8, Math.min(CW - w - 8, s.x - w / 2)), y = Math.max(50, s.y - h);
  c.fillStyle = '#fffdf6'; c.strokeStyle = '#2a1f3d'; c.lineWidth = 2.5; c.beginPath(); c.roundRect(x, y, w, h, 12); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(Math.max(x + 14, Math.min(x + w - 14, s.x)) - 7, y + h); c.lineTo(s.x, y + h + 11); c.lineTo(Math.max(x + 14, Math.min(x + w - 14, s.x)) + 7, y + h); c.fillStyle = '#fffdf6'; c.fill(); c.stroke();
  c.fillStyle = '#fffdf6'; c.fillRect(Math.max(x + 14, Math.min(x + w - 14, s.x)) - 6, y + h - 3, 12, 4);
  c.fillStyle = '#2a1f3d'; c.textAlign = 'center'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, x + w / 2, y + 7 + i * 18)); c.restore();
}
let bgCache = null;
function drawBg(c, fy, t) {           // static rooms are cached; animated rooms redraw each frame
  const room = G.room; if (room.animated) { room.drawBg(c, CW, CH, fy, t); return; }
  const key = room.id + CW + 'x' + CH + '@' + Math.round(fy) + '@' + dpr;
  if (!bgCache || bgCache.key !== key) { const cv = (bgCache && bgCache.cv) || document.createElement('canvas'); cv.width = CW * dpr; cv.height = CH * dpr; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); room.drawBg(x, CW, CH, fy, 0); bgCache = { key, cv }; }
  c.drawImage(bgCache.cv, 0, 0, CW, CH);
}
export function drawFrame(t) {
  const c = ctx, cam = G.cam, s = cam.s, fy = cam.floorSY - cam.y * s;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#111'; c.fillRect(0, 0, CW, CH);
  if (G.room) drawBg(c, fy, t);
  const alt = Math.min(0.85, Math.max(0, (-cam.y - 300) / 2600)); if (alt > 0 && G.room.id !== 'space') { c.fillStyle = `rgba(8,6,36,${alt})`; c.fillRect(0, 0, CW, CH); if (alt > 0.3) { c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) c.fillRect((i * 83.7) % CW, (i * 47.3) % CH, 2, 2); } }
  c.setTransform(s * dpr, 0, 0, s * dpr, (CW / 2 - cam.x * s + cam.shx) * dpr, (cam.floorSY - cam.y * s + cam.shy) * dpr);
  if (G.contraptions) G.contraptions.draw(c, t);
  Fx.draw(c, false); drawProps(c);
  if (G.plush) { if (!G.replaying) Fx.drawStrands(c); drawPlush(c, G.plush, t); if (G.replaying) Fx.drawStrands(c); }
  Fx.draw(c, true);
  if (G.drawOverlayWorld) G.drawOverlayWorld(c);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.plush) { const st = G.plush.status; if (st.heat > 0.25) { c.fillStyle = `rgba(255,120,30,${(st.heat - 0.25) * 0.18})`; c.fillRect(0, 0, CW, CH); } if (st.frost > 0.25) { c.fillStyle = `rgba(150,210,255,${(st.frost - 0.25) * 0.2})`; c.fillRect(0, 0, CW, CH); } }
  if (Fx.flashA > 0.01) { c.globalAlpha = Math.min(1, Fx.flashA); c.fillStyle = Fx.flashC; c.fillRect(0, 0, CW, CH); c.globalAlpha = 1; }
  drawBubble(c);
  if (G.altitude > 400) { c.fillStyle = '#fff'; c.font = '800 13px sans-serif'; c.textAlign = 'right'; c.fillText(`ALT ${Math.round(G.altitude / 10)} m`, CW - 12, CH - 190); }
  if (G.replayBanner) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, CH * 0.12, CW, 30); c.fillStyle = '#ff7eb6'; c.font = '900 16px sans-serif'; c.textAlign = 'center'; c.fillText(G.replayBanner, CW / 2, CH * 0.12 + 21); }
  if (G.debug) { c.fillStyle = '#0f0'; c.font = '12px monospace'; c.textAlign = 'left'; c.fillText(`fps ${G.fps | 0} parts ${Fx.parts.length} props ${P.props.length}`, 8, CH - 160); }
}
