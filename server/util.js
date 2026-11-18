'use strict';
const crypto = require('crypto');

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => shuffle(a).slice(0, n);
const newId = (prefix = '') => prefix + crypto.randomBytes(5).toString('hex');
const newToken = () => crypto.randomBytes(16).toString('hex');

/** Normalise user text: drop control/bidi chars, collapse whitespace, clamp length (by characters). */
function cleanText(s, max = 140) {
  if (typeof s !== 'string') return '';
  s = s.replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, max).join('').trim() : s;
}

/** Validate a base64 image data URL. Returns {mime, buf} or null. */
function parseImageDataUrl(str, maxBytes) {
  if (typeof str !== 'string' || str.length > maxBytes * 1.4 + 100) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(str);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > maxBytes) return null;
  const mime = m[1];
  const ok =
    (mime === 'image/jpeg' && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (mime === 'image/png' && buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
    (mime === 'image/webp' && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP');
  return ok ? { mime, buf } : null;
}

module.exports = { shuffle, pick, sample, newId, newToken, cleanText, parseImageDataUrl };
