import TutorialOverlay from './TutorialOverlay';

// Slides with `video` show a screen recording of that gesture (public/TutorialVideos/Hybrid/...).
// Slides with `targetId` only point at where to look, so they spotlight that element instead.
const V = (name) => `/TutorialVideos/Hybrid/${name}.mp4`;

const slides = [
  {
    title: 'HYBRID ISLAND',
    body: 'Hybrid problems use MIXED NUMBERS — a whole number plus a fraction, like 1 1/2.\n\nFirst look at the bottom numbers (denominators):\n• The SAME? Draw a circle.\n• DIFFERENT? Draw a triangle and forge them first.',
  },
  {
    targetId: 'problem-box',
    title: 'READ YOUR PROBLEM',
    body: 'Your problem appears here. Check: are the bottom numbers the same or different?',
  },
  {
    targetId: 'interactable',
    title: 'YOUR SPELL BOX',
    body: 'This is where you cast your spells. Every step happens inside this box.',
  },
  // ── Same bottom numbers ──
  {
    video: V('01-draw-circle'),
    title: 'SAME BOTTOMS — DRAW A CIRCLE',
    body: 'If both bottom numbers are the same, draw a circle inside the spell box.\n\nThe bottom number lands in the circle.',
  },
  {
    video: V('02-combine'),
    title: 'COMBINE WHOLES AND TOPS',
    body: 'Add or subtract the two whole numbers in one box, and the two top numbers in the other. Then press Cast Spell.\n\nExample: 1 1/5 + 1 2/5 → wholes 2, tops 3',
  },
  {
    video: V('03-final-answer'),
    title: 'FINAL ANSWER',
    body: 'Type your final answer and press Check to hit the enemy!\n\nExample: 2 3/5',
  },
  {
    video: V('04-jar-game'),
    title: 'TOO MANY PIECES? THE JAR GAME',
    body: 'If the top number ends up the same as or bigger than the bottom number:\n\n1. Type how many times the bottom fits into the top, then press Check.\n2. The gem shatters! Drag the shards into the jars.\n3. Press Confirm.\n\nThe new full jars join your whole number!\n\nExample: 2 7/5 → 3 2/5',
  },
  // ── Different bottom numbers ──
  {
    video: V('05-draw-triangle'),
    title: 'DIFFERENT BOTTOMS — DRAW A TRIANGLE',
    body: 'If the bottom numbers are different, draw a triangle inside the spell box.\n\nNow you forge each mixed number into a top-heavy (improper) fraction, starting with the left one.',
  },
  {
    video: V('06-forge-multiply'),
    title: 'FORGE — MULTIPLY',
    body: 'Drag the bottom number onto the whole number. Type what they make when multiplied, then press Forge.\n\nExample: 1 1/2 → 1 × 2 = 2',
  },
  {
    video: V('07-forge-add'),
    title: 'FORGE — ADD',
    body: 'Drag that answer onto the top number. Type the sum, then press Forge.\n\nExample: 2 + 1 = 3 → 3/2',
  },
  {
    video: V('08-forge-second'),
    title: 'FORGE THE OTHER SIDE',
    body: 'Press Next Fraction and forge the right side the same way. Then press Start Solving.\n\nExample: 1 1/3 → 4/3',
  },
  {
    video: V('09-butterfly'),
    title: 'FINISH WITH THE BUTTERFLY',
    body: 'Draw the ∞ symbol and solve it just like Dissimilar Island: multiply the wings, multiply the bottoms, press Confirm, combine, then Cast Spell!\n\nExample: 3/2 + 4/3 → 17/6 → 2 5/6',
  },
  {
    video: V('10-simplify'),
    title: 'SIMPLIFY IT!',
    body: 'If you see "Can be simplified!", your answer is right but can be made smaller. Divide the top and bottom by the same number and try again.\n\nType the simplest answer on your first try to get a PERFECT!\n\nExample: 2 4/6 → 2 2/3',
  },
  {
    title: '⚠ ABOUT THE HINT',
    body: 'A Hint button appears after you draw the shape.\n\nIf you use it, you only get a small part of the points for that step.\n\nTry to solve it on your own first!',
    isWarning: true,
    isLast: true,
  },
];

const HybridFractionTutorial = ({ onComplete }) => <TutorialOverlay slides={slides} onComplete={onComplete} />;

export default HybridFractionTutorial;
