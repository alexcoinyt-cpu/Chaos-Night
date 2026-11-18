// Coins, XP/levels, combo multiplier, achievements, daily reward, prize wheel, unlock rules.
import { G, hap } from './game.js';
import { S, save, stat, statMax } from './save.js';

export const levelOf = xp => 1 + Math.floor(Math.sqrt(xp / 60));
export const xpAt = lv => 60 * (lv - 1) * (lv - 1);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const yesterday = () => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const ACH = [
  { id: 'hello', name: 'Hello, Physics', desc: 'Land your first hit.', coins: 20, test: s => s.hits >= 1 },
  { id: 'sliced3', name: 'Sliced in three', desc: 'Cut Dumpling into 3+ pieces.', coins: 120, test: s => s.maxPieces >= 3 },
  { id: 'orbital', name: 'Orbital launch', desc: 'Reach 220 m altitude.', coins: 200, test: s => s.maxAlt >= 2200 },
  { id: 'hugstreak', name: 'Gentle Hug Streak', desc: '5 gentle actions in a row.', coins: 100, test: s => s.gentleStreakMax >= 5 },
  { id: 'bandit', name: 'Button Bandit', desc: 'Lose both button eyes.', coins: 80, test: s => s.bothEyes >= 1 },
  { id: 'limbless', name: 'Limbless Wonder', desc: 'All four limbs off at once.', coins: 250, test: s => s.limbless >= 1 },
  { id: 'headover', name: 'Head Over Heels', desc: 'Pop his head off.', coins: 90, test: s => s.headOff >= 1 },
  { id: 'toasty', name: 'Perfectly Toasty', desc: 'Get him golden brown.', coins: 70, test: s => s.toasted >= 1 },
  { id: 'popsicle', name: 'Plush Popsicle', desc: 'Freeze him solid.', coins: 70, test: s => s.frozen >= 1 },
  { id: 'combo5', name: 'Combo Maestro', desc: 'Reach a x5 multiplier.', coins: 150, test: s => s.maxMult >= 5 },
  { id: 'stitch10', name: 'Stitch Witch', desc: 'Stitch him back 10 times.', coins: 100, test: s => s.stitches >= 10 },
  { id: 'fashion', name: 'Wardrobe Malfunction', desc: 'Wear an outfit.', coins: 40, test: s => s.outfits >= 1 },
  { id: 'photo', name: 'Photogenic', desc: 'Apply a custom image.', coins: 60, test: s => s.images >= 1 },
  { id: 'tour', name: 'World Tour', desc: 'Visit all 6 rooms.', coins: 200, test: s => (s.roomsSeen || 0) >= 6 },
  { id: 'rube', name: 'Contraption Creator', desc: 'Trigger a 3-device chain.', coins: 180, test: s => s.chain3 >= 1 },
  { id: 'spender', name: 'Big Spender', desc: 'Spend 1000 coins.', coins: 100, test: s => s.spent >= 1000 },
  { id: 'cutfine', name: 'Cutting It Fine', desc: 'Make 50 cuts.', coins: 80, test: s => s.cuts >= 50 },
  { id: 'streak3', name: 'Regular Visitor', desc: '3-day daily streak.', coins: 90, test: s => s.dailyStreak >= 3 },
  { id: 'tourist', name: 'Tool Tourist', desc: 'Try 25 different tools.', coins: 200, test: s => (s.toolsUsed || 0) >= 25 },
  { id: 'rewind', name: 'Back to the Future-ish', desc: 'Rewind time.', coins: 60, test: s => s.rewinds >= 1 },
  { id: 'pie', name: 'Pie Chart', desc: 'Get pied.', coins: 40, test: s => s.pies >= 1 },
  { id: 'bigbang', name: 'Big Hit Energy', desc: 'A single hit worth 60+ force.', coins: 120, test: s => s.best >= 60 },
];
export const Econ = {
  chain: 0, chainT: 0, mult: 1, boostT: 0,
  get level() { return levelOf(S.xpTotal); },
  addCoins(n) { S.coins += n; S.xpTotal += Math.max(0, n); save(); },
  spend(n) { if (S.coins < n) return false; S.coins -= n; stat('spent', n); save(); this.checkAch(); return true; },
  update(dt) {
    if (this.chain > 0) { this.chainT -= dt; if (this.chainT <= 0) { this.chain = 0; } }
    if (this.boostT > 0) this.boostT -= dt;
    this.mult = Math.min(8, 1 + Math.floor(this.chain / 3)) * (this.boostT > 0 ? 2 : 1);
  },
  meter() { return this.chain === 0 ? 0 : (this.chain % 3) / 3 + (this.mult >= 8 ? 1 : 0); },
  bump(n = 1) { this.chain += n; this.chainT = 2.2; const m = Math.min(8, 1 + Math.floor(this.chain / 3)); statMax('maxMult', m); if (m > (this._lastM || 1)) { G.audio.play('ding', { pitch: 1 + m * 0.06 }); } this._lastM = m; },
  // award coins for an event; returns coins gained
  reward(base, o = {}) {
    if (o.chain !== false) this.bump(o.gentle ? 1 : o.chainN || 1);
    const m = o.gentle ? Math.max(1, this.mult) : this.mult, n = Math.max(1, Math.round(base * m * (o.gentle ? 2 : 1)));
    this.addCoins(n);
    if (o.at && n >= (o.min ?? 3)) G.fx.text(o.at.x, o.at.y - 20, `+${n}${o.gentle ? ' 💗' : ''}`, { color: o.gentle ? '#ff9ac8' : '#ffd54a', size: 16 + Math.min(10, m * 1.5) });
    this.checkAch(); return n;
  },
  checkAch() {
    const st = Object.assign({}, S.stats); st.dailyStreak = S.daily.streak; st.best = S.best;
    for (const a of ACH) if (!S.ach[a.id] && a.test(st)) { S.ach[a.id] = 1; this.addCoins(a.coins); G.ui && G.ui.toast(`🏆 ${a.name}  +${a.coins}🪙`); G.audio.play('fanfare'); G.fx.sparkleBurst(G.plush.center().x, G.plush.center().y - 80, 14); save(); }
  },
  // ---- shop rules ----
  toolOwned(t) { return t.cost === 0 || !!S.unlocked.tools[t.id]; },
  toolLevelOk(t) { return this.level >= t.level; },
  owned(kind, id, price) { return price === 0 || !!S.unlocked[kind][id]; },
  buy(kind, id, price) { if (S.unlocked[kind][id] || price === 0) return true; if (!this.spend(price)) return false; S.unlocked[kind][id] = 1; save(); G.audio.play('coin'); return true; },
  // ---- daily + wheel ----
  dailyReady() { return S.daily.last !== today(); },
  claimDaily() {
    if (!this.dailyReady()) return 0; S.daily.streak = S.daily.last === yesterday() ? S.daily.streak + 1 : 1; S.daily.last = today();
    const n = 50 + 25 * Math.min(S.daily.streak, 7); this.addCoins(n); save(); this.checkAch(); return n;
  },
  wheelReady() { return S.wheel.last !== today(); },
  PRIZES: [{ t: 'coins', n: 25, l: '25🪙' }, { t: 'coins', n: 60, l: '60🪙' }, { t: 'coins', n: 120, l: '120🪙' }, { t: 'boost', l: 'x2 combo!' }, { t: 'coins', n: 40, l: '40🪙' }, { t: 'unlock', l: 'Free unlock' }, { t: 'coins', n: 250, l: '250🪙' }, { t: 'coins', n: 80, l: '80🪙' }],
  spinWheel(paid) {
    if (paid) { if (!this.spend(40)) return null; } else { if (!this.wheelReady()) return null; S.wheel.last = today(); }
    const i = (Math.random() * this.PRIZES.length) | 0, p = this.PRIZES[i]; let msg = p.l;
    if (p.t === 'coins') this.addCoins(p.n); else if (p.t === 'boost') { this.boostT = 60; msg = 'x2 multiplier for 60s'; }
    else { const pool = []; G.catalog && G.catalog.lockedItems().forEach(x => pool.push(x)); if (pool.length) { const x = pool[(Math.random() * pool.length) | 0]; S.unlocked[x.kind][x.id] = 1; msg = 'Unlocked ' + x.name; } else { this.addCoins(100); msg = '100🪙'; } }
    save(); return { i, msg };
  },
};
