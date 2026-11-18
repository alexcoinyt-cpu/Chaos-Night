// Synthesized sound effects. No asset files. Starts on first user gesture.
import { S, save } from './save.js';
let ac = null, master = null, noiseBuf = null; const loops = {};
export const Audio_ = {
  get muted() { return S.settings.mute; },
  setMuted(m) { S.settings.mute = m; if (master) master.gain.value = m ? 0 : 0.8; save(); },
  init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = S.settings.mute ? 0 : 0.8; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  },
  play(name, o = {}) { if (!ac || S.settings.mute) return; const f = SFX[name]; if (f) { try { f(o.vol ?? 1, o.pitch ?? 1); } catch (e) {} } },
  loop(name, on) {
    if (!ac) return;
    if (!on) { const l = loops[name]; if (l) { l.g.gain.setTargetAtTime(0, ac.currentTime, 0.05); setTimeout(() => { try { l.src.stop(); } catch (e) {} }, 300); delete loops[name]; } return; }
    if (loops[name]) return;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const g = ac.createGain(); g.gain.value = 0; const flt = ac.createBiquadFilter();
    const cfg = { saw: ['bandpass', 600, 0.25], flame: ['lowpass', 900, 0.3], wind: ['bandpass', 400, 0.25], vac: ['bandpass', 250, 0.3], zap: ['highpass', 3000, 0.15], rain: ['highpass', 2500, 0.1] }[name] || ['lowpass', 800, 0.2];
    flt.type = cfg[0]; flt.frequency.value = cfg[1]; src.connect(flt); flt.connect(g); g.connect(master); src.start();
    g.gain.setTargetAtTime(cfg[2], ac.currentTime, 0.05); loops[name] = { src, g };
    if (name === 'saw') { const lfo = ac.createOscillator(); lfo.frequency.value = 38; const lg = ac.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(flt.frequency); lfo.start(); loops[name].lfo = lfo; }
  },
  stopAllLoops() { Object.keys(loops).forEach(k => this.loop(k, false)); },
};
function tone(f, dur, type = 'sine', vol = 0.3, slide = null, delay = 0) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(dur, vol = 0.3, type = 'lowpass', f0 = 1000, f1 = null, delay = 0) {
  const t = ac.currentTime + delay, s = ac.createBufferSource(); s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const r = (a, b) => a + Math.random() * (b - a);
const SFX = {
  squeak(v, p) { const f = r(900, 1500) * p; const o = tone(f, 0.16, 'square', 0.12 * v, f * 1.5); tone(f * 1.01, 0.16, 'sine', 0.2 * v, f * 1.6); },
  squeak2(v, p) { tone(1300 * p, 0.09, 'square', .1 * v, 1900 * p); tone(1700 * p, 0.12, 'square', .1 * v, 1100 * p, 0.09); },
  thud(v, p) { tone(110 * p, 0.2, 'sine', 0.6 * v, 40); noise(0.12, 0.3 * v, 'lowpass', 500, 100); },
  bonk(v, p) { tone(220 * p, 0.14, 'triangle', 0.5 * v, 70); noise(0.06, 0.25 * v, 'bandpass', 1500, 400); },
  boom(v, p) { tone(70 * p, 0.7, 'sawtooth', 0.4 * v, 25); noise(0.8, 0.7 * v, 'lowpass', 1800, 80); },
  whoosh(v, p) { noise(0.45, 0.35 * v, 'bandpass', 300 * p, 3000 * p); },
  zap(v, p) { noise(0.35, 0.5 * v, 'highpass', 4000, 800); tone(1800, 0.3, 'sawtooth', 0.15 * v, 60); },
  pop(v, p) { tone(500 * p, 0.08, 'sine', 0.4 * v, 1400 * p); noise(0.04, 0.2 * v, 'highpass', 2000); },
  rip(v, p) { noise(0.35, 0.5 * v, 'bandpass', 3500, 900); noise(0.2, 0.3 * v, 'highpass', 2500, 5000, 0.05); },
  ding(v, p) { tone(1320 * p, 0.5, 'sine', 0.25 * v); tone(1980 * p, 0.4, 'sine', 0.12 * v, null, 0.02); },
  coin(v, p) { tone(988 * p, 0.08, 'square', 0.12 * v); tone(1319 * p, 0.25, 'square', 0.12 * v, null, 0.07); },
  sigh(v, p) { noise(0.9, 0.12 * v, 'bandpass', 900, 250); tone(380 * p, 0.8, 'sine', 0.08 * v, 180); },
  boing(v, p) { const o = tone(180 * p, 0.45, 'sine', 0.4 * v, 700 * p); const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 22; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency); l.start(); l.stop(ac.currentTime + 0.5); },
  honk(v, p) { tone(330 * p, 0.35, 'sawtooth', 0.25 * v, 260 * p); tone(335 * p, 0.35, 'square', 0.1 * v); },
  buzz(v, p) { tone(120 * p, 0.3, 'sawtooth', 0.2 * v); },
  sizzle(v, p) { noise(0.5, 0.25 * v, 'highpass', 5000); },
  splash(v, p) { noise(0.5, 0.4 * v, 'lowpass', 2500, 400); },
  fanfare(v, p) { [523, 659, 784, 1046].forEach((f, i) => tone(f * p, 0.25, 'square', 0.13 * v, null, i * 0.1)); },
  giggle(v, p) { for (let i = 0; i < 4; i++) tone((900 + i * 80) * p, 0.07, 'square', 0.1 * v, 1300 * p, i * 0.09); },
  fart(v, p) { tone(90 * p, 0.45, 'sawtooth', 0.35 * v, 55); noise(0.4, 0.2 * v, 'bandpass', 200, 120); },
  chime(v, p) { [880, 1175, 1568].forEach((f, i) => tone(f * p, 0.5, 'sine', 0.12 * v, null, i * 0.08)); },
  crash(v, p) { noise(0.9, 0.5 * v, 'highpass', 3000, 6000); tone(420, 0.6, 'square', 0.08 * v, 300); },
  piano(v, p) { [262, 330, 392, 523].forEach(f => tone(f * p, 0.9, 'triangle', 0.15 * v)); },
  bark(v, p) { tone(400 * p, 0.12, 'sawtooth', 0.3 * v, 220); tone(380 * p, 0.14, 'sawtooth', 0.3 * v, 200, 0.18); },
  warp(v, p) { tone(200, 0.8, 'sine', 0.3 * v, 1600); tone(1600, 0.8, 'sine', 0.2 * v, 200, 0.1); },
  rewind(v, p) { tone(1200, 0.9, 'sawtooth', 0.15 * v, 150); },
  hum(v, p) { tone(140 * p, 1.2, 'sine', 0.2 * v, 180 * p); },
  clink(v, p) { tone(2400 * p, 0.1, 'triangle', 0.18 * v, 1800); },
  squelch(v, p) { noise(0.25, 0.4 * v, 'lowpass', 900, 200); tone(160, 0.2, 'sine', 0.3 * v, 60); },
  bubble(v, p) { tone(500 * p, 0.12, 'sine', 0.2 * v, 1100 * p); },
  poof(v, p) { noise(0.3, 0.3 * v, 'lowpass', 1200, 200); },
  snip(v, p) { noise(0.06, 0.4 * v, 'highpass', 5000); noise(0.06, 0.4 * v, 'highpass', 5000, null, 0.08); },
  fuse(v, p) { noise(0.6, 0.2 * v, 'highpass', 4500, 2000); },
};
