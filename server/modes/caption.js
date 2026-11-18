'use strict';
const { tally, names } = require('./_helpers');

/** Choose the image for a round according to the photo-source setting. */
function pickImage(ctx) {
  const src = ctx.settings.photoSource;
  const haveUploads = ctx.pool.size('photos') > 0;
  const useUpload = src === 'uploads' ? haveUploads : src === 'mix' ? haveUploads && Math.random() < 0.5 : false;
  if (useUpload) {
    const ph = ctx.pool.draw('photos');
    if (ph) return { image: { asset: ph.asset }, by: ph.by };
  }
  return { image: { scene: ctx.pool.draw('scenes') }, by: null };
}

module.exports = {
  id: 'caption', name: 'Caption the Chaos', emoji: '🖼️', order: 3, minPlayers: 2,
  description: 'Everyone captions the same wacky picture. The room votes for the funniest.',
  instructions: 'Write a funny caption for the picture. Then vote for your favorite caption (not your own!).',
  example: 'Picture: a wolf in a tie at a job interview. Caption: "Yes, I do work well in a pack."',

  async run(ctx) {
    for (let round = 1; round <= ctx.rounds; round++) {
      const players = ctx.players();
      const { image, by } = pickImage(ctx);
      const res = await ctx.write({
        title: `Round ${round} · Caption the Chaos`, instruction: 'Write a funny caption for this picture.',
        shared: { heading: 'Caption this!', image }, per: () => ({ prompt: 'Caption the picture', fields: [{ label: 'Your caption', max: 100 }] }),
        players, seconds: 50,
      });
      const byId = names(players);
      const options = players.map((p) => ({ id: p.id, text: res[p.id].fields[0] }));
      const credit = by && byId[by] ? `📸 Photo by ${byId[by].name}` : by ? '📸 A player\'s photo' : '';
      const votes = await ctx.choose({
        title: 'Vote for the funniest caption', instruction: 'Tap your favorite. You can\'t vote for your own.',
        shared: { heading: 'Vote!', image }, options, voters: players, disabled: (v) => [v.id], seconds: 30,
      });
      const t = tally(votes, options.map((o) => o.id));
      const items = options.map((o) => {
        const n = t[o.id].length;
        ctx.award(o.id, n * 100); if (n) ctx.stat(o.id, 'funny', n);
        const a = byId[o.id];
        return { text: o.text, tag: `${a.avatar} ${a.name}`, sub: `${n} vote${n === 1 ? '' : 's'}`, delta: n * 100 || undefined, _n: n };
      }).sort((a, b) => b._n - a._n);
      items.forEach((i, idx) => { delete i._n; if (idx === 0) i.tone = 'good'; });
      await ctx.reveal({ title: 'Caption results', shared: { heading: 'The captions!', sub: credit, image, items }, seconds: 10 });
    }
  },
};
