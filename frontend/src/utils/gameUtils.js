// ── Shared difficulty parameters ──────────────────────────────────────────
export const getDifficultyParams = (level = 1) => ({
  minDen:    Math.min(2 + Math.floor((level - 1) / 2), 6),
  maxDen:    Math.min(2 + level * 2, 16),
  subChance: Math.min(0.1 + (level - 1) * 0.1, 0.6),
});

// ── Problem builders ───────────────────────────────────────────────────────

export const buildProblem = (level = 1) => {
  const { minDen, maxDen, subChance } = getDifficultyParams(level);
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

export const buildProblemHybrid = (level = 1) => {
  const minDen    = Math.min(2 + Math.floor((level - 1) / 2), 4);
  const maxDen    = Math.min(3 + level * 2, 12);
  const maxWhole  = Math.min(1 + Math.floor(level / 2), 5);
  const subChance = Math.min(0.1 + (level - 1) * 0.1, 0.55);
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
