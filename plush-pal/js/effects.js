// Particles (stuffing, dust, confetti...), trailing stuffing strands, floating text, rings, timed actors.
import { G } from './game.js';
const R = (a, b) => a + Math.random() * (b - a);
const cotton = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#e7dcc6'; for (const [px, py, r] of [[16, 17, 9], [10, 14, 7], [21, 13, 7], [14, 22, 7], [22, 21, 6]]) { x.beginPath(); x.arc(px, py + 1, r, 0, 7); x.fill(); } x.fillStyle = '#fffaf0'; for (const [px, py, r] of [[16, 15, 9], [10, 12, 7], [21, 11, 7], [14, 20, 7], [22, 19, 6]]) { x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } return c; })();
const CONF = ['#ff5d8f', '#ffd54a', '#6ee7b7', '#7ad7f0', '#b08cff', '#ff9a3c'];

export const Fx = {
  parts: [], texts: [], rings: [], strands: [], actors: [], flashA: 0, flashC: '#fff', max: 520,
  add(o) {
    if (this.parts.length > this.max) this.parts.splice(0, 40);
    const p = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.99, life: 1, age: 0, size: 6, rot: 0, vr: 0, type: 'dust', col: '#fff', floor: false, grow: 0 }, o); p.max = p.life; this.parts.push(p); return p;
  },
  stuff(x, y, n, o = {}) {
    const sp = o.speed ?? 3.2; if (G.plush && o.fromPlush !== false) G.plush.stuffing = Math.max(0.15, G.plush.stuffing - 0.004 * n);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = R(0.4, 1) * sp; this.add({ type: 'cotton', x: x + R(-6, 6), y: y + R(-6, 6), vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0) - 1, g: 0.07, drag: 0.985, life: R(3, 6), size: R(10, 18), rot: R(0, 6), vr: R(-0.1, 0.1), floor: true }); }
  },
  dust(x, y, n = 6, o = {}) { for (let i = 0; i < n; i++) this.add({ type: 'dust', x: x + R(-12, 12), y, vx: R(-1.6, 1.6) * (o.spread ?? 1), vy: R(-1.2, -0.1), life: R(0.4, 0.8), size: R(6, 12), grow: 14, drag: 0.94, col: o.col || '#e8dcc8' }); },
  smoke(x, y, n = 3, o = {}) { for (let i = 0; i < n; i++) this.add({ type: 'dust', x: x + R(-8, 8), y: y + R(-4, 4), vx: R(-.3, .3) + (o.vx || 0), vy: R(-1.4, -.6), life: R(.8, 1.6), size: R(8, 14), grow: 20, drag: .98, col: o.col || '#6b6470', alpha: .55 }); },
  fire(x, y, vx, vy, n = 1) { for (let i = 0; i < n; i++) this.add({ type: 'fire', x, y, vx: vx + R(-.8, .8), vy: vy + R(-.8, .8), life: R(.3, .6), size: R(8, 16), drag: .98, g: -.03 }); },
  ice(x, y, vx, vy, n = 1) { for (let i = 0; i < n; i++) this.add({ type: 'ice', x, y, vx: vx + R(-.8, .8), vy: vy + R(-.8, .8), life: R(.3, .6), size: R(5, 10), drag: .98 }); },
  spark(x, y, n = 8, o = {}) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), s = R(2, 7); this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R(.25, .6), size: 2, g: .1, col: o.col || '#ffe56a' }); } },
  confetti(x, y, n = 30, o = {}) { for (let i = 0; i < n; i++) { const a = (o.angle ?? -1.57) + R(-(o.spread ?? 1.2), (o.spread ?? 1.2)), s = R(3, o.speed ?? 10); this.add({ type: 'conf', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: .12, drag: .975, life: R(2, 4), size: R(5, 9), rot: R(0, 6), vr: R(-.3, .3), col: CONF[(Math.random() * CONF.length) | 0], floor: true }); } },
  glyph(x, y, ch, n = 1, o = {}) { for (let i = 0; i < n; i++) this.add({ type: 'glyph', ch, x: x + R(-14, 14), y: y + R(-10, 10), vx: R(-.6, .6) + (o.vx || 0), vy: o.vy ?? R(-1.8, -.8), g: o.g ?? -0.01, life: o.life ?? R(1, 1.8), size: o.size ?? R(16, 24), drag: .99 }); },
  hearts(x, y, n = 5) { this.glyph(x, y, '💖', n); },
  sparkleBurst(x, y, n = 10) { this.glyph(x, y, '✨', n, { vy: R(-3, 1), g: .05 }); this.spark(x, y, n); },
  bubbles(x, y, n = 4) { for (let i = 0; i < n; i++) this.add({ type: 'bubble', x: x + R(-20, 20), y: y + R(-10, 10), vx: R(-.3, .3), vy: R(-1.4, -.5), life: R(1, 2.2), size: R(4, 10), drag: .99 }); },
  drops(x, y, n = 6, col = '#7ad7f0') { for (let i = 0; i < n; i++) this.add({ type: 'spark', x: x + R(-10, 10), y, vx: R(-2, 2), vy: R(-4, -1), life: R(.4, .9), size: 3, g: .2, col }); },
  chips(x, y, n = 10) { for (let i = 0; i < n; i++) this.add({ type: 'conf', x, y, vx: R(-6, 6), vy: R(-8, -1), g: .2, life: R(1, 2), size: R(4, 7), rot: R(0, 6), vr: R(-.4, .4), col: ['#b5835a', '#d2a679', '#8a5a36'][(Math.random() * 3) | 0], floor: true }); },
  thread(x, y) { this.add({ type: 'thread', x, y, vx: R(-2, 2), vy: R(-3, -.5), g: .06, life: R(.6, 1.2), size: R(6, 10), rot: R(0, 6), vr: R(-.2, .2) }); },
  text(x, y, str, o = {}) { this.texts.push({ x, y, str, col: o.color || '#fff', size: o.size || 20, age: 0, life: o.life || 1.1, vy: o.vy ?? -0.9 }); },
  ring(x, y, o = {}) { this.rings.push({ x, y, r: 4, R: o.r || 60, col: o.color || '#fff', life: o.life || 0.4, age: 0, w: o.width || 4 }); },
  flash(col = '#fff', a = 0.5) { this.flashC = col; this.flashA = Math.max(this.flashA, a); },
  shake(v) { if (G.save.settings.shake) G.cam.shake = Math.max(G.cam.shake, Math.min(v, 28)); },
  actor(o) { const a = Object.assign({ t: 0, ttl: 1 }, o); this.actors.push(a); return a; },
  strand(node, len = 5) {
    if (this.strands.length > 44) this.strands.shift();
    const pts = []; for (let i = 0; i < len; i++) pts.push({ x: node.position.x, y: node.position.y + i * 3, px: node.position.x, py: node.position.y + i * 3 });
    this.strands.push({ node, pts, seg: R(5, 8) });
  },
  clearStrands() { this.strands.length = 0; },
  clear() { this.parts.length = 0; this.texts.length = 0; this.rings.length = 0; this.actors.length = 0; this.strands.length = 0; },
  update(dt) {
    const k = dt * 60;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.age += dt; if (p.age >= p.life) { this.parts.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, k); p.vy = p.vy * Math.pow(p.drag, k) + p.g * k; p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k; p.size += p.grow * dt;
      if (p.floor && p.y > -3) { p.y = -3; p.vy *= -0.15; p.vx *= 0.7; p.vr *= 0.7; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.age += dt; t.y += t.vy * k; if (t.age > t.life) this.texts.splice(i, 1); }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.age += dt; r.r = r.R * Math.min(1, r.age / r.life); if (r.age > r.life) this.rings.splice(i, 1); }
    for (const s of this.strands) {
      const p0 = s.pts[0]; p0.x = s.node.position.x; p0.y = s.node.position.y;
      for (let i = 1; i < s.pts.length; i++) {
        const p = s.pts[i], vx = (p.x - p.px) * 0.93, vy = (p.y - p.py) * 0.93; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 0.18 * k;
        const q = s.pts[i - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1; if (d > s.seg) { p.x = q.x + dx / d * s.seg; p.y = q.y + dy / d * s.seg; }
        if (p.y > -2) { p.y = -2; }
      }
    }
    for (let i = this.actors.length - 1; i >= 0; i--) { const a = this.actors[i]; a.t += dt; if (a.update) a.update(dt, a); if (a.t >= a.ttl || a.dead) { if (a.onEnd) a.onEnd(a); this.actors.splice(i, 1); } }
    this.flashA = Math.max(0, this.flashA - dt * 2.2);
  },
  drawStrands(c) {
    for (const s of this.strands) for (let i = s.pts.length - 1; i >= 1; i--) { const p = s.pts[i], r = 5.5 - i * 0.6; c.drawImage(cotton, p.x - r * 1.5, p.y - r * 1.5, r * 3, r * 3); }
  },
  draw(c, front) {
    for (const a of this.actors) if (a.draw && !!a.front === !!front) { c.save(); a.draw(c, a); c.restore(); }
    if (front) return;
    for (const p of this.parts) {
      const f = 1 - p.age / p.max; c.save(); c.globalAlpha = Math.min(1, f * 2.2) * (p.alpha ?? 1);
      switch (p.type) {
        case 'cotton': c.translate(p.x, p.y); c.rotate(p.rot); c.drawImage(cotton, -p.size / 2, -p.size / 2, p.size, p.size); break;
        case 'dust': c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); break;
        case 'fire': c.globalCompositeOperation = 'lighter'; c.fillStyle = f > 0.55 ? '#ffd24a' : f > 0.25 ? '#ff7a1f' : '#c0301a'; c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + f * 0.7), 0, 7); c.fill(); break;
        case 'ice': c.fillStyle = f > 0.5 ? '#e8faff' : '#8fd8ff'; c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + f * 0.6), 0, 7); c.fill(); break;
        case 'spark': c.strokeStyle = p.col; c.lineWidth = p.size; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); c.stroke(); break;
        case 'conf': c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.abs(Math.sin(p.rot * 2)) * 0.8 + 0.2); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); break;
        case 'glyph': c.font = `${p.size}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.ch, p.x, p.y); break;
        case 'bubble': c.strokeStyle = '#d6f4ff'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.stroke(); break;
        case 'thread': c.translate(p.x, p.y); c.rotate(p.rot); c.strokeStyle = '#f4ecd8'; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i <= 6; i++) c.lineTo(i * p.size / 6 - p.size / 2, Math.sin(i * 1.6) * 2.5); c.stroke(); break;
      }
      c.restore();
    }
    for (const r of this.rings) { c.globalAlpha = 1 - r.age / r.life; c.strokeStyle = r.col; c.lineWidth = r.w; c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.stroke(); }
    c.globalAlpha = 1;
    for (const t of this.texts) { const f = Math.min(1, (t.life - t.age) * 3), sc = Math.min(1, t.age * 8 + 0.4); c.save(); c.globalAlpha = f; c.translate(t.x, t.y); c.scale(sc, sc); c.font = `900 ${t.size}px "Trebuchet MS",sans-serif`; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#1a1030'; c.lineJoin = 'round'; c.strokeText(t.str, 0, 0); c.fillStyle = t.col; c.fillText(t.str, 0, 0); c.restore(); }
  },
};
