// Ring-buffer recorder: slow-mo replay of the biggest hit, rewind, screenshots, clip download.
import { G } from './game.js';
import { S, save } from './save.js';
import { Fx } from './effects.js';
import { P } from './physics.js';
import { canvas } from './render.js';
const MAX = 200;                        // ~6.6 s @ 30 fps
export const Replay = {
  ring: [], n: 0, best: null, bestForce: 0, pending: null, playing: null,
  record() {
    this.n++; if (this.n % 2) return;
    const f = { s: G.plush.snap(), fx: Fx.parts.slice(-60).map(p => [p.x, p.y, p.size, p.type, p.col, p.rot, 1 - p.age / p.max, p.ch]) };
    this.ring.push(f); if (this.ring.length > MAX) this.ring.shift();
    if (this.pending && --this.pending.left <= 0) { this.best = this.ring.slice(-Math.min(this.ring.length, 105)); this.bestForce = this.pending.f; this.pending = null; G.ui && G.ui.toast('🎬 New biggest hit saved! Open Replay in the side bar.'); }
  },
  noteHit(f) { if (f > this.bestForce && f >= 24 && !this.pending) { this.pending = { f, left: 45 }; } else if (this.pending && f > this.pending.f) this.pending.f = f; },
  play(opts = {}) {
    if (!this.best || this.playing) { G.ui.toast('No big hit recorded yet. Go bonk something! 🔨'); return; }
    const pl = G.plush, saved = pl.snap(), frames = this.best; this.playing = { i: 0, frames, saved, rec: opts.record }; G.replaying = true; G.replayBanner = '🎬 REPLAY (slow-mo)';
    P.engine.enabled = false; Object.values(this.playing); this.acc = 0; this.rec = opts.record ? startRecording() : null;
    G.replayTick = (dt) => {
      const p = this.playing; this.acc += dt * 0.5 * 60; const adv = Math.floor(this.acc / 2); if (adv < 1) return; this.acc -= adv * 2; p.i += adv;
      if (p.i >= p.frames.length) { this.stop(); return; }
      const f = p.frames[p.i]; pl.restoreSnap(f.s, false); Fx.parts = f.fx.map(a => ({ x: a[0], y: a[1], size: a[2], type: a[3], col: a[4] || '#fff', rot: a[5], age: 0, max: 1, life: 1, ch: a[7], vx: 0, vy: 0, grow: 0, alpha: 1 }));
      Fx.parts.forEach((q, k) => { const l = f.fx[k][6]; q.age = (1 - l) * q.max; });
    };
  },
  stop() {
    const p = this.playing; if (!p) return; G.replaying = false; G.replayBanner = null; G.replayTick = null; P.engine.enabled = true; Fx.parts = [];
    G.plush.restoreSnap(p.saved, true); for (const n of G.plush.nodes) Matter.Body.setVelocity(n, { x: 0, y: 0 }); this.playing = null; if (this.rec) { this.rec(); this.rec = null; }
  },
  // rewind the last ~3 s of plush motion (rips un-rip!)
  rewind() {
    if (this.ring.length < 12 || G.replaying) { G.ui.toast('Not enough history yet. Do something first!'); return; }
    const frames = this.ring.slice(-90).reverse(), pl = G.plush; G.replaying = true; G.replayBanner = '⏪ REWIND'; G.audio.play('rewind'); Matter.Body && 0; P.engine.enabled = false; let i = 0, acc = 0; Fx.flash('#7ad7f0', 0.2);
    G.replayTick = (dt) => { acc += dt * 60 * 1.4; const adv = Math.floor(acc / 2); if (adv < 1) return; acc -= adv * 2; i += adv; if (i >= frames.length) { G.replaying = false; G.replayBanner = null; G.replayTick = null; P.engine.enabled = true; for (const n of pl.nodes) Matter.Body.setVelocity(n, { x: 0, y: 0 }); this.ring.length = 0; require_stat(); return; } pl.restoreSnap(frames[i].s, true); for (const n of pl.nodes) Matter.Body.setVelocity(n, { x: 0, y: 0 }); };
  },
  screenshot() { try { const a = document.createElement('a'); a.download = `plush-pal-${Date.now()}.png`; a.href = canvas.toDataURL('image/png'); a.click(); G.ui.toast('📸 Screenshot saved to your downloads'); } catch (e) { G.ui.toast('Screenshot blocked by the browser'); } },
  saveClip() { this.play({ record: true }); },
};
function require_stat() { S.stats.rewinds = (S.stats.rewinds || 0) + 1; save(); G.econ.checkAch(); }
function startRecording() {
  try {
    if (!window.MediaRecorder || !canvas.captureStream) { G.ui.toast('Clip recording is not supported here; use the screenshot button.'); return null; }
    const st = canvas.captureStream(30), mr = new MediaRecorder(st, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' }), chunks = [];
    mr.ondataavailable = e => e.data.size && chunks.push(e.data); mr.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = `plush-pal-replay-${Date.now()}.webm`; a.click(); G.ui.toast('🎬 Replay clip saved to your downloads'); }; mr.start(); return () => mr.stop();
  } catch (e) { return null; }
}
