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

// Only the typing pop-up's own box (components/TouchTextPrompt.jsx) may select text on a phone.
const mayType = (el) => !!el?.closest?.('#wf-text-prompt input');

export function installDeviceClass() {
  document.documentElement.classList.add(TOUCH ? 'wf-touch' : 'wf-desktop');
  if (!TOUCH) return;
  // Phones behave like an app, not a web page:
  //  • no pinch zoom (iPhone's own pinch "gesture" events; double-tap zoom is off in index.css)
  //  • no text selection, so a long press never brings up the iPhone magnifier (loupe) or a menu
  const block = (e) => e.preventDefault();
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, block, { passive: false }));
  document.addEventListener('selectstart', (e) => { if (!mayType(e.target)) e.preventDefault(); });
  document.addEventListener('contextmenu', (e) => { if (!mayType(e.target)) e.preventDefault(); });
  // Two-finger touches would pinch-zoom on older iPhones that ignore the viewport lock
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  //  • the page itself never scrolls (a phone keyboard opening tries to scroll a typing box into
  //    view): snap straight back. Lists inside the game still scroll; this is only the whole page.
  const unscroll = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
  window.addEventListener('scroll', unscroll, { passive: true });
  window.visualViewport?.addEventListener('resize', unscroll);
}
