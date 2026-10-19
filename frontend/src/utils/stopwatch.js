import { useState, useEffect, useRef, useCallback } from 'react';

// A stopwatch that only counts while `running` is true. Pausing keeps the time
// counted so far; reset() puts it back to 0 (it keeps counting if still running).
// getMs() reads the exact time right now, for saving it without waiting for a render.
export const useStopwatch = (running) => {
  const doneMs = useRef(0);        // time counted before the current run
  const runStart = useRef(null);   // performance.now() when the current run started, null while paused
  const [ms, setMs] = useState(0);

  const getMs = useCallback(
    () => doneMs.current + (runStart.current !== null ? performance.now() - runStart.current : 0),
    []
  );

  useEffect(() => {
    if (!running) return undefined;
    runStart.current = performance.now();
    const id = setInterval(() => setMs(getMs()), 250);
    return () => {
      clearInterval(id);
      doneMs.current = getMs();
      runStart.current = null;
      setMs(doneMs.current);
    };
  }, [running, getMs]);

  const reset = useCallback(() => {
    doneMs.current = 0;
    if (runStart.current !== null) runStart.current = performance.now();
    setMs(0);
  }, []);

  return { ms, getMs, reset };
};

// For short one-off animations that have no state of their own to watch (e.g. a hint
// sliding in): hold(ms) makes `held` true for that long. Overlapping holds stack.
export const useAnimationHold = () => {
  const [count, setCount] = useState(0);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const hold = useCallback((ms) => {
    setCount(c => c + 1);
    timers.current.push(setTimeout(() => setCount(c => c - 1), ms));
  }, []);
  return { held: count > 0, hold };
};

// For a child component that animates on its own: tells the parent through
// onBusyChange whenever `busy` flips, and reports false when it unmounts.
export const useReportBusy = (busy, onBusyChange) => {
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onBusyChange?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps
};

// Always H:MM:SS: 83500 -> "0:01:23", 3723000 -> "1:02:03"
export const formatStopwatch = (ms) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
};
