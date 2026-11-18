// Dumpling's mood, speech bubble, and one-liners.
import { G } from './game.js';
export const NAME = 'Dumpling Von Fluffernoodle';
export const BACKSTORY = `${NAME}, "Dumpling" to friends, was sewn on a Tuesday by retired sock-puppeteer Auntie Marjorie out of three couch cushions and a mild disagreement. He trained to be a Serious Opera Singer, but the squeaker got stitched in during a power cut, so every high note is a squeak. He is made of fabric and cotton and has accepted this. He is always, somehow, fine.`;
const L = {
  smash: ['I felt that in my stuffing.', 'Bonk. Noted.', 'Ah yes, percussion.', 'That tickled. Structurally.', 'My squeaker is on the OTHER side.', 'Ow! ...it was a good hit, though.', 'I have been bonked. I forgive you.'],
  slice: ['Well, that is a draft.', 'I am now available in multiple pieces.', 'Please mind the seams.', 'Auntie Marjorie is going to have notes.', 'Halves! Both of them me!', 'I feel lighter. Emotionally and cottonally.'],
  boom: ['Ta-da?', 'I regret nothing, mostly.', 'That was loud. I loved it.', 'Do it again. Slower.', 'My ears are ringing. All of them.', 'Boom! I mean, ow. Boom.'],
  fire: ['Toasty.', 'I am a marshmallow now.', 'Smells like Tuesday.', 'Well done. As in cooked.', 'Medium rare cotton, please.'],
  ice: ['Brrr-eakfast.', 'I am a popsicle with feelings.', 'Cool. Literally. Stop.', 'Chilly... but make it fashion.'],
  shock: ['BZZZ-ing! My hair! I have no hair!', 'Static! Everything is static!', 'Somebody sneezed in my wiring.'],
  launch: ['Wheeeeee-eek!', 'Tell my cushions I love them.', 'I can see my couch from here!', 'Orbital Dumpling, reporting in.'],
  gentle: ['Aww. That is nice.', 'Five stars. Would cuddle again.', 'My stuffing is warm.', 'This is my favorite one.', 'I feel appreciated.'],
  silly: ['Squeak-a-doodle!', 'Honk. That was not me.', 'This is the finest day of my life.', 'Comedy is pain, but fluffier.', 'I am trying to remain dignified.'],
  space: ['Physics is just a suggestion.', 'Is this allowed? ...Do it again.', 'The universe has questions.', 'I am a space potato. Proudly.'],
  machine: ['I am not a sock! Washing is not for me!', 'Spin cycle for one, please.', 'Everything is going round. Including me.', 'Gentle cycle, they said.'],
  env: ['Well, this is an adventure.', 'Location: surprising.', 'Great venue. Terrible landing.', 'I came for the physics, I stayed for the physics.'],
  pop: ['My arm! ...Oh, it is fine, it is just over there.', 'Parts are optional.', 'I have always been a loose collection of ideas.', 'Pop! A limb. Cute.', 'Could somebody grab that? I am busy being dramatic.'],
  eye: ['My eye! It is a button. I will live.', 'Eyes are overrated. Stitched Xs are very now.', 'Somebody catch that, it is my good one.'],
  stitch: ['All better! Slightly squeakier.', 'Good as new. Better. Fluffier.', 'Thank you, thread. Thank you, Auntie.', 'Back in one piece. Mostly the same pieces.'],
  idle: ['Is it my turn to be hit?', 'I could really use a hat.', 'Anyone seen my squeaker?', 'This is fine. I am fine.', 'Sing me a lullaby. Or a hammer.', '*dramatic sigh*', 'I used to be an opera singer. Squeak.', 'I contain multitudes. And cotton.'],
  ouch: ['Squeak!', 'Eep!', 'Oof, my seams.', 'Wheek!'],
  dizzy: ['Stars. Pretty ones.', 'The room is doing a dance.', 'Why are there two of everything?'],
  grin: ['That was FUN!', 'Again! Again!', 'Best. Day. Ever.', 'My seams are giggling.'],
  combo: ['Combo! I am a physics circus!', 'That chain was art.', 'Rube Goldberg would weep. Happily.'],
  water: ['Glug.', 'I am a very absorbent hero.', 'Soggy but proud.'],
  yank: ['Easy! I am held together by hope!', 'My shoulder seam says hello.', 'Whoa, whoa, whoa.'],
};
export const React = {
  bubble: null, mood: 'idle', moodT: 0, lastSay: -9, idleT: 6,
  line(cat) { const a = L[cat] || L.smash; return a[(Math.random() * a.length) | 0]; },
  say(text, o = {}) {
    const prio = o.prio ?? 1; if (G.time - this.lastSay < (o.gap ?? 1.4) && prio < 3 && this.bubble && this.bubble.prio >= prio) return;
    this.bubble = { text, t: 0, dur: o.dur ?? Math.max(1.8, text.length * 0.055), prio }; this.lastSay = G.time; if (o.mood) this.setMood(o.mood, o.moodDur ?? 1.6);
  },
  sayCat(cat, o) { this.say(this.line(cat), o); },
  setMood(m, dur = 1.5) { if (this.moodPrio && this.mood !== 'idle' && this.moodT > 0 && m === 'ouch' && this.mood === 'dizzy') return; this.mood = m; this.moodT = dur; },
  update(dt) {
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) { this.mood = this.restMood(); } }
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
    this.idleT -= dt; if (this.idleT <= 0) { this.idleT = 9 + Math.random() * 8; if (!this.bubble && !G.pointer.down) this.say(this.line('idle'), { gap: 0, mood: Math.random() < .3 ? 'dramatic' : null }); }
  },
  restMood() { const p = G.plush; if (!p) return 'idle'; if (p.status.sleepy > 0) return 'sleepy'; if (p.status.frost > 0.5) return 'frozen'; if (p.status.heat > 0.5) return 'toasty'; if (p.status.wet > 0.5) return 'sad'; if (p.damaged() && Math.random() < 0.35) return 'deadpan'; return 'idle'; },
};
