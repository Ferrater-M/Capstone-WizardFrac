// ── Is the game being played on a phone (touch screen) or a computer (mouse + keyboard)? ──
//
// What matters for the game is the INPUT, not the brand: a phone has no keyboard, so it
// gets on-screen controls (the pressable arrow-key guide, the battle keypad).
//   • Main check: the main pointer is a finger and can't hover. True on iPhone and
//     Android; false on desktops/laptops, even ones with a touch screen.
//   • Backup: the browser's own "mobile" flag / device text (iPhone, Android), plus
//     iPads, which pretend to be a Mac but have a touch screen.
// Checked once at startup; <html> gets the class "wf-touch" or "wf-desktop" for CSS.
// To try it on a computer: Chrome DevTools → device toolbar (Ctrl+Shift+M) → pick a phone → reload.

const detect = () => {
  if (typeof window === 'undefined') return false;
  const fingerOnly = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
  const ua = navigator.userAgent || '';
  const saysMobile = navigator.userAgentData?.mobile ?? /Android|iPhone|iPod/i.test(ua);
  const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return !!(fingerOnly || saysMobile || iPad);
};

const TOUCH = detect();

export const isTouchDevice = () => TOUCH;

export function installDeviceClass() {
  document.documentElement.classList.add(TOUCH ? 'wf-touch' : 'wf-desktop');
}
