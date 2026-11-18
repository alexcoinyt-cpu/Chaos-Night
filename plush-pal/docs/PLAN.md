# Plush Pal Chaos Lab: plan

## The buddy
**Dumpling Von Fluffernoodle** ("Dumpling"), sewn on a Tuesday by retired sock-puppeteer Auntie Marjorie from
"three couch cushions and a mild disagreement". He trained to be a Serious Opera Singer, but the squeaker was
stitched in during a power cut, so every high note is a squeak. Dry, theatrical, forever unbothered. He is
fabric and cotton only: seams rip, buttons fly, stuffing poofs. Never blood, never gore. Always fixable.

## Architecture (plain ES modules, Matter.js vendored, zero build step)
| Module | Job |
|---|---|
| `physics.js` | Matter engine, walls/floor, props, collision to impact routing, room physics |
| `plush.js` | The ragdoll: each body part is a soft lattice of nodes, linked by tearable seams |
| `textures.js` | Bakes part textures: fabric, stitches, species look, custom images (normal / toasty / frosty) |
| `render.js` | Textured-triangle mesh drawing, face overlay, backgrounds, camera, layers |
| `effects.js` | Stuffing, dust, confetti, floating text, trailing stuffing strands, actors (timed effects) |
| `faces.js` | Face drawing + random face maker |
| `reactions.js` | Moods, speech bubbles, one-liners |
| `economy.js` | Coins, XP, combo/multiplier, achievements, daily reward, prize wheel, shop rules |
| `toolkit.js` + `tools/*.js` | Tool helpers + every tool as a config object |
| `contraptions.js` | Placeable devices + Rube Goldberg link mode |
| `images.js` | Upload / drag-drop, crop tool with mask preview, gallery |
| `replay.js` | Ring-buffer recorder, slow-mo replay, screenshot, clip download |
| `audio.js` | Synthesized WebAudio sfx (no assets) |
| `save.js` | localStorage (settings, coins, unlocks, gallery) |
| `ui.js` | HUD, dock, shop, modals |

**Soft plush trick:** each part (head, torso, 2 arms, 2 legs) is a grid of small circle bodies with
structural/shear/bend constraints. A part's texture is mapped onto the grid as triangles, so images bend,
squash and spin with the physics. Parts are joined by *seams* (constraint groups) that accumulate damage and
tear. A cut removes every constraint crossing the cut line, so both halves keep simulating and the image
splits along the line. Torn constraints leave stitched, cotton-fringed edges and trailing stuffing strands.

**Tool config:** `{id,name,icon,cat,cost,level,type:'tap'|'hold'|'global'|'place',sounds,lines,effect(G,p)}`.

## Interaction list (65 tools + Hand + Rube devices)
**Smash** 1 Mallet of Mild Inconvenience (hammer) / 2 Strike Night (bowling ball) / 3 Totally Generic Anvil /
4 Wrecking Ball Wendy / 5 Giant Fist of Friendly Feedback / 6 Falling Piano (in tune) /
7 Mystery Boxing Glove / 8 Cymbal Crash Surprise.
**Slice** 9 Chainsaw of Mild Alarm / 10 Dramatic Sword / 11 Lawnmower Lenny / 12 Paper Shredder /
13 Giant Scissors / 14 Cheese Slicer Wire / 15 Pizza Cutter / (cuts are plush-only: seams and fabric).
**Boom** 16 Rocket Buddy / 17 Pillow Cannon / 18 Firecracker String / 19 Cartoon Bomb / 20 Confetti Cannon /
21 Party Popper / 22 Firework Bouquet.
**Elements** 23 Flamethrower (toasty + smoke) / 24 Ice Gun / 25 Lightning Zap / 26 Tornado / 27 Leaf Blower /
28 Personal Raincloud.
**Machines** 29 Washing Machine (spin cycle) / 30 Trash Compactor (plush-safe) / 31 Catapult /
32 Conveyor Belt / 33 Smoothie Blender (plush-safe whirl) / 34 Wood Chipper (spits confetti chips) / 35 Vacuum.
**Silly** 36 Whoopee Cushion / 37 Banana Peel / 38 Trampoline / 39 Tickle Feather / 40 Rubber Chicken /
41 Pie to the Face / 42 Rubber Duck Rain.
**Gentle** (bonus coins) 43 Big Hug / 44 Tea Party / 45 Spa Day / 46 Bedtime Story / 47 Tiny Hat /
48 Pat on the Head / 49 Warm Blanket / 50 Gold Star Sticker.
**Absurd/Sci-fi** 51 Black Hole / 52 Gravity Flip / 53 Shrink Ray / 54 Grow Ray / 55 Time Rewind /
56 Teleporter Mishap / 57 Giant Foot from the Sky / 58 UFO Beam.
**Environment** 59 Cliff Drop / 60 Bouncy Castle / 61 Water Slide / 62 Ball Pit / 63 Dog Zoomies /
64 Wind Gust / 65 Earthquake.
**Rube Goldberg mode** devices: ramp, trampoline, fan, conveyor, bumper, cannon, dispenser, trigger pad,
catapult. Link any device to any other, then press Go.
**Combos:** chain meter (impacts within 2.5 s) plus named sequences (e.g. Catapult → Trampoline → Leaf Blower).

## Rooms
Living room, junkyard, space station (low gravity), underwater (buoyancy + drag), carnival (bouncy floor),
haunted-but-silly mansion.

## Build order
1. Ragdoll + seams + stuffing, tuned until it feels great 2. Custom image system 3. Five tools
(hammer, chainsaw, rocket, flamethrower, trampoline), tested 4. Expand to all tools 5. Phone viewport +
performance pass 6. Anything outside this list: ask first.
