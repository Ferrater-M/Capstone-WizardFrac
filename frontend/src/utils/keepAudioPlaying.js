// Keeps the game's music going while the player is in another tab or app.
// Nothing in the game stops sound when the page is hidden, but browsers sometimes do on their own:
// they pause looping music or put the audio engine (AudioContext, used by the battle music) to sleep.
// This runs once for the whole app:
//   • Any looping track the BROWSER pauses (not the game) is started again right away.
//   • Any audio engine the browser suspends is woken back up.
//   • When the page is hidden/shown or loses/gets focus, everything that should be playing is nudged again.
// Pauses the game asks for (pause()) are remembered and never undone.

// .src reads back as the page address after src = '', so check the attribute instead
const hasSrc = (a) => !!a.getAttribute('src');
const loops = new Set();      // looping <audio> the game wants playing
const contexts = new Set();   // audio engines the game created

const resumeAll = () => {
  loops.forEach(a => {
    if (!hasSrc(a)) { loops.delete(a); return; }   // released (src cleared)
    if (a.paused && !a._gamePaused) a.play().catch(() => {});
  });
  contexts.forEach(ctx => {
    if (ctx.state === 'closed') { contexts.delete(ctx); return; }
    if (ctx.state !== 'running' && !ctx._gameSuspended) ctx.resume().catch(() => {});
  });
};

export const installKeepAudioPlaying = () => {
  if (typeof window === 'undefined' || window.__keepAudioPlaying) return;
  window.__keepAudioPlaying = true;

  const proto = HTMLMediaElement.prototype;
  const origPlay = proto.play;
  const origPause = proto.pause;

  proto.play = function play(...args) {
    this._gamePaused = false;
    if (this.loop && !this._keepAlive) {
      this._keepAlive = true;
      loops.add(this);
      // The browser paused it (we didn't): start it again
      this.addEventListener('pause', () => {
        if (this._gamePaused || !this.loop || !hasSrc(this)) return;
        setTimeout(() => { if (this.paused && !this._gamePaused && hasSrc(this)) origPlay.call(this).catch(() => {}); }, 50);
      });
    }
    return origPlay.apply(this, args);
  };

  proto.pause = function pause(...args) {
    this._gamePaused = true;
    return origPause.apply(this, args);
  };

  // Track every audio engine so a suspended one can be woken
  ['AudioContext', 'webkitAudioContext'].forEach(name => {
    const Orig = window[name];
    if (!Orig) return;
    const Wrapped = function (...args) {
      const ctx = new Orig(...args);
      contexts.add(ctx);
      const origSuspend = ctx.suspend.bind(ctx);
      ctx.suspend = () => { ctx._gameSuspended = true; return origSuspend(); };
      const origResume = ctx.resume.bind(ctx);
      ctx.resume = () => { ctx._gameSuspended = false; return origResume(); };
      ctx.addEventListener?.('statechange', () => {
        if (ctx.state !== 'running' && ctx.state !== 'closed' && !ctx._gameSuspended) origResume().catch(() => {});
      });
      return ctx;
    };
    Wrapped.prototype = Orig.prototype;
    window[name] = Wrapped;
  });

  // After a refresh the browser blocks sound until the player clicks or presses a key. Music that was
  // blocked is still waiting in `loops` (paused, but not paused by the game), so the first click/key starts it.
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, resumeAll, { capture: true, passive: true }));

  document.addEventListener('visibilitychange', resumeAll);
  window.addEventListener('blur', resumeAll);
  window.addEventListener('focus', resumeAll);
  window.addEventListener('pageshow', resumeAll);
};
