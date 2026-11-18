'use strict';
const { tally, names, list } = require('./_helpers');

module.exports = {
  id: 'whosaidit', name: 'Who Said It?', emoji: '🕵️', order: 2, minPlayers: 3,
  description: 'Everyone answers a weird prompt anonymously. Then guess who wrote what!',
  instructions: 'Answer the weird question anonymously. Then guess which player wrote each answer.',
  example: 'Prompt: "What\'s the worst superpower?" Answer: "Being able to talk to lukewarm soup." Everyone guesses who wrote it!',

  async run(ctx) {
    for (let round = 1; round <= ctx.rounds; round++) {
      const prompt = ctx.pool.draw('prompts');
      if (!prompt) return;
      const players = ctx.players();
      const res = await ctx.write({
        title: `Round ${round} · Who Said It?`, instruction: 'Answer anonymously. Be funny. Nobody knows it\'s you… yet.',
        shared: { heading: 'Everyone is answering…', prompt: prompt.text },
        per: () => ({ prompt: prompt.text, fields: [{ label: 'Your answer', max: 120 }] }),
        players,
      });
      const byId = names(players);
      // Prefer answers people actually wrote; show at most 4.
      const real = Object.entries(res).filter(([, r]) => !r.auto);
      const rest = Object.entries(res).filter(([, r]) => r.auto);
      const shown = ctx.shuffle(real).concat(ctx.shuffle(rest)).slice(0, 4);
      let n = 0;
      for (const [authorId, r] of shown) {
        n++;
        const options = players.map((p) => ({ id: p.id, text: p.name, avatar: p.avatar }));
        const voters = ctx.players().filter((p) => p.id !== authorId);
        const votes = await ctx.choose({
          title: `Answer ${n} of ${shown.length}`, instruction: 'Who wrote this? Tap a player.',
          spectatorJob: 'This is YOUR answer. Poker face! 😐',
          shared: { prompt: prompt.text, answer: r.fields[0] }, options, voters,
        });
        const t = tally(votes, options.map((o) => o.id));
        for (const v of t[authorId]) { ctx.award(v, 100); ctx.stat(v, 'detective'); }
        const fooled = voters.length - t[authorId].length;
        if (fooled > 0) { ctx.award(authorId, fooled * 50); ctx.stat(authorId, 'fooled', fooled); }
        const a = byId[authorId] || { name: 'Someone', avatar: '❓' };
        await ctx.reveal({
          title: 'It was…',
          shared: {
            heading: `${a.avatar} ${a.name} wrote it!`, prompt: prompt.text,
            items: [{ text: r.fields[0], tone: 'good', tag: `${a.avatar} ${a.name}`,
              sub: t[authorId].length ? `Spotted by ${list(t[authorId], byId)}` : 'Nobody guessed it!',
              delta: fooled > 0 ? fooled * 50 : undefined }],
          },
          seconds: 6,
        });
      }
    }
  },
};
