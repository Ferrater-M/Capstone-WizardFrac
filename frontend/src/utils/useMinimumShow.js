import { useEffect, useState } from 'react';

// Loading screens: shown while `loading` is true, and for at least `ms` after the screen first opened,
// so a quick load doesn't just flash the loading screen. A slow load shows exactly as long as it takes.
export const useMinimumShow = (loading, ms = 1000) => {
  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading || !minDone;
};
