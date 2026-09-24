// ── Shared difficulty parameters ──────────────────────────────────────────
export const getDifficultyParams = (level = 1) => ({
  minDen:    Math.min(2 + Math.floor((level - 1) / 2), 6),
  maxDen:    Math.min(2 + level * 2, 16),
  subChance: Math.min(0.1 + (level - 1) * 0.1, 0.6),
});

// ── Problem builders ───────────────────────────────────────────────────────

export const buildProblem = (level = 1) => {
  const { minDen, maxDen, subChance } = getDifficultyParams(level);

  // From level 2 on, some sums reach 2-3 wholes (the addends themselves are improper),
  // so students also practise turning a bigger improper fraction into a mixed number.
  // The game has 4 levels: rare at 2 (medium), more at 3 (hard), most at 4 (boss).
  const bigChance = level < 2 ? 0 : Math.min(0.1 + (level - 2) * 0.15, 0.4);
  if (Math.random() < bigChance) {
    const lo = Math.max(minDen, 3);
    const hi = Math.max(lo, Math.min(maxDen, 8));
    const bigDen = lo + Math.floor(Math.random() * (hi - lo + 1));
    const wholes = level >= 4 && Math.random() < 0.5 ? 3 : 2;
    const rem = 1 + Math.floor(Math.random() * (bigDen - 1));
    const sum = wholes * bigDen + rem;
    const a = 1 + Math.floor(Math.random() * (sum - 1));
    return `${a}/${bigDen} + ${sum - a}/${bigDen} = ?`;
  }

  let den, n1, n2, op, resNum, attempts = 0;
  do {
    den = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
    n1  = Math.floor(Math.random() * (den - 1)) + 1;
    n2  = Math.floor(Math.random() * (den - 1)) + 1;
    op  = Math.random() < subChance ? '-' : '+';
    if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
    resNum = op === '+' ? n1 + n2 : n1 - n2;
    attempts++;
  } while (resNum % den === 0 && attempts < 20);
  return `${n1}/${den} ${op} ${n2}/${den} = ?`;
};

export const buildProblemDissimilar = (level = 1) => {
  const minDen    = Math.min(2 + Math.floor((level - 1) / 2), 4);
  const maxDen    = Math.min(3 + level * 2, 14);
  const subChance = Math.min(0.1 + (level - 1) * 0.1, 0.6);
  let d1 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  let d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  while (d2 === d1) d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
  const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
  const op = Math.random() < subChance ? '-' : '+';
  if (op === '-' && n1 * d2 < n2 * d1) return `${n2}/${d2} ${op} ${n1}/${d1} = ?`;
  return `${n1}/${d1} ${op} ${n2}/${d2} = ?`;
};

// Dissimilar Island difficulty is fixed per level (the game has 4: easy, medium, hard, boss)
// instead of scaling continuously. Any level past 4 uses the boss tier.
// The butterfly method's denominator is d1 * d2, and an improper result is turned into a
// mixed number with the gem/jar game (one jar of that many shards per whole), so improper
// sums only use pairs whose product is at most maxImproperDen. improperChance is the share of
// additions that are steered to an improper sum (the rest stay proper). leftover says how many
// shards are left outside the jar (the new numerator): weights for exactly 1, 2-3, or 4+.
// bigChance is the share of all problems whose sum reaches 2 or 3 wholes (the addends themselves are
// improper fractions, like Similar Island's bigger problems): 2 wholes, or 3 with probability
// threeWholeChance. Those are capped by DISSIMILAR_BIG so the gem game stays playable.
const DISSIMILAR_TIERS = {
  1: { minDen: 2, maxDen: 4, subChance: 0.1,  improperChance: 0.4,  maxImproperDen: 12, bigChance: 0,    threeWholeChance: 0,   leftover: { one: 0.4,  few: 0.45, many: 0.15 } },
  2: { minDen: 2, maxDen: 5, subChance: 0.2,  improperChance: 0.5,  maxImproperDen: 15, bigChance: 0.1,  threeWholeChance: 0,   leftover: { one: 0.3,  few: 0.4,  many: 0.3 } },
  3: { minDen: 2, maxDen: 6, subChance: 0.3,  improperChance: 0.6,  maxImproperDen: 15, bigChance: 0.25, threeWholeChance: 0,   leftover: { one: 0.2,  few: 0.4,  many: 0.4 } },
  4: { minDen: 2, maxDen: 8, subChance: 0.4,  improperChance: 0.75, maxImproperDen: 15, bigChance: 0.4,  threeWholeChance: 0.5, leftover: { one: 0.15, few: 0.35, many: 0.5 } },
};

// Limits for sums of 2+ wholes: most shards on screen (Similar Island tops out at 31), and the largest
// d1 * d2 allowed for 2 and for 3 wholes.
const DISSIMILAR_BIG = { maxShards: 31, bigMaxDen: { 2: 12, 3: 8 } };

export const getDissimilarTier = (level = 1) => ({
  ...DISSIMILAR_TIERS[Math.min(Math.max(Math.round(level) || 1, 1), 4)],
  ...DISSIMILAR_BIG,
});

export const getDifficultyParamsHybrid = (level = 1) => ({
  minDen:    Math.min(2 + Math.floor((level - 1) / 2), 4),
  maxDen:    Math.min(3 + level * 2, 12),
  maxWhole:  Math.min(1 + Math.floor(level / 2), 5),
  subChance: Math.min(0.1 + (level - 1) * 0.1, 0.55),
});

export const buildProblemHybrid = (level = 1) => {
  const { minDen, maxDen, maxWhole, subChance } = getDifficultyParamsHybrid(level);
  let d1 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  let d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  while (d2 === d1) d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  const w1 = Math.floor(Math.random() * maxWhole) + 1;
  const w2 = Math.floor(Math.random() * maxWhole) + 1;
  const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
  const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
  const op = Math.random() < subChance ? '-' : '+';
  if (op === '-' && w1 + n1 / d1 < w2 + n2 / d2)
    return `${w2} ${n2}/${d2} ${op} ${w1} ${n1}/${d1} = ?`;
  return `${w1} ${n1}/${d1} ${op} ${w2} ${n2}/${d2} = ?`;
};

// ── Shared animation timing (ms) ─────────────────────────────────────────
export const TIMING = {
  FIREBALL_HOLD:       800,
  FIREBALL_ARC:        650,
  ATTACK_TO_FIREBALL:  500,
  MARGIN_TRANSITION:   500,
  BG_SHIFT:            600,
  BG_RETURN:           700,
  INTERACTABLE_FADE:   400,
  LEVEL_RESET_DELAY:  1500,
  FEEDBACK_CLEAR:     4000,
  SPARKLE_SPIN:       1200,
  MAGIC_FLOAT_PLAYER:  3000,
  MAGIC_FLOAT_CIRCLE:  4000,
  BOOK_FLOAT:          6000,
  BG_BOB:             12000,
};

// ── Feedback popup duration ──────────────────────────────────────────────
// Starts at 6s for short messages, then grows with how much text there is to read.
const FEEDBACK_BASE_DURATION  = 6000;
const FEEDBACK_BASELINE_CHARS = 20;
const FEEDBACK_MS_PER_CHAR    = 60;

export const getFeedbackDuration = (text = '') => {
  const extraChars = Math.max(0, text.length - FEEDBACK_BASELINE_CHARS);
  return FEEDBACK_BASE_DURATION + extraChars * FEEDBACK_MS_PER_CHAR;
};
