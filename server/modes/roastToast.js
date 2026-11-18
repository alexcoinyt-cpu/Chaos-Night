'use strict';
const { names } = require('./_helpers');

module.exports = {
  id: 'roasttoast', name: 'Roast Toast', emoji: '🔥', order: 6, minPlayers: 3,
  description: 'One player is the guest of honor. Everyone writes loving roasts; the guest picks the best.',
  instructions: 'One player is the guest of honor. Everyone else writes a friendly, loving roast line. The guest picks their favorite and can veto anything that goes too far.',
  example: 'Guest: Sam. Roast: "Sam is so punctual, he arrived early to his own surprise party and ruined it."',

  async run(ctx) {
    const all = ctx.players();
    const guests = ctx.shuffle(all).slice(0, Math.min(all.length, ctx.rounds * 2));
    let n = 0;
    for (const g of guests) {
      n++;
      const now = ctx.players();
      const guest = now.find((p) => p.id === g.id);
      if (!guest || now.length < 3) continue;
      const writers = now.filter((p) => p.id !== guest.id);
      const byId = names(now);
      const res = await ctx.write({
        title: `Roast ${n} of ${guests.length}: ${guest.name}`, instruction: `Write a loving roast line about ${guest.name}. Tease, don't wound!`,
        spectatorJob: "You're the guest of honor! Brace yourself 😎",
        shared: { heading: `🔥 Guest of honor: ${guest.avatar} ${guest.name}`, prompt: 'Everyone is writing loving roasts…' },
        per: () => ({ prompt: `Roast ${guest.name} (lovingly)`, hint: 'Teasing is fine. Being mean is not.', fields: [{ label: 'Your roast', max: 140 }] }),
        players: writers, seconds: 50,
      });
      const options = writers.map((p) => ({ id: p.id, text: res[p.id].fields[0] }));
      const votes = await ctx.choose({
        title: `${guest.name}, pick the best roast`, instruction: `Tap 👑 on your favorite. Mark any that go too far with 🚫.`,
        job: 'You decide!', spectatorJob: `${guest.name} is judging your roast…`,
        shared: { heading: `${guest.avatar} ${guest.name} is judging…` }, options, voters: [guest], vetoable: true, seconds: 30,
      });
      const vetoed = new Set(votes.vetoes[guest.id] || []);
      let winner = votes[guest.id];
      if (!winner || vetoed.has(winner)) { const ok = options.filter((o) => !vetoed.has(o.id)); winner = ok.length ? ctx.pick(ok).id : null; }
      const items = options.map((o) => {
        const a = byId[o.id]; const isW = o.id === winner; const isV = vetoed.has(o.id);
        if (isW) { ctx.award(o.id, 200); ctx.stat(o.id, 'funny', 1); } else if (!isV) ctx.award(o.id, 25);
        return { text: o.text, tag: `${a.avatar} ${a.name}`, tone: isW ? 'good' : isV ? 'bad' : '',
          sub: isW ? '👑 Guest\'s favorite!' : isV ? '🚫 Too far! No points.' : 'Nice try', delta: isW ? 200 : isV ? undefined : 25 };
      });
      await ctx.reveal({ title: 'Roast results', shared: { heading: `🔥 ${guest.name} has spoken`, items }, seconds: 10 });
    }
  },
};
