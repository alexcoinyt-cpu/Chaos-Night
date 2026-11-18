// Game rules glue: impacts, tears, cuts, scoring and reactions.
import { G, hap } from './game.js';
import { S, stat, statMax, save } from './save.js';
import { Fx } from './effects.js';

export function installLogic() {
  G.lastImpact = -9; G.lastImpactF = 0; G.look = { x: 0, y: -100 };
  G.onPlushHit = (node, other, rel) => {
    if (G.plush.stitching || G.replaying) return; const floor = other.isStatic, m = other.mass || 1, pr = other.prop;
    if (pr && pr.onPlush && !pr._used) { pr._used = true; pr.onPlush(pr, node, rel); }
    if (pr && pr.harmless) { if (rel > 5 && pr.sfx) G.audio.play(pr.sfx, { vol: 0.5 }); return; } if (rel < (floor ? 7 : 4.5)) return;
    const force = rel * (floor ? 1.2 : 1.2 + Math.min(4, Math.sqrt(m) * 0.8));
    G.impact({ force, x: node.position.x, y: node.position.y, node, floor, tag: other.label });
  };
  G.impact = (i) => {
    const f = i.force; if (f < 6 || G.replaying) return;
    if (G.time - G.lastImpact < 0.08 && f < G.lastImpactF * 1.4) return; G.lastImpact = G.time; G.lastImpactF = f; G.lastAction = G.time;
    const pl = G.plush, x = i.x, y = i.y, tier = f < 16 ? 0 : f < 36 ? 1 : f < 70 ? 2 : 3;
    G.econ.reward(Math.min(24, Math.max(1, Math.round(f * 0.09))), { at: { x, y }, gentle: i.gentle, min: 3 });
    stat('hits'); statMax('best', Math.round(f)); if (f > S.best) S.best = Math.round(f);
    pl.damageAt(x, y, f * 0.009, 105);
    if (!i.noFx) { if (y > -45 && i.floor !== false) Fx.dust(x, -2, 2 + tier * 2); if (tier >= 1 && !i.floor) Fx.stuff(x, y, tier, { speed: 2.5 }); Fx.shake(tier * 3 + 1); }
    if (!i.noSound) { G.audio.play(tier >= 2 ? 'thud' : 'bonk', { vol: 0.5 + tier * 0.15 }); if (Math.random() < 0.55) G.audio.play(Math.random() < 0.5 ? 'squeak' : 'squeak2', { vol: 0.6 }); }
    if (!i.gentle) {
      const dizzy = tier >= 3 || (i.node && i.node.plushNode.part === 'head' && tier >= 2 && Math.random() < 0.5);
      G.react.setMood(dizzy ? 'dizzy' : tier >= 1 ? 'ouch' : 'ouch', dizzy ? 2.2 : 0.9);
      if (!i.noLine && tier >= 1) G.react.sayCat(dizzy ? 'dizzy' : (i.cat || (tier >= 2 ? 'smash' : 'ouch')), { gap: 2.4 });
      if (i.node && i.node.plushNode.part === 'head' && tier >= 2 && Math.random() < 0.3) pl.popEye(Math.random() < 0.5 ? 'L' : 'R');
    }
    if (tier >= 3) G.hitstop = 0.06; hap(tier >= 2 ? [30, 20, 30] : 12);
    if (G.replay) G.replay.noteHit(f);
  };
  G.onTear = (o) => {
    stat('tears'); const n = G.econ.reward(25, { at: { x: o.x, y: o.y - 20 }, chainN: 2 }); Fx.shake(10); Fx.flash('#fff', 0.12); hap([20, 30, 20]);
    if (o.part === 'head') { stat('headOff'); }
    const gone = G.plush.detachedParts(); if (['armL', 'armR', 'legL', 'legR'].every(p => gone.includes(p))) stat('limbless');
    if (!o.viaCut) { G.audio.play('rip'); G.audio.play('pop', { pitch: 0.8 }); G.react.sayCat('pop', { prio: 2, mood: 'shock', moodDur: 1.2 }); Fx.text(o.x, o.y - 50, 'RIIIP!', { color: '#fff7e6', size: 22 }); }
    G.econ.checkAch();
  };
  G.onCut = (n, pieces) => {
    stat('cuts', 1); statMax('maxPieces', pieces); G.react.setMood('shock', 0.8); if (Math.random() < 0.08) G.react.sayCat('slice', { gap: 3 });
    const gone = G.plush.detachedParts(); if (gone.includes('head')) statMax('headOff', 1); if (['armL', 'armR', 'legL', 'legR'].every(p => gone.includes(p))) statMax('limbless', 1);
    G.econ.checkAch();
  };
  G.onEyePop = () => { stat('buttons'); const e = G.plush.eyes; if (!e.L && !e.R) stat('bothEyes'); G.react.sayCat('eye', { prio: 2, mood: 'shock' }); G.econ.reward(10, { at: G.plush.headPos() }); G.econ.checkAch(); };
  G.onStitched = () => { stat('stitches'); G.react.sayCat('stitch', { prio: 3, mood: 'grin', moodDur: 2 }); G.fx.hearts(G.plush.center().x, G.plush.center().y - 60, 4); G.econ.checkAch(); G.audio.play('squeak2'); };
}
