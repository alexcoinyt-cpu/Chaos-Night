// HUD, dock, and every modal: menu, shop, rooms, rewards, achievements, settings, face maker, Rube mode.
import { G } from './game.js';
import { S, save, resetAll } from './save.js';
import { Econ, levelOf, xpAt, ACH } from './economy.js';
import { TOOLS, CATS, toolById } from './tools/index.js';
import { useTool } from './input.js';
import { SPECIES, OUTFITS } from './species.js';
import { ROOM_LIST, setRoom } from './rooms.js';
import { FACE_OPTS, randomFace, speciesFace, currentFace, drawFace } from './faces.js';
import { Tex } from './textures.js';
import { openLab, resetImages } from './images.js';
import { Contra, DEVICES, DEVICE_LIST, COMBOS } from './contraptions.js';
import { BACKSTORY, NAME } from './reactions.js';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const UI = {
  cat: 'smash', shopTab: 'tools', rubeMode: 'place', rubeDev: 'trampoline', linkFrom: null, dragDev: null,
  toast(msg) { const t = $('toast'); while (t.children.length >= 3) t.firstChild.remove(); const d = document.createElement('div'); d.textContent = msg; t.appendChild(d); setTimeout(() => d.remove(), 3100); },
  init() {
    G.ui = this; G.catalog = this; this.buildDock(); this.selectTool('hand');
    $('btnStitch').onclick = () => { G.audio.init(); G.plush.stitchBack(); };
    $('btnMute').onclick = () => { G.audio.init(); G.audio.setMuted(!S.settings.mute); this.hud(true); };
    $('btnRegen').onclick = () => { S.settings.autoRegen = !S.settings.autoRegen; save(); this.hud(true); this.toast(S.settings.autoRegen ? '♻️ Auto-regen ON: he mends himself when left alone' : '♻️ Auto-regen off'); };
    $('btnClear').onclick = () => { G.physics.clearProps(); Contra.clear(); G.fx.clear(); G.fx.strands.length = 0; this.toast('Swept up the mess 🧹'); };
    $('btnMenu').onclick = () => { G.audio.init(); this.openMenu(); };
    $('btnReplay').onclick = () => G.replay.play();
    $('btnShot').onclick = () => G.replay.screenshot();
    $('modalX').onclick = () => this.closeModal(); $('modal').onclick = e => { if (e.target.id === 'modal') this.closeModal(); };
    this.hud(true);
  },
  // ---------- dock ----------
  buildDock() {
    const cats = $('cats'); cats.innerHTML = '';
    for (const c of CATS) { const b = document.createElement('button'); b.textContent = `${c.icon} ${c.name}`; b.dataset.cat = c.id; b.onclick = () => { this.cat = c.id; this.buildTools(); this.markCats(); }; cats.appendChild(b); }
    this.markCats(); this.buildTools();
  },
  markCats() { [...$('cats').children].forEach(b => b.classList.toggle('on', b.dataset.cat === this.cat)); },
  buildTools() {
    const box = $('tools'); box.innerHTML = '';
    const list = TOOLS.filter(t => t.cat === this.cat);
    for (const t of list) {
      const owned = Econ.toolOwned(t), lvl = Econ.toolLevelOk(t), b = document.createElement('button');
      b.className = 'tool' + (G.toolId === t.id ? ' on' : '') + (owned ? '' : ' lock'); b.dataset.id = t.id;
      b.innerHTML = `<span class="ic">${t.icon}</span><span class="nm">${esc(t.name)}</span>${owned ? '' : `<span class="lk">${lvl ? '🪙' + t.cost : '🔒Lv' + t.level}</span>`}${t.gentle ? '<span class="gt">💗</span>' : ''}`;
      b.onclick = () => this.pickTool(t); box.appendChild(b);
    }
  },
  pickTool(t) {
    G.audio.init();
    if (!Econ.toolOwned(t)) { this.openShop('tools'); this.toast(Econ.toolLevelOk(t) ? `${t.name}: ${t.cost}🪙 in the shop` : `${t.name} unlocks at level ${t.level}`); return; }
    if (t.type === 'global') { G.toolId = G.toolId; useTool(t, { x: 0, y: 0, dt: 0 }); this.flashTool(t.id); return; }
    this.selectTool(t.id);
  },
  flashTool(id) { const b = $('tools').querySelector(`[data-id="${id}"]`); if (b) { b.style.transform = 'scale(.9)'; setTimeout(() => b.style.transform = '', 160); } },
  selectTool(id) {
    const t = toolById(id); G.tool = t; G.toolId = id; G.cursor = null; this.cat = t.cat; this.markCats(); this.buildTools();
    $('toolhint').textContent = t.hint || ''; if (this._ht) clearTimeout(this._ht); this._ht = setTimeout(() => { if (G.toolId === id && !G.rube) $('toolhint').textContent = ''; }, 3800);
  },
  hud(force) {
    const lv = levelOf(S.xpTotal), a = xpAt(lv), b = xpAt(lv + 1), co = Math.floor(S.coins);
    if (force || this._c !== co) { this._c = co; $('coins').innerHTML = `🪙 <b>${co}</b>`; }
    if (force || this._x !== S.xpTotal) { this._x = S.xpTotal; $('lvl').innerHTML = `Lv <b>${lv}</b><u><i style="width:${Math.min(100, (S.xpTotal - a) / (b - a) * 100)}%"></i></u>`; }
    $('meter').firstElementChild.style.width = Math.min(100, Econ.meter() * 100) + '%'; $('meter').lastElementChild.textContent = 'x' + Econ.mult;
    $('btnMute').textContent = S.settings.mute ? '🔇' : '🔊'; $('btnRegen').classList.toggle('on', S.settings.autoRegen);
    $('stuffbar').firstElementChild.style.width = (G.plush ? G.plush.stuffing * 100 : 100) + '%';
    $('menuDot').hidden = !(Econ.dailyReady() || Econ.wheelReady());
    if (this._lv && lv > this._lv) { this.toast(`⭐ Level ${lv}! New toys in the shop.`); G.audio.play('fanfare'); this.buildTools(); } this._lv = lv;
  },
  openModal(html) { $('sheetBody').innerHTML = html; $('modal').hidden = false; $('sheet').scrollTop = 0; },
  closeModal() { $('modal').hidden = true; $('sheetBody').innerHTML = ''; this._faceRaf && cancelAnimationFrame(this._faceRaf); this._faceRaf = 0; this._wheel = null; },
  lockedItems() {
    const out = []; TOOLS.forEach(t => { if (!Econ.toolOwned(t)) out.push({ kind: 'tools', id: t.id, name: t.name }); });
    Object.entries(SPECIES).forEach(([id, s]) => { if (!S.unlocked.species[id] && s.price) out.push({ kind: 'species', id, name: s.name }); });
    OUTFITS.forEach(o => { if (!S.unlocked.outfits[o.id] && o.price) out.push({ kind: 'outfits', id: o.id, name: o.name }); });
    ROOM_LIST.forEach(r => { if (!S.unlocked.rooms[r.id] && r.price) out.push({ kind: 'rooms', id: r.id, name: r.name }); });
    return out;
  },
  // ---------- menu ----------
  openMenu() {
    this.openModal(`<h2>🧸 Plush Pal Chaos Lab</h2><div class="menu">
      <button data-m="shop">🛍️ Shop<small>Tools, skins, outfits, rooms</small></button>
      <button data-m="lab">🖼️ Image Lab<small>Put your own photo on his face, body, or whole plush (stays on this device)</small></button>
      <button data-m="face">🙂 Face Maker<small>Mix eyes, mouths, brows. Or roll the dice.</small></button>
      <button data-m="rooms">🏠 Rooms<small>Different physics and props</small></button>
      <button data-m="rewards">🎁 Daily Reward &amp; Prize Wheel${Econ.dailyReady() || Econ.wheelReady() ? ' <b style="color:var(--pink)">● ready</b>' : ''}</button>
      <button data-m="ach">🏆 Achievements<small>${Object.keys(S.ach).length}/${ACH.length} earned</small></button>
      <button data-m="rube">🔧 Rube Goldberg Mode<small>Place, link and run contraptions</small></button>
      <button data-m="settings">⚙️ Settings</button>
      <button data-m="about">📖 Meet ${NAME.split(' ')[0]}</button></div>`);
    $('sheetBody').querySelectorAll('[data-m]').forEach(b => b.onclick = () => this['open_' + b.dataset.m]());
  },
  open_shop() { this.openShop(this.shopTab); }, open_lab() { openLab(); }, open_face() { this.openFace(); }, open_rooms() { this.openRooms(); }, open_rewards() { this.openRewards(); }, open_ach() { this.openAch(); },
  open_rube() { this.closeModal(); this.setRube(true); }, open_settings() { this.openSettings(); }, open_about() { this.openAbout(); },
  // ---------- shop ----------
  openShop(tab = 'tools') {
    this.shopTab = tab; const tabs = [['tools', '🧰 Tools'], ['species', '🧸 Skins'], ['outfits', '🎩 Outfits'], ['rooms', '🏠 Rooms']];
    let body = '';
    if (tab === 'tools') {
      body = `<p>Reach the level, pay the coins, play the toy. You are level <b>${Econ.level}</b>.</p><div class="grid">` + TOOLS.filter(t => t.cost > 0).sort((a, b) => a.level - b.level || a.cost - b.cost).map(t => {
        const own = Econ.toolOwned(t), lv = Econ.toolLevelOk(t); return `<div class="card"><span class="ic">${t.icon}</span><b>${esc(t.name)}</b><span>${own ? '✅ Owned' : (lv ? `🪙 ${t.cost}` : `🔒 Level ${t.level}`)}</span>${own ? '' : `<button data-buy="tools:${t.id}:${t.cost}" ${lv && S.coins >= t.cost ? '' : 'disabled'}>Buy</button>`}</div>`; }).join('') + '</div>';
    } else if (tab === 'species') {
      body = '<div class="grid">' + Object.entries(SPECIES).map(([id, s]) => { const own = Econ.owned('species', id, s.price); return `<div class="card ${S.equip.species === id ? 'on' : ''}"><span class="ic">${s.icon}</span><b>${s.name}</b>${own ? `<button data-wear="species:${id}">${S.equip.species === id ? 'Wearing' : 'Wear'}</button>` : `<span>🪙 ${s.price}</span><button data-buy="species:${id}:${s.price}" ${S.coins >= s.price ? '' : 'disabled'}>Buy</button>`}</div>`; }).join('') + '</div>';
    } else if (tab === 'outfits') {
      body = '<div class="grid">' + OUTFITS.map(o => { const own = Econ.owned('outfits', o.id, o.price), on = o.id === 'none' ? (S.equip.head === 'none' && S.equip.body === 'none') : (S.equip[o.slot] === o.id); return `<div class="card ${on ? 'on' : ''}"><span class="ic">${o.icon}</span><b>${o.name}</b>${own ? `<button data-wear="outfits:${o.id}">${on ? 'Worn' : 'Wear'}</button>` : `<span>🪙 ${o.price}</span><button data-buy="outfits:${o.id}:${o.price}" ${S.coins >= o.price ? '' : 'disabled'}>Buy</button>`}</div>`; }).join('') + '</div>';
    } else {
      body = '<div class="grid">' + ROOM_LIST.map(r => { const own = Econ.owned('rooms', r.id, r.price); return `<div class="card ${S.equip.room === r.id ? 'on' : ''}"><span class="ic">${r.icon}</span><b>${r.name}</b>${own ? `<button data-wear="rooms:${r.id}">${S.equip.room === r.id ? 'Here' : 'Visit'}</button>` : `<span>🪙 ${r.price}</span><button data-buy="rooms:${r.id}:${r.price}" ${S.coins >= r.price ? '' : 'disabled'}>Buy</button>`}</div>`; }).join('') + '</div>';
    }
    this.openModal(`<h2>🛍️ Shop <small style="color:var(--gold)">🪙 ${Math.floor(S.coins)}</small></h2><div class="row">${tabs.map(([k, n]) => `<button class="btn ${k === tab ? 'gold' : 'alt'}" data-tab="${k}">${n}</button>`).join('')}</div>${body}`);
    const root = $('sheetBody'); root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => this.openShop(b.dataset.tab));
    root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const [k, id, p] = b.dataset.buy.split(':'); if (Econ.buy(k, id, +p)) { this.toast('Purchased! 🎉'); this.buildTools(); this.openShop(tab); } });
    root.querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { const [k, id] = b.dataset.wear.split(':'); this.wear(k, id); this.openShop(tab); });
  },
  wear(k, id) {
    if (k === 'species') { S.equip.species = id; G.rebake(); } else if (k === 'rooms') { this.visit(id); }
    else if (k === 'outfits') { const o = OUTFITS.find(x => x.id === id); if (id === 'none') { S.equip.head = S.equip.body = 'none'; } else if (S.equip[o.slot] === id) S.equip[o.slot] = 'none'; else { S.equip[o.slot] = id; S.stats.outfits = (S.stats.outfits || 0) + 1; } Econ.checkAch(); }
    save(); G.audio.play('ding', { vol: 0.5 });
  },
  visit(id) { setRoom(id); S.equip.room = id; S.stats.rv = S.stats.rv || {}; S.stats.rv[id] = 1; S.stats.roomsSeen = Object.keys(S.stats.rv).length; save(); Econ.checkAch(); G.react.say(`New room: ${G.room.name}. I approve.`, { prio: 3 }); },
  openRooms() { this.openShop('rooms'); },
  // ---------- rewards ----------
  openRewards() {
    const ready = Econ.dailyReady(), wr = Econ.wheelReady();
    this.openModal(`<h2>🎁 Daily Reward</h2><p>Streak: <b>${S.daily.streak}</b> day(s). Come back each day for a bigger reward!</p><div class="row"><button class="btn gold" id="claim" ${ready ? '' : 'disabled'}>${ready ? `Claim ${50 + 25 * Math.min((S.daily.last && ready ? S.daily.streak + 1 : 1), 7)}🪙` : 'Claimed today ✅'}</button></div>
      <h2>🎡 Prize Wheel</h2><p>${wr ? 'Your free daily spin is ready!' : 'Extra spins cost 40🪙.'}</p><canvas id="wheelCv" width="300" height="300" style="display:block;margin:0 auto;max-width:100%"></canvas><div class="row" style="justify-content:center"><button class="btn" id="spin">${wr ? 'FREE SPIN' : 'Spin (40🪙)'}</button></div><p id="wheelMsg" style="text-align:center;font-weight:800;color:var(--gold)"></p>`);
    this._wheel = { a: 0 }; this.drawWheel(0);
    $('claim').onclick = () => { const n = Econ.claimDaily(); if (n) { this.toast(`🎁 +${n} coins!`); G.audio.play('fanfare'); this.openRewards(); } };
    $('spin').onclick = () => { if (this._wheel.spinning) return; const r = Econ.spinWheel(!wr); if (!r) { this.toast('Not enough coins'); return; } this._wheel.spinning = true; G.audio.play('whoosh');
      const n = Econ.PRIZES.length, target = Math.PI * 2 * 6 + (-(r.i + 0.5) / n * Math.PI * 2) - Math.PI / 2 + Math.PI * 2, start = performance.now(), a0 = this._wheel.a % (Math.PI * 2);
      const step = (t) => { if (!this._wheel) return; const u = Math.min(1, (t - start) / 3200), e = 1 - Math.pow(1 - u, 3); this._wheel.a = a0 + (target - a0) * e; this.drawWheel(this._wheel.a); if (u < 1) requestAnimationFrame(step); else { this._wheel.spinning = false; $('wheelMsg').textContent = '🎉 ' + r.msg; G.audio.play('fanfare'); this.buildTools(); this.hud(true); } };
      requestAnimationFrame(step); };
  },
  drawWheel(a) {
    const cv = $('wheelCv'); if (!cv) return; const c = cv.getContext('2d'), n = Econ.PRIZES.length, R = 140; c.clearRect(0, 0, 300, 300); c.save(); c.translate(150, 150); c.rotate(a);
    for (let i = 0; i < n; i++) { c.fillStyle = ['#ff7eb6', '#ffd54a', '#6ee7b7', '#7ad7f0', '#b08cff', '#ff9a3c', '#9be36b', '#ffb3c8'][i]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, i / n * 6.283, (i + 1) / n * 6.283); c.fill(); c.save(); c.rotate((i + 0.5) / n * 6.283); c.fillStyle = '#2a1f3d'; c.font = '800 14px sans-serif'; c.textAlign = 'right'; c.fillText(Econ.PRIZES[i].l, R - 10, 5); c.restore(); }
    c.restore(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(150, 4); c.lineTo(138, -14); c.lineTo(162, -14); c.fill(); c.beginPath(); c.moveTo(150, 22); c.lineTo(138, 0); c.lineTo(162, 0); c.fillStyle = '#2a1f3d'; c.fill();
  },
  // ---------- achievements ----------
  openAch() { this.openModal(`<h2>🏆 Achievements</h2><div class="grid">${ACH.map(a => `<div class="card ${S.ach[a.id] ? 'on' : ''}" style="opacity:${S.ach[a.id] ? 1 : 0.65}"><span class="ic">${S.ach[a.id] ? '🏆' : '🔒'}</span><b>${a.name}</b><span>${a.desc}</span><span>+${a.coins}🪙</span></div>`).join('')}</div><h3>Combos</h3><p>${COMBOS.map(c => `<b>${c.name}</b>: ${c.seq.join(' → ')}`).join('<br>')}</p>`); },
  // ---------- settings / about ----------
  openSettings() {
    const row = (k, l) => `<div class="row"><button class="btn ${S.settings[k] ? 'gold' : 'alt'}" data-set="${k}">${S.settings[k] ? 'ON' : 'OFF'}</button> ${l}</div>`;
    this.openModal(`<h2>⚙️ Settings</h2>${row('mute', '🔇 Mute all sound')}${row('haptics', '📳 Haptics (phone buzz)')}${row('shake', '🫨 Screen shake')}${row('autoRegen', '♻️ Auto-regen when left alone')}
      <div class="row"><button class="btn alt" id="s1">📸 Screenshot</button><button class="btn alt" id="s2">🎬 Save replay clip</button><button class="btn alt" id="s3">🖼️ Reset all images</button></div>
      <p>Everything is saved only in this browser (settings, coins, unlocks, your gallery). No accounts, no uploads. Only screenshot and clip downloads you press yourself.</p>
      <div class="row"><button class="btn alt" id="wipe" style="background:#6b2a3a">🗑️ Erase ALL progress</button></div>`);
    $('sheetBody').querySelectorAll('[data-set]').forEach(b => b.onclick = () => { const k = b.dataset.set; if (k === 'mute') G.audio.setMuted(!S.settings.mute); else S.settings[k] = !S.settings[k]; save(); this.hud(true); this.openSettings(); });
    $('s1').onclick = () => { this.closeModal(); setTimeout(() => G.replay.screenshot(), 80); }; $('s2').onclick = () => { this.closeModal(); G.replay.saveClip(); }; $('s3').onclick = () => { resetImages(); };
    $('wipe').onclick = () => { if (confirm('Erase all coins, unlocks and images in this browser?')) resetAll(); };
  },
  openAbout() { this.openModal(`<h2>📖 ${esc(NAME)}</h2><p>${esc(BACKSTORY)}</p><p>No blood, no gore, ever: he is fabric and cotton. Seams rip, buttons fly, stuffing poofs, and a little thread and a hug always puts him right.</p><p><b>Tips:</b> Chain hits quickly for a multiplier. Gentle tools earn double coins. Try combos like Catapult → Trampoline → Leaf Blower.</p>`); },
  // ---------- face maker ----------
  openFace() {
    let mood = 'idle'; const f = () => currentFace();
    const sel = (k) => `<div class="pickrow"><label>${k}</label><select data-k="${k}">${FACE_OPTS[k].map(o => `<option ${f()[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    const render = () => {
      this.openModal(`<h2>🙂 Face Maker</h2><canvas id="facePrev" class="faceprev" width="260" height="230"></canvas>
        <div class="row" style="justify-content:center">${['idle', 'grin', 'ouch', 'dizzy', 'shock', 'sad', 'love', 'sleepy'].map(m => `<button class="btn ${m === mood ? 'gold' : 'alt'}" data-mood="${m}" style="padding:4px 8px">${m}</button>`).join('')}</div>
        ${sel('eyes')}${sel('mouth')}${sel('brows')}${sel('nose')}
        <div class="pickrow"><label>Size</label><input type="range" id="fsize" min="5" max="14" step="0.5" value="${f().size}"></div><div class="pickrow"><label>Gap</label><input type="range" id="fgap" min="12" max="30" step="1" value="${f().gap}"></div><div class="pickrow"><label>Height</label><input type="range" id="fy" min="-14" max="6" step="1" value="${f().y}"></div>
        <div class="row"><button class="btn gold" id="dice">🎲 Random face</button><button class="btn alt" id="freset">↩ Species default</button><label style="font-size:13px"><input type="checkbox" id="chk" ${f().cheeks ? 'checked' : ''}> blush</label></div>
        <p>${S.skin.face || S.skin.whole ? 'A photo is on his face right now, so these features are hidden. Remove the image in the Image Lab to see them.' : 'Changes apply instantly.'}</p>`);
      const root = $('sheetBody'); const set = (k, v) => { S.face = Object.assign({}, f(), { [k]: v }); save(); };
      root.querySelectorAll('select').forEach(s => s.onchange = () => set(s.dataset.k, s.value));
      root.querySelector('#fsize').oninput = e => set('size', +e.target.value); root.querySelector('#fgap').oninput = e => set('gap', +e.target.value); root.querySelector('#fy').oninput = e => set('y', +e.target.value); root.querySelector('#chk').onchange = e => set('cheeks', e.target.checked);
      root.querySelector('#dice').onclick = () => { S.face = randomFace(); save(); G.audio.play('pop'); render(); };
      root.querySelector('#freset').onclick = () => { S.face = null; save(); render(); };
      root.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => { mood = b.dataset.mood; root.querySelectorAll('[data-mood]').forEach(x => x.className = 'btn ' + (x === b ? 'gold' : 'alt')); });
      const cv = root.querySelector('#facePrev'), c = cv.getContext('2d'), start = performance.now();
      const loop = (t) => { if ($('modal').hidden || !$('facePrev')) return; c.clearRect(0, 0, 260, 230); const tx = Tex.parts.head && Tex.parts.head.base; c.save(); c.translate(130, 118); c.scale(1.9, 1.9); if (tx) c.drawImage(tx, -56, -50, 112, 100); drawFace(c, f(), { mood, image: false, eyes: { L: true, R: true }, look: { x: Math.sin(t / 700) * 50, y: 10 }, pie: 0 }, (t - start) / 1000); c.restore(); this._faceRaf = requestAnimationFrame(loop); };
      this._faceRaf = requestAnimationFrame(loop);
    };
    render();
  },
  // ---------- Rube Goldberg mode ----------
  setRube(on) {
    G.rube = on; $('rube').hidden = !on; $('cats').hidden = on; $('tools').hidden = on; this.linkFrom = null;
    if (on) { this.buildRube(); $('toolhint').textContent = 'Rube mode: pick a device, tap to place. Use Link to connect A → B, then Go!'; G.react.say('Contraptions! My favourite kind of trouble.', { prio: 3 }); }
    else { $('toolhint').textContent = ''; Contra.save(); this.buildDock(); }
    setTimeout(() => import('./render.js').then(m => m.resize()), 50);
  },
  buildRube() {
    const modes = [['place', '➕ Place'], ['move', '✋ Move'], ['link', '🔗 Link'], ['rot', '🔄 Rotate/Flip'], ['del', '🗑 Delete'], ['grab', '🧸 Grab Dumpling']];
    $('rube').innerHTML = modes.map(([k, n]) => `<button data-mode="${k}" class="${this.rubeMode === k ? 'on' : ''}">${n}</button>`).join('') + `<button id="rgo">▶ GO</button><button id="rclr">Clear</button><button id="rexit">✕ Exit</button>` +
      `<span style="flex:none;width:8px"></span>` + DEVICE_LIST.map(d => `<button data-dev="${d}" class="${this.rubeDev === d ? 'on' : ''}">${DEVICES[d].icon} ${DEVICES[d].name}</button>`).join('');
    const r = $('rube'); r.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { this.rubeMode = b.dataset.mode; this.linkFrom = null; this.buildRube(); });
    r.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => { this.rubeDev = b.dataset.dev; this.rubeMode = 'place'; this.buildRube(); });
    $('rgo').onclick = () => { G.audio.init(); Contra.go(); }; $('rclr').onclick = () => { Contra.clear(); Contra.save(); }; $('rexit').onclick = () => this.setRube(false);
    G.rubeMode = this.rubeMode;
  },
  rubePointer(phase, pt) {
    G.rubeMode = this.rubeMode; const mode = this.rubeMode, hit = Contra.pick(pt.x, pt.y);
    if (mode === 'grab') return;
    if (phase === 'down') {
      if (mode === 'place') { const y = pt.y > -70 && !['ramp', 'slide'].includes(this.rubeDev) ? -(DEVICES[this.rubeDev].h || 30) / 2 : pt.y; const d = Contra.add(this.rubeDev, pt.x, y); if (d) { G.audio.play('pop'); Contra.save(); } }
      else if (mode === 'move') this.dragDev = hit; else if (mode === 'link') this.linkFrom = hit; else if (mode === 'del' && hit) { Contra.remove(hit); Contra.save(); G.audio.play('poof'); }
      else if (mode === 'rot' && hit) { if (hit.type === 'conveyor') hit.dir = -hit.dir; else if (hit.type === 'catapult') hit.flip = !hit.flip; else { hit.a += Math.PI / 8; Matter.Body.setAngle(hit.body, hit.a); } G.audio.play('clink'); Contra.save(); }
    } else if (phase === 'move') { if (mode === 'move' && this.dragDev) Contra.move(this.dragDev, pt.x, pt.y); }
    else if (phase === 'up') { if (mode === 'link' && this.linkFrom && hit && hit !== this.linkFrom) { Contra.link(this.linkFrom, hit); G.audio.play('chime'); Contra.save(); } this.linkFrom = null; if (this.dragDev) { this.dragDev = null; Contra.save(); } }
  },
};
