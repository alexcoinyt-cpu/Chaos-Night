# 🧸 Plush Pal Chaos Lab

A private, local-only physics sandbox where you do absurd (and gentle) things to **Dumpling Von Fluffernoodle**,
a stuffed-animal buddy made of fabric and cotton. Slapstick only: seams rip, limbs pop off, stuffing poofs,
button eyes go flying. No blood, no gore. He is always fixable and always good-humoured about it.

## Run it (one command)
```bash
npm run plush            # from the repo root  (or: node plush-pal/serve.js)
```
Open http://localhost:8080 (on a phone: use your computer's LAN IP, same Wi-Fi). Zero dependencies: Matter.js
is vendored in `vendor/`, and the server is ~15 lines of plain Node. (Any static file server works too; it needs
HTTP, not `file://`, because it uses ES modules.)

## Privacy
Everything stays in your browser: settings, coins, unlocks and your **image gallery** live in `localStorage`.
No accounts, no uploads, no sharing links. The only things that leave the page are a screenshot / replay clip
that *you* press download on.

## What's in it
* **65 tools** in 9 categories (Smash, Slice, Boom, Elements, Machines, Silly, Gentle, Absurd, Places) plus Grab & Fling
  and a **Rube Goldberg mode** with 11 linkable devices. Full list: [`docs/PLAN.md`](docs/PLAN.md).
* **Plush damage:** every part is a soft lattice with tearable seams. Cuts split him cleanly along the line (both halves
  keep simulating, stuffing trails out). Squeaks, dizzy eyes, sighs, grins. **Stitch him back** animation + optional auto-regen.
* **Custom images** (Menu → Image Lab, or drop a picture on the page): face, torso, arms, legs, or whole-plush skin, with
  crop/zoom/rotate/flip and a mask preview. The image is texture-mapped, so it bends and squashes with the physics, goes with
  a torn-off limb, and splits along a cut. Gallery for quick swaps and one-tap reset.
* **Face maker:** mix eyes, mouths, brows, noses, with a 🎲 button.
* **Game loop:** coins from impact force, tears and combo chains, multiplier meter, XP levels, shop (tools, 7 skins,
  14 outfits, 6 rooms), daily reward, prize wheel, 22 achievements, named combos, slow-mo replay of your biggest hit,
  rewind, screenshots, sound, screen shake, haptics, mute.
* **Rooms:** living room, junkyard, space station (low-g), underwater (drag), carnival (bouncy), haunted-ish mansion.

## Adding a tool
Every tool is a config object in `js/tools/<category>.js`:
```js
T({ id: 'hammer', name: 'Mallet of Mild Inconvenience', icon: '🔨', cost: 0, level: 1, type: 'tap',
    sounds: ['bonk'], lines: ['Bonk. Noted.'], hint: 'Tap to bonk.',
    effect(G, p) { K.hit(p.x, p.y, 90, 9, { up: -4, tear: 0.25 }); } })
```
`type` is `tap`, `hold` (effect runs each frame; add `end(G)`), `global` (runs when you tap its tile) or `place`
(spawns a persistent device). `js/toolkit.js` (`K`) has the helpers: `hit`, `cut`, `blast`, `field`, `strike`, `prop`...
Rooms live in `js/rooms.js`, outfits and species in `js/species.js`, devices in `js/contraptions.js`.

## Layout
`physics.js` world · `plush.js` ragdoll/seams/cuts · `textures.js` · `render.js` · `effects.js` · `faces.js` ·
`reactions.js` · `economy.js` · `toolkit.js` + `tools/` · `contraptions.js` · `images.js` · `replay.js` · `audio.js` ·
`save.js` · `ui.js` · `input.js` · `logic.js` · `main.js`. Matter.js is MIT licensed (see `vendor/MATTER-LICENSE`).
