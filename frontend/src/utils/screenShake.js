// Impact screen shake: the whole app (#root, so every piece of UI) jolts rapidly in random
// directions for SHAKE_MS, easing off toward the end. Fresh random offsets are rolled on every
// call, and a new shake cancels one still running instead of stacking.
// Fired on impact — when the enemy plays its hit animation or the player plays their hurt one —
// and plays the generalHurt impact sound with it.

import { playSfx } from './audio';

const SHAKE_MS = 500;
const STEPS = 14;           // ~35 ms per jolt
const MAX_PX = 18;
const MAX_DEG = 1.2;        // slight random tilt per jolt for extra punch

let current = null;

// Pass { sound: false } to shake without the hurt sound (e.g. the gem shatter, which has its own).
export const triggerScreenShake = ({ sound = true } = {}) => {
  const el = document.getElementById('root');
  if (!el?.animate) return;
  const frames = [{ transform: 'translate(0, 0) rotate(0deg)' }];
  for (let i = 1; i < STEPS; i++) {
    const k = 1 - i / STEPS * 0.6;                // hardest on impact, softens a little near the end
    const amp = MAX_PX * k * (0.7 + Math.random() * 0.3);
    const ang = Math.random() * Math.PI * 2;
    const rot = (Math.random() * 2 - 1) * MAX_DEG * k;
    frames.push({ transform: `translate(${(Math.cos(ang) * amp).toFixed(1)}px, ${(Math.sin(ang) * amp).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)` });
  }
  frames.push({ transform: 'translate(0, 0) rotate(0deg)' });
  if (sound) playSfx('/SoundEffects/generalHurt.wav');
  current?.cancel();
  current = el.animate(frames, { duration: SHAKE_MS, easing: 'linear' });
  current.onfinish = () => { current = null; };
};
