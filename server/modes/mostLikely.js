'use strict';
const { tally, names, list } = require('./_helpers');

module.exports = {
  id: 'mostlikely', name: 'Most Likely To', emoji: '🗳️', order: 7, minPlayers: 3,
  description: 'Everyone votes at once on who is most likely to… Then see who agreed with the group.',
  instructions: 'A prompt appears: "Who\'s most likely to…?" Everyone votes for a player at the same time. You score for voting with the crowd!',
  example: '"Who\'s most likely to adopt twelve cats?" If most people pick Alex, everyone who voted Alex scores.',

  async run(ctx) {
    const rounds = Math.min(ctx.rounds * 2, 8);
    const start = ctx.players();
    for (let r = 1; r <= rounds; r++) {
      const prompt = ctx.pool.draw('mostlikely'); if (!prompt) return;
      const players = ctx.players();
      const byId = names(players.concat(start));
      const options = players.map((p) => ({ id: p.id, text: p.name, avatar: p.avatar }));
      const votes = await ctx.choose({
        title: `Round ${r} of ${rounds}`, instruction: 'Tap the player who fits best. You may vote for yourself!',
        shared: { heading: "Who's most likely to…", prompt: prompt.text + '?' }, options, voters: players, seconds: 20,
      });
      const t = tally(votes, options.map((o) => o.id));
      const top = Math.max(0, ...Object.values(t).map((v) => v.length));
      const winners = top ? options.filter((o) => t[o.id].length === top) : [];
      for (const w of winners) for (const v of t[w.id]) { ctx.award(v, 100); ctx.stat(v, 'agree'); }
      const items = options.map((o) => ({
        text: `${o.avatar} ${o.text}`, sub: t[o.id].length ? `${t[o.id].length} vote${t[o.id].length === 1 ? '' : 's'}: ${list(t[o.id], byId)}` : 'No votes',
        tone: winners.includes(o) ? 'good' : '', tag: winners.includes(o) ? '🏆 Most likely' : undefined, _n: t[o.id].length,
      })).sort((a, b) => b._n - a._n);
      items.forEach((i) => delete i._n);
      await ctx.reveal({ title: 'Results', shared: { heading: `Most likely to ${prompt.text}`, sub: top ? 'Everyone who voted for the winner scores +100' : 'Nobody voted!', items }, seconds: 8 });
    }
  },
};
