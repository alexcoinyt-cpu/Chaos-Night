// Shared state hub. main.js fills in the systems; tools and modules read them from G.
export const G = {
  time: 0, dt: 1 / 60, paused: false, timeScale: 1, hitstop: 0,
  tool: null, toolId: 'hand', pointer: { down: false, x: 0, y: 0, sx: 0, sy: 0 },
  cam: { x: 0, y: 0, s: 1, w: 800, h: 600, shake: 0, floorSY: 500, worldW: 520, shx: 0, shy: 0 },
  lastAction: 0, lastToolAt: 0, replaying: false, rube: false,
  // systems, filled at boot: physics, plush, fx, audio, econ, react, room, ui, ...
};
export const hap = (pat) => { try { if (G.save && G.save.settings.haptics && navigator.vibrate) navigator.vibrate(pat); } catch (e) {} };
