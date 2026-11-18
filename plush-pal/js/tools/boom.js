import { G } from '../game.js';
import { Fx } from '../effects.js';
import { K } from '../toolkit.js';
import { P } from '../physics.js';
const T = o => Object.assign({ cat: 'boom', cost: 0, level: 1, type: 'tap', sounds: [], lines: [] }, o);
const pillowDraw = (c) => { c.fillStyle = '#fff'; c.strokeStyle = '#e8b0d0'; c.lineWidth = 3; c.beginPath(); c.roundRect(-34, -22, 68, 44, 16); c.fill(); c.stroke(); c.fillStyle = '#ff9ac8'; for (const [x, y] of [[-28, -16], [28, -16], [-28, 16], [28, 16]]) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } };
export const boom = [
  T({ id: 'rocket', name: 'Rocket Buddy', icon: '🚀', type: 'global', hint: 'Straps a rocket on his back. 3, 2, 1...', lines: ['Tell my cushions I love them!', 'Wheeeeee-eek!', 'I can see my couch from here!'], mood: 'shock',
    effect(G) {
      const pl = G.plush; let lit = false; G.audio.play('fuse'); G.lastAction = G.time + 3;
      Fx.actor({ ttl: 2.1, front: true,
        update(dt, a) {
          const c = pl.center(); a.cx = c.x; a.cy = c.y;
          if (a.t < 0.6) { for (const n of pl.nodes) K.vel(n, (Math.random() - 0.5) * 0.3, 0); Fx.spark(c.x + 10, c.y + 40, 1, { col: '#ff9a3c' }); return; }
          if (!lit) { lit = true; G.audio.loop('flame', true); Fx.flash('#fff2b0', 0.25); }
          const k = Math.min(1, (a.t - 0.6) / 0.2);
          for (const n of pl.nodes) K.vel(n, (c.x - n.position.x) * 0.0006, -0.68 * k);
          Fx.fire(c.x, c.y + 60, 0, 6, 3); Fx.smoke(c.x, c.y + 70, 1); if (a.t % 0.2 < dt) Fx.shake(6);
        },
        draw(c, a) { if (a.cx === undefined) return; c.translate(a.cx, a.cy - 6); c.font = '58px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.rotate(Math.PI * 3 / 4); c.fillText('🚀', 0, 0); },
        onEnd() { G.audio.loop('flame', false); G.react.sayCat('launch', { prio: 2, mood: 'grin' }); } });
    } }),
  T({ id: 'pillowcannon', name: 'Pillow Cannon', icon: '🛏️', level: 1, cost: 0, hint: 'Fires a pillow from the side at your tap.', lines: ['Fwump! Soft but suspiciously fast.', 'Pillow fight! I was not informed.', 'Fluffy projectile accepted.'],
    effect(G, p) { const c = K.C(), dir = p.x < c.x ? 1 : -1, x = dir > 0 ? K.left() + 30 : K.right() - 30; G.audio.play('boom', { vol: 0.35, pitch: 1.6 }); Fx.smoke(x, p.y, 4); K.prop({ shape: 'rect', w: 68, h: 44, x, y: p.y, vx: dir * 22, vy: -1.5, density: 0.0016, draw: pillowDraw, restitution: 0.4, ttl: 6, noBlast: true, onPlush(pr, n) { G.audio.play('poof'); Fx.stuff(n.position.x, n.position.y, 6, { fromPlush: false, speed: 4 }); K.hit(n.position.x, n.position.y, 105, 9, { dir: { x: dir, y: -0.2 }, tear: 0.2, cat: 'boom' }); } }); } }),
  T({ id: 'firecracker', name: 'Firecracker String', icon: '🧨', level: 2, cost: 60, hint: 'A pop-pop-pop chain around your tap.', lines: ['Pop pop pop! I feel popcorn-y.', 'Tiny booms, tiny regrets.', 'It is like a drumline made of fireworks.'],
    effect(G, p) { for (let i = 0; i < 9; i++) setTimeout(() => { const x = p.x + K.R(-70, 70), y = p.y + K.R(-60, 50); Fx.spark(x, y, 10, { col: '#ffcf4a' }); Fx.smoke(x, y, 2); G.audio.play('pop', { pitch: K.R(0.8, 1.6), vol: 0.7 }); Fx.shake(3); K.hit(x, y, 75, 3.2, { up: 1, tear: 0.07, noLine: true }); }, i * 120); } }),
  T({ id: 'bomb', name: 'Cartoon Bomb', icon: '💣', level: 2, cost: 90, hint: 'Drops a lit bomb. Fuse: 1.6 s. Cartoon physics.', lines: ['Of course it is round and black.', 'The fuse is a polite warning.', 'Kaboom, said the bomb, politely.'],
    effect(G, p) { const bomb = K.prop({ shape: 'circle', r: 20, x: p.x, y: Math.min(p.y - 40, -60), vy: -3, density: 0.003, emoji: '💣', restitution: 0.5, ttl: 1.6, noBlast: true, bounces: true,
        update(pr, dt) { const b = pr.body; if (Math.random() < 0.6) Fx.spark(b.position.x + 8, b.position.y - 24, 1, { col: '#ffd54a' }); pr.blink = ((pr.age * 6) % 1) > 0.5; },
        draw(c, pr) { c.font = '44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('💣', 0, 2); if (pr.blink) { c.fillStyle = '#ff2f2f88'; c.beginPath(); c.arc(0, 2, 22, 0, 7); c.fill(); } },
        onExpire(pr) { const b = pr.body; K.blast(b.position.x, b.position.y, { r: 190, f: 15 }); Fx.text(b.position.x, b.position.y - 50, 'KABOOM!', { color: '#ff9a3c', size: 30 }); G.plush.status.heat = Math.min(1, G.plush.status.heat + 0.3); G.react.sayCat('boom', { prio: 2 }); } }); G.audio.play('fuse'); } }),
  T({ id: 'confetti', name: 'Confetti Cannon', icon: '🎊', level: 1, cost: 0, hint: 'Party! A gentle shove and a mountain of confetti.', lines: ['Surprise! I am the surprise.', 'Everything is festive now.', 'Confetti in the stuffing. Forever.'], mood: 'grin',
    effect(G, p) { const c = K.C(), dir = p.x < c.x ? 1 : -1, x = dir > 0 ? K.left() + 40 : K.right() - 40; G.audio.play('pop'); G.audio.play('fanfare', { vol: 0.5 }); Fx.confetti(x, -80, 90, { angle: dir > 0 ? -0.6 : -2.55, spread: 0.45, speed: 18 }); Fx.flash('#ffffff', 0.15); setTimeout(() => { Fx.confetti(c.x, c.y - 40, 40, { spread: 3, speed: 9 }); K.hit(c.x, c.y, 160, 3, { dir: { x: dir * 0.7, y: -0.3 }, noLine: true }); G.econ.reward(6, { at: { x: c.x, y: c.y - 90 } }); }, 450); } }),
  T({ id: 'popper', name: 'Party Popper', icon: '🎉', level: 1, cost: 0, hint: 'POP! Streamers, confetti, and a tiny party hat.', lines: ['A party hat! Finally someone respects me.', 'Pop! Is it my birthday? It is always my birthday.', 'The streamers are in my seams now.'], mood: 'grin',
    effect(G, p) { G.audio.play('pop'); G.audio.play('chime', { vol: 0.5 }); Fx.confetti(p.x, p.y, 50, { spread: 1, speed: 12 }); Fx.glyph(p.x, p.y, '🎉', 3); Fx.ring(p.x, p.y, { r: 70, color: '#ff7eb6', life: 0.35 }); K.hit(p.x, p.y, 100, 3.4, { up: 2, noLine: true }); G.plush.status.hat = 12; } }),
  T({ id: 'fireworks', name: 'Firework Bouquet', icon: '🎆', level: 4, cost: 140, hint: 'Four rockets lift him, then bloom overhead.', lines: ['Ooooh! Aaaah! Eeeek!', 'I am the centerpiece. Quite literally.', 'Fireworks! Please ignore the ones in my pockets.'],
    effect(G, p) { const c = K.C(), cols = ['#ff7eb6', '#7ad7f0', '#ffd54a', '#6ee7b7']; G.audio.play('fuse'); for (let i = 0; i < 4; i++) { const x = c.x + (i - 1.5) * 38, peak = c.y - 300 - i * 30; let y = -6, done = false;
      Fx.actor({ ttl: 2.6, front: true, t: -i * 0.12, update(dt, a) { if (a.t < 0) return; if (!done) { y -= 13; Fx.add({ type: 'spark', x, y: y + 6, vx: 0, vy: 4, life: 0.4, size: 3, col: '#ffe56a', g: 0.05 }); if (Math.abs(x - c.x) < 120 && y > c.y - 40 && y < c.y + 130) { K.hit(x, y, 70, 1.4, { dir: { x: 0, y: -1 }, noLine: true, mul: 0.2 }); } if (y < peak) { done = true; G.audio.play('boom', { vol: 0.4, pitch: 1.8 }); Fx.sparkleBurst(x, y, 8); for (let k = 0; k < 30; k++) { const an = k / 30 * 6.28; Fx.add({ type: 'spark', x, y, vx: Math.cos(an) * 5, vy: Math.sin(an) * 5, life: 1.1, size: 3, col: cols[i], g: 0.06 }); } Fx.flash(cols[i], 0.12); G.econ.reward(5, { at: { x, y } }); } } },
        draw(c, a) { if (a.t >= 0 && !done) { c.font = '28px sans-serif'; c.textAlign = 'center'; c.fillText('🎇', x, y); } } }); } } }),
];
