const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = process.argv[2] || require('os').tmpdir();
const lessons = ['1-1','1-2','1-3','1-4','1-5','2-1','2-2','2-3','3-1','4-1','4-2','5-1','5-2','5-3','6-1','7-1','7-2','7-3','8-1'];
const labs = ['conversion','regions','linear-programming','gradient','motion','data-organizer','charts','algebraic-fractions','circle-symmetry','circle-angles','stats-measures','box-plot','proportion','scatter','histogram','cumulative','functions'];
const games = ['speed','catcher','race','spot-error','complete','graph-challenge','data-sort','circle-angles','function-builder','lp-challenge'];
const routes = ['/', '/curriculum', '/lessons', '/tutor', '/whiteboard', '/labs', '/bank', '/exams', '/games', '/notes', '/review', '/progress', '/tools', '/offline', '/admin/login',
  ...lessons.map(l => '/lessons/' + l), ...labs.map(l => '/labs/' + l), ...games.map(g => '/games/' + g)];
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [name, ctxOpts] of [['desktop', { viewport: { width: 1366, height: 860 } }], ['mobile', { ...devices['iPhone 13'] }]]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) problems.push(`[${name}] console ${page.url()}: ${m.text().slice(0, 300)}`); });
    page.on('pageerror', e => problems.push(`[${name}] pageerror ${page.url()}: ${e.message.slice(0, 300)}`));
    for (const r of routes) {
      const res = await page.goto(BASE + r, { waitUntil: 'networkidle' }).catch(e => { problems.push(`[${name}] nav ${r}: ${e.message}`); return null; });
      if (res && res.status() >= 400) problems.push(`[${name}] status ${res.status()} ${r}`);
      await page.waitForTimeout(r.startsWith('/labs/') || r.startsWith('/lessons/') ? 700 : 250);
      // تحقق من عدم وجود تمرير أفقي على الهاتف
      if (name === 'mobile') {
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ov > 2) problems.push(`[mobile] horizontal overflow ${ov}px on ${r}`);
      }
      if (['/', '/lessons/1-2', '/labs/regions', '/curriculum', '/games', '/whiteboard', '/exams', '/tools', '/lessons/4-2', '/labs/circle-angles', '/labs/box-plot', '/labs/functions'].includes(r)) {
        await page.screenshot({ path: `${OUT}/${name}${r.replace(/\//g, '_') || '_home'}.png`, fullPage: false });
      }
    }
    await ctx.close();
  }
  console.log(problems.length ? problems.join('\n') : 'NO PROBLEMS');
  await browser.close();
})();
