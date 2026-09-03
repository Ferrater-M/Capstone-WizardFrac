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
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:5174/dev-hybrid-preview');
  await page.waitForTimeout(1200);
  await page.click('text=SKIP');
  await page.waitForTimeout(500);

  // Read the problem to know if it's similar-mixed (denominators equal) without
  // needing to draw anything yet — both original fractions' denominators are
  // always shown in the problem box regardless of stage.
  const probText = await page.locator('body').evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    return document.body.innerText;
  });
  const hintNow = await page.locator('text=/Draw (a circle|a triangle|an infinity) to continue!/').textContent().catch(() => null);
  console.log('initial hint (should be "Draw a circle" for similarMixed, "Draw a triangle" for forge):', hintNow);

  if (!hintNow || !hintNow.includes('circle')) {
    console.log('NOT_SIMILAR_MIXED_THIS_RUN');
    console.log('ERRORS:', JSON.stringify(errors));
    await browser.close();
    return false;
  }

  // ── Draw the circle gesture ──
  await drawPath(page, 'canvas >> nth=0', [[170,40],[280,90],[320,170],[280,250],[170,300],[60,250],[20,170],[60,90],[170,40]]);

  // Wait for both inputs to land (den fly-in + reveal), poll.
  let inputCount = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(200);
    inputCount = await page.locator('input[inputmode="numeric"]').count();
    if (inputCount >= 2) break;
  }
  console.log('numeric inputs visible after landing (want 2 = W and N):', inputCount);
  await shot(page, 'v9_01_landed_wn_inputs');

  // Confirm button should be disabled until BOTH filled.
  const btnDisabledBefore = await page.locator('button:has-text("Cast Spell")').isDisabled().catch(() => null);
  console.log('Cast Spell disabled with nothing filled (want true):', btnDisabledBefore);

  const inputs = page.locator('input[inputmode="numeric"]');
  await inputs.nth(0).fill('1');
  const btnDisabledPartial = await page.locator('button:has-text("Cast Spell")').isDisabled().catch(() => null);
  console.log('Cast Spell disabled with only W filled (want true):', btnDisabledPartial);

  // ── Try a WRONG combine first, to check immediate life-loss ──
  const livesBefore = await page.locator('img[alt="heart"]').evaluateAll(els => els.filter(e => e.style.opacity !== '0.25').length);
  await inputs.nth(1).fill('999');
  await page.locator('button:has-text("Cast Spell")').click();
  await page.waitForTimeout(1500);
  const livesAfterWrong = await page.locator('img[alt="heart"]').evaluateAll(els => els.filter(e => e.style.opacity !== '0.25').length);
  console.log('lives before/after a wrong phase-1 answer (want a decrease):', livesBefore, '->', livesAfterWrong);
  await shot(page, 'v9_02_after_wrong_phase1');

  console.log('ERRORS so far:', JSON.stringify(errors));
  await browser.close();
  return true;
}

(async () => {
  for (let i = 0; i < 8; i++) {
    const hit = await run();
    if (hit) break;
  }
})();
