import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Typing pop-up for phones (iPhone and Android) ──
// Mounted by App.jsx on touch devices only (utils/device.js).
//
// On a phone held sideways the keyboard covers most of the screen, and the game is one scaled
// 1920×1080 picture that can't scroll, so a text box low on the screen would end up hidden
// under the keyboard. So when the player taps any box that needs the phone keyboard (nickname,
// password, email, …), a pop-up input bar opens at the very top of the screen, above the
// keyboard, with an X on its right to close it.
//   • What's typed there goes straight into the real box (its own checks and limits still run).
//   • Enter (the keyboard's Go / Done / Return) closes it and does what Enter does in the real
//     box: submits the login form, saves the nickname, …
//   • X, tapping outside, or the phone hiding its keyboard just closes it (the text stays).
// Battle answer boxes are not touched: they use the battle keypad (TouchKeypad, inputmode="none").
// The pop-up lives outside the game stage, so it's sized to the real phone screen.

const KEYBOARD_FIELDS = 'input:not([type]), input[type="text"], input[type="password"], input[type="email"], input[type="search"], input[type="url"], input[type="tel"], input[type="number"], textarea';

const valueSetter = (el) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;

const needsKeyboard = (el) =>
  !!el?.matches?.(KEYBOARD_FIELDS)
  && !el.closest('#wf-text-prompt')
  && !el.disabled && !el.readOnly
  && el.getAttribute('inputmode') !== 'none';

const labelFor = (el) =>
  el.getAttribute('aria-label') || el.placeholder || el.labels?.[0]?.textContent?.trim() || 'Type here';

const TouchTextPrompt = () => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const inputRef = useRef(null);
  const targetRef = useRef(null);
  const openRef = useRef(false);

  const close = () => {
    if (!openRef.current) return;
    openRef.current = false;
    targetRef.current = null;
    setOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    // A tap on a box that needs the keyboard → open the pop-up and move the typing there. This runs
    // inside the tap itself, so the phone is allowed to bring up its keyboard for the pop-up's box.
    const onTap = (e) => {
      const el = e.target;
      if (!needsKeyboard(el) || openRef.current) return;
      const input = inputRef.current;
      if (!input) return;
      targetRef.current = el;
      input.type = el.type === 'password' ? 'password' : el.type === 'email' ? 'email' : el.type === 'url' ? 'url' : 'text';
      input.inputMode = el.inputMode || '';
      input.autocomplete = el.autocomplete || 'off';
      input.maxLength = el.maxLength > 0 ? el.maxLength : 524288;
      input.placeholder = el.placeholder || '';
      input.value = el.value;
      setLabel(labelFor(el));
      openRef.current = true;
      setOpen(true);
      input.focus({ preventScroll: true });
      const end = input.value.length;
      try { input.setSelectionRange(end, end); } catch { /* email/number boxes don't support it */ }
    };
    document.addEventListener('click', onTap, true);
    return () => document.removeEventListener('click', onTap, true);
  }, []);

  // Typing in the pop-up → the real box, exactly as if typed there (React's onChange runs)
  const mirror = () => {
    const el = targetRef.current;
    const input = inputRef.current;
    if (!el || !input) return;
    valueSetter(el).call(el, input.value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = el.value;            // the box may refuse/trim characters: show what it kept
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const el = targetRef.current;
    close();
    if (!el) return;
    const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    if (!ev.defaultPrevented && el.form) el.form.requestSubmit();
  };

  return createPortal(
    <div id="wf-text-prompt" className={open ? 'is-open' : ''} aria-hidden={!open}>
      <div className="wf-tp-backdrop" onPointerDown={(e) => { e.preventDefault(); close(); }} />
      <div className="wf-tp-bar">
        <label className="wf-tp-label" htmlFor="wf-tp-input">{label}</label>
        <div className="wf-tp-row">
          <input
            id="wf-tp-input"
            ref={inputRef}
            className="wf-tp-input"
            enterKeyHint="done"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onInput={mirror}
            onKeyDown={onKeyDown}
            onBlur={close}
          />
          <button
            type="button"
            className="wf-tp-close"
            aria-label="Close"
            onPointerDown={(e) => { e.preventDefault(); close(); }}
          >
            <svg viewBox="0 0 7 7" width="18" height="18" shapeRendering="crispEdges" aria-hidden="true">
              <path fill="currentColor" d="M0 0h2v1h1v1h1V1h1V0h2v2H6v1H5v1h1v1h1v2H5V6H4V5H3v1H2v1H0V5h1V4h1V3H1V2H0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TouchTextPrompt;
