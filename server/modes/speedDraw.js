'use strict';
const { names } = require('./_helpers');

module.exports = {
  id: 'speeddraw', name: 'Speed Draw', emoji: '🎨', order: 8, minPlayers: 3,
  description: 'Draw a secret prompt on your phone. Everyone else guesses what it is!',
  instructions: 'You get a secret prompt. Draw it with your finger, fast! Then guess what everyone else drew.',
  example: 'Secret prompt: "A cat driving a bus". Others pick it from four choices, so draw the key details!',

  async run(ctx) {
    for (let round = 1; round <= ctx.rounds; round++) {
      const players = ctx.players();
      const used = new Set();
      const draw = () => {
        let p;
        for (let i = 0; i < 40; i++) { p = ctx.pool.draw('drawprompts'); if (!used.has(p.id)) break; }
        used.add(p.id); return p;
      };
      const mineFor = (p) => ({ prompt: p.text, hint: 'Draw this! No letters or words.', topic: p.text, topicId: p.id, fields: [{ type: 'draw', label: 'Your drawing' }] });
      const res = await ctx.write({
        title: `Round ${round} · Speed Draw`, instruction: 'Draw your secret prompt with your finger. Quick!',
        shared: { heading: 'Everyone is drawing…', prompt: 'Draw it so others can guess!' },
        per: () => mineFor(draw()), reroll: (p, mine) => { used.delete(mine.topicId); return mineFor(draw()); },
        players, seconds: 60,
      });
      const byId = names(players);
      const drawn = ctx.shuffle(Object.entries(res).filter(([, r]) => r.fields[0])).slice(0, 5);
      const allPrompts = ctx.pool.list('drawprompts');
      for (const [artistId, r] of drawn) {
        const asset = r.fields[0]; const truth = r.mine.topic;
        const decoys = ctx.sample(allPrompts.filter((p) => p.text !== truth), 3).map((p) => p.text);
        const options = ctx.shuffle([{ id: 't', text: truth }, ...decoys.map((d, i) => ({ id: 'd' + i, text: d }))]);
        const voters = ctx.players().filter((p) => p.id !== artistId);
        const votes = await ctx.choose({
          title: 'What is this a drawing of?', instruction: 'Tap what you think it is.', spectatorJob: 'Your drawing is up! Fingers crossed 🤞',
          shared: { heading: 'What is it?', image: { asset } }, options, voters, seconds: 20,
        });
        let right = [];
        for (const [v, c] of Object.entries(votes)) if (c === 't') { right.push(byId[v] ? byId[v].name : '?'); ctx.award(v, 100); ctx.stat(v, 'detective'); ctx.award(artistId, 50); }
        const a = byId[artistId] || { name: 'Someone', avatar: '🎨' };
        await ctx.reveal({
          title: 'The answer', shared: { heading: `${a.avatar} ${a.name} drew…`, image: { asset },
            items: [{ text: truth, tone: 'good', tag: '✅ Answer', sub: right.length ? `Guessed by ${right.join(', ')}` : 'Nobody got it!', delta: right.length ? right.length * 50 : undefined }] },
          seconds: 6,
        });
      }
      for (const [, r] of Object.entries(res)) if (r.fields[0]) ctx.dropAsset(r.fields[0]);
    }
  },
};
