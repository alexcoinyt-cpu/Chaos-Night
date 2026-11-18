'use strict';
// One place to rename the game or change global constants.
module.exports = {
  GAME_NAME: 'Chaos Night',
  TAGLINE: 'The party game where your phone is the controller.',
  // Emoji avatars players can pick from (the server validates against this list).
  AVATARS: ['😀','😎','🤩','🥳','😜','🤪','🤠','👻','👽','🤖','🦄','🐸','🐙','🦊','🐼','🐵','🦖','🐧','🦆','🐝','🍕','🌮','🍩','🔥'],
  MAX_PLAYERS: 12,
  ROOM_IDLE_MS: 30 * 60 * 1000,                       // empty/inactive rooms are deleted after this
  HOST_GRACE_MS: Number(process.env.CHAOS_HOST_GRACE_MS) || 20000, // host gone this long => next player hosts
};
