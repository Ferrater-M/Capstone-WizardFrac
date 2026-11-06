// Remembers, per island and per player, that the battle tutorial was finished or skipped — so it only
// opens by itself the first time (on level 1). The Help button still opens it any time.
const key = (island, studentId) => `wizardfrac_seen_tutorial_${island}_${studentId ?? 'guest'}`;

export const hasSeenTutorial = (island, studentId) => {
  try { return localStorage.getItem(key(island, studentId)) === '1'; } catch { return false; }
};

export const markTutorialSeen = (island, studentId) => {
  try { localStorage.setItem(key(island, studentId), '1'); } catch { /* private mode etc. — just shows again */ }
};

// Open the tutorial automatically only on an island's first level, and only until it has been seen.
export const shouldAutoShowTutorial = (island, studentId, level) =>
  (level || 1) <= 1 && !hasSeenTutorial(island, studentId);
