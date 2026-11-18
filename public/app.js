/* Phone controller: join, lobby, private stage UI, host menu. Vanilla JS, no build step. */
(function () {
  const esc = CN.esc;
  const app = document.getElementById('app');
  const banner = document.getElementById('banner');
  let S = null; let recvAt = 0; let cfg = { name: 'Chaos Night', tagline: '', avatars: [] };
  let session = CN.store.get('cn_session');
  let lastSig = ''; let lastStage = null; let lastSec = -1; let menuOpen = false; let menuSig = '';
  let pick = null; let vetoes = new Set(); let autoSent = {}; let avatar = (session && session.avatar) || '';
  const socket = io();

  // ------------------------------------------------------------ connection
  fetch('/config.json').then((r) => r.json()).then((c) => {
    cfg = c; document.title = c.name; if (!avatar) avatar = c.avatars[Math.floor(Math.random() * c.avatars.length)];
    if (!S && !(session && session.code)) landing();
  });
  function saveSession(code, token, name) { session = { code, token, name, avatar }; CN.store.set('cn_session', session); }
  function clearSession() { session = null; CN.store.set('cn_session', null); }
  function rejoin() {
    if (!session || !session.code) return;
    app.innerHTML = '<h1 class="logo">…</h1><p class="tag">Reconnecting…</p>';
    socket.emit('room:join', { code: session.code, token: session.token, name: session.name, avatar }, (res) => {
      if (!res || !res.ok) { clearSession(); S = null; landing(res && res.error); }
    });
  }
  socket.on('connect', () => { banner.style.display = 'none'; if (session && session.code) rejoin(); });
  socket.on('disconnect', () => { banner.className = 'banner'; banner.textContent = 'Connection lost. Reconnecting…'; banner.style.display = 'block'; });
  socket.on('state', (st) => { S = st; recvAt = Date.now(); render(); });
  socket.on('toast', (t) => toast(t.text));
  socket.on('kicked', () => { clearSession(); S = null; landing('You were removed from the room.'); });
  socket.on('closed', () => { clearSession(); S = null; landing('That room was closed.'); });
  socket.on('replaced', () => { banner.className = 'banner'; banner.textContent = 'Opened on another device.'; banner.style.display = 'block'; });

  function toast(text) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // --------------------------------------------------------------- landing
  function landing(err) {
    const params = new URLSearchParams(location.search);
    const code = (params.get('code') || (session && session.code) || '').toUpperCase().slice(0, 4);
    app.innerHTML = `<h1 class="logo">${esc(cfg.name)}</h1><p class="tag">${esc(cfg.tagline)}</p>
      <div class="card"><label for="name">Your name</label><input id="name" maxlength="16" autocomplete="off" value="${esc((session && session.name) || '')}" placeholder="Name">
      <label>Pick your avatar</label><div class="avatars">${cfg.avatars.map((a) => `<button class="av ${a === avatar ? 'sel' : ''}" data-act="avatar" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <label for="code">Room code</label><input id="code" maxlength="4" autocapitalize="characters" autocomplete="off" value="${esc(code)}" placeholder="ABCD" style="text-transform:uppercase;font-size:1.6rem;text-align:center;letter-spacing:.2em">
      <button class="btn pink block" data-act="join">Join game</button>
      <button class="btn blue block" data-act="create">Create a new room</button><p class="err" id="err">${esc(err || '')}</p></div>
      <p class="tag">Got a big screen? Open <b>${esc(location.host)}/tv</b> on it.</p>`;
  }
  function submitJoin(create) {
    const name = document.getElementById('name').value.trim();
    const code = document.getElementById('code').value.trim().toUpperCase();
    const err = document.getElementById('err');
    if (!name) { err.textContent = 'Type a name first.'; return; }
    if (!create && code.length !== 4) { err.textContent = 'Enter the 4-letter room code.'; return; }
    const cb = (res) => {
      if (!res || !res.ok) { err.textContent = (res && res.error) || 'Something went wrong.'; return; }
      saveSession(res.code, res.token, res.name || name);
    };
    if (create) socket.emit('room:create', { name, avatar }, cb);
    else socket.emit('room:join', { code, name, avatar, token: session && session.code === code ? session.token : undefined }, cb);
  }

  // ----------------------------------------------------------------- render
  function render() {
    if (!S) return;
    const st = S.stage;
    const sig = JSON.stringify([S.phase, S.paused, S.you.host, st && [st.id, st.kind, st.over, st.submitted, st.participant, st.rerollsLeft, st.mine, !!st.shared, st.job],
      !st && [S.settings, S.modes.length]]);
    if (st && st.id !== lastStage) {
      lastStage = st.id; pick = null; vetoes = new Set();
      CN.play(st.sfx || 'whoosh');
      if (st.kind === 'final') CN.confetti(120); else if (st.kind === 'reveal' && S.display === 'phone') CN.confetti(40);
    }
    if (sig !== lastSig) { lastSig = sig; draw(); }
    updateDynamic();
    if (menuOpen) { const ms = JSON.stringify([S.phase, S.paused, S.settings, S.players.map((p) => p.id + p.name), S.pool.photos]); if (ms !== menuSig) drawMenu(); }
  }
  function top() {
    return `<div class="top"><div class="chip">${esc(S.you.avatar)} ${esc(S.you.name)} · ⭐ <span id="myscore">${S.you.score}</span></div><div>Room <b>${esc(S.code)}</b></div></div>`;
  }
  function draw() {
    const st = S.stage;
    let h = top();
    h += st ? stageHtml(st) : lobbyHtml();
    h += `<button class="btn mute" data-act="mute" id="mutebtn">${CN.muted ? '🔇' : '🔊'}</button>`;
    if (S.you.host) h += '<button class="btn pink fab" data-act="menu" aria-label="Host menu">⚙️</button>';
    if (S.paused) h += '<div class="pause">⏸<br>Paused by host</div>';
    app.innerHTML = h;
    if (st && st.kind === 'write' && st.participant && !st.submitted) initCanvases();
    updateDynamic();
  }
  function updateDynamic() {
    const st = S.stage;
    const ms = document.getElementById('myscore'); if (ms) ms.textContent = S.you.score;
    const pl = document.getElementById('plist');
    if (pl) pl.innerHTML = S.players.map((p) => `<span class="chip ${p.connected ? '' : 'off'}">${esc(p.avatar)} ${esc(p.name)}${p.host ? ' 👑' : ''}</span>`).join('');
    const pc = document.getElementById('poolcount');
    if (pc) pc.textContent = `Shared so far: ${S.pool.prompts} prompts · ${S.pool.scenarios} scenarios · ${S.pool.names} names · ${S.pool.photos} photos`;
    const w = document.getElementById('waiting');
    if (w && st) w.textContent = st.waiting.length && !st.over ? '⏳ Waiting on: ' + st.waiting.join(', ') : '';
    tick();
  }
  function tick() {
    if (!S || !S.stage) return;
    const st = S.stage; const t = document.getElementById('timer');
    if (st.remainingMs == null) return;
    const rem = S.paused ? st.remainingMs : st.remainingMs - (Date.now() - recvAt);
    const sec = CN.fmtTime(rem);
    if (t) { t.textContent = sec; t.classList.toggle('low', sec <= 5); }
    const bar = document.getElementById('bar'); if (bar) bar.style.width = Math.max(0, (rem / st.totalMs) * 100) + '%';
    if (sec <= 5 && sec > 0 && sec !== lastSec && !S.paused) CN.play('tick');
    lastSec = sec;
    // Auto-submit whatever is typed when time runs out.
    if (rem <= 0 && !S.paused && st.kind === 'write' && st.participant && !st.submitted && !autoSent[st.id]) {
      autoSent[st.id] = true; sendWrite(true);
    }
  }
  setInterval(tick, 250);

  // ------------------------------------------------------------------ lobby
  function lobbyHtml() {
    const host = S.you.host;
    const link = `${location.origin}/?code=${S.code}`;
    let h = `<div class="card hot" style="text-align:center"><b>Room code</b><div class="code">${esc(S.code)}</div>
      <div>Friends join at <b>${esc(location.host)}</b></div>
      <button class="btn small" data-act="share" data-link="${esc(link)}">📤 Share invite link</button></div>
      <div class="card"><h3>Players</h3><div class="players" id="plist"></div></div>`;
    if (host) {
      h += `<div class="card cool"><h3>👑 Pick a game</h3>` + S.modes.map((m) =>
        `<button class="btn block" data-act="mode" data-id="${esc(m.id)}">${esc(m.emoji)} ${esc(m.name)}<br><small>${esc(m.description)}</small></button>`).join('') +
        `<button class="btn pink block" data-act="shuffle">🔀 Shuffle all modes</button></div>`;
    } else {
      h += '<div class="card cool eyes"><span>🎲</span>Waiting for the host to pick a game…</div>';
    }
    h += `<div class="card"><h3>Add to the pool</h3><p>Add your own stuff to the game!</p>
      <select id="ptype"><option value="prompt">Who Said It? prompt</option><option value="scenario">What Do You Do? scenario</option><option value="name">Person for Hot Take</option><option value="photo">Photo for Caption the Chaos</option></select>
      <div id="pform"></div><p id="poolcount"></p></div>`;
    setTimeout(poolForm, 0);
    return h;
  }
  function poolForm() {
    const sel = document.getElementById('ptype'); const f = document.getElementById('pform'); if (!sel || !f) return;
    const draw = () => {
      if (sel.value === 'photo') f.innerHTML = '<input type="file" id="pfile" accept="image/*"><p><small>Your photo stays hidden (and anonymous) until it shows up in a round.</small></p>';
      else f.innerHTML = '<input id="ptext" maxlength="140" placeholder="Type here…"><button class="btn green block" data-act="padd">Add</button>';
      const pf = document.getElementById('pfile'); if (pf) pf.onchange = () => { if (pf.files[0]) uploadPhoto(pf.files[0]); pf.value = ''; };
    };
    sel.onchange = draw; draw();
  }
  function uploadPhoto(file) {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let q = 0.8; let data = c.toDataURL('image/jpeg', q);
      while (data.length > 560000 && q > 0.3) { q -= 0.15; data = c.toDataURL('image/jpeg', q); }
      socket.emit('pool:add', { type: 'photo', dataUrl: data }, (r) => toast(r && r.ok ? 'Photo added! 📸' : (r && r.error) || 'Could not add photo'));
    };
    img.onerror = () => toast('Could not read that image.');
    img.src = url;
  }

  // ----------------------------------------------------------------- stages
  function stageHtml(st) {
    const tvMode = S.display === 'tv';
    let h = `<div class="top"><span class="job">${esc(st.job || 'Look')}</span>${st.remainingMs != null ? '<div class="timer" id="timer"></div>' : ''}</div>`;
    if (st.remainingMs != null) h += '<div class="bar"><i id="bar" style="width:100%"></i></div>';
    h += '<div class="waiting" id="waiting"></div>';
    if (st.title) h += `<h2 class="big">${esc(st.title)}</h2>`;
    if (st.instruction && st.kind !== 'intro') h += `<p>${esc(st.instruction)}</p>`;
    const sh = st.shared;
    switch (st.kind) {
      case 'intro':
        h += sh ? CN.renderShared(st, S) : '<div class="card hot eyes"><span>📺</span>Rules are on the TV!</div>';
        h += st.participant && !st.submitted ? '<button class="btn green block" data-act="ready">Got it! 👍</button>' : '<p class="waiting">You\'re ready ✅</p>';
        break;
      case 'write': h += writeHtml(st); break;
      case 'choose': h += chooseHtml(st); break;
      default: // reveal, scores, final
        if (sh) h += CN.renderShared(st, S);
        else h += `<div class="card hot eyes"><span>📺</span>${tvMode ? 'Eyes on the TV!' : 'Look up!'}</div>` + miniScore();
    }
    if (S.you.host && st.kind === 'final') h += '<button class="btn pink block" data-act="lobby">Back to lobby 🏠</button>';
    return h;
  }
  function miniScore() {
    const me = S.players.slice().sort((a, b) => b.score - a.score);
    const i = me.findIndex((p) => p.id === S.you.id);
    return `<p class="tag">You're #${i + 1} with ${S.you.score} points</p>`;
  }
  function writeHtml(st) {
    if (!st.participant) return '<div class="card cool eyes"><span>🙌</span>' + esc(st.job) + '</div>';
    if (st.submitted) return '<div class="card good eyes"><span>✅</span>Locked in! Waiting for others…</div>';
    const m = st.mine || { fields: [] };
    let h = '';
    if (S.display === 'phone' && st.shared && st.shared.image) h += `<div class="card">${CN.image(st.shared.image, S.code)}</div>`;
    if (m.prompt) h += `<div class="prompt card hot">${esc(m.prompt)}${m.hint ? `<br><small>${esc(m.hint)}</small>` : ''}</div>`;
    if (m.bio) h += `<button class="btn small blue" data-act="bio">🤔 Who's this?</button><div class="card cool" id="bio" hidden>${esc(m.bio)}</div>`;
    if (m.truth) h += `<div class="card good"><b>The TRUE fact (keep it secret!)</b><br>${esc(m.truth)}</div>`;
    m.fields.forEach((f, i) => {
      h += `<label>${esc(f.label)}</label>`;
      if (f.type === 'draw') {
        h += `<canvas class="draw" id="f${i}" data-draw="1" width="400" height="400"></canvas><div class="colors">${['#16113a', '#ff3d81', '#00a8ff', '#2ee59d', '#ffb300', '#7c4dff'].map((c, k) => `<button data-act="color" data-c="${c}" class="${k === 0 ? 'sel' : ''}" style="background:${c}"></button>`).join('')}<button class="btn small" data-act="eraser">🧽</button><button class="btn small" data-act="clear">🗑️</button></div>`;
      } else h += `<textarea id="f${i}" maxlength="${f.max}" placeholder="${esc(f.placeholder)}"></textarea>`;
    });
    h += '<button class="btn green block" data-act="send">Lock it in ✅</button>';
    if (st.rerollsLeft > 0) h += `<button class="btn small" data-act="reroll">🎲 Skip / reroll (${st.rerollsLeft} left)</button>`;
    return h;
  }
  function chooseHtml(st) {
    if (!st.participant) return `<div class="card cool eyes"><span>👀</span>${esc(st.job)}</div>` + (S.display === 'phone' && st.shared ? CN.renderShared(st, S) : '');
    if (st.submitted) return '<div class="card good eyes"><span>✅</span>Vote locked in!</div>';
    const m = st.mine; let h = '';
    if (S.display === 'phone' && st.shared) h += CN.renderShared({ ...st, kind: 'x', shared: { ...st.shared, options: null } }, S);
    h += m.options.map((o) => `<button class="btn opt ${o.disabled ? 'dis' : ''}" data-act="opt" data-id="${esc(o.id)}">${o.avatar ? `<span class="av2">${esc(o.avatar)}</span>` : ''}<span>${esc(o.text)}${o.sub ? `<br><small>${esc(o.sub)}</small>` : ''}</span></button>` +
      (m.vetoable && !o.disabled ? `<button class="btn small pink" data-act="veto" data-id="${esc(o.id)}">🚫 Too far</button>` : '')).join('');
    if (m.vetoable) h += '<button class="btn green block" data-act="lockvote">Lock in my pick 👑</button>';
    return h;
  }

  // ---------------------------------------------------------------- writing
  function collectFields() {
    const st = S.stage; const out = [];
    (st.mine ? st.mine.fields : []).forEach((f, i) => {
      const el = document.getElementById('f' + i); if (!el) return out.push('');
      if (f.type === 'draw') out.push(el.dataset.drew ? el.toDataURL('image/jpeg', 0.6) : '');
      else out.push(el.value);
    });
    return out;
  }
  function sendWrite(auto) {
    const st = S.stage; const fields = collectFields();
    if (auto && !fields.some((x) => x && x.trim())) return;
    socket.emit('submit', { stageId: st.id, data: { fields } }, (r) => { if (r && !r.ok && !auto) toast(r.error || 'Could not submit'); });
  }
  let brush = { color: '#16113a', size: 6 };
  function initCanvases() {
    document.querySelectorAll('canvas[data-draw]').forEach((c) => {
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.lineCap = 'round'; g.lineJoin = 'round';
      let down = false; let last = null;
      const pos = (e) => { const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }; };
      c.addEventListener('pointerdown', (e) => { down = true; last = pos(e); c.setPointerCapture(e.pointerId); c.dataset.drew = '1'; line(g, last, last); e.preventDefault(); });
      c.addEventListener('pointermove', (e) => { if (!down) return; const p = pos(e); line(g, last, p); last = p; e.preventDefault(); });
      const up = () => { down = false; };
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    });
  }
  function line(g, a, b) { g.strokeStyle = brush.color; g.lineWidth = brush.size; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }

  // ---------------------------------------------------------------- actions
  const host = (msg, cb) => socket.emit('host', msg, (r) => { if (r && !r.ok && r.error) toast(r.error); if (cb) cb(r); });
  function act(name, el) {
    const st = S && S.stage;
    switch (name) {
      case 'avatar': avatar = el.dataset.v; document.querySelectorAll('.av').forEach((b) => b.classList.toggle('sel', b === el)); break;
      case 'join': submitJoin(false); break;
      case 'create': submitJoin(true); break;
      case 'mute': CN.muted = !CN.muted; document.getElementById('mutebtn').textContent = CN.muted ? '🔇' : '🔊'; CN.play('ding'); break;
      case 'share':
        if (navigator.share) navigator.share({ title: cfg.name, text: `Join my ${cfg.name} room!`, url: el.dataset.link }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(el.dataset.link).then(() => toast('Link copied!'), () => toast(el.dataset.link));
        else toast(el.dataset.link);
        break;
      case 'mode': host({ action: 'mode', modeId: el.dataset.id }); closeMenu(); break;
      case 'shuffle': host({ action: 'shuffle' }); closeMenu(); break;
      case 'padd': {
        const i = document.getElementById('ptext'); const type = document.getElementById('ptype').value;
        socket.emit('pool:add', { type, text: i.value }, (r) => { if (r && r.ok) { i.value = ''; toast('Added! ✨'); } else toast((r && r.error) || 'Could not add'); });
        break;
      }
      case 'ready': socket.emit('submit', { stageId: st.id, data: {} }); break;
      case 'bio': { const b = document.getElementById('bio'); b.hidden = !b.hidden; break; }
      case 'send': sendWrite(false); break;
      case 'reroll': socket.emit('reroll', { stageId: st.id }); break;
      case 'color': brush = { color: el.dataset.c, size: 6 }; document.querySelectorAll('.colors button[data-c]').forEach((b) => b.classList.toggle('sel', b === el)); break;
      case 'eraser': brush = { color: '#ffffff', size: 22 }; break;
      case 'clear': document.querySelectorAll('canvas[data-draw]').forEach((c) => { const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); delete c.dataset.drew; }); break;
      case 'opt':
        if (st.mine.vetoable) { pick = el.dataset.id; document.querySelectorAll('.opt').forEach((b) => b.classList.toggle('sel', b === el)); }
        else socket.emit('submit', { stageId: st.id, data: { choice: el.dataset.id } }, (r) => { if (r && !r.ok) toast(r.error); });
        break;
      case 'veto': {
        const id = el.dataset.id; if (vetoes.has(id)) vetoes.delete(id); else vetoes.add(id);
        el.classList.toggle('purple', vetoes.has(id)); el.textContent = vetoes.has(id) ? '🚫 Marked too far' : '🚫 Too far'; break;
      }
      case 'lockvote':
        if (!pick || vetoes.has(pick)) { toast('Pick a 👑 favorite that isn\'t vetoed.'); break; }
        socket.emit('submit', { stageId: st.id, data: { choice: pick, vetoes: [...vetoes] } }, (r) => { if (r && !r.ok) toast(r.error); });
        break;
      case 'lobby': host({ action: 'lobby' }); break;
      case 'menu': menuOpen = true; drawMenu(); break;
      case 'closemenu': closeMenu(); break;
      case 'skip': host({ action: 'skip' }); break;
      case 'pause': host({ action: S.paused ? 'resume' : 'pause' }); break;
      case 'end': if (confirm('End the game and show final results?')) { host({ action: 'end' }); closeMenu(); } break;
      case 'kick': if (confirm('Remove this player?')) host({ action: 'kick', playerId: el.dataset.id }); break;
      case 'photos': host({ action: 'photos' }, (r) => showPhotos(r.photos || [])); break;
      case 'rmphoto': host({ action: 'removePhoto', id: el.dataset.id }, () => { el.parentElement.remove(); }); break;
    }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b); });

  // -------------------------------------------------------------- host menu
  function closeMenu() { menuOpen = false; const s = document.getElementById('sheet'); if (s) s.remove(); }
  function sel(key, label, opts) {
    return `<label>${label}</label><select data-setting="${key}">${opts.map(([v, t]) => `<option value="${v}" ${String(S.settings[key]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  }
  function drawMenu() {
    menuSig = JSON.stringify([S.phase, S.paused, S.settings, S.players.map((p) => p.id + p.name), S.pool.photos]);
    let s = document.getElementById('sheet');
    if (!s) { s = document.createElement('div'); s.id = 'sheet'; s.className = 'sheet'; document.body.appendChild(s); s.addEventListener('change', (e) => { const k = e.target.dataset.setting; if (k) host({ action: 'settings', settings: { [k]: e.target.value } }); }); }
    let h = '<div class="card"><h2>👑 Host menu</h2>';
    if (S.phase === 'lobby') {
      h += S.modes.map((m) => `<button class="btn block" data-act="mode" data-id="${esc(m.id)}">${esc(m.emoji)} ${esc(m.name)}</button>`).join('') + '<button class="btn pink block" data-act="shuffle">🔀 Shuffle all modes</button>';
    } else {
      h += `<div class="hostlist"><button class="btn blue" data-act="skip">⏭ Skip stage</button><button class="btn" data-act="pause">${S.paused ? '▶️ Resume' : '⏸ Pause'}</button>` +
        (S.phase === 'playing' ? '<button class="btn pink" data-act="end">🛑 End game</button>' : '<button class="btn green" data-act="lobby">🏠 Back to lobby</button>') + '</div>';
    }
    h += '</div><div class="card"><h3>Settings</h3>' +
      sel('spice', 'Spice level', [['clean', '😇 Clean'], ['normal', '😏 Normal'], ['unhinged', '🔥 Unhinged']]) +
      sel('timer', 'Timer length', [['short', 'Short'], ['normal', 'Normal'], ['long', 'Long']].concat(S.settings.timer === 'fast' ? [['fast', 'Fast (test)']] : [])) +
      sel('photoSource', 'Photos for Caption the Chaos', [['bank', 'Bank only'], ['uploads', 'Uploads only'], ['mix', 'Mix']]) +
      sel('display', 'Display mode', [['auto', 'Auto'], ['tv', 'TV'], ['phone', 'Phone-only']]) +
      sel('rounds', 'Rounds per mode', [1, 2, 3, 4, 5].map((n) => [n, n])) +
      `<p><small>TV connected: ${S.tvCount ? 'yes 📺' : 'no'} · showing ${S.display === 'tv' ? 'TV mode' : 'phone-only mode'}</small></p></div>`;
    h += '<div class="card"><h3>Players</h3>' + S.players.filter((p) => p.id !== S.you.id).map((p) => `<div class="row"><span>${esc(p.avatar)} ${esc(p.name)}${p.connected ? '' : ' 💤'}</span><button class="btn small pink" data-act="kick" data-id="${esc(p.id)}">Kick</button></div>`).join('') +
      '</div><div class="card"><h3>Uploaded photos</h3><div id="phbox"><button class="btn small" data-act="photos">Review photos (' + S.pool.photos + ')</button></div></div>' +
      '<button class="btn block" data-act="closemenu">Close</button>';
    s.innerHTML = h;
  }
  function showPhotos(list) {
    const box = document.getElementById('phbox'); if (!box) return;
    box.innerHTML = list.length ? '<div class="thumbs">' + list.map((p) => `<div><img class="thumb" alt="" src="${esc(p.dataUrl)}"><br>${esc(p.by)}<br><button class="btn small pink" data-act="rmphoto" data-id="${esc(p.id)}">Remove</button></div>`).join('') + '</div>' : 'No photos uploaded.';
  }
})();
