// All persistence lives here. Everything stays in this browser's localStorage.
const KEY = 'plushpal.v1', GKEY = 'plushpal.gallery.v1';
const defaults = () => ({
  v: 1, coins: 300, xpTotal: 0,
  settings: { mute: false, haptics: true, shake: true, autoRegen: false },
  unlocked: { tools: {}, species: { bear: 1 }, outfits: { none: 1 }, rooms: { living: 1 } },
  equip: { species: 'bear', head: 'none', body: 'none', room: 'living' },
  face: null,                       // custom face config from the face maker (null = species default)
  skin: { face: null, torso: null, arms: null, legs: null, whole: null }, // {imgId, tx}
  ach: {}, stats: {}, daily: { last: '', streak: 0 }, wheel: { last: '' }, best: 0,
  rube: { devices: [] },
});
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; }
function load() { try { const r = localStorage.getItem(KEY); return r ? merge(defaults(), JSON.parse(r)) : defaults(); } catch (e) { return defaults(); } }
export const S = load();
let timer = 0;
export function save(now) {
  if (now) return write();
  clearTimeout(timer); timer = setTimeout(write, 400);
}
function write() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: play on */ } }
export function resetAll() { try { localStorage.removeItem(KEY); localStorage.removeItem(GKEY); } catch (e) {} location.reload(); }
export function loadGallery() { try { return JSON.parse(localStorage.getItem(GKEY) || '[]'); } catch (e) { return []; } }
export function saveGallery(arr) { try { localStorage.setItem(GKEY, JSON.stringify(arr)); return true; } catch (e) { return false; } }
export const stat = (k, n = 1) => { S.stats[k] = (S.stats[k] || 0) + n; save(); return S.stats[k]; };
export const statMax = (k, v) => { if (v > (S.stats[k] || 0)) { S.stats[k] = v; save(); } return S.stats[k] || 0; };
