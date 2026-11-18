// Original cartoon species + outfits. Each has colours, an ear/appendage style, and a pattern.
export const SPECIES = {
  bear:     { name: 'Classic Dumpling', icon: '🧸', price: 0,   main: '#c98f5b', belly: '#f3d9ae', accent: '#9a6238', pad: '#7a4a2a', ears: 'round',  pattern: 'none',    tail: 'round', face: { eyes: 'button', mouth: 'smile', brows: 'none', nose: 'triangle' } },
  bunny:    { name: 'Bun-Bun Noodle',   icon: '🐰', price: 150, main: '#f2d6e4', belly: '#fff6fa', accent: '#f29fc1', pad: '#f29fc1', ears: 'long',   pattern: 'none',    tail: 'pom',   face: { eyes: 'dots', mouth: 'tooth', brows: 'none', nose: 'heart' } },
  cat:      { name: 'Sir Whiskerton',   icon: '🐱', price: 220, main: '#9aa7c7', belly: '#e9edf8', accent: '#5e6a92', pad: '#e58aa6', ears: 'pointy', pattern: 'stripes', tail: 'curl',  face: { eyes: 'googly', mouth: 'cat', brows: 'arch', nose: 'triangle' } },
  dino:     { name: 'Chompsky',         icon: '🦖', price: 320, main: '#72c27a', belly: '#e6f3b0', accent: '#3f8f55', pad: '#3f8f55', ears: 'spikes', pattern: 'spots',   tail: 'dino',  face: { eyes: 'dots', mouth: 'zigzag', brows: 'angry', nose: 'none' } },
  lumpkin:  { name: 'Lumpkin',          icon: '🎃', price: 420, main: '#f39c3d', belly: '#ffd9a0', accent: '#6aa84f', pad: '#c26a1a', ears: 'stem',   pattern: 'ribs',    tail: 'none',  face: { eyes: 'sleepy', mouth: 'wavy', brows: 'bushy', nose: 'dot' } },
  sockeroo: { name: 'Sockeroo',         icon: '🧦', price: 520, main: '#ef6f6c', belly: '#fff2e0', accent: '#3d5a80', pad: '#3d5a80', ears: 'one',    pattern: 'hstripes', tail: 'none', face: { eyes: 'star', mouth: 'tongue', brows: 'unibrow', nose: 'none' } },
  cloudlet: { name: 'Cloudlet',         icon: '☁️', price: 650, main: '#d4e8ff', belly: '#ffffff', accent: '#8fb8ee', pad: '#8fb8ee', ears: 'puff',   pattern: 'none',    tail: 'puff',  face: { eyes: 'sparkle', mouth: 'tiny', brows: 'none', nose: 'none' } },
};
const dk = '#2b1d2e';
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
// all drawn in head flat coords: origin = head centre, top of head at y=-50
export function drawEars(c, sp, spring) {
  const S = SPECIES[sp], a = spring;
  const side = (sg, fn) => { c.save(); c.translate(sg * 34, -40); c.rotate(sg * a * 0.5 + sg * 0.1); fn(sg); c.restore(); };
  c.lineWidth = 2; c.strokeStyle = S.accent;
  switch (S.ears) {
    case 'round': for (const sg of [-1, 1]) side(sg, () => { c.fillStyle = S.main; ell(c, 0, -4, 18, 18); c.fill(); c.stroke(); c.fillStyle = S.belly; ell(c, 0, -3, 9, 9); c.fill(); }); break;
    case 'long': for (const sg of [-1, 1]) { c.save(); c.translate(sg * 24, -44); c.rotate(sg * (0.12 + a * 0.5)); c.fillStyle = S.main; ell(c, 0, -34, 13, 38); c.fill(); c.stroke(); c.fillStyle = S.pad; ell(c, 0, -32, 6, 28); c.fill(); c.restore(); } break;
    case 'pointy': for (const sg of [-1, 1]) side(sg, () => { c.fillStyle = S.main; c.beginPath(); c.moveTo(-15, 4); c.lineTo(sg * 2, -34); c.lineTo(15, 6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = S.pad; c.beginPath(); c.moveTo(-7, 2); c.lineTo(sg * 1, -22); c.lineTo(8, 3); c.fill(); }); break;
    case 'spikes': c.fillStyle = S.accent; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 15 - 9, -44); c.lineTo(i * 15, -64 + Math.abs(i) * 5 + a * i * 2); c.lineTo(i * 15 + 9, -44); c.fill(); } break;
    case 'stem': c.fillStyle = S.accent; c.beginPath(); c.moveTo(-6, -44); c.quadraticCurveTo(-4 + a * 8, -66, 8 + a * 12, -68); c.lineTo(12 + a * 12, -62); c.quadraticCurveTo(4, -54, 6, -44); c.fill(); c.beginPath(); c.moveTo(8, -58); c.quadraticCurveTo(28, -78 + a * 6, 34, -56); c.quadraticCurveTo(20, -60, 8, -58); c.fill(); break;
    case 'one': c.save(); c.translate(-38, -40); c.rotate(-0.5 + a * 0.8); c.fillStyle = S.main; ell(c, 0, -18, 14, 26); c.fill(); c.stroke(); c.fillStyle = S.accent; ell(c, 0, -36, 14, 8); c.fill(); c.restore(); break;
    case 'puff': c.fillStyle = S.main; for (const [x, y, r] of [[-30, -44, 16], [-10, -54, 18], [14, -54, 18], [34, -44, 16]]) { ell(c, x, y + a * 2, r, r); c.fill(); c.stroke(); } break;
  }
}
export function drawTail(c, sp, t) { // torso frame, behind torso, bottom right
  const S = SPECIES[sp]; c.save(); c.translate(40, 44); c.lineWidth = 2; c.strokeStyle = S.accent; c.fillStyle = S.main;
  switch (S.tail) {
    case 'round': ell(c, 12, 4, 12, 12); c.fill(); c.stroke(); break;
    case 'pom': c.fillStyle = '#fff'; ell(c, 12, 4, 14, 14); c.fill(); c.stroke(); break;
    case 'curl': c.lineWidth = 11; c.lineCap = 'round'; c.strokeStyle = S.main; c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(30, 12, 34, -10, 26, -34 + Math.sin(t * 2) * 3); c.stroke(); break;
    case 'dino': c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(30, 0, 44, 22); c.quadraticCurveTo(24, 22, 0, 18); c.fill(); c.stroke(); break;
    case 'puff': c.fillStyle = S.main; for (const [x, y] of [[10, 6], [22, 0], [16, 16]]) { ell(c, x, y, 10, 10); c.fill(); c.stroke(); } break;
  }
  c.restore();
}
// ---------- outfits (slot: head draws in head frame, body in torso frame; layer back/front) ----------
const lw = (c, w, col) => { c.lineWidth = w; c.strokeStyle = col; };
export const OUTFITS = [
  { id: 'none', name: 'Nothing (naked fluff)', icon: '🚫', slot: 'both', price: 0 },
  { id: 'tophat', name: 'Tiny Top Hat', icon: '🎩', slot: 'head', price: 60, draw(c) { c.save(); c.translate(6, -50); c.rotate(0.15); c.fillStyle = '#2b2b3b'; ell(c, 0, 0, 30, 6); c.fill(); c.fillRect(-18, -30, 36, 30); ell(c, 0, -30, 18, 5); c.fill(); c.fillStyle = '#d94f6a'; c.fillRect(-18, -10, 36, 7); c.restore(); } },
  { id: 'party', name: 'Party Cone', icon: '🥳', slot: 'head', price: 50, draw(c) { c.save(); c.translate(0, -48); c.rotate(-0.12); c.fillStyle = '#7ad7f0'; c.beginPath(); c.moveTo(-20, 0); c.lineTo(0, -50); c.lineTo(20, 0); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; for (const [x, y] of [[-6, -10], [6, -22], [-2, -32], [8, -6]]) { ell(c, x, y, 3, 3); c.fill(); } c.fillStyle = '#ff7eb6'; ell(c, 0, -52, 7, 7); c.fill(); c.restore(); } },
  { id: 'crown', name: 'Wobbly Crown', icon: '👑', slot: 'head', price: 120, draw(c) { c.save(); c.translate(0, -48); c.fillStyle = '#ffd54a'; c.strokeStyle = '#c9971a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-24, 0); c.lineTo(-26, -26); c.lineTo(-12, -12); c.lineTo(0, -30); c.lineTo(12, -12); c.lineTo(26, -26); c.lineTo(24, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e8445a'; ell(c, 0, -8, 4, 4); c.fill(); c.restore(); } },
  { id: 'chef', name: 'Chef Puff Hat', icon: '👨‍🍳', slot: 'head', price: 90, draw(c) { c.save(); c.translate(0, -46); c.fillStyle = '#fff'; c.strokeStyle = '#cfd6e6'; c.lineWidth = 2; for (const [x, y, r] of [[-14, -20, 14], [0, -26, 16], [14, -20, 14]]) { ell(c, x, y, r, r); c.fill(); c.stroke(); } c.fillRect(-20, -14, 40, 14); c.strokeRect(-20, -14, 40, 14); c.restore(); } },
  { id: 'prop', name: 'Propeller Beanie', icon: '🚁', slot: 'head', price: 100, draw(c, t) { c.save(); c.translate(0, -48); c.fillStyle = '#4aa8ff'; c.beginPath(); c.ellipse(0, 0, 30, 20, 0, Math.PI, 0); c.fill(); c.fillStyle = '#ffd54a'; c.fillRect(-3, -26, 6, 8); c.save(); c.translate(0, -26); c.scale(Math.cos(t * 18), 1); c.fillStyle = '#e8445a'; ell(c, 0, 0, 26, 3.5); c.fill(); c.restore(); c.restore(); } },
  { id: 'shades', name: 'Cool Shades', icon: '🕶️', slot: 'head', price: 80, draw(c) { c.fillStyle = '#1a1a24'; c.beginPath(); c.roundRect(-34, -14, 30, 20, 8); c.roundRect(4, -14, 30, 20, 8); c.fill(); c.fillRect(-6, -10, 12, 4); c.fillStyle = '#fff4'; c.fillRect(-28, -10, 8, 3); c.fillRect(10, -10, 8, 3); } },
  { id: 'wizard', name: 'Wizard Hat', icon: '🧙', slot: 'head', price: 160, draw(c) { c.save(); c.translate(0, -46); c.rotate(0.1); c.fillStyle = '#5b3fa0'; c.beginPath(); c.moveTo(-36, 0); c.lineTo(8, -66); c.quadraticCurveTo(14, -50, 36, 0); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; c.font = '14px sans-serif'; c.fillText('★', -6, -22); c.fillText('✦', 8, -8); c.restore(); } },
  { id: 'bandana', name: 'Pirate Bandana', icon: '🏴‍☠️', slot: 'head', price: 70, draw(c) { c.fillStyle = '#d94f4f'; c.beginPath(); c.moveTo(-50, -24); c.quadraticCurveTo(0, -62, 50, -24); c.lineTo(48, -14); c.quadraticCurveTo(0, -42, -48, -14); c.closePath(); c.fill(); c.fillStyle = '#fff'; for (const x of [-26, -6, 14, 32]) { ell(c, x, -34 + Math.abs(x) * 0.06, 2.2, 2.2); c.fill(); } c.beginPath(); c.moveTo(46, -20); c.lineTo(66, -10); c.lineTo(58, -2); c.lineTo(44, -12); c.fillStyle = '#d94f4f'; c.fill(); } },
  { id: 'bowtie', name: 'Fancy Bow Tie', icon: '🎀', slot: 'body', layer: 'front', price: 40, draw(c) { c.fillStyle = '#e8445a'; c.beginPath(); c.moveTo(0, -46); c.lineTo(-22, -58); c.lineTo(-22, -34); c.closePath(); c.moveTo(0, -46); c.lineTo(22, -58); c.lineTo(22, -34); c.closePath(); c.fill(); c.fillStyle = '#b02a40'; ell(c, 0, -46, 6, 6); c.fill(); } },
  { id: 'scarf', name: 'Stripey Scarf', icon: '🧣', slot: 'body', layer: 'front', price: 70, draw(c) { c.save(); c.lineCap = 'round'; for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#fff' : '#3aa6a0'; c.beginPath(); c.roundRect(-44 + i * 18, -52, 18, 16, 6); c.fill(); } c.fillStyle = '#3aa6a0'; c.beginPath(); c.roundRect(14, -40, 14, 40, 5); c.fill(); c.fillStyle = '#fff'; c.fillRect(14, -22, 14, 6); c.restore(); } },
  { id: 'cape', name: 'Heroic Cape', icon: '🦸', slot: 'body', layer: 'back', price: 110, draw(c, t) { c.fillStyle = '#d63a54'; c.beginPath(); c.moveTo(-44, -48); c.lineTo(44, -48); c.lineTo(62 + Math.sin(t * 3) * 4, 74); c.lineTo(-62 + Math.sin(t * 3 + 1) * 4, 74); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; ell(c, 0, -46, 8, 8); c.fill(); } },
  { id: 'apron', name: 'Tiny Apron', icon: '🥄', slot: 'body', layer: 'front', price: 60, draw(c) { c.fillStyle = '#fff'; c.strokeStyle = '#cfd6e6'; c.lineWidth = 2; c.beginPath(); c.roundRect(-30, -16, 60, 64, 10); c.fill(); c.stroke(); c.fillStyle = '#7ad7f0'; c.fillRect(-18, 10, 36, 16); } },
  { id: 'medal', name: 'Participation Medal', icon: '🏅', slot: 'body', layer: 'front', price: 50, draw(c) { c.strokeStyle = '#d94f4f'; c.lineWidth = 6; c.beginPath(); c.moveTo(-14, -52); c.lineTo(0, -10); c.lineTo(14, -52); c.stroke(); c.fillStyle = '#ffd54a'; ell(c, 0, -6, 12, 12); c.fill(); c.fillStyle = '#c9971a'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('1', 0, -2); } },
];
export const outfitById = id => OUTFITS.find(o => o.id === id);
