// Helpers every tool uses. Tools stay tiny: they compose these.
import { G } from './game.js';
import { P } from './physics.js';
import { Fx } from './effects.js';
const R = (a, b) => a + Math.random() * (b - a);
export const K = {
  R, rnd: a => a[(Math.random() * a.length) | 0],
  C: () => G.plush.center(),
  top: () => G.cam.y - (G.cam.floorSY / G.cam.s) - 120,         // world y just above the visible top
  left: () => -G.cam.worldW / 2 - 80, right: () => G.cam.worldW / 2 + 80,
  // radial/directional impulse on the plush + scoring. Returns strength.
  hit(x, y, r, f, o = {}) {
    const s = G.plush.impulse(x, y, r, f, o); if (s <= 0.1) return 0;
    G.impact({ force: s * (o.mul ?? 0.35), x, y, tag: o.tag, cat: o.cat, noLine: o.noLine, gentle: o.gentle });
    if (o.tear) G.plush.damageAt(x, y, o.tear, r + 30); return s;
  },
  say(cat, o) { G.react.sayCat(cat, o); },
  prop(o) { return P.addProp(o); },
  sky(x, o) { return P.addProp(Object.assign({ x, y: K.top(), vy: 6 }, o)); },
  side(dir, y, o) { return P.addProp(Object.assign({ x: dir < 0 ? K.left() : K.right(), y, vx: -dir * -14 }, o)); },
  cut(a, b, o = {}) { const n = G.plush.cutSegment(a, b, o); if (n) { G.audio.play('rip', { vol: 0.4 }); G.impact({ force: 6 + n, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, cat: 'slice', slice: true, noSound: true, tag: o.tag }); } return n; },
  // explosion: radial push, fire, flash, smoke
  blast(x, y, o = {}) {
    const r = o.r ?? 190, f = o.f ?? 16; Fx.ring(x, y, { r: r * 0.8, color: o.color || '#ffd54a', life: 0.35, width: 7 }); Fx.spark(x, y, 20, { col: '#ffb02e' }); Fx.smoke(x, y, 10, { col: '#44404a' });
    if (o.fire !== false) Fx.fire(x, y, 0, 0, 14); Fx.flash('#fff6c8', o.flash ?? 0.35); Fx.shake(o.shake ?? 16); G.audio.play(o.sound || 'boom');
    for (const p of P.props) { const b = p.body, dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy); if (d < r && !b.isStatic && !p.noBlast) { const k = (1 - d / r) * f * 0.012 * Math.max(1, b.mass); Matter.Body.applyForce(b, b.position, { x: dx / (d || 1) * k, y: dy / (d || 1) * k - 0.002 }); } }
    return K.hit(x, y, r, f, { tag: 'boom', cat: 'boom', up: o.up ?? 3, tear: o.tear ?? 0.6, mul: 0.5 });
  },
  // timed force field acting on plush nodes (and optionally props)
  field(o) {
    const a = Fx.actor({ ttl: o.ttl || 3, x: o.x, y: o.y, front: o.front, ...o,
      update(dt) { if (o.move) o.move(a, dt); for (const n of G.plush.nodes) { const dx = n.position.x - a.x, dy = n.position.y - a.y, d = Math.hypot(dx, dy); if (d < (a.r || 150)) o.node(n, dx, dy, d, dt, a); } if (o.props) for (const p of P.props) { const b = p.body, dx = b.position.x - a.x, dy = b.position.y - a.y, d = Math.hypot(dx, dy); if (d < (a.r || 150)) o.props(b, dx, dy, d, dt, a); } if (o.tick) o.tick(dt, a); } });
    return a;
  },
  vel(n, ax, ay) { Matter.Body.setVelocity(n, { x: n.velocity.x + ax, y: n.velocity.y + ay }); },
  // an emoji that flies from A to B, hitting at `at` (0..1) of the way
  strike(o) {
    const from = o.from, to = o.to, dur = o.dur ?? 0.5; let hit = false;
    return Fx.actor({ ttl: dur + (o.linger ?? 0.3), front: true,
      draw(c, a) { const u = Math.min(1, a.t / dur), e = o.ease === 'out' ? 1 - (1 - u) * (1 - u) : u * u, x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(u * Math.PI) * (o.arc || 0), rot = (o.rot0 ?? 0) + ((o.rot1 ?? 0) - (o.rot0 ?? 0)) * e; c.translate(x, y); c.rotate(rot); c.font = `${o.size || 70}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = a.t > dur ? Math.max(0, 1 - (a.t - dur) / (o.linger ?? 0.3)) : 1; c.fillText(o.emoji, 0, 0); },
      update(dt, a) { if (!hit && a.t >= dur * (o.at ?? 1)) { hit = true; o.onHit(to); } } });
  },
  // temporary decorative emoji over the plush
  puff(x, y, ch, n = 4) { Fx.glyph(x, y, ch, n); },
  status(k, v, cap = 1) { const s = G.plush.status; s[k] = Math.min(cap, s[k] + v); },
  dir(a, b) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; },
  mood(m, d) { G.react.setMood(m, d); },
  gentle(x, y, base = 8) { G.react.setMood('love', 2); G.plush.assist = 1; return G.econ.reward(base, { gentle: true, at: { x, y } }); },
};
