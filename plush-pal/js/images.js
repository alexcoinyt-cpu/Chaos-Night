// Custom image system. Everything stays in this browser: images are downscaled and kept in localStorage.
import { G } from './game.js';
import { S, save, stat, loadGallery, saveGallery } from './save.js';
import { LAYOUT, FLAT_BOX } from './plush.js';
import { images, loadImage, silhouette, partRect, drawImageInRegion } from './textures.js';

export const TARGETS = {
  face:  { name: 'Face', icon: '🙂', parts: ['head'], region: () => partRect('head') },
  torso: { name: 'Torso', icon: '👕', parts: ['torso'], region: () => partRect('torso') },
  arms:  { name: 'Arms', icon: '💪', parts: ['armL'], region: () => partRect('armL') },
  legs:  { name: 'Legs', icon: '🦵', parts: ['legL'], region: () => partRect('legL') },
  whole: { name: 'Whole plush skin', icon: '🧸', parts: Object.keys(LAYOUT), region: () => FLAT_BOX },
};
export const Gallery = {
  list: loadGallery(),
  persist() { if (!saveGallery(this.list)) { G.ui.toast('Browser storage is full: delete a few gallery images.'); return false; } return true; },
  async add(file) {
    const url = await downscale(file); if (!url) { G.ui.toast("Couldn't read that image."); return null; }
    if (this.list.length >= 12) this.list.shift(); const id = 'g' + Date.now().toString(36); this.list.push({ id, url, name: (file.name || 'photo').slice(0, 24) });
    if (!this.persist()) { this.list.pop(); return null; } await loadImage(id, url); return id;
  },
  remove(id) { this.list = this.list.filter(g => g.id !== id); images.delete(id); for (const k in S.skin) if (S.skin[k] && S.skin[k].imgId === id) S.skin[k] = null; this.persist(); save(); G.rebake(); },
};
async function downscale(file) {
  return new Promise(res => {
    const fr = new FileReader(); fr.onerror = () => res(null);
    fr.onload = () => { const im = new Image(); im.onerror = () => res(null); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); let u = cv.toDataURL('image/webp', 0.85); if (!u.startsWith('data:image/webp')) u = cv.toDataURL('image/jpeg', 0.85); res(u); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
export function resetImages(key) { if (key) S.skin[key] = null; else for (const k in S.skin) S.skin[k] = null; save(); G.rebake(); G.ui.toast(key ? 'Image removed' : 'All images reset to fabric ✨'); }

// ---------- Image Lab UI (crop / zoom / rotate / position with mask preview) ----------
let lab = null;
export function openLab(initialFile) {
  lab = { target: 'face', imgId: null, tx: { x: 0.5, y: 0.5, s: 1, r: 0, f: false } };
  const el = () => document.getElementById('sheetBody');
  const render = () => {
    const g = Gallery.list, t = TARGETS[lab.target];
    G.ui.openModal(`<h2>🖼️ Image Lab</h2><p>Photos never leave this device. Pick an image, choose where it goes, position it inside the mask, and apply.</p>
      <div class="row"><label class="btn alt" for="imgPick">📷 Choose / take photo</label><input id="imgPick" type="file" accept="image/*" hidden>
      <button class="btn alt" id="imgReset">↩ Reset all to fabric</button></div>
      <h3>Where does it go?</h3><div class="row">${Object.entries(TARGETS).map(([k, v]) => `<button class="btn ${lab.target === k ? 'gold' : 'alt'}" data-t="${k}">${v.icon} ${v.name}</button>`).join('')}</div>
      <canvas class="crop" id="cropCv" width="360" height="360"></canvas>
      <p style="text-align:center;font-size:12px">Drag to move · pinch or slider to zoom · slider to rotate. Bright area = what shows on the plush.</p>
      <div class="pickrow"><label>Zoom</label><input id="zoom" type="range" min="0.4" max="4" step="0.01" value="${lab.tx.s}"></div>
      <div class="pickrow"><label>Rotate</label><input id="rot" type="range" min="-180" max="180" step="1" value="${Math.round(lab.tx.r * 180 / Math.PI)}"></div>
      <div class="row"><button class="btn alt" id="flip">↔ Flip</button><button class="btn alt" id="center">⌖ Re-center</button><button class="btn" id="apply" ${lab.imgId ? '' : 'disabled'}>✅ Apply to ${t.name}</button></div>
      <h3>Gallery <small style="color:var(--dim)">(${g.length}/12, saved only in this browser)</small></h3>
      <div class="grid">${g.length ? g.map(x => `<div class="card ${lab.imgId === x.id ? 'on' : ''}"><img src="${x.url}" style="width:72px;height:72px;object-fit:cover;border-radius:10px" data-g="${x.id}"><button data-del="${x.id}" class="btn alt" style="padding:3px 8px">🗑</button></div>`).join('') : '<p>Nothing here yet. Choose a photo above, or drop one anywhere on the game.</p>'}</div>
      <h3>Currently applied</h3><div class="row">${Object.entries(TARGETS).map(([k, v]) => S.skin[k] ? `<button class="btn alt" data-clear="${k}">${v.icon} ${v.name} ✕</button>` : '').join('') || '<span style="color:var(--dim)">Nothing, he is pure fabric.</span>'}</div>`);
    wire();
  };
  const wire = () => {
    const root = document.getElementById('sheetBody'), cv = root.querySelector('#cropCv');
    root.querySelector('#imgPick').onchange = async e => { const f = e.target.files[0]; if (f) await useFile(f); };
    root.querySelector('#imgReset').onclick = () => { resetImages(); render(); };
    root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { lab.target = b.dataset.t; lab.tx = { x: 0.5, y: 0.5, s: 1, r: 0, f: false }; render(); });
    root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { lab.imgId = b.dataset.g; render(); });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { Gallery.remove(b.dataset.del); if (lab.imgId === b.dataset.del) lab.imgId = null; render(); });
    root.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { resetImages(b.dataset.clear); render(); });
    root.querySelector('#zoom').oninput = e => { lab.tx.s = +e.target.value; draw(cv); };
    root.querySelector('#rot').oninput = e => { lab.tx.r = +e.target.value * Math.PI / 180; draw(cv); };
    root.querySelector('#flip').onclick = () => { lab.tx.f = !lab.tx.f; draw(cv); };
    root.querySelector('#center').onclick = () => { lab.tx = { x: 0.5, y: 0.5, s: 1, r: 0, f: false }; render(); };
    root.querySelector('#apply').onclick = () => { if (!lab.imgId) return; S.skin[lab.target] = { imgId: lab.imgId, tx: Object.assign({}, lab.tx) }; stat('images'); save(); G.rebake(); G.econ.checkAch(); G.ui.closeModal(); G.ui.toast(`🖼️ Applied to ${TARGETS[lab.target].name}!`); G.audio.play('ding'); G.fx.sparkleBurst(G.plush.center().x, G.plush.center().y - 60, 12); G.react.say(['Do I look different? I feel different.', 'A new look! Squeak!', 'I am a fashion icon now. Allegedly.'][(Math.random() * 3) | 0], { prio: 3 }); };
    // pointer drag + pinch
    const ptrs = new Map(); let last = null;
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = null; };
    cv.onpointermove = e => { if (!ptrs.has(e.pointerId) || !lab.imgId) return; const p = ptrs.get(e.pointerId), old = { x: p.x, y: p.y }; p.x = e.clientX; p.y = e.clientY;
      const rc = cv.getBoundingClientRect(), reg = TARGETS[lab.target].region(), sc = Math.min(330 / reg.w, 330 / reg.h) * (360 / rc.width) * (rc.width / 360);
      if (ptrs.size === 1) { lab.tx.x += (p.x - old.x) / rc.width * 360 / (reg.w * previewScale(reg)); lab.tx.y += (p.y - old.y) / rc.height * 360 / (reg.h * previewScale(reg)); }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (last) lab.tx.s = Math.max(0.4, Math.min(4, lab.tx.s * d / last)); last = d; root.querySelector('#zoom').value = lab.tx.s; }
      draw(cv); };
    cv.onpointerup = cv.onpointercancel = e => { ptrs.delete(e.pointerId); last = null; };
    draw(cv);
  };
  const useFile = async (f) => { const id = await Gallery.add(f); if (id) { lab.imgId = id; lab.tx = { x: 0.5, y: 0.5, s: 1, r: 0, f: false }; render(); } };
  lab.useFile = useFile; render(); if (initialFile) useFile(initialFile);
}
export function labOpen() { return !!lab && !document.getElementById('modal').hidden && document.getElementById('cropCv'); }
export function labUseFile(f) { if (!labOpen()) openLab(f); else lab.useFile(f); }
const previewScale = reg => Math.min(300 / reg.w, 300 / reg.h);
function draw(cv) {
  const c = cv.getContext('2d'), reg = TARGETS[lab.target].region(), sc = previewScale(reg), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H); c.fillStyle = '#1b1530'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 20) for (let x = 0; x < W; x += 20) { c.fillStyle = (x + y) / 20 % 2 ? '#2a2145' : '#241c3b'; c.fillRect(x, y, 20, 20); }
  c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc); c.translate(-reg.x - reg.w / 2, -reg.y - reg.h / 2);
  const im = images.get(lab.imgId); if (im) drawImageInRegion(c, im, lab.tx, reg, 0, 0);
  c.restore();
  // mask: dim everything outside the part silhouettes
  const ov = document.createElement('canvas'); ov.width = W; ov.height = H; const o = ov.getContext('2d'); o.fillStyle = 'rgba(10,6,24,0.72)'; o.fillRect(0, 0, W, H);
  o.globalCompositeOperation = 'destination-out'; o.translate(W / 2, H / 2); o.scale(sc, sc); o.translate(-reg.x - reg.w / 2, -reg.y - reg.h / 2);
  for (const id of TARGETS[lab.target].parts) { const r = partRect(id), d = LAYOUT[id]; o.save(); o.translate(r.x, r.y); silhouette(o, d.shape, d.w, d.h, 1); o.fill(); o.restore(); }
  c.drawImage(ov, 0, 0);
  c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc); c.translate(-reg.x - reg.w / 2, -reg.y - reg.h / 2); c.strokeStyle = '#ffd54a'; c.lineWidth = 2 / sc; c.setLineDash([6 / sc, 5 / sc]);
  for (const id of TARGETS[lab.target].parts) { const r = partRect(id), d = LAYOUT[id]; c.save(); c.translate(r.x, r.y); silhouette(c, d.shape, d.w, d.h, 1); c.stroke(); c.restore(); } c.restore();
  if (!im) { c.fillStyle = '#c9bde6'; c.font = '700 16px sans-serif'; c.textAlign = 'center'; c.fillText('Choose a photo to begin', W / 2, H / 2); }
}
export function initDragDrop() {
  const drop = document.getElementById('drop'); let depth = 0;
  addEventListener('dragenter', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { depth++; drop.hidden = false; e.preventDefault(); } });
  addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) drop.hidden = true; });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); depth = 0; drop.hidden = true; const f = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/')); if (f) labUseFile(f); });
}
