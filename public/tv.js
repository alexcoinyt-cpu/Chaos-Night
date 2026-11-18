/* Big-screen display: shows prompts, answers, voting options, reveals and scores. */
(function () {
  const esc = CN.esc; const app = document.getElementById('app'); const banner = document.getElementById('banner');
  let S = null; let recvAt = 0; let code = (new URLSearchParams(location.search).get('code') || '').toUpperCase().slice(0, 4);
  let cfg = { name: 'Chaos Night' }; let lastStage = null; let lastSig = ''; let lastSec = -1;
  CN.muted = false; // TV sound on by default (browsers unlock audio after the first click)
  const socket = io();

  fetch('/config.json').then((r) => r.json()).then((c) => { cfg = c; document.title = c.name + ' TV'; if (!S) landing(); });

  function landing(err) {
    app.innerHTML = `<h1 class="logo">${esc(cfg.name)} TV</h1><div class="card" style="max-width:700px;margin:3vh auto;text-align:center">
      <p class="big">Enter the room code from the host's phone</p>
      <input id="code" maxlength="4" autocapitalize="characters" value="${esc(code)}" style="font-size:5vw;text-align:center;letter-spacing:.2em">
      <button class="btn pink block" id="go">Show on this screen</button><p class="err">${esc(err || '')}</p></div>`;
    document.getElementById('go').onclick = () => { code = document.getElementById('code').value.toUpperCase().trim().slice(0, 4); connect(); };
  }
  function connect() {
    socket.emit('tv:join', { code }, (res) => { if (!res || !res.ok) { landing((res && res.error) || 'Could not connect'); } });
  }
  socket.on('connect', () => { banner.style.display = 'none'; if (code) connect(); });
  socket.on('disconnect', () => { banner.className = 'banner'; banner.textContent = 'Reconnecting…'; banner.style.display = 'block'; });
  socket.on('closed', () => { S = null; code = ''; landing('That room was closed.'); });
  socket.on('state', (st) => { S = st; recvAt = Date.now(); render(); });

  function render() {
    const st = S.stage;
    const sig = JSON.stringify([S.phase, st && [st.id, st.kind, st.over, st.shared], S.paused, S.players.map((p) => [p.id, p.score, p.connected, p.host])]);
    if (st && st.id !== lastStage) {
      lastStage = st.id; CN.play(st.sfx === 'win' ? 'win' : st.sfx || 'whoosh');
      if (st.kind === 'final') CN.confetti(160); else if (st.kind === 'reveal') CN.confetti(50);
    }
    if (sig !== lastSig) { lastSig = sig; draw(); }
    tick();
  }
  function dock() {
    return '<div class="dock">' + S.players.map((p) => `<span class="chip ${p.connected ? '' : 'off'}">${esc(p.avatar)} ${esc(p.name)}${p.host ? ' 👑' : ''} <small>${p.score}</small></span>`).join('') + '</div>';
  }
  function draw() {
    let h = '';
    const st = S.stage; const url = location.origin;
    if (!st) {
      h = `<h1 class="logo">${esc(cfg.name)}</h1><div class="card hot" style="text-align:center"><p class="big">Go to <b>${esc(url.replace(/^https?:\/\//, ''))}</b> on your phone and enter</p>
        <div class="code">${esc(S.code)}</div></div><div class="card"><h2>Players (${S.players.length})</h2><div class="players">${S.players.map((p) => `<span class="chip ${p.connected ? '' : 'off'}"><span class="big">${esc(p.avatar)}</span> ${esc(p.name)}${p.host ? ' 👑' : ''}</span>`).join('') || 'Waiting for players…'}</div></div>
        <p class="tag">The host picks a game from their phone.</p>`;
    } else {
      h = `<div class="top"><h2>${esc(st.title)}</h2><div class="job">${esc(S.currentMode ? S.currentMode.emoji + ' ' + S.currentMode.name : '')}</div>${st.remainingMs != null ? '<div class="timer" id="timer"></div>' : ''}</div>
        ${st.remainingMs != null ? '<div class="bar"><i id="bar" style="width:100%"></i></div>' : ''}
        ${st.instruction && st.kind !== 'intro' ? `<p class="big" style="text-align:center">${esc(st.instruction)}</p>` : ''}
        ${CN.renderShared(st, S)}
        <div class="waiting" id="waiting"></div>${dock()}
        ${S.paused ? '<div class="pause">⏸ Paused</div>' : ''}`;
      if (st.kind === 'final') h += '<p class="tag">Host: tap "Back to lobby" on your phone to play again.</p>';
    }
    app.innerHTML = h + '<button class="btn mute" id="mute">' + (CN.muted ? '🔇' : '🔊') + '</button>';
    document.getElementById('mute').onclick = () => { CN.muted = !CN.muted; draw(); CN.play('ding'); };
  }
  function tick() {
    if (!S || !S.stage) return;
    const st = S.stage; const w = document.getElementById('waiting');
    if (w) w.textContent = st.waiting && st.waiting.length ? '⏳ Waiting on: ' + st.waiting.join(', ') : '';
    const t = document.getElementById('timer');
    if (t && st.remainingMs != null) {
      const rem = S.paused ? st.remainingMs : st.remainingMs - (Date.now() - recvAt);
      const sec = CN.fmtTime(rem);
      t.textContent = sec; t.classList.toggle('low', sec <= 5);
      const bar = document.getElementById('bar'); if (bar) bar.style.width = Math.max(0, (rem / st.totalMs) * 100) + '%';
      if (sec <= 5 && sec > 0 && sec !== lastSec && !S.paused) CN.play('tick');
      lastSec = sec;
    }
  }
  setInterval(tick, 250);
  document.addEventListener('pointerdown', () => { if (!CN.muted) CN.play('tick'); }, { once: true });
  landing();
  if (code) { /* auto-connect handled on socket connect */ }
})();
