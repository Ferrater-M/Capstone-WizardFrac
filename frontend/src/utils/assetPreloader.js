import publicAssets from 'virtual:public-assets';

// ── Start-up download ───────────────────────────────────────────────────────
// The game stays on the loading screen until everything in public/ (every picture, sound, all music,
// the tutorial videos), the font and the code for every screen has been downloaded, so nothing ever
// shows up half-drawn, silent or late. To let something stream instead, return false for it here.
const isBlocking = () => true;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;
const PARALLEL = 6;
// Code chunks and the font have no known size; each counts as this many bytes on the progress bar.
const SMALL_TASK_BYTES = 150 * 1024;

// Decoded pictures are kept here for the whole visit, so every <img> / CSS background of the same
// file is drawn instantly from memory.
const keptImages = [];

let started = null;

// Downloads one file, reporting each chunk's bytes as it arrives. Never rejects: a file that fails
// is skipped (the game still works; that picture just loads late) rather than freezing the loading screen.
const downloadFile = async ({ url, size }, onBytes) => {
  let got = 0;
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // Bytes beyond the listed size (e.g. a file changed since the build) don't push the bar past 100%
      const step = Math.min(value.length, Math.max(0, size - got));
      got += value.length;
      if (step) onBytes(step);
    }
    if (IMAGE_RE.test(url)) {
      const img = new Image();
      img.src = url;                       // straight from the browser cache now
      keptImages.push(img);
      await img.decode().catch(() => {});
    }
  } catch {
    // skipped
  } finally {
    if (got < size) onBytes(size - got);   // whatever wasn't counted still fills the bar
  }
};

// Starts the download (only once per visit) and resolves when everything is in.
// onProgress(0..1) is called as bytes arrive.
// extraTasks: functions returning promises (e.g. the code for the battle screens).
export const preloadAllAssets = (onProgress, extraTasks = []) => {
  if (started) {
    started.listeners.add(onProgress);
    onProgress(started.done / started.total);
    return started.promise;
  }
  const files = publicAssets.filter(isBlocking);
  const fontTask = () => (document.fonts?.load ? document.fonts.load('16px "Press Start 2P"') : Promise.resolve());
  const tasks = [fontTask, ...extraTasks];

  const state = {
    total: files.reduce((n, f) => n + f.size, 0) + tasks.length * SMALL_TASK_BYTES,
    done: 0,
    listeners: new Set([onProgress]),
  };
  started = state;
  let lastSent = -1;
  const add = (bytes) => {
    state.done += bytes;
    const p = state.total ? Math.min(1, state.done / state.total) : 1;
    if (p - lastSent < 0.002 && p < 1) return;   // no need to re-render for every few KB
    lastSent = p;
    state.listeners.forEach((fn) => fn(p));
  };

  const runFiles = async () => {
    // Biggest first, so the slow downloads aren't the ones left at the end.
    const queue = [...files].sort((a, b) => b.size - a.size);
    const worker = async () => {
      while (queue.length) await downloadFile(queue.shift(), add);
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
  };
  const runTasks = () => Promise.all(tasks.map((t) =>
    Promise.resolve().then(t).catch(() => {}).finally(() => add(SMALL_TASK_BYTES))));

  state.promise = Promise.all([runFiles(), runTasks()]).then(() => {
    state.listeners.forEach((fn) => fn(1));
  });
  return state.promise;
};
