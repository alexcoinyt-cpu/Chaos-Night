'use strict';
const { tally, names, list } = require('./_helpers');

const SILLY_LIES = [
  'They once lost a bet to a goat and had to change their name for a year.',
  'They were secretly terrified of the color orange.',
  'They invented the first alarm clock, then slept through its debut.',
  'They owned a pet badger that attended important meetings.',
  'They refused to ever wear socks, even in winter.',
  'They were banned from three different taverns for singing.',
];

module.exports = {
  id: 'twolies', name: 'Two Lies & a Truth', emoji: '🤥', order: 1, minPlayers: 3,
  description: 'Invent two believable lies about a historical figure. Can the room find the truth?',
  instructions: 'You get a famous person from history with one TRUE fact. Write TWO believable lies. Everyone else votes for the truth.',
  example: 'Truth: "Cleopatra lived closer to the Moon landing than to the Great Pyramid." Your lies: "She invented the first alarm clock" and "She spoke nine languages and three cat dialects."',

  async run(ctx) {
    for (let round = 1; round <= ctx.rounds; round++) {
      const players = ctx.players();
      const used = new Set();
      const draw = () => {
        let f;
        for (let i = 0; i < 40; i++) { f = ctx.pool.draw('figures'); if (!used.has(f.id)) break; }
        used.add(f.id); return f;
      };
      const mineFor = (f) => ({
        prompt: `${f.name}`, hint: f.era, bio: f.bio, truth: f.fact, figure: f,
        fields: [{ label: 'Lie #1', max: 140, placeholder: 'Something believable but false…' },
                 { label: 'Lie #2', max: 140, placeholder: 'Another convincing fib…' }],
      });
      const res = await ctx.write({
        title: `Round ${round} · Two Lies`,
        instruction: 'Write TWO believable lies about your person. Tap "Who\'s this?" if you don\'t know them.',
        job: "You're writing lies",
        shared: { heading: 'Everyone is inventing lies…', prompt: 'Each player has a different historical figure. Look at your phone!' },
        per: () => mineFor(draw()),
        reroll: (p, mine) => { used.delete(mine.figure.id); return mineFor(draw()); },
        fallback: () => ctx.pick(SILLY_LIES),
        seconds: 75,
      });

      const byId = names(players);
      const entries = ctx.shuffle(Object.entries(res)).slice(0, 6);
      for (const [authorId, r] of entries) {
        const fig = r.mine.figure;
        let [l1, l2] = r.fields;
        if (l1.toLowerCase() === l2.toLowerCase()) l2 = ctx.pick(SILLY_LIES);
        const opts = ctx.shuffle([{ id: 't', text: fig.fact }, { id: 'a', text: l1 }, { id: 'b', text: l2 }]);
        const voters = ctx.players().filter((p) => p.id !== authorId);
        const votes = await ctx.choose({
          title: `Which is TRUE about ${fig.name}?`, instruction: 'Tap the statement you think is true.',
          spectatorJob: "You wrote these lies — don't give it away!",
          shared: { prompt: fig.name, sub: `${fig.era}. ${fig.bio}` }, options: opts, voters,
        });
        const t = tally(votes, ['t', 'a', 'b']);
        for (const v of t.t) { ctx.award(v, 100); ctx.stat(v, 'detective'); }
        const fooled = t.a.length + t.b.length;
        if (fooled) { ctx.award(authorId, fooled * 75); ctx.stat(authorId, 'fooled', fooled); }
        const authorName = byId[authorId] ? byId[authorId].name : 'Someone';
        await ctx.reveal({
          title: `The truth about ${fig.name}`,
          shared: {
            heading: fig.name, sub: fig.era,
            items: opts.map((o) => ({
              text: o.text, tag: o.id === 't' ? '✅ TRUE' : `🤥 Lie by ${authorName}`, tone: o.id === 't' ? 'good' : 'bad',
              sub: t[o.id].length ? `Picked by ${list(t[o.id], byId)}` : 'Nobody picked this',
              delta: o.id === 't' ? undefined : t[o.id].length * 75 || undefined,
            })),
          },
          seconds: 9, sfx: 'ding',
        });
      }
    }
  },
};
