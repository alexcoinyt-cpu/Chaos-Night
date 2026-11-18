# Adding a game mode

Every mode is **one file** in `server/modes/`. The server loads every `.js` file in that folder
(except files starting with `_`) when it starts. The generic client already knows how to display
every stage kind, so a new mode needs **no client changes** unless you invent a brand-new stage kind.

1. Copy `server/modes/_template.js` to `server/modes/myMode.js`.
2. Change `id`, `name`, `emoji`, `order`, `description`, `instructions`, `example`, `minPlayers`.
3. Write `async run(ctx)` (below).
4. Restart the server (`npm start`). Your mode shows up in the host's menu and in "Shuffle all".
5. Run `npm test`. The bot test automatically plays every mode it finds.

The engine shows the one-time intro screen before your `run` and the scoreboard after it. You don't
need to do either.

## The module shape

```js
module.exports = { id, name, emoji, order, description, instructions, example, minPlayers, async run(ctx) {} };
```

## `ctx` helpers

| Helper | What it does |
| --- | --- |
| `ctx.write(spec)` | Private writing/drawing stage. Resolves `{ [playerId]: { fields: [...], auto, mine } }`. |
| `ctx.choose(spec)` | Voting stage. Resolves `{ [voterId]: optionId \| null }`. |
| `ctx.reveal(spec)` | Shows content to everyone for a few seconds. |
| `ctx.showScores()` | Shows the scoreboard (the engine also does this after `run`). |
| `ctx.award(playerId, points)` | Add points. |
| `ctx.stat(playerId, key, n=1)` | Count a stat. Used for awards: `fooled` (Best Liar), `detective`, `funny`, `agree`. |
| `ctx.players()` | Connected players right now: `[{id, name, avatar, score}]`. |
| `ctx.player(id)` | One player (even if disconnected), or `null`. |
| `ctx.settings` | Room settings (`spice`, `timer`, `photoSource`, `display`, `rounds`). |
| `ctx.rounds` | Shortcut for `settings.rounds`. |
| `ctx.pool.draw(name)` | Draw an unused item. Names: `figures`, `scenes`, `prompts`, `scenarios`, `names`, `mostlikely`, `drawprompts`, `photos`. Text pools return `{id, text, by?}`. Player-added items come first. Respects the spice level. |
| `ctx.pool.list(name)` / `ctx.pool.size(name)` | All items / how many are unused. |
| `ctx.shuffle(arr)`, `ctx.pick(arr)`, `ctx.sample(arr, n)` | Random helpers. |
| `ctx.dropAsset(id)` | Free a drawing from memory when you are done with it. |
| `ctx.isAborted()` | True if the host ended the game. (Helpers throw automatically, so you rarely need it.) |

### `ctx.write(spec)`
```js
await ctx.write({
  title, instruction, job,                // text at the top; job = label like "You're writing"
  shared: { heading, prompt, image },     // what the TV (and phone-only mode) shows
  per: (player) => ({                     // what THIS player sees, privately
    prompt, hint, bio, truth,
    fields: [{ type: 'text' | 'draw', label, max, placeholder }],
  }),
  reroll: (player, mine) => newMine,      // optional; enables a Reroll button (max 2 per stage)
  fallback: (player, mine, fieldIndex) => 'text used if they time out',
  players, seconds,                       // optional: subset of players, base timer length
});
```
Drawings come back as an asset id: use `{ asset: id }` in `shared.image` to show it.

### `ctx.choose(spec)`
```js
await ctx.choose({
  title, instruction, job, spectatorJob,
  shared: { heading, prompt, answer, image },
  options: [{ id, text, sub, avatar }],
  voters,                                 // default: all connected players
  disabled: (voter) => [optionIds],       // e.g. can't vote for your own
  vetoable: false,                        // true adds a "too far" button; read result.vetoes[voterId]
  seconds,
});
```

### `ctx.reveal(spec)`
```js
await ctx.reveal({ title, shared: { heading, sub, prompt, image, items: [
  { text, tag, sub, tone: 'good' | 'bad', delta: 100, asset }
] }, seconds });
```

## Rules of thumb
* **Never block on one player.** `write`/`choose` auto-submit on timeout and when players disconnect.
* **Sanitize nothing yourself.** Text from `write` is already length-limited; the client escapes it.
* **Keep secrets out of `shared`.** It goes to every TV and (in phone-only mode) every phone.
  Put private info in `per()` / `mine`.
* **Content banks** live in `data/*.json`; add new content there (or add a new pool in
  `server/room.js` `_poolList`).
