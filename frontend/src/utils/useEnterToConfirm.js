import { useEffect, useRef } from 'react';

// Enter presses the battle's main action button (Cast Spell / Confirm / Check / Forge) — whichever one
// is on screen and usable right now. Buttons opt in with the `data-enter-action` attribute.
// `enabled` is the game's own "nothing in the way" condition (intro done, no tutorial/menu/pop-up, …).
// Inputs that already handle Enter themselves call preventDefault, and a focused button already clicks
// itself on Enter, so neither ever fires twice.
const isUsable = (btn) => {
  if (btn.disabled || !btn.getClientRects().length) return false;
  const style = getComputedStyle(btn);
  if (style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
  for (let el = btn; el; el = el.parentElement) {
    if (parseFloat(getComputedStyle(el).opacity) < 0.05) return false;   // faded out / hidden panel
  }
  return true;
};

export const useEnterToConfirm = (enabled) => {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.repeat || e.defaultPrevented || !enabledRef.current) return;
      const t = e.target;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      // Pop-ups on top of the battle (intro, result, settings/menu) take priority
      if (document.querySelector('.ip-overlay, .gep-backdrop, .settings-overlay, .wizard-menu-overlay')) return;
      const btn = [...document.querySelectorAll('[data-enter-action]')].find(isUsable);
      if (!btn) return;
      e.preventDefault();
      btn.click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
