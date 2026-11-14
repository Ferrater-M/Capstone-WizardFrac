import TutorialOverlay from './TutorialOverlay';

// Slides with `video` show a screen recording of that gesture (public/TutorialVideos/Similar/...).
// Slides with `targetId` only point at where to look, so they spotlight that element instead.
const V = (name) => `/TutorialVideos/Similar/${name}.mp4`;

const slides = [
  {
    title: 'SIMILAR ISLAND',
    body: 'Both fractions have the SAME bottom number (denominator).\n\nThat means you only add or subtract the TOP numbers (numerators)!',
  },
  {
    targetId: 'problem-box',
    title: 'READ YOUR PROBLEM',
    body: 'Your fraction problem appears here. Look — both bottom numbers are the same!',
  },
  {
    targetId: 'interactable',
    title: 'YOUR SPELL BOX',
    body: 'This is where you cast your spells. Every step happens inside this box.',
  },
  {
    video: V('01-draw-circle'),
    title: 'STEP 1 — DRAW A CIRCLE',
    body: 'Draw a circle inside the spell box.\n\nThe bottom numbers fly into the circle — they match!',
  },
  {
    video: V('02-combine-numerators'),
    title: 'STEP 2 — COMBINE THE TOP NUMBERS',
    body: 'Add or subtract the two top numbers, type the answer, then press Cast Spell.\n\nExample: 1/5 + 2/5 → type 3',
  },
  {
    video: V('03-final-answer'),
    title: 'STEP 3 — FINAL ANSWER',
    body: 'Type your final answer and press Check to hit the enemy!\n\nIt can be a whole number, a fraction, or a mixed number.\n\nExample: 3/5',
  },
  {
    video: V('04-simplify'),
    title: 'SIMPLIFY IT!',
    body: 'If you see "Can be simplified!", your answer is right but can be made smaller. Divide the top and bottom by the same number and try again.\n\nType the simplest answer on your first try to get a PERFECT!\n\nExample: 4/6 → 2/3',
  },
  {
    video: V('05-jar-game'),
    title: 'TOO MANY PIECES? THE JAR GAME',
    body: 'If the top number is the same as or bigger than the bottom number:\n\n1. Type how many times the bottom fits into the top, then press Check.\n2. The gem shatters! Drag the shards into the jars (or sweep them in if there are lots).\n3. Press Confirm.\n\nFull jars = the whole number. Leftover shards = the new top number.\n\nExample: 7/5 → 1 2/5',
  },
  {
    title: '⚠ ABOUT THE HINT',
    body: 'A Hint button appears after you draw the circle.\n\nIf you use it, you only get a small part of the points for that step.\n\nTry to solve it on your own first!',
    isWarning: true,
    isLast: true,
  },
];

const SimilarFractionTutorial = ({ onComplete }) => <TutorialOverlay slides={slides} onComplete={onComplete} />;

export default SimilarFractionTutorial;
