import { G } from './game.js';
import { S, save } from './save.js';
import { P } from './physics.js';
import { Plush } from './plush.js';
import { Fx } from './effects.js';
import { Audio_ } from './audio.js';
import { React } from './reactions.js';
import { Econ } from './economy.js';
import { Faces, currentFace } from './faces.js';
import { bakeAll, loadImage } from './textures.js';
import { initRender, drawFrame, updateCamera, canvas, toScreen, resize } from './render.js';
import { setRoom } from './rooms.js';
import { Contra } from './contraptions.js';
import { installLogic } from './logic.js';
import { initInput, stepInput } from './input.js';
import { UI } from './ui.js';
import { loadGallery } from './save.js';
import { Replay } from './replay.js';
import { initDragDrop } from './images.js';

G.save = S; G.replay = Replay; G.fx = Fx; G.audio = Audio_; G.react = React; G.econ = Econ; G.faces = Faces; G.physics = P; G.contraptions = Contra;
G.debug = /debug/.test(location.search);
G.rebake = () => { G.faceImage = !!(S.skin.face && S.skin.face.imgId) || !!(S.skin.whole && S.skin.whole.imgId); bakeAll(S.equip.species); };
G.drawOverlayWorld = (c) => {
  const cu = G.cursor, pt = G.pointer; if (!cu || !pt.down) return;
  c.save(); if (cu.wire) { c.strokeStyle = '#ffe9a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(pt.x - cu.wire, pt.y); c.lineTo(pt.x + cu.wire, pt.y); c.stroke(); } c.translate(pt.x, pt.y); c.rotate(cu.rot || 0); if (cu.wob) c.translate((Math.random() - .5) * cu.wob, (Math.random() - .5) * cu.wob); c.font = `${cu.size || 50}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(cu.emoji, 0, 0); c.restore();
};

async function boot() {
  P.init(); installLogic();
  const cv = document.getElementById('c'); initRender(cv);
  // restore saved gallery images
  const gal = loadGallery(); for (const g of gal) await loadImage(g.id, g.url);
  G.plush = new Plush(); G.plush.build(0, -190); G.rebake(); setRoom(S.equip.room);
  S.stats.roomsSeen = S.stats.roomsSeen || 1; S.rooms = S.rooms || {}; 
  UI.init(); resize(); if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(document.getElementById('dock')); initInput(); initDragDrop(); Contra.load(); S.stats.rv = S.stats.rv || { living: 1 }; loop.last = performance.now();
  G.react.say('Oh! Hello. I am Dumpling. Please be gentle. Or do not.', { prio: 3, dur: 3.5 });
  requestAnimationFrame(loop);
  window.G = G; window.toScreenDbg = () => toScreen(G.plush.center().x, G.plush.center().y);
}
let acc = 0; const STEP = 1 / 60; let fpsT = 0, fpsN = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min(0.05, (now - loop.last) / 1000); loop.last = now; fpsT += dt; fpsN++; if (fpsT > 0.5) { G.fps = fpsN / fpsT; fpsT = 0; fpsN = 0; }
  if (G.paused) return;
  G.rawDt = dt;
  if (!G.replaying) {
    acc += dt * G.timeScale;
    while (acc >= STEP) { acc -= STEP; tick(STEP); }
  } else if (G.replayTick) G.replayTick(dt);
  updateCamera(dt); G.time += dt; Fx.update(G.replaying ? dt * 0.35 : dt);
  UI.hud(); G.t = (G.t || 0) + dt;
  drawFrame(G.t);
}
function tick(dt) {
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  stepInput(dt);
  if (G.room.fields) G.room.fields(dt);
  if (G.room.ambient) G.room.ambient(dt);
  P.step(1000 / 120); P.step(1000 / 120);
  P.updateProps(dt); Contra.update(dt); G.plush.update(dt); Econ.update(dt); React.update(dt);
  G.altitude = Math.max(0, -G.plush.center().y - 60); if (G.altitude > (S.stats.maxAlt || 0)) { S.stats.maxAlt = Math.round(G.altitude); if (G.altitude > 2200) Econ.checkAch(); }
  if (G.replay) G.replay.record();
  // auto-regen
  if (S.settings.autoRegen && !G.plush.stitching && G.plush.damaged() && G.time - G.lastAction > 7) G.plush.stitchBack();
}
boot();
