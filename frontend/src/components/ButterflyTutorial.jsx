import TutorialOverlay from './TutorialOverlay';

// Dissimilar Island's tutorial. Slides with `video` show a screen recording of that gesture
// (public/TutorialVideos/Dissimilar/...). Slides with `targetId` only point at where to look,
// so they spotlight that element instead.
const V = (name) => `/TutorialVideos/Dissimilar/${name}.mp4`;

const slides = [
  {
    title: 'BUTTERFLY METHOD',
    body: 'These fractions have DIFFERENT bottom numbers (denominators).\n\nTo solve them, we use the Butterfly Method: multiply across like butterfly wings, multiply the bottoms, then combine!',
  },
  {
    targetId: 'problem-box',
    title: 'READ YOUR PROBLEM',
    body: 'Your fraction problem appears here. Look — the bottom numbers are different!',
  },
  {
    targetId: 'interactable',
    title: 'YOUR SPELL BOX',
    body: 'This is where you cast your spells. Every step happens inside this box.',
  },
  {
    video: V('01-draw-infinity'),
    title: 'STEP 1 — DRAW ∞',
    body: 'Draw an infinity (∞) symbol inside the spell box.\n\nYour four numbers fly into the magic circle.',
  },
  {
    video: V('02-cross-left'),
    title: 'STEP 2 — LEFT WING',
    body: 'Drag the RIGHT bottom number onto the LEFT top number. Type what they make when multiplied.\n\nExample: 1/2 + 1/3 → 1 × 3 = 3',
  },
  {
    video: V('03-cross-right'),
    title: 'STEP 3 — RIGHT WING',
    body: 'Drag the LEFT bottom number onto the RIGHT top number. Type what they make when multiplied.\n\nExample: 1/2 + 1/3 → 2 × 1 = 2',
  },
  {
    video: V('04-multiply-bottoms'),
    title: 'STEP 4 — MULTIPLY THE BOTTOMS',
    body: 'Drag one bottom number onto the other. Type what they make when multiplied.\n\nExample: 2 × 3 = 6',
  },
  {
    video: V('05-confirm'),
    title: 'STEP 5 — CONFIRM',
    body: 'Press Confirm once to check all three boxes. Right answers lock in!\n\nYour first 2 mistakes are free — the 3rd one costs half a heart.',
  },
  {
    video: V('06-combine'),
    title: 'STEP 6 — COMBINE THE WINGS',
    body: 'The center of the circle opens. Add or subtract your two wing answers, then press Cast Spell.\n\nExample: 3 + 2 = 5',
  },
  {
    video: V('07-final-answer'),
    title: 'STEP 7 — FINAL ANSWER',
    body: 'Type your final answer and press Cast Spell to hit the enemy!\n\nIt can be a whole number, a fraction, or a mixed number.\n\nExample: 5/6',
  },
  {
    video: V('08-simplify'),
    title: 'SIMPLIFY IT!',
    body: 'If you see "Can be simplified!", your answer is right but can be made smaller. Divide the top and bottom by the same number and try again.\n\nType the simplest answer on your first try to get a PERFECT!\n\nExample: 8/12 → 2/3',
  },
  {
    video: V('09-jar-game'),
    title: 'TOO MANY PIECES? THE JAR GAME',
    body: 'If the top number is the same as or bigger than the bottom number:\n\n1. Type how many times the bottom fits into the top, then press Check.\n2. The gem shatters! Drag the shards into the jars (or sweep them in if there are lots).\n3. Press Confirm.\n\nFull jars = the whole number. Leftover shards = the new top number.\n\nExample: 17/12 → 1 5/12',
  },
  {
    title: '⚠ ABOUT THE HINT',
    body: 'A Hint button appears after you draw the ∞.\n\nIf you use it, you only get a small part of the points for that step.\n\nTry to solve it on your own first!',
    isWarning: true,
    isLast: true,
  },
];

const ButterflyTutorial = ({ onComplete }) => <TutorialOverlay slides={slides} onComplete={onComplete} />;

export default ButterflyTutorial;
