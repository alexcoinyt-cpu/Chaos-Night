// Pointer handling: grab-and-fling, tool dispatch (tap / hold / place), drag-and-drop images.
import { G } from './game.js';
import { P } from './physics.js';
import { toWorld, canvas } from './render.js';
import { Contra, DEVICES } from './contraptions.js';
import { stat, S } from './save.js';
import { toolById } from './tools/index.js';
const { Constraint, Composite } = Matter;

export const Input = { grab: null, hold: null };
const used = new Set();
export function useTool(tool, p, first = true) {
  if (!tool || !G.plush || G.plush.stitching) return;
  const now = G.time; if (tool.type === 'tap' || tool.type === 'place' || tool.type === 'global') { if (now - (tool._last || -9) < (tool.cd ?? 0.18)) return; tool._last = now; }
  if (first) {
    tool.sounds.forEach(s => G.audio.play(s)); if (tool.lines.length) G.react.say(tool.lines[(Math.random() * tool.lines.length) | 0], { prio: 2, mood: tool.mood, gap: 0.8 });
    G.lastAction = now; G.lastToolAt = now; if (!used.has(tool.id)) { used.add(tool.id); S.stats.toolsUsed = (S.stats.toolsUsed || 0) + 1; }
    if (tool.gentle) { G.gentleStreak = (G.gentleStreak || 0) + 1; S.stats.gentleStreakMax = Math.max(S.stats.gentleStreakMax || 0, G.gentleStreak); } else if (tool.cat !== 'gentle') G.gentleStreak = 0;
    Contra.note(tool.noteId || tool.id);
  }
  tool.effect(G, p);
  G.econ.checkAch();
}
export function initInput() {
  const pt = G.pointer;
  const upd = (e) => { const r = canvas.getBoundingClientRect(); pt.sx = e.clientX - r.left; pt.sy = e.clientY - r.top; const w = toWorld(pt.sx, pt.sy); pt.px = pt.x; pt.py = pt.y; pt.x = w.x; pt.y = w.y; G.look = { x: w.x, y: w.y }; };
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); G.audio.init(); if (G.replaying) { G.replay.stop(); return; } canvas.setPointerCapture(e.pointerId); pt.down = true; pt.id = e.pointerId; upd(e); pt.px = pt.x; pt.py = pt.y; G.react.idleT = 8;
    if (G.rube && G.rubeMode !== 'grab') { G.ui.rubePointer('down', pt); return; }
    const t = G.rube ? { type: 'hand' } : G.tool; if (!t) return;
    if (t.type === 'hand') { const i = G.plush.nearestNode(pt.x, pt.y, 55); if (i >= 0) { const n = G.plush.nodes[i]; const con = Constraint.create({ pointA: { x: pt.x, y: pt.y }, bodyB: n, stiffness: 0.16, damping: 0.08, length: 0 }); Composite.add(P.world, con); Input.grab = { con, n }; G.plush.grab = true; G.lastAction = G.time; G.react.setMood('shock', 0.6); G.audio.play('squeak', { vol: 0.5 }); } }
    else if (t.type === 'hold') { Input.hold = { tool: t, first: true }; }
    else if (t.type === 'tap' || t.type === 'place') useTool(t, { x: pt.x, y: pt.y, sx: pt.sx, sy: pt.sy, px: pt.x, py: pt.y, dt: 0 });
  });
  canvas.addEventListener('pointermove', e => { if (e.pointerId !== pt.id && pt.down) return; upd(e); if (G.rube && G.rubeMode !== 'grab' && pt.down) G.ui.rubePointer('move', pt); if (Input.grab) { Input.grab.con.pointA.x = pt.x; Input.grab.con.pointA.y = pt.y; G.lastAction = G.time; } });
  const up = e => { if (!pt.down) return; pt.down = false; if (G.rube && G.rubeMode !== 'grab') { G.ui.rubePointer('up', pt); return; } if (Input.grab) { Composite.remove(P.world, Input.grab.con); Input.grab = null; G.plush.grab = false; } if (Input.hold) { if (Input.hold.tool.end) Input.hold.tool.end(G); Input.hold = null; G.cursor = null; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  addEventListener('keydown', e => { if (e.key === 's') G.plush.stitchBack(); });
}
export function stepInput(dt) {
  const pt = G.pointer;
  if (Input.hold && pt.down) { useTool(Input.hold.tool, { x: pt.x, y: pt.y, px: pt.px ?? pt.x, py: pt.py ?? pt.y, dx: pt.x - (pt.px ?? pt.x), dy: pt.y - (pt.py ?? pt.y), dt, first: Input.hold.first }, Input.hold.first); Input.hold.first = false; pt.px = pt.x; pt.py = pt.y; }
  if (Input.grab) { const n = Input.grab.n; const dx = Input.grab.con.pointA.x - n.position.x, dy = Input.grab.con.pointA.y - n.position.y; if (Math.hypot(dx, dy) > 140 && Math.random() < dt * 4) { const s = G.plush.seams.find(s => !s.torn && s.ratio > 1.5); if (s) G.react.sayCat('yank', { gap: 3 }); } }
}
