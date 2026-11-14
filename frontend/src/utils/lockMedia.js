// ── Music, sound effects and tutorial clips play like part of the game ──
// Nobody can move their progress forward/back, skip or pause them from outside the game: not the
// browser's media button / media hub (PC), not a phone's lock screen, notification panel or
// Control Center, not a "Show controls" menu on a video. Installed once (main.jsx).
//   1. Media Session: the browser/phone hands its seek / skip / pause buttons to the page, and the
//      page's handlers do nothing, so those buttons have no effect.
//   2. Backup guard on every sound/clip: any jump in its progress that the GAME didn't make (the
//      game sets currentTime itself, e.g. to restart a track) is put straight back. A track looping
//      back to its start is the game's own playback and plays on.
// The game's own speed changes (e.g. the magnet hum, the "before defeat" speed-up) are untouched.

const guarded = new WeakSet();
let timeSetter = null;   // the browser's own currentTime setter (the game's seeks go through the patched one)

// Put one sound/clip under guard (safe to call many times)
export const guardMedia = (el) => {
  if (!el || guarded.has(el) || !timeSetter) return;
  guarded.add(el);
  let lastTime = el.currentTime || 0;
  el.addEventListener('timeupdate', () => { if (!el.seeking) lastTime = el.currentTime; });
  el.addEventListener('seeking', () => {
    const t = el.currentTime;
    if (el._wfGameSeek) { el._wfGameSeek = false; lastTime = t; return; }          // the game moved it
    const d = el.duration || 0;
    const loopRestart = el.loop && t < 0.5 && d > 0 && lastTime > d - 1;           // looping back to 0
    if (loopRestart || Math.abs(t - lastTime) < 0.35) { lastTime = t; return; }
    timeSetter.call(el, lastTime);                                                  // outside jump: undo
  });
};

export function installMediaLock() {
  if (typeof window === 'undefined' || window.__wfMediaLock) return;
  window.__wfMediaLock = true;

  // 1. Outside media controls: seek / skip / pause / stop buttons do nothing
  if ('mediaSession' in navigator) {
    ['seekto', 'seekforward', 'seekbackward', 'previoustrack', 'nexttrack', 'skipad', 'pause', 'stop'].forEach((action) => {
      try { navigator.mediaSession.setActionHandler(action, () => {}); } catch { /* not supported in this browser */ }
    });
  }

  // 2. Mark the game's own seeks, and guard every sound/clip as soon as it plays
  const proto = HTMLMediaElement.prototype;
  const timeDesc = Object.getOwnPropertyDescriptor(proto, 'currentTime');
  if (!timeDesc?.set) return;
  timeSetter = timeDesc.set;
  Object.defineProperty(proto, 'currentTime', {
    ...timeDesc,
    set(v) { this._wfGameSeek = true; timeSetter.call(this, v); },
  });
  const origPlay = proto.play;
  proto.play = function play(...args) {
    guardMedia(this);
    return origPlay.apply(this, args);
  };
}
