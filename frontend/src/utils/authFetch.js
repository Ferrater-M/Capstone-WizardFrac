import { API_BASE_URL } from '../config';

// Login pass handling for every request to our server.
//
// The server only lets a request touch a player's data when it carries that player's login pass
// (backend AuthInterceptor). Instead of editing every fetch() in the game, this wraps window.fetch once:
// any request to API_BASE_URL gets "Authorization: Bearer <token>" added automatically.
//
// If the server answers 401 with the X-Auth-Error header (pass expired, or the password was changed in
// another game), the handler set by App.jsx sends the player back to the login screen.

export const AUTH_TOKEN_KEY = 'authToken';

let onAuthExpired = null;
export const setAuthExpiredHandler = (fn) => { onAuthExpired = fn; };

export const getAuthToken = () => {
  try { return sessionStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
};

export const setAuthToken = (token) => {
  try {
    if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    else sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch { /* storage blocked: the player will just be asked to log in again */ }
};

const isOurServer = (url) => typeof url === 'string' && url.startsWith(API_BASE_URL);

export const installAuthFetch = () => {
  if (window.__wizardfracAuthFetch) return; // once (Vite hot reload)
  window.__wizardfracAuthFetch = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = input instanceof URL ? input.href : input;
    if (!isOurServer(url)) return originalFetch(input, init);

    const token = getAuthToken(); // read now, before anything (like logout) clears it
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const response = await originalFetch(url, { ...init, headers });
    if (response.status === 401 && response.headers.get('X-Auth-Error') && token) {
      setAuthToken(null);
      onAuthExpired?.();
    }
    return response;
  };
};
