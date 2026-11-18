# 🎉 Chaos Night

A Jackbox-style party game. Everyone joins from their phone; an optional TV screen shows the big
display. The host is also a player. Eight game modes, plug-in architecture, no build step, no
database. Everything lives in server memory and disappears when a room closes.

*(The name is a placeholder: change `GAME_NAME` in `config.js`.)*

## Game modes
1. **Two Lies & a Truth**: invent two believable lies about a historical figure; others find the truth.
2. **Who Said It?**: answer a weird prompt anonymously, then guess who wrote each answer.
3. **Caption the Chaos**: caption a silly picture (built-in emoji scenes or photos players upload).
4. **Hashtag Hot Take**: write a tweet about a person, ending in a #hashtag; vote for the funniest.
5. **What Do You Do?**: write wild scenarios, answer each other's, vote; writers get bonus points.
6. **Roast Toast**: loving roasts for a guest of honor, who picks the best and can veto "too far".
7. **Most Likely To**: everyone votes at once; score for agreeing with the group.
8. **Speed Draw**: draw a secret prompt on your phone; the others guess what it is.

## Run it locally
You need Node.js 18 or newer.

```bash
npm install
npm start
```
It prints a local URL and a LAN URL (for example `http://192.168.1.20:3000`).
* Phones on the same Wi-Fi open that URL and enter the room code.
* A TV or laptop opens `/tv` (for example `http://192.168.1.20:3000/tv`) and enters the code.
  No TV? That's fine: phones show the shared content themselves ("phone-only" mode).
* Run the tests with `npm test`. It plays every mode with 5 bot players and a TV.

Environment: `PORT` (default 3000).

## Deploy on Render from your phone (free)
1. Put this repo on GitHub (it already is, if you're reading this there).
2. In your phone browser go to **render.com** and sign in (use "Continue with GitHub").
3. Tap **New +** → **Blueprint**.
4. Connect your GitHub account if asked, then choose this repository and tap **Connect**.
5. Render reads `render.yaml`. Tap **Apply** / **Deploy Blueprint**. Wait a few minutes for the build.
6. When the service says **Live**, open its URL (like `https://chaos-night.onrender.com`).
7. Tap **Create a new room**. Share the invite link with friends. On a TV, open the same URL plus `/tv`.

Notes: the free plan goes to sleep after ~15 minutes without visitors (the first load afterwards takes
about a minute) and rooms are lost on a restart; that is by design since nothing is stored.
Render's default branch is used for deploys; if you develop on another branch, merge it first or pick
that branch in the service settings.

## How a game works
* **Host** creates a room (4-letter code) and is also a player. The ⚙️ button opens the Host menu:
  pick a mode or **Shuffle all**, skip stage, pause/resume, settings, review/remove uploaded photos,
  kick a player, end game. If the host is gone for ~20 seconds, the next connected player becomes host.
* **Settings**: spice (Clean / Normal / Unhinged), timer (Short / Normal / Long), photo source
  (Bank / Uploads / Mix), display (Auto / TV / Phone-only), rounds per mode.
* Anything not submitted by the timer is auto-submitted, and disconnected players never block a game.
  Players can rejoin using their stored token or by typing the same name. Late joiners play from the
  next stage. Players can reroll a prompt twice per stage (where prompts are personal).
* **Pools**: from the lobby anyone can add prompts, scenarios, people (for Hot Take) and photos.
  Photos are resized on the phone, validated on the server, kept in memory, anonymous until shown,
  and removable by the host.
* Rooms with no activity for about 30 minutes are deleted.

## Add your own content
Edit the JSON files in `data/`: `figures.json` (historical figures; keep facts true and verifiable),
`prompts.json`, `mostlikely.json`, `drawprompts.json`, `scenarios.json` (tagged `clean`/`normal`/`unhinged`),
`names.json` (fallback Hot Take targets; deliberately not current events) and `scenes.json`
(emoji pictures for Caption the Chaos).

## Add a game mode
Drop one file in `server/modes/` (copy `_template.js`). No client changes needed.
See [docs/ADDING_A_MODE.md](docs/ADDING_A_MODE.md).

## Layout
```
config.js            game name, avatars, constants
server/index.js      Express + Socket.IO, /health, /tv, asset route
server/room.js       rooms, stages, game loop, the ctx helpers modes use
server/registry.js   auto-loads server/modes/*.js (skips _files)
server/modes/        one file per game mode
data/                editable content banks
public/              vanilla JS/CSS client (phone: index.html, TV: tv.html)
test/bots.js         full-game bot test for every mode
```

## Privacy and safety
No accounts, analytics, external requests, CDNs or fonts. Only `express` and `socket.io` at runtime.
User text is length-limited on the server and HTML-escaped on the client; uploaded images are
type- and size-checked (magic bytes) and only served after they've been shown in a round.
