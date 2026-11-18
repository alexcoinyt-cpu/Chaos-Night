'use strict';
const { tally, names } = require('./_helpers');

module.exports = {
  id: 'whatdoyoudo', name: 'What Do You Do?', emoji: '🐺', order: 5, minPlayers: 3,
  description: 'Write wild scenarios, then answer each other\'s. Writers earn bonus points for great answers.',
  instructions: 'First, everyone writes a wild scenario. Then you answer scenarios from others and vote on the best answers.',
  example: 'Scenario: "You\'re in the woods and a wolf walks up wearing a tie." Answer: "Ask if he\'s hiring."',

  async run(ctx) {
    const players = ctx.players();
    const byId = names(players);
    const wrote = await ctx.write({
      title: 'Write a scenario', instruction: 'Invent a weird situation for others to react to. Start with "You\'re…" and end with a question.',
      shared: { heading: 'Everyone is writing wild scenarios…', prompt: 'Look at your phone!' },
      per: () => ({ prompt: 'Write a wild scenario', hint: 'Example: You\'re in the woods and a wolf walks up…',
        fields: [{ label: 'Your scenario', max: 160, placeholder: "You're in…" }] }),
      fallback: () => ctx.pool.draw('scenarios').text, players, seconds: 50,
    });
    const scenarios = ctx.shuffle(players.map((p) => ({ text: wrote[p.id].fields[0], by: wrote[p.id].auto ? null : p.id })));
    const rounds = Math.min(ctx.rounds * 2, 6);
    for (let r = 1; r <= rounds; r++) {
      let sc = scenarios.pop();
      if (!sc) { const d = ctx.pool.draw('scenarios'); if (!d) break; sc = { text: d.text, by: d.by || null }; }
      const now = ctx.players();
      const answerers = now.filter((p) => p.id !== sc.by);
      if (answerers.length < 2) continue;
      const ans = await ctx.write({
        title: `Scenario ${r} of ${rounds}`, instruction: 'What do you do? Be funny!', spectatorJob: 'This is YOUR scenario. Relax and enjoy!',
        shared: { heading: 'What do you do?', prompt: sc.text },
        per: () => ({ prompt: sc.text, fields: [{ label: 'What do you do?', max: 140 }] }),
        players: answerers, seconds: 45,
      });
      const options = answerers.map((p) => ({ id: p.id, text: ans[p.id].fields[0] }));
      const votes = await ctx.choose({
        title: 'Vote for the best answer', instruction: "Tap your favorite. You can't vote for your own.",
        shared: { heading: 'Best answer?', prompt: sc.text }, options, voters: now, disabled: (v) => [v.id], seconds: 25,
      });
      const t = tally(votes, options.map((o) => o.id));
      let strong = 0;
      const items = options.map((o) => {
        const n = t[o.id].length; if (n) strong++;
        ctx.award(o.id, n * 100); if (n) ctx.stat(o.id, 'funny', n);
        return { text: o.text, tag: `${byId[o.id].avatar} ${byId[o.id].name}`, sub: `${n} vote${n === 1 ? '' : 's'}`, delta: n * 100 || undefined, _n: n };
      }).sort((a, b) => b._n - a._n);
      items.forEach((i, k) => { delete i._n; if (k === 0 && i.sub !== '0 votes') i.tone = 'good'; });
      let note = '';
      if (sc.by && strong) { ctx.award(sc.by, strong * 50); note = `Scenario by ${byId[sc.by].avatar} ${byId[sc.by].name} — bonus +${strong * 50} for inspiring great answers!`; }
      await ctx.reveal({ title: 'Answers', shared: { heading: sc.text, sub: note, items }, seconds: 10 });
    }
  },
};
