'use strict';
const { tally, names } = require('./_helpers');

module.exports = {
  id: 'hottake', name: 'Hashtag Hot Take', emoji: '📢', order: 4, minPlayers: 3,
  description: 'Write a tweet-style hot take about a person, ending in a #hashtag. Room votes funniest.',
  instructions: 'You get a person (or thing). Write a short, funny "tweet" about them that ends with a #hashtag. Then vote for the funniest.',
  example: 'About: The Loch Ness Monster. Tweet: "Just surfaced for air and everyone has a camera. Rude. #NoPrivacy"',

  async run(ctx) {
    for (let round = 1; round <= ctx.rounds; round++) {
      const players = ctx.players();
      const used = new Set();
      const draw = () => {
        let n;
        for (let i = 0; i < 40; i++) { n = ctx.pool.draw('names'); if (!used.has(n.id)) break; }
        used.add(n.id); return n;
      };
      const mineFor = (n) => ({
        prompt: `Hot take about: ${n.text}`, hint: 'End your tweet with a #hashtag', about: n.text, nameId: n.id,
        fields: [{ label: 'Your tweet', max: 140, placeholder: 'Hot take… #Hashtag' }],
      });
      const res = await ctx.write({
        title: `Round ${round} · Hot Take`, instruction: 'Write a funny tweet about your person. End it with a #hashtag!',
        shared: { heading: 'Everyone is tweeting…', prompt: 'Each player has a different target. Look at your phone!' },
        per: () => mineFor(draw()),
        reroll: (p, mine) => { used.delete(mine.nameId); return mineFor(draw()); },
        fallback: (p, mine) => `${mine.about} is simply iconic. #NoComment`,
        players, seconds: 60,
      });
      const byId = names(players);
      const options = players.map((p) => {
        let t = res[p.id].fields[0];
        if (!t.includes('#')) t += ' #HotTake';
        return { id: p.id, text: t, sub: `About: ${res[p.id].mine.about}` };
      });
      const votes = await ctx.choose({
        title: 'Vote for the funniest tweet', instruction: "Tap your favorite. You can't vote for your own.",
        shared: { heading: 'Which hot take is the funniest?' }, options, voters: players, disabled: (v) => [v.id], seconds: 30,
      });
      const t = tally(votes, options.map((o) => o.id));
      const items = options.map((o) => {
        const n = t[o.id].length; ctx.award(o.id, n * 100); if (n) ctx.stat(o.id, 'funny', n);
        return { text: o.text, tag: `${byId[o.id].avatar} ${byId[o.id].name}`, sub: `${o.sub} · ${n} vote${n === 1 ? '' : 's'}`, delta: n * 100 || undefined, _n: n };
      }).sort((a, b) => b._n - a._n);
      items.forEach((i, k) => { delete i._n; if (k === 0) i.tone = 'good'; });
      await ctx.reveal({ title: 'Hot take results', shared: { heading: 'The hottest takes', items }, seconds: 10 });
    }
  },
};
