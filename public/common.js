/* Shared client helpers: escaping, sound, confetti, and the generic renderer for shared stage content. */
(function () {
  const CN = (window.CN = {});
  CN.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = CN.esc;
  CN.store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } },
  };

  // ---- sound (WebAudio; no files) ----
  let ac = null;
  CN.muted = true;
  function tone(freq, dur, type, vol, when) {
    if (CN.muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      const t = ac.currentTime + (when || 0);
      g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
    } catch (e) { /* audio unsupported */ }
  }
  CN.sfx = {
    tick() { tone(880, 0.06, 'square', 0.06); },
    ding() { tone(988, 0.15, 'sine', 0.2); tone(1319, 0.3, 'sine', 0.2, 0.12); },
    whoosh() { for (let i = 0; i < 6; i++) tone(200 + i * 160, 0.08, 'sawtooth', 0.04, i * 0.03); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, i * 0.13)); },
  };
  CN.play = (name) => { const f = CN.sfx[name]; if (f) f(); };

  // ---- confetti / emoji burst ----
  CN.confetti = function (n) {
    let c = document.getElementById('fx');
    if (!c) { c = document.createElement('canvas'); c.id = 'fx'; document.body.appendChild(c); }
    c.width = innerWidth; c.height = innerHeight;
    const g = c.getContext('2d');
    const em = ['🎉', '✨', '🔥', '⭐', '🎊', '💥'];
    const ps = Array.from({ length: n || 70 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * 6 + 4, h: Math.random() * 360, e: Math.random() < 0.25 ? em[Math.floor(Math.random() * em.length)] : null, a: 1,
    }));
    let f = 0;
    (function step() {
      g.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.a -= 0.008;
        g.globalAlpha = Math.max(0, p.a);
        if (p.e) { g.font = '26px serif'; g.fillText(p.e, p.x, p.y); } else { g.fillStyle = `hsl(${p.h},90%,55%)`; g.fillRect(p.x, p.y, p.r, p.r * 1.6); }
      }
      if (++f < 130) requestAnimationFrame(step); else g.clearRect(0, 0, c.width, c.height);
    })();
  };

  // ---- inline SVG scenes built from emoji ----
  CN.sceneSvg = function (sc) {
    if (!sc || !sc.items) return '';
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    const items = sc.items.map((i) =>
      `<text x="${+i.x}" y="${+i.y}" font-size="${+i.s}" text-anchor="middle" transform="rotate(${+i.r || 0} ${+i.x} ${+i.y})">${esc(i.e)}</text>`).join('');
    return `<svg class="scene" viewBox="0 0 400 300" role="img" aria-label="Funny picture"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${esc(sc.bg[0])}"/><stop offset="1" stop-color="${esc(sc.bg[1])}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>${items}</svg>`;
  };
  CN.image = function (img, code) {
    if (!img) return '';
    if (img.scene) return CN.sceneSvg(img.scene);
    if (img.asset) return `<img class="photo" alt="" src="/asset/${encodeURIComponent(code)}/${encodeURIComponent(img.asset)}">`;
    return '';
  };

  // ---- generic renderer for stage.shared (used by TV and by phone-only mode) ----
  CN.renderShared = function (st, S) {
    const sh = st.shared || {};
    let h = '';
    if (st.kind === 'intro') {
      return `<div class="card hot" style="text-align:center"><div style="font-size:4em">${esc(sh.emoji)}</div><h1>${esc(sh.name)}</h1><p class="big">${esc(sh.instruction)}</p></div>
        <div class="card cool"><b>Example</b><p>${esc(sh.example)}</p></div>`;
    }
    if (st.kind === 'scores' || st.kind === 'final') {
      const rows = sh.rows || []; const max = Math.max(1, ...rows.map((r) => r.score));
      h += `<div class="card">${st.kind === 'final' ? '<h1 style="text-align:center">🏆 Final Results 🏆</h1>' : '<h2>Scoreboard</h2>'}` +
        rows.map((r, i) => `<div class="score"><span class="big">${i === 0 ? '👑' : i + 1 + '.'}</span><span class="big">${esc(r.avatar)}</span><span class="n">${esc(r.name)}${r.connected === false ? ' 💤' : ''}</span>
        <div class="b" style="width:${Math.max(4, (r.score / max) * 38)}%"></div><b>${r.score}</b>${r.delta ? `<span class="delta">+${r.delta}</span>` : ''}</div>`).join('') + '</div>';
      if (sh.awards && sh.awards.length) {
        h += '<div class="card cool"><h2>Awards</h2>' + sh.awards.map((a) =>
          `<div class="award"><span class="em">${esc(a.emoji)}</span><span><b>${esc(a.title)}</b>: ${esc(a.avatar)} ${esc(a.name)}<br><small>${esc(a.detail)}</small></span></div>`).join('') + '</div>';
      }
      return h;
    }
    if (sh.heading) h += `<h2 class="big" style="text-align:center">${esc(sh.heading)}</h2>`;
    if (sh.sub) h += `<p style="text-align:center">${esc(sh.sub)}</p>`;
    if (sh.prompt) h += `<div class="prompt card hot">${esc(sh.prompt)}</div>`;
    if (sh.answer) h += `<div class="prompt card cool">“${esc(sh.answer)}”</div>`;
    if (sh.image) h += `<div class="card">${CN.image(sh.image, S.code)}</div>`;
    if (sh.options && st.kind === 'choose') {
      h += '<div class="grid">' + sh.options.map((o) => `<div class="item"><span class="t">${o.avatar ? esc(o.avatar) + ' ' : ''}${esc(o.text)}</span>${o.sub ? `<span class="s">${esc(o.sub)}</span>` : ''}</div>`).join('') + '</div>';
    }
    if (sh.items) {
      h += '<div class="grid">' + sh.items.map((i, n) => `<div class="item ${esc(i.tone || '')}" style="animation-delay:${n * 0.12}s">
        ${i.tag ? `<span><span class="pill">${esc(i.tag)}</span></span>` : ''}${i.asset ? CN.image({ asset: i.asset }, S.code) : ''}<span class="t">${esc(i.text)}</span>
        ${i.sub ? `<span class="s">${esc(i.sub)}</span>` : ''}${i.delta ? `<span class="delta">+${i.delta}</span>` : ''}</div>`).join('') + '</div>';
    }
    return h;
  };

  CN.fmtTime = (ms) => Math.ceil(Math.max(0, ms) / 1000);
  CN.stageLabel = (st) => (st && st.title) || '';
})();
