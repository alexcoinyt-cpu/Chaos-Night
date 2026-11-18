// The ragdoll. Every body part is a soft lattice of small circle bodies (nodes) joined by constraints.
// Parts are joined to each other by SEAMS, which gather damage and tear. Cuts remove every constraint that
// crosses the cut line, so both halves keep simulating. Triangles of the lattice are textured in render.js.
import { P, CAT } from './physics.js';
import { G } from './game.js';
const { Bodies, Body, Composite, Constraint } = Matter;

export const NODE_R = 9;            // node collision radius == rim margin of each part texture
export const TS = 2;                // texture scale (texture px per unit)
export const DRAW_ORDER = ['legL', 'legR', 'torso', 'armL', 'armR', 'head'];
// "flat" paper-doll layout (cx,cy,w,h) is also used to map skins/images across the whole plush
export const LAYOUT = {
  torso: { w: 100, h: 112, C: 4, R: 5, cx: 0, cy: 0, shape: 'torso', rot: 0, stiff: 0.9, label: 'Torso' },
  head: { w: 112, h: 100, C: 4, R: 4, cx: 0, cy: -98, shape: 'head', rot: 0, stiff: 0.85, label: 'Head' },
  armL: { w: 42, h: 90, C: 2, R: 4, cx: -72, cy: -6, shape: 'limb', pivot: { x: -56, y: -44 }, rot: 0.3, stiff: 0.8, label: 'Left arm' },
  armR: { w: 42, h: 90, C: 2, R: 4, cx: 72, cy: -6, shape: 'limb', pivot: { x: 56, y: -44 }, rot: -0.3, stiff: 0.8, label: 'Right arm' },
  legL: { w: 46, h: 92, C: 2, R: 4, cx: -26, cy: 102, shape: 'limb', pivot: { x: -26, y: 56 }, rot: 1.15, stiff: 0.85, label: 'Left leg' },
  legR: { w: 46, h: 92, C: 2, R: 4, cx: 26, cy: 102, shape: 'limb', pivot: { x: 26, y: 56 }, rot: -1.15, stiff: 0.85, label: 'Right leg' },
};
export const FLAT_BOX = { x: -93, y: -148, w: 186, h: 296 };
const SEAMS = [
  { id: 'neck', a: 'head', ac: [[1, 3], [2, 3]], b: 'torso', bc: [[1, 0], [2, 0]], k: 2, strength: 1.3 },
  { id: 'shoulderL', a: 'armL', ac: [[0, 0], [1, 0]], b: 'torso', bc: [[0, 0], [0, 1]], k: 2, strength: 1.0 },
  { id: 'shoulderR', a: 'armR', ac: [[0, 0], [1, 0]], b: 'torso', bc: [[3, 0], [3, 1]], k: 2, strength: 1.0 },
  { id: 'hipL', a: 'legL', ac: [[0, 0], [1, 0]], b: 'torso', bc: [[0, 4], [1, 4]], k: 2, strength: 1.1 },
  { id: 'hipR', a: 'legR', ac: [[0, 0], [1, 0]], b: 'torso', bc: [[2, 4], [3, 4]], k: 2, strength: 1.1 },
];
const SEAM_NAMES = { neck: 'head', shoulderL: 'left arm', shoulderR: 'right arm', hipL: 'left leg', hipR: 'right leg' };
export const seamPart = { neck: 'head', shoulderL: 'armL', shoulderR: 'armR', hipL: 'legL', hipR: 'legR' };

function segDist(a, b, c, d) { // distance between segments ab and cd
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return 0;
  const pd = (p, s, e) => { const dx = e.x - s.x, dy = e.y - s.y, l = dx * dx + dy * dy || 1; let t = ((p.x - s.x) * dx + (p.y - s.y) * dy) / l; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - (s.x + dx * t), p.y - (s.y + dy * t)); };
  return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
}

export class Plush {
  constructor() {
    this.nodes = []; this.cons = []; this.parts = {}; this.seams = []; this.restLocal = [];
    this.status = { heat: 0, frost: 0, wet: 0, glow: 0, pie: 0, hat: 0, sleepy: 0 };
    this.eyes = { L: true, R: true }; this.stuffing = 1; this.scale = 1; this.air = 1;
    this.stitching = null; this.grab = null; this.assist = 1; this.lookAt = { x: 0, y: 0 }; this.earSpring = { a: 0, v: 0 };
    this.pieceCount = 1; this.lastCutAt = -9; this.airMul = 1; this.stickers = [];
  }
  build(x, y) {
    for (const id of Object.keys(LAYOUT)) this._part(id, LAYOUT[id], x, y);
    for (const s of SEAMS) this._seam(s);
    const bb = this.bounds(), dy = -(bb.y1 + NODE_R + 14);       // start just above the floor for a tiny plop
    for (const n of this.nodes) Body.setPosition(n, { x: n.position.x, y: n.position.y + dy });
    this.cx0 = x; this.cy0 = y + dy;
    this.restLocal = this.nodes.map(n => ({ x: n.position.x - x, y: n.position.y - this.cy0 }));
    this.snapshotRest = this.nodes.map(n => ({ x: n.position.x, y: n.position.y }));
    this.setAir(1);
  }
  _part(id, d, ox, oy) {
    const m = NODE_R, spx = (d.w - 2 * m) / (d.C - 1), spy = (d.h - 2 * m) / (d.R - 1);
    let cx = d.cx, cy = d.cy;
    if (d.pivot) { const c = Math.cos(d.rot), s = Math.sin(d.rot), dx = d.cx - d.pivot.x, dy = d.cy - d.pivot.y; cx = d.pivot.x + dx * c - dy * s; cy = d.pivot.y + dx * s + dy * c; }
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const part = { id, def: d, C: d.C, R: d.R, m, spx, spy, grid: [], nodes: [], cons: [], tris: [], W: d.w * TS, H: d.h * TS };
    this.parts[id] = part;
    for (let i = 0; i < d.C; i++) { part.grid[i] = []; for (let j = 0; j < d.R; j++) {
      const lx = -d.w / 2 + m + i * spx, ly = -d.h / 2 + m + j * spy;
      const px = ox + cx + lx * c - ly * s, py = oy + cy + lx * s + ly * c;
      const b = Bodies.circle(px, py, m, { restitution: 0.15, friction: 0.7, frictionStatic: 0.4, frictionAir: 0.02, density: 0.0012, slop: 0.08,
        collisionFilter: { group: -1, category: CAT.PLUSH, mask: CAT.WORLD | CAT.PROP } });
      b.plushNode = { part: id, i, j, idx: this.nodes.length }; part.grid[i][j] = this.nodes.length; part.nodes.push(this.nodes.length); this.nodes.push(b); Composite.add(P.world, b);
    } }
    const st = d.stiff, N = (i, j) => part.grid[i][j];
    const H = [], V = [], D = [], A = []; for (let i = 0; i < d.C; i++) { H[i] = []; V[i] = []; D[i] = []; A[i] = []; }
    for (let i = 0; i < d.C; i++) for (let j = 0; j < d.R; j++) {
      if (i < d.C - 1) H[i][j] = this._con(N(i, j), N(i + 1, j), 'str', st, id);
      if (j < d.R - 1) V[i][j] = this._con(N(i, j), N(i, j + 1), 'str', st, id);
      if (i < d.C - 1 && j < d.R - 1) { D[i][j] = this._con(N(i, j), N(i + 1, j + 1), 'shear', st * 0.7, id); A[i][j] = this._con(N(i + 1, j), N(i, j + 1), 'shear', st * 0.7, id); }
      if (i < d.C - 2) this._con(N(i, j), N(i + 2, j), 'bend', 0.22, id);
      if (j < d.R - 2) this._con(N(i, j), N(i, j + 2), 'bend', 0.22, id);
    }
    for (let i = 0; i < d.C - 1; i++) for (let j = 0; j < d.R - 1; j++) {
      part.tris.push({ n: [N(i, j), N(i + 1, j), N(i + 1, j + 1)], c: [H[i][j], V[i + 1][j], D[i][j]], g: [[i, j], [i + 1, j], [i + 1, j + 1]] });
      part.tris.push({ n: [N(i, j), N(i + 1, j + 1), N(i, j + 1)], c: [D[i][j], H[i][j + 1], V[i][j]], g: [[i, j], [i + 1, j + 1], [i, j + 1]] });
    }
  }
  _con(a, b, kind, stiff, part, extra) {
    const A = this.nodes[a], B = this.nodes[b];
    const len = Math.max(1, Math.hypot(A.position.x - B.position.x, A.position.y - B.position.y));
    const c = Constraint.create({ bodyA: A, bodyB: B, length: len, stiffness: stiff, damping: 0.06, render: { visible: false } });
    const rec = Object.assign({ c, a, b, kind, alive: true, part, k: stiff, len0: len, idx: this.cons.length }, extra);
    this.cons.push(rec); if (this.parts[part]) this.parts[part].cons.push(rec); else if (this._cur) this._cur.push(rec);
    Composite.add(P.world, c); return rec;
  }
  _seam(s) {
    const A = this.parts[s.a], B = this.parts[s.b], recs = [], seen = new Set();
    for (const [ai, aj] of s.ac) {
      const na = A.grid[ai][aj], pa = this.nodes[na].position;
      const cand = s.bc.map(([bi, bj]) => { const nb = B.grid[bi][bj], pb = this.nodes[nb].position; return { nb, d: Math.hypot(pa.x - pb.x, pa.y - pb.y) }; }).sort((x, y) => x.d - y.d).slice(0, s.k);
      for (const c of cand) { const key = na + '-' + c.nb; if (seen.has(key)) continue; seen.add(key); recs.push(this._con(na, c.nb, 'seam', 0.5, null, { seam: s.id })); }
    }
    this.seams.push({ id: s.id, a: s.a, b: s.b, cons: recs, torn: false, damage: 0, strength: s.strength, ratio: 1 });
  }
  seam(id) { return this.seams.find(s => s.id === id); }
  setAir(a) { this.air = a; for (const n of this.nodes) n.frictionAir = 0.02 * a * this.airMul; }
  // ---------- geometry helpers ----------
  pos(i) { return this.nodes[i].position; }
  center() { const t = this.parts.torso; let x = 0, y = 0; for (const i of t.nodes) { x += this.nodes[i].position.x; y += this.nodes[i].position.y; } return { x: x / t.nodes.length, y: y / t.nodes.length }; }
  headPos() { const h = this.parts.head; let x = 0, y = 0; for (const i of h.nodes) { x += this.nodes[i].position.x; y += this.nodes[i].position.y; } return { x: x / h.nodes.length, y: y / h.nodes.length }; }
  bounds() { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const n of this.nodes) { const p = n.position; if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; } return { x0, y0, x1, y1 }; }
  // affine frame of a part in flat units: world = c + a*u + b*v where (u,v) is relative to the part's flat center
  frame(id) {
    const p = this.parts[id], N = this.nodes, g = p.grid, C = p.C, R = p.R; let cx = 0, cy = 0;
    for (const i of p.nodes) { cx += N[i].position.x; cy += N[i].position.y; } cx /= p.nodes.length; cy /= p.nodes.length;
    let ux = 0, uy = 0, vx = 0, vy = 0;
    for (let j = 0; j < R; j++) { ux += N[g[C - 1][j]].position.x - N[g[0][j]].position.x; uy += N[g[C - 1][j]].position.y - N[g[0][j]].position.y; }
    for (let i = 0; i < C; i++) { vx += N[g[i][R - 1]].position.x - N[g[i][0]].position.x; vy += N[g[i][R - 1]].position.y - N[g[i][0]].position.y; }
    const iw = (p.def.w - 2 * p.m) * R, ih = (p.def.h - 2 * p.m) * C;
    return { cx, cy, ax: ux / iw, ay: uy / iw, bx: vx / ih, by: vy / ih };
  }
  // ---------- tearing ----------
  _killCon(rec, quiet) {
    if (!rec.alive) return; rec.alive = false; Composite.remove(P.world, rec.c);
    if (rec.kind !== 'bend' && !quiet && G.fx) { if (Math.random() < 0.5) G.fx.strand(this.nodes[rec.a]); if (Math.random() < 0.5) G.fx.strand(this.nodes[rec.b]); }
  }
  cutSegment(a, b, o = {}) {
    const w = (o.width ?? 8) / 2 + 2; let n = 0; const mid = [];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (const rec of this.cons) {
      if (!rec.alive) continue; const pa = this.nodes[rec.a].position, pb = this.nodes[rec.b].position;
      if (segDist(a, b, pa, pb) < w) {
        this._killCon(rec, false);
        if (rec.kind !== 'bend') {
          n++; mid.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 });
          const A = this.nodes[rec.a], B = this.nodes[rec.b], sa = Math.sign((pa.x - a.x) * nx + (pa.y - a.y) * ny) || 1, f = o.push ?? 1.6;
          Body.setVelocity(A, { x: A.velocity.x + nx * f * sa, y: A.velocity.y + ny * f * sa });
          Body.setVelocity(B, { x: B.velocity.x - nx * f * sa, y: B.velocity.y - ny * f * sa });
        }
      }
    }
    if (n) { this._afterCut(mid, o); }
    return n;
  }
  _afterCut(mid, o) {
    for (const s of this.seams) if (!s.torn && s.cons.every(r => !r.alive)) this._seamTorn(s, true);
    if (G.fx && !o.quiet) { const k = Math.min(mid.length, 4); for (let i = 0; i < k; i++) { const m = mid[(Math.random() * mid.length) | 0]; G.fx.stuff(m.x, m.y, 2, { vx: 0, vy: -1 }); } }
    this.pieceCount = this.pieces().filter(s => s >= 4).length; this.lastCutAt = G.time;
    G.onCut && G.onCut(mid.length, this.pieceCount, o);
  }
  _seamTorn(s, viaCut) {
    if (s.torn) return; s.torn = true;
    s.cons.forEach(r => this._killCon(r, false));
    const n1 = this.nodes[s.cons[0].a].position, n2 = this.nodes[s.cons[0].b].position, x = (n1.x + n2.x) / 2, y = (n1.y + n2.y) / 2;
    if (G.fx) { G.fx.stuff(x, y, 14, { speed: 4 }); G.fx.ring(x, y, { r: 40, color: '#fff7e6', life: 0.35 }); for (let i = 0; i < 6; i++) G.fx.thread(x, y); }
    G.onTear && G.onTear({ seam: s, name: SEAM_NAMES[s.id], x, y, viaCut: !!viaCut, part: seamPart[s.id] });
  }
  tearSeam(id) { const s = this.seam(id); if (s && !s.torn) this._seamTorn(s); }
  damageAt(x, y, amount, r = 110) {
    for (const s of this.seams) {
      if (s.torn) continue; const A = this.nodes[s.cons[0].a].position, B = this.nodes[s.cons[0].b].position;
      const d = Math.hypot((A.x + B.x) / 2 - x, (A.y + B.y) / 2 - y); if (d < r) s.damage += amount * (1 - d / r);
    }
  }
  // loosen everything (e.g. tickle / washing machine): add damage to all seams
  weakenAll(a) { for (const s of this.seams) if (!s.torn) s.damage += a; }
  popEye(side, boost = 1) {
    if (!this.eyes[side]) return false; this.eyes[side] = false;
    const hp = G.faces.eyeWorld(side); if (!hp) return false;
    const pr = P.addProp({ shape: 'circle', r: 6, x: hp.x, y: hp.y, vx: (side === 'L' ? -1 : 1) * (2 + Math.random() * 3) * boost, vy: -(5 + Math.random() * 5) * boost, restitution: 0.7, density: 0.003, ttl: 40, plushEye: true, draw: 'button', tag: 'button', noPlush: true });
    G.fx && G.fx.ring(hp.x, hp.y, { r: 24, color: '#fff', life: 0.25 }); G.audio.play('pop'); G.onEyePop && G.onEyePop(side); return true;
  }
  // ---------- per-frame ----------
  update(dt) {
    const st = this.status, N = this.nodes;
    if (this.stitching) { this._stitchStep(dt); return; }
    for (const s of this.seams) {
      if (s.torn) continue; let mx = 1;
      for (const r of s.cons) { if (!r.alive) continue; const A = N[r.a].position, B = N[r.b].position, ratio = Math.hypot(A.x - B.x, A.y - B.y) / Math.max(r.len0, 26); if (ratio > mx) mx = ratio; }
      s.ratio = mx; s.damage = Math.max(0, s.damage - dt * 0.35);
      if (mx > 1.6) s.damage += (mx - 1.6) * dt * 7;
      if (mx > 3.4 || s.damage >= s.strength) this._seamTorn(s);
    }
    // status decay
    st.heat = Math.max(0, st.heat - dt * 0.12); st.frost = Math.max(0, st.frost - dt * 0.1); st.wet = Math.max(0, st.wet - dt * 0.06);
    st.pie = Math.max(0, st.pie - dt * 0.08); st.glow = Math.max(0, st.glow - dt * 1.2); st.hat = Math.max(0, st.hat - dt); st.sleepy = Math.max(0, st.sleepy - dt);
    this.airMul = 1 + st.frost * 5 + st.wet * 0.6; if (st.frost > 0.01 || this._airDirty) { this.setAir(this.air); this._airDirty = st.frost > 0.01; }
    // ear flutter spring driven by head motion
    const hn = N[this.parts.head.nodes[5]], sp = this.earSpring; const acc = -hn.velocity.x * 0.05;
    sp.v += (acc - sp.a * 14 - sp.v * 3) * dt * 6; sp.a += sp.v * dt * 6; sp.a = Math.max(-1.2, Math.min(1.2, sp.a));
    // eyes look toward last interest point
    const hp = this.headPos(); this.lookAt.x += (G.look.x - hp.x - this.lookAt.x) * 0.1; this.lookAt.y += (G.look.y - hp.y - this.lookAt.y) * 0.1;
    // stuffing level affects floppiness
    const k = 0.55 + 0.45 * this.stuffing; if (Math.abs(k - (this._k || 1)) > 0.02) { this._k = k; for (const r of this.cons) if (r.alive && r.kind !== 'seam') r.c.stiffness = r.k * k; }
    this._posture(dt);
  }
  _posture(dt) { // gentle self-righting so he mostly sits up with dignity; fades while he's being tossed about
    const quiet = G.time - G.lastAction > 1.4 && !this.grab && this.assist > 0; if (!quiet) return;
    const t = this.parts.torso, f = this.frame('torso'), ang = Math.atan2(f.ay, f.ax);
    const grounded = t.nodes.some(i => this.nodes[i].position.y > -30); if (!grounded) return;
    const K = 0.00004 * this.assist * (this.stitching ? 0 : 1);
    for (const pid of ['torso', 'head']) {
      if (pid === 'head' && this.seam('neck').torn) continue;
      for (const i of this.parts[pid].nodes) {
        const n = this.nodes[i], u = n.position.x - f.cx, v = n.position.y - f.cy;
        Body.applyForce(n, n.position, { x: ang * v * K * n.mass * 60, y: -ang * u * K * n.mass * 60 });
      }
    }
  }
  // ---------- components / info ----------
  _uf() { const p = this.nodes.map((_, i) => i); const f = i => (p[i] === i ? i : (p[i] = f(p[i]))); for (const r of this.cons) if (r.alive && r.kind !== 'bend') p[f(r.a)] = f(r.b); return f; }
  pieces() { const f = this._uf(), cnt = {}; for (let i = 0; i < this.nodes.length; i++) { const k = f(i); cnt[k] = (cnt[k] || 0) + 1; } return Object.values(cnt); }
  detachedParts() { return this.seams.filter(s => s.torn).map(s => seamPart[s.id]); }
  damaged() { return this.cons.some(r => !r.alive) || !this.eyes.L || !this.eyes.R || this.stuffing < 0.97 || Math.abs(this.scale - 1) > 0.01; }
  // ---------- scale (shrink / grow) ----------
  setScale(s) {
    const k = s / this.scale; if (Math.abs(k - 1) < 1e-4) return; const c = this.center(); this.scale = s;
    for (const n of this.nodes) { Body.scale(n, k, k, n.position); Body.setPosition(n, { x: c.x + (n.position.x - c.x) * k, y: c.y + (n.position.y - c.y) * k }); }
    for (const r of this.cons) { r.c.length *= k; r.len0 *= k; }
  }
  // ---------- snapshots (replay / rewind) ----------
  snap() { const n = this.nodes.length, a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = this.nodes[i].position.x; a[i * 2 + 1] = this.nodes[i].position.y; }
    const al = new Uint8Array(this.cons.length); for (let i = 0; i < al.length; i++) al[i] = this.cons[i].alive ? 1 : 0;
    return { p: a, al, eL: this.eyes.L, eR: this.eyes.R, heat: this.status.heat, frost: this.status.frost, sc: this.scale }; }
  restoreSnap(s, world = true) {
    for (let i = 0; i < this.nodes.length; i++) Body.setPosition(this.nodes[i], { x: s.p[i * 2], y: s.p[i * 2 + 1] }, true);
    for (let i = 0; i < this.cons.length; i++) { const r = this.cons[i], want = !!s.al[i]; if (want !== r.alive) { r.alive = want; if (world) { if (want) Composite.add(P.world, r.c); else Composite.remove(P.world, r.c); } } }
    this.eyes.L = s.eL; this.eyes.R = s.eR; this.status.heat = s.heat; this.status.frost = s.frost;
  }
  // ---------- stitch him back ----------
  stitchBack() {
    if (this.stitching) return;
    this.setScale(1); G.fx && G.fx.clearStrands(); P.props.filter(p => p.plushEye).forEach(p => P.removeProp(p));
    const c = this.center(); let minY = 0, maxY = -1e9; for (const r of this.restLocal) { if (r.y > maxY) maxY = r.y; }
    const tx = Math.max(-P.W / 2 + 130, Math.min(P.W / 2 - 130, c.x)), ty = -(maxY + NODE_R) - 6;
    const from = this.nodes.map(n => ({ x: n.position.x, y: n.position.y }));
    const to = this.restLocal.map(r => ({ x: tx + r.x, y: ty + r.y }));
    for (const r of this.cons) if (r.alive) Composite.remove(P.world, r.c);
    for (const n of this.nodes) n.collisionFilter.mask = 0;
    this.stitching = { t: 0, dur: 1.5, from, to, revealed: false }; G.audio.play('chime'); G.audio.play('whoosh', { vol: 0.5 });
    G.fx && G.fx.text(c.x, c.y - 120, '🧵 Stitching!', { color: '#ffd54a', size: 22 });
  }
  _stitchStep(dt) {
    const s = this.stitching; s.t += dt; const u = Math.min(1, s.t / s.dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, lift = Math.sin(Math.PI * u) * 50;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i], f = s.from[i], t = s.to[i];
      Body.setPosition(n, { x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e - lift }, true); Body.setVelocity(n, { x: 0, y: 0 }); Body.setAngularVelocity(n, 0);
    }
    if (!s.revealed && u > 0.6) { s.revealed = true; for (const r of this.cons) r.alive = true; for (const sm of this.seams) { sm.torn = false; sm.damage = 0; } G.audio.play('ding'); G.fx && G.fx.sparkleBurst(this.center().x, this.center().y, 18); }
    if (u >= 1) {
      for (const n of this.nodes) { n.collisionFilter.mask = CAT.WORLD | CAT.PROP; Body.setVelocity(n, { x: 0, y: 0 }); }
      for (const r of this.cons) { Composite.add(P.world, r.c); r.c.stiffness = r.k; }
      this.eyes.L = this.eyes.R = true; this.stuffing = 1; this.stickers.length = 0; this._k = 1; this.stitching = null; Object.assign(this.status, { heat: 0, frost: 0, wet: 0, pie: 0 }); this.setAir(this.air);
      for (const sm of this.seams) { sm.torn = false; sm.damage = 0; }
      G.onStitched && G.onStitched();
    }
  }
  // ---------- grabbing ----------
  nearestNode(x, y, maxD = 46) { let best = -1, bd = maxD; this.nodes.forEach((n, i) => { const d = Math.hypot(n.position.x - x, n.position.y - y); if (d < bd) { bd = d; best = i; } }); return best; }
  // adds a velocity change to all nodes within r (falloff), returns total strength
  impulse(x, y, r, f, o = {}) {
    let tot = 0; for (const n of this.nodes) {
      const dx = n.position.x - x, dy = n.position.y - y, d = Math.hypot(dx, dy); if (d > r) continue; const fo = 1 - d / r, k = f * fo * fo * 1.4 + f * fo * 0.3;
      let vx, vy; if (o.dir) { vx = o.dir.x * k; vy = o.dir.y * k; } else { const l = d || 1; vx = dx / l * k; vy = dy / l * k; }
      vy -= (o.up || 0) * fo; Body.setVelocity(n, { x: n.velocity.x + vx, y: n.velocity.y + vy }); tot += k;
    }
    return tot;
  }
}
