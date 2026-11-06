// Maps island name -> the section key used for it in enemyData.txt
export const ISLAND_ENEMY_KEY = { Similar: 'similarIsland', Dissimilar: 'dissimilarIsland', Hybrid: 'hybridIsland' };

// Counts how many enemy blocks exist for each island section in enemyData.txt,
// so the lobby can show each island's real max stage count instead of a guess.
export const countEnemiesPerIsland = (text) => {
  const sections = text.split('===').filter(s => s.trim());
  const counts = {};
  Object.entries(ISLAND_ENEMY_KEY).forEach(([islandName, key]) => {
    let count = 0;
    for (const section of sections) {
      const lines = section.trim().split('\n').map(l => l.trim()).filter(l => l);
      if (lines[0] !== key) continue;
      const blocks = section.split('---').slice(1);
      for (const rawBlock of blocks) {
        const content = rawBlock.split('+++')[0].trim();
        if (content) count++;
      }
    }
    counts[islandName] = count;
  });
  return counts;
};
