'use strict';
/**
 * TEMPLATE MODE. Copy this file to e.g. `myMode.js` (no leading underscore) and edit.
 * It is picked up automatically on the next server start. See docs/ADDING_A_MODE.md.
 */
module.exports = {
  id: 'template',            // unique, no spaces
  name: 'Template Mode',
  emoji: '🧪',
  order: 99,                 // position in the menu
  description: 'One short sentence shown on the mode button.',
  instructions: 'One plain-language sentence shown on the intro screen.',
  example: 'A short example shown under the instructions.',
  minPlayers: 3,

  async run(ctx) {
    for (let round = 1; round <= ctx.rounds; round++) {
      const players = ctx.players();

      // 1) Everyone writes something privately.
      const written = await ctx.write({
        title: `Round ${round}`,
        instruction: 'Write something funny.',
        shared: { heading: 'Everyone is writing…', prompt: 'Look at your phone!' }, // what the TV shows
        per: () => ({ prompt: 'Your prompt here', fields: [{ label: 'Your answer', max: 100 }] }),
      });

      // 2) Everyone votes on the answers (players can't vote for their own).
      const options = players.map((p) => ({ id: p.id, text: written[p.id].fields[0] }));
      const votes = await ctx.choose({
        title: 'Vote!', instruction: 'Tap the funniest one.',
        shared: { prompt: 'Which is funniest?' }, options, voters: players,
        disabled: (voter) => [voter.id],
      });

      // 3) Give points and show the results.
      const items = [];
      for (const o of options) {
        const n = Object.values(votes).filter((v) => v === o.id).length;
        ctx.award(o.id, n * 100); ctx.stat(o.id, 'funny', n);
        items.push({ text: o.text, who: ctx.player(o.id).name, sub: `${n} votes`, delta: n * 100 });
      }
      await ctx.reveal({ title: 'Results', shared: { heading: 'The results', items } });
    }
    // The engine shows the scoreboard automatically after run() returns.
  },
};
