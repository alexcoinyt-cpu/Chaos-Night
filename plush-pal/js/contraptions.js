// Placeable devices (also used by Rube Goldberg mode) + named combo detection.
import { G } from './game.js';
import { P } from './physics.js';
import { Fx } from './effects.js';
import { S, save, stat } from './save.js';
const { Bodies, Body } = Matter;
const R = (a, b) => a + Math.random() * (b - a);
const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); };
const near = (n, x, y, r) => Math.hypot(n.position.x - x, n.position.y - y) < r;
const boostPlush = (x, y, vy, vx = 0, r = 420) => { for (const n of G.plush.nodes) if (near(n, x, y, r)) Body.setVelocity(n, { x: n.velocity.x * 0.5 + vx + R(-1, 1), y: vy }); G.plush.assist = 0.3; G.lastAction = G.time; };

export const DEVICES = {
  trampoline: { name: 'Trampoline', icon: '🤸', w: 130, h: 16, mk: d => Bodies.rectangle(d.x, d.y, 130, 16, { isStatic: true, restitution: 0.5, angle: d.a }),
    touch(d, o, ph) { if (ph !== 'start' || d.cd > 0 || !(o.plushNode || (o.prop && o.prop.bounces))) return; d.cd = 0.3; d.anim = 1; const sp = Math.max(17, Math.min(30, Math.abs(o.velocity.y) * 1.05 + 5)); G.audio.play('boing'); Fx.dust(d.x, d.y - 8, 6); if (o.plushNode) { boostPlush(d.x, d.y - 40, -sp, Math.sin(d.a) * 8); Fx.shake(5); G.react.setMood('grin', 1.4); G.econ.reward(8, { at: { x: d.x, y: d.y - 60 } }); Contra.note('trampoline'); G.react.say(G.pick('trampoline'), { gap: 3 }); } Contra.fireLinks(d); },
    fire(d) { d.anim = 1; boostPlush(d.x, d.y - 50, -22, 0, 110); G.audio.play('boing'); },
    draw(c, d) { const k = d.anim * Math.sin(d.anim * 9) * 6; c.fillStyle = '#4a4a66'; c.fillRect(-52, 6, 6, 26); c.fillRect(46, 6, 6, 26); c.fillStyle = '#222'; c.beginPath(); c.roundRect(-65, -8 + k, 130, 16, 8); c.fill(); c.fillStyle = '#ff7eb6'; c.beginPath(); c.roundRect(-62, -8 + k, 124, 9, 5); c.fill(); } },
  ramp: { name: 'Ramp', icon: '📐', w: 170, h: 16, mk: d => Bodies.rectangle(d.x, d.y, 170, 16, { isStatic: true, friction: 0.3, angle: d.a || -0.4 }), draw(c) { c.fillStyle = '#c98a4a'; c.beginPath(); c.roundRect(-85, -8, 170, 16, 5); c.fill(); c.fillStyle = '#8a5a2a'; for (let x = -75; x < 80; x += 26) c.fillRect(x, -8, 3, 16); } },
  slide: { name: 'Water Slide', icon: '🛝', w: 190, h: 14, mk: d => Bodies.rectangle(d.x, d.y, 190, 14, { isStatic: true, friction: 0.005, frictionStatic: 0, angle: d.a || 0.45, restitution: 0 }),
    update(d, dt) { if (Math.random() < dt * 14) { const c = Math.cos(d.a), s = Math.sin(d.a), u = R(-80, 80); Fx.drops(d.x + c * u, d.y + s * u - 10, 1); } for (const n of G.plush.nodes) if (Math.abs(n.position.x - d.x) < 100 && Math.abs(n.position.y - (d.y + Math.tan(d.a) * (n.position.x - d.x))) < 30) { Body.setVelocity(n, { x: n.velocity.x + Math.cos(d.a) * 0.18 * Math.sign(d.a), y: n.velocity.y }); G.plush.status.wet = Math.min(0.6, G.plush.status.wet + dt * 0.3); } },
    draw(c) { c.fillStyle = '#34c3e8'; c.beginPath(); c.roundRect(-95, -8, 190, 16, 8); c.fill(); c.fillStyle = '#b8f0ff'; c.fillRect(-90, -6, 180, 4); c.fillStyle = '#e8445a'; c.fillRect(-95, 4, 6, 40); c.fillRect(89, 4, 6, 40); } },
  fan: { name: 'Big Fan', icon: '🌀', w: 60, h: 60, mk: d => Bodies.rectangle(d.x, d.y, 50, 56, { isStatic: true, angle: d.a }), life: 0,
    update(d, dt) { d.spin = (d.spin || 0) + dt * (d.on ? 20 : 2); if (d.on) { d.life -= dt; if (d.life <= 0 && !d.always) d.on = false; const c = Math.cos(d.a), s = Math.sin(d.a); for (const n of G.plush.nodes) { const dx = n.position.x - d.x, dy = n.position.y - d.y, along = dx * c + dy * s, perp = -dx * s + dy * c; if (along > 20 && along < 300 && Math.abs(perp) < 90) { const k = (1 - along / 300) * 0.55; Body.setVelocity(n, { x: n.velocity.x + c * k, y: n.velocity.y + s * k }); } } if (Math.random() < dt * 20) Fx.add({ type: 'dust', x: d.x + c * 40, y: d.y + s * 40 + R(-30, 30), vx: c * 8, vy: s * 8, life: 0.4, size: 3, col: '#fff', alpha: 0.5, drag: 1 }); } },
    fire(d) { d.on = true; d.life = 5; G.audio.play('whoosh'); }, draw(c, d) { c.fillStyle = '#556'; c.fillRect(-6, 0, 12, 36); c.fillStyle = '#8899aa'; ell(c, 0, 0, 26, 26); c.fill(); c.save(); c.rotate(d.spin || 0); c.fillStyle = '#dde'; for (let i = 0; i < 3; i++) { c.rotate(2.094); ell(c, 0, -12, 6, 13); c.fill(); } c.restore(); c.fillStyle = '#333'; ell(c, 0, 0, 4, 4); c.fill(); } },
  conveyor: { name: 'Conveyor Belt', icon: '➡️', w: 190, h: 20, mk: d => Bodies.rectangle(d.x, d.y, 190, 20, { isStatic: true, friction: 1, angle: d.a }),
    update(d, dt) { d.off = (d.off || 0) + dt * 40 * (d.dir || 1); const dir = d.dir || 1; const test = (b, p) => { const dx = p.x - d.x, dy = p.y - d.y; if (Math.abs(dx) < 100 && dy < -4 && dy > -34) Body.setVelocity(b, { x: b.velocity.x * 0.9 + dir * 2.2 * 0.1 + (Math.abs(b.velocity.x) < 4.5 ? dir * 0.35 : 0), y: b.velocity.y }); }; for (const n of G.plush.nodes) test(n, n.position); for (const p of P.props) test(p.body, p.body.position); },
    fire(d) { d.dir = -(d.dir || 1); }, draw(c, d) { c.fillStyle = '#333'; c.beginPath(); c.roundRect(-95, -10, 190, 20, 10); c.fill(); c.strokeStyle = '#ffd54a'; c.lineWidth = 3; c.setLineDash([8, 10]); c.lineDashOffset = -(d.off || 0); c.beginPath(); c.moveTo(-85, -6); c.lineTo(85, -6); c.stroke(); c.setLineDash([]); c.fillStyle = '#ffd54a'; const dr = d.dir || 1; c.beginPath(); c.moveTo(dr * 14, 0); c.lineTo(-dr * 6, -6); c.lineTo(-dr * 6, 6); c.fill(); } },
  bumper: { name: 'Pinball Bumper', icon: '🔴', w: 56, h: 56, mk: d => Bodies.circle(d.x, d.y, 28, { isStatic: true, restitution: 1.3 }),
    touch(d, o, ph) { if (ph !== 'start' || d.cd > 0) return; if (!(o.plushNode || o.prop)) return; d.cd = 0.2; d.anim = 1; const dx = o.position.x - d.x, dy = o.position.y - d.y, l = Math.hypot(dx, dy) || 1; if (o.plushNode) boostPlush(d.x + dx, d.y + dy, dy / l * 14 - 3, dx / l * 14, 110); else Body.setVelocity(o, { x: dx / l * 14, y: dy / l * 14 }); G.audio.play('bonk', { pitch: 2 }); Fx.sparkleBurst(d.x, d.y, 4); G.econ.reward(6, { at: { x: d.x, y: d.y - 40 } }); Contra.note('bumper'); Contra.fireLinks(d); },
    fire(d) { d.anim = 1; for (const n of G.plush.nodes) if (near(n, d.x, d.y, 130)) { const dx = n.position.x - d.x, dy = n.position.y - d.y, l = Math.hypot(dx, dy) || 1; Body.setVelocity(n, { x: dx / l * 12, y: dy / l * 12 - 4 }); } },
    draw(c, d) { const k = 1 + d.anim * 0.25; c.scale(k, k); c.fillStyle = '#e8445a'; ell(c, 0, 0, 28, 28); c.fill(); c.fillStyle = '#fff'; ell(c, 0, 0, 18, 18); c.fill(); c.fillStyle = '#e8445a'; ell(c, 0, 0, 9, 9); c.fill(); } },
  cannon: { name: 'Plush Cannon', icon: '💥', w: 80, h: 50, mk: d => Bodies.rectangle(d.x, d.y + 24, 56, 30, { isStatic: true }), life: 0,
    touch(d, o, ph) { if (ph !== 'start' || d.cd > 0 || !o.plushNode) return; const mx = d.x + Math.cos(d.a) * 30, my = d.y + Math.sin(d.a) * 30; if (!near(o, mx, my, 90)) return; d.cd = 1.5; d.arm = 0.35; Contra.note('cannon'); },
    fire(d) { d.arm = Math.max(d.arm || 0, 0.05); d.forced = true; },
    update(d, dt) { if (d.arm > 0) { d.arm -= dt; d.anim = 1; if (d.arm <= 0) { const c = Math.cos(d.a), s = Math.sin(d.a); const mx = d.x + c * 40, my = d.y + s * 40; G.audio.play('boom', { vol: 0.7 }); Fx.shake(8); Fx.fire(mx, my, c * 5, s * 5, 10); Fx.smoke(mx, my, 6); let any = false; for (const n of G.plush.nodes) if (near(n, mx, my, 140)) { any = true; Body.setVelocity(n, { x: c * 25 + R(-1, 1), y: s * 25 + R(-1, 1) }); } if (!any) { P.addProp({ shape: 'circle', r: 14, x: mx, y: my, vx: c * 20, vy: s * 20, density: 0.006, emoji: '⚫', ttl: 8, bounces: true }); } G.plush.assist = 0.2; G.lastAction = G.time; Contra.note('cannon'); Contra.fireLinks(d); } } },
    draw(c, d) { c.fillStyle = '#6b4a2a'; ell(c, -14, 20, 16, 16); c.fill(); ell(c, 14, 20, 16, 16); c.fill(); c.save(); c.rotate(-d.a * 0 + 0); c.restore(); c.fillStyle = '#444a5a'; c.beginPath(); c.roundRect(-4, -18, 62, 36, 8); c.fill(); c.fillStyle = '#2b303c'; ell(c, 58, 0, 7, 18); c.fill(); if (d.arm > 0) { c.fillStyle = '#ffd54a'; ell(c, -6, -22, 5, 9); c.fill(); } } },
  dispenser: { name: 'Ball Dropper', icon: '🎳', w: 60, h: 60, mk: d => Bodies.rectangle(d.x, d.y - 20, 60, 30, { isStatic: true, isSensor: true }),
    fire(d) { d.anim = 1; G.audio.play('thud', { vol: 0.5 }); P.addProp({ shape: 'circle', r: 24, x: d.x, y: d.y + 40, vy: 2, density: 0.01, emoji: '🎳', ttl: 12, restitution: 0.3 }); Contra.fireLinks(d); },
    update(d, dt) { if (d.auto) { d.t2 = (d.t2 || 0) - dt; if (d.t2 <= 0) { d.t2 = 6; this.fire(d); } } },
    draw(c, d) { c.fillStyle = '#7a8aa0'; c.beginPath(); c.moveTo(-30, -20); c.lineTo(30, -20); c.lineTo(14, 22); c.lineTo(-14, 22); c.closePath(); c.fill(); c.fillStyle = '#333'; c.font = '24px sans-serif'; c.textAlign = 'center'; c.fillText('🎳', 0, 4 - d.anim * 8); } },
  pad: { name: 'Trigger Pad', icon: '🟢', w: 80, h: 12, mk: d => Bodies.rectangle(d.x, d.y, 80, 12, { isStatic: true, angle: d.a }),
    touch(d, o, ph) { if (ph !== 'start' || d.cd > 0 || !(o.plushNode || o.prop)) return; d.cd = 0.7; d.anim = 1; G.audio.play('clink'); Contra.note('pad'); Contra.fireLinks(d); }, fire(d) { d.anim = 1; Contra.fireLinks(d); },
    draw(c, d) { c.fillStyle = '#333'; c.fillRect(-40, 0, 80, 6); c.fillStyle = d.anim > 0.1 ? '#b8ffb8' : '#3ac860'; c.beginPath(); c.roundRect(-34, -6 + d.anim * 4, 68, 9, 4); c.fill(); } },
  catapult: { name: 'Catapult', icon: '🏹', w: 150, h: 40, mk: d => Bodies.rectangle(d.x, d.y + 10, 90, 20, { isStatic: true, angle: d.a }),
    touch(d, o, ph) { if (ph !== 'start' || d.cd > 0 || !o.plushNode) return; d.cd = 1.8; d.arm = 0.3; Contra.note('catapult'); },
    fire(d) { d.arm = 0.1; },
    update(d, dt) { if (d.arm > 0) { d.arm -= dt; if (d.arm <= 0) { d.flick = 1; G.audio.play('whoosh'); G.audio.play('boing', { vol: 0.6 }); const dir = d.flip ? -1 : 1; boostPlush(d.x + dir * 20, d.y - 40, -29, dir * 13, 130); Fx.dust(d.x, d.y, 8); Fx.shake(7); Contra.fireLinks(d); } } if (d.flick > 0) d.flick -= dt * 3; },
    draw(c, d) { const k = d.arm > 0 ? -0.1 : (d.flick > 0 ? 1.1 * d.flick : -0.4); c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(-20, 28); c.lineTo(0, 0); c.lineTo(20, 28); c.fill(); c.save(); c.translate(0, 2); c.rotate(-0.5 + k * 0.9); c.fillStyle = '#c98a4a'; c.beginPath(); c.roundRect(-72, -5, 144, 10, 4); c.fill(); c.fillStyle = '#6b6b78'; ell(c, 68, -10, 14, 6); c.fill(); c.restore(); } },
  bouncy: { name: 'Bouncy Castle', icon: '🏰', w: 170, h: 100, mk: d => Bodies.rectangle(d.x, d.y, 160, 40, { isStatic: true, restitution: 0.6 }),
    touch(d, o, ph) { if (ph !== 'start' || d.cd > 0 || !o.plushNode) return; d.cd = 0.35; d.anim = 1; boostPlush(d.x, d.y - 40, -Math.max(13, Math.min(22, Math.abs(o.velocity.y) + 6)), R(-3, 3), 140); G.audio.play('boing', { pitch: 0.8 }); Fx.glyph(d.x, d.y - 40, '🎈', 2); G.econ.reward(7, { at: { x: d.x, y: d.y - 70 } }); Contra.note('bouncy'); Contra.fireLinks(d); },
    fire(d) { d.anim = 1; boostPlush(d.x, d.y - 60, -20, 0, 130); },
    draw(c, d) { const k = 1 - d.anim * 0.06; c.scale(1, k); const cols = ['#ff7eb6', '#ffd54a', '#7ad7f0']; c.fillStyle = cols[0]; c.beginPath(); c.roundRect(-80, -20, 160, 40, 14); c.fill(); for (const [x, col] of [[-72, 1], [72, 2]]) { c.fillStyle = cols[col]; c.beginPath(); c.roundRect(x - 12, -60, 24, 70, 12); c.fill(); } c.fillStyle = cols[2]; c.beginPath(); c.moveTo(-60, -60); c.lineTo(0, -92); c.lineTo(60, -60); c.closePath(); c.fill(); c.fillStyle = '#fff8'; c.fillRect(-60, -56, 120, 10); } },
};
export const DEVICE_LIST = Object.keys(DEVICES);

export const COMBOS = [
  { id: 'launchparty', name: 'Launch Party', seq: ['catapult', 'trampoline', 'leaf'], coins: 200 },
  { id: 'boombounce', name: 'Boom Bounce', seq: ['bomb', 'trampoline'], coins: 150 },
  { id: 'toastlaunch', name: 'Toast Launch', seq: ['flame', 'rocket'], coins: 160 },
  { id: 'soggyzap', name: 'Soggy Zap', seq: ['rain', 'lightning'], coins: 160 },
  { id: 'frozenbonk', name: 'Cold Open', seq: ['ice', 'hammer'], coins: 140 },
  { id: 'spinzone', name: 'Spin Doctor', seq: ['washer', 'tornado'], coins: 160 },
  { id: 'dogpile', name: 'Zoomie Pit', seq: ['dog', 'ballpit'], coins: 150 },
  { id: 'cartoon', name: 'Cartoon Classic', seq: ['banana', 'anvil'], coins: 150 },
  { id: 'wholesome', name: 'Wholesome Wonder', seq: ['hug', 'pat', 'star'], coins: 180 },
  { id: 'pinball', name: 'Pinball Wizard', seq: ['cannon', 'bumper', 'bouncy'], coins: 220 },
];
export const Contra = {
  devices: [], uid: 1, recent: [], touchChain: [], running: false,
  add(type, x, y, a) {
    const def = DEVICES[type]; if (!def) return null; if (this.devices.length >= 12) this.remove(this.devices[0]);
    const d = { id: this.uid++, type, x, y, a: a ?? (type === 'ramp' ? -0.4 : type === 'slide' ? 0.45 : 0), links: [], cd: 0, anim: 0, on: false, life: 0, dir: 1 };
    if (type === 'dispenser') d.auto = false; if (type === 'fan') { d.a = a ?? (x > 0 ? Math.PI : 0); }
    d.body = def.mk(d); d.body.device = d; P.addStatic(d.body); this.devices.push(d); return d;
  },
  remove(d) { P.removeStatic(d.body); this.devices = this.devices.filter(x => x !== d); this.devices.forEach(o => o.links = o.links.filter(i => i !== d.id)); },
  clear() { [...this.devices].forEach(d => this.remove(d)); },
  get(id) { return this.devices.find(d => d.id === id); },
  pick(x, y) { let best = null, bd = 60; for (const d of this.devices) { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d; } } return best; },
  link(a, b) { if (a === b) return; if (a.links.includes(b.id)) a.links = a.links.filter(i => i !== b.id); else a.links.push(b.id); },
  move(d, x, y) { d.x = x; d.y = y; Body.setPosition(d.body, { x, y: d.type === 'cannon' ? y + 24 : d.type === 'dispenser' ? y - 20 : d.type === 'catapult' ? y + 10 : y }); },
  onCollide(body, other, pair, phase) { const d = body.device, def = DEVICES[d.type]; if (def.touch) def.touch(d, other.plushNode ? other : (other.prop ? other : other), phase); },
  fireLinks(d) { for (const id of d.links) { const t = this.get(id); if (t) setTimeout(() => { const def = DEVICES[t.type]; if (def.fire) def.fire(t); this.noteDevice(t); }, 280); } },
  noteDevice(d) { const now = G.time; this.touchChain = this.touchChain.filter(x => now - x.t < 5 && x.d !== d.id); this.touchChain.push({ t: now, d: d.id }); if (this.touchChain.length >= 3 && !this._chainCool) { this._chainCool = true; setTimeout(() => this._chainCool = false, 4000); stat('chain3'); G.fx.text(0, -260, 'CONTRAPTION CHAIN!', { color: '#6ee7b7', size: 24, life: 1.6 }); G.econ.reward(60, { at: { x: 0, y: -240 }, chainN: 3 }); G.audio.play('fanfare'); } },
  note(id) { // tool or device event -> combo detection
    const now = G.time; this.recent = this.recent.filter(e => now - e.t < 16); this.recent.push({ id, t: now });
    for (const cb of COMBOS) { if (cb.seq[cb.seq.length - 1] !== id) continue; let k = 0; for (const e of this.recent) if (e.id === cb.seq[k]) k++; if (k >= cb.seq.length && !(S.stats['cb_' + cb.id] && now - (this['_t' + cb.id] || -99) < 20)) { this['_t' + cb.id] = now; S.stats['cb_' + cb.id] = 1; this.recent = []; G.fx.text(G.plush.center().x, G.plush.center().y - 150, `COMBO: ${cb.name}!`, { color: '#ff7eb6', size: 24, life: 1.8 }); G.econ.reward(cb.coins / 4, { chainN: 3 }); G.econ.addCoins(cb.coins * 0.75 | 0); G.audio.play('fanfare'); G.fx.confetti(G.plush.center().x, G.plush.center().y, 24); G.react.sayCat('combo', { prio: 3 }); stat('combos'); break; } }
  },
  update(dt) {
    for (const d of this.devices) { d.cd = Math.max(0, d.cd - dt); d.anim = Math.max(0, d.anim - dt * 3); const def = DEVICES[d.type]; if (def.update) def.update(d, dt); }
  },
  draw(c, t) {
    for (const d of this.devices) {
      const def = DEVICES[d.type]; c.save(); c.translate(d.x, d.y); c.rotate(d.type === 'catapult' ? 0 : d.a); def.draw(c, d, t); c.restore();
      if (G.rube) {
        for (const id of d.links) { const o = this.get(id); if (!o) continue; c.strokeStyle = '#6ee7b7'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(o.x, o.y); c.stroke(); c.setLineDash([]); const ang = Math.atan2(o.y - d.y, o.x - d.x), mx = (d.x + o.x) / 2, my = (d.y + o.y) / 2; c.fillStyle = '#6ee7b7'; c.beginPath(); c.moveTo(mx + Math.cos(ang) * 10, my + Math.sin(ang) * 10); c.lineTo(mx + Math.cos(ang + 2.5) * 10, my + Math.sin(ang + 2.5) * 10); c.lineTo(mx + Math.cos(ang - 2.5) * 10, my + Math.sin(ang - 2.5) * 10); c.fill(); }
        c.font = '700 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(`#${d.id}`, d.x, d.y - 46);
      }
    }
  },
  go() { // Rube mode: drop the plush at the left, fire all droppers
    const pl = G.plush, c = pl.center(), tx = -G.cam.worldW / 2 + 90, ty = -460; for (const n of pl.nodes) { Matter.Body.setPosition(n, { x: n.position.x - c.x + tx, y: n.position.y - c.y + ty }, true); Matter.Body.setVelocity(n, { x: 0, y: 0 }); }
    this.touchChain = []; this.devices.filter(d => d.type === 'dispenser').forEach(d => DEVICES.dispenser.fire(d)); G.audio.play('whoosh'); G.react.say('Here we go. Squeak responsibly.', { prio: 2 });
  },
  save() { S.rube.devices = this.devices.map(d => ({ type: d.type, x: Math.round(d.x), y: Math.round(d.y), a: d.a, links: d.links.map(i => this.devices.findIndex(x => x.id === i)), dir: d.dir, flip: d.flip })); save(); },
  load() { this.clear(); const made = (S.rube.devices || []).map(o => { const d = this.add(o.type, o.x, o.y, o.a); if (d) { d.dir = o.dir || 1; d.flip = o.flip; } return d; }); (S.rube.devices || []).forEach((o, i) => { if (made[i]) made[i].links = (o.links || []).map(j => made[j] && made[j].id).filter(Boolean); }); },
};
G.pick = k => ({ trampoline: ['Boing! Again, again.', 'I am a very bouncy professional.', 'Up! Down! Up! Existential!'] }[k] || ['Squeak!'])[(Math.random() * 3) | 0] || 'Boing!';
