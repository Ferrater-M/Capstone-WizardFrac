const { chromium } = require('playwright');
const shot = (page, name) => page.screenshot({ path: `C:/Users/USER/AppData/Local/Temp/claude/c--Users-USER-Desktop-Capstone-Capstone-WizardFrac/5e771ac7-c4dc-4628-9f5b-659e9c16f27c/scratchpad/${name}.png` });
const drawPath = async (page, canvasSel, pts) => {
  const box = await page.locator(canvasSel).boundingBox();
  const abs = pts.map(([x, y]) => ({ x: box.x + x, y: box.y + y }));
  await page.mouse.move(abs[0].x, abs[0].y);
  await page.mouse.down();
  for (const p of abs.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
};

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('console', msg => {
    if (msg.text().includes('DEBUG_')) console.log('[browser]', msg.text());
    if (msg.type() === 'error' && !msg.text().includes('Failed to save spell') && !msg.text().includes('400')) errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:5174/dev-hybrid-preview');
  await page.waitForTimeout(1200);
  await page.click('text=SKIP');
  await page.waitForTimeout(500);

  const hintNow = await page.locator('text=/Draw (a circle|a triangle|an infinity) to continue!/').textContent().catch(() => null);
  if (!hintNow || !hintNow.includes('circle')) {
    console.log('NOT_SIMILAR_MIXED_THIS_RUN', hintNow);
    await browser.close();
    return false;
  }

  // Read the raw problem straight from the problem box (whole/num/den for both
  // fractions) so we can compute the exact correct W/N/simplified answers.
  const getFrac = async (idx) => {
    const w = await page.locator(`[data-fly="frac${idx}-w"]`).textContent().catch(() => '0');
    const n = await page.locator(`[data-fly="frac${idx}-n"]`).textContent();
    const d = await page.locator(`[data-fly="frac${idx}-d"]`).textContent();
    return { w: parseInt(w || '0'), n: parseInt(n), d: parseInt(d) };
  };
  const f0 = await getFrac(0), f1 = await getFrac(1);
  const opText = await page.locator('div').filter({ hasText: /^[+\-]$/ }).first().textContent().catch(() => null);
  console.log('f0', JSON.stringify(f0), 'f1', JSON.stringify(f1));

  await drawPath(page, 'canvas >> nth=0', [[170,40],[280,90],[320,170],[280,250],[170,300],[60,250],[20,170],[60,90],[170,40]]);

  // Wait generously for both inputs to land.
  let inputCount = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(200);
    inputCount = await page.locator('input[inputmode="numeric"]').count();
    if (inputCount >= 2) break;
  }
  console.log('inputs after landing:', inputCount);
  await shot(page, 'v10_01_landed');

  // We don't know the operator textually reliably, so try both combos and use
  // whichever the game itself reports as correct via getCorrectAnswerStr's
  // logic — simplest: try '+' first; if wrong, retry with '-'. But wrong
  // answers cost a life and reset input, so instead read the operator glyph
  // directly from the problem box text.
  const problemText = await page.locator('.problem-fade-in, [class*="problem"]').first().innerText().catch(() => '');
  console.log('problem box text:', problemText);
  const opMatch = problemText.match(/[+\-−]/);
  const op = opMatch ? (opMatch[0] === '-' || opMatch[0] === '−' ? '-' : '+') : '+';
  const rawW = op === '+' ? f0.w + f1.w : f0.w - f1.w;
  const rawN = op === '+' ? f0.n + f1.n : f0.n - f1.n;
  const d = f0.d;
  console.log('computed op/rawW/rawN/d:', op, rawW, rawN, d);

  const inputs = page.locator('input[inputmode="numeric"]');
  await inputs.nth(0).fill(String(rawW));
  await inputs.nth(1).fill(String(rawN));
  await page.locator('button:has-text("Cast Spell")').click();

  // Watch for the dual-bubble shine/travel animation mid-flight.
  await page.waitForTimeout(300);
  await shot(page, 'v10_02_mid_travel');
  await page.waitForTimeout(1500);
  await shot(page, 'v10_03_after_travel');

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const div = gcd(Math.abs(rawN), d) || 1;
  const simplifiedNum = rawN / div, simplifiedDen = d / div;
  console.log('simplified target:', simplifiedNum, '/', simplifiedDen, '(isWhole:', simplifiedDen === 1, ')');

  if (simplifiedDen !== 1) {
    // Phase 2 should now show a LOCKED whole number + editable fraction.
    const lockedText = await page.evaluate((rawW) => {
      const spans = [...document.querySelectorAll('span')];
      const match = spans.find(s => s.textContent.trim() === String(rawW) && s.closest('input') === null);
      return match ? match.textContent : null;
    }, rawW);
    console.log('locked whole-number display found (want matches rawW):', lockedText);

    const fracInputs = page.locator('input[inputmode="numeric"]');
    const fracCount = await fracInputs.count();
    console.log('phase-2 editable inputs (want 2, numerator+denominator):', fracCount);
    await shot(page, 'v10_04_phase2_layout');

    await fracInputs.nth(0).click();
    await fracInputs.nth(0).pressSequentially(String(simplifiedNum));
    await fracInputs.nth(1).click();
    await fracInputs.nth(1).pressSequentially(String(simplifiedDen));
    console.log('input values after fill:', await fracInputs.nth(0).inputValue(), await fracInputs.nth(1).inputValue());
    // checkButtonReady flips true 600ms after the shine/travel explode sound's
    // 'ended' event fires — give it a safety margin beyond that.
    await page.waitForTimeout(1200);
    const btnState = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Check'));
      return btn ? { disabled: btn.disabled, opacity: btn.style.opacity, cursor: btn.style.cursor } : null;
    });
    console.log('Check button state before click:', JSON.stringify(btnState));
    const scoreBefore = await page.locator('text=/Score: \\d+/').textContent().catch(() => null);
    await page.locator('button:has-text("Check")').click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    const scoreAfter = await page.locator('text=/Score: \\d+/').textContent().catch(() => null);
    console.log('score before/after correct phase-2 answer (want an increase):', scoreBefore, '->', scoreAfter);
  } else {
    console.log('(degenerate isWhole case — should auto-submit with no phase 2)');
    await page.waitForTimeout(5000); // handleAnswerSubmit itself has ~500ms+ of animation delay
    const scoreAfter = await page.locator('text=/Score: \\d+/').textContent().catch(() => null);
    console.log('score after auto-submit (want > 0):', scoreAfter);
  }

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
  return true;
}

(async () => {
  for (let i = 0; i < 15; i++) {
    try {
      const hit = await run();
      if (hit) break;
    } catch (e) {
      console.log('RUN_ERROR:', e.message);
    }
  }
})();
