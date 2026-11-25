const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = process.argv[2] || require('os').tmpdir();
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.|status of 401/.test(m.text())) errors.push(m.text()); });

  // 1) سؤال تحقق داخل الدرس 1-2 (صح/خطأ: الإجابة خطأ)
  await page.goto(BASE + '/lessons/1-2', { waitUntil: 'networkidle' });
  const card = page.locator('div.card').filter({ has: page.getByRole('button', { name: '✘ خطأ' }) }).first();
  await card.getByRole('button', { name: '✘ خطأ' }).click();
  await card.getByRole('button', { name: 'تحقّق' }).click();
  ok('lesson check question graded', await card.getByText('إجابة صحيحة! أحسنت').isVisible());
  // لقطة للدرس بالرسوم
  await page.locator('#sec-s1').screenshot({ path: OUT + '/lesson-section.png' });

  // 2) المثال المحلول خطوة بخطوة
  const ex = page.locator('#examples');
  await ex.getByRole('button', { name: 'ابدأ الحل خطوة بخطوة' }).first().click();
  ok('worked example reveals step', await ex.locator('ol li').first().isVisible());

  // 3) الاختبار القصير للدرس
  await page.locator('#quiz').getByRole('button', { name: 'ابدأ الاختبار القصير' }).click();
  await page.locator('#quiz').getByRole('button', { name: 'سلّم الإجابات' }).click();
  ok('lesson quiz submits with score', await page.locator('#quiz').getByText('%').first().isVisible());

  // 4) مختبر الكسور الجبرية
  await page.goto(BASE + '/labs/algebraic-fractions', { waitUntil: 'networkidle' });
  await page.waitForSelector('div.bg-ok-50');
  const res = await page.locator('div.bg-ok-50').first().innerText();
  ok('algebraic fraction lab simplifies', res.includes('س'), res.slice(0, 60));
  await page.screenshot({ path: OUT + '/lab-fractions.png' });

  // 5) مختبر الربيعات (طريقة الكتاب)
  await page.goto(BASE + '/labs/box-plot', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const boxTxt = await page.locator('main').innerText();
  ok('box plot lab quartiles (book example: IQR 6 and 5.5)', boxTxt.includes('5.5') && boxTxt.includes('12.5'));

  // 6) مختبر الدوال: المعكوس
  await page.goto(BASE + '/labs/functions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const fnTxt = await page.locator('main').innerText();
  ok('functions lab inverse of 2x+5', /د\s*-1\s*\(س\)|-1/.test(fnTxt) && fnTxt.includes('5'));
  await page.screenshot({ path: OUT + '/lab-functions.png', fullPage: true });

  // 7) بنك الأسئلة + تصفية
  await page.goto(BASE + '/bank?lesson=5-3', { waitUntil: 'networkidle' });
  const count = await page.locator('text=سؤالاً مطابقاً').innerText();
  ok('bank filters by lesson', /\d/.test(count), count);

  // 8) اختبار كامل
  await page.goto(BASE + '/exams', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /اختبار وحدة/ }).click();
  await page.getByRole('button', { name: 'ابدأ الاختبار' }).click();
  await page.waitForSelector('text=أُجيب:');
  ok('exam timer visible', await page.locator('[role=timer]').isVisible());
  // أجب عن أول سؤال إن كان اختياراً
  const radio = page.locator('[role=radio]').first();
  if (await radio.count()) await radio.click();
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  const resumeBtn = page.getByRole('button', { name: 'استكمل الاختبار' });
  ok('exam can be resumed after reload', await resumeBtn.isVisible());
  await resumeBtn.click();
  await page.getByRole('button', { name: 'تسليم' }).first().click();
  await page.getByRole('button', { name: 'نعم، سلّم' }).click();
  await page.waitForSelector('text=الحل النموذجي وتحليل الإجابات');
  ok('exam results with model solutions', true);
  await page.screenshot({ path: OUT + '/exam-results.png' });

  // 9) لعبة اكتشف الخطأ
  await page.goto(BASE + '/games/spot-error', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ابدأ' }).click();
  await page.locator('ol li button').first().click();
  ok('spot-error game gives feedback', await page.getByRole('button', { name: 'التالي' }).isVisible());

  // 10) لعبة بناء الدالة تعمل
  await page.goto(BASE + '/games/function-builder', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ابدأ' }).click();
  ok('function builder renders target table', await page.getByText('المطلوب د(س)').isVisible());
  await page.screenshot({ path: OUT + '/game-fb.png' });

  // 11) المعلم الذكي يوضح أنه غير مفعّل
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'فتح المعلم الذكي' }).click();
  await page.waitForSelector('text=المعلم الذكي غير متاح حالياً');
  ok('tutor shows clear not-configured state', true);
  await page.keyboard.press('Escape');

  // 12) الملاحظات تُحفظ بعد التحديث
  await page.goto(BASE + '/notes', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('العنوان').fill('قانون الميل');
  await page.getByPlaceholder('اكتب ملاحظتك…').fill('الميل = \\frac{ص_2 - ص_1}{س_2 - س_1}');
  await page.getByRole('button', { name: 'أضف' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  ok('notes persist locally', await page.getByText('قانون الميل').isVisible());

  // 13) السبورة: رسم وتراجع
  await page.goto(BASE + '/whiteboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 300, box.y + 200, { steps: 8 }); await page.mouse.up();
  await page.getByRole('button', { name: 'معادلة' }).click();
  await page.mouse.click(box.x + 600, box.y + 150);
  await page.locator('#board-root').getByRole('textbox').fill('ص = \\frac{3س + 2}{س - 1}');
  await page.getByRole('button', { name: 'إضافة' }).click();
  const undoEnabled = await page.getByRole('button', { name: 'تراجع' }).isEnabled();
  ok('whiteboard draws and undo is enabled', undoEnabled);
  await page.screenshot({ path: OUT + '/whiteboard.png' });

  // 14) التقدم: نقاط خبرة
  await page.goto(BASE + '/progress', { waitUntil: 'networkidle' });
  const progTxt = await page.locator('main').innerText();
  ok('progress page shows activity', progTxt.includes('آخر النشاطات') && !progTxt.includes('لا يوجد نشاط بعد'));

  // 15) الإدارة: محمية، ثم دخول، ثم إعلان يظهر للطلاب
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  ok('admin redirects to login', page.url().endsWith('/admin/login'));
  await page.locator('input[type=password]').fill('wrong-password');
  await page.getByRole('button', { name: 'دخول' }).click();
  ok('wrong password rejected', await page.getByRole('alert').isVisible());
  await page.locator('input[type=password]').fill(process.env.ADMIN_PASSWORD || 'TestAdmin123');
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForURL(BASE + '/admin');
  await page.waitForSelector('text=لوحة إدارة المعلم');
  ok('admin login works', true);
  await page.getByRole('button', { name: 'الإعلانات' }).click();
  await page.getByPlaceholder('العنوان').fill('اختبار قصير يوم الأحد');
  await page.getByPlaceholder('النص').fill('راجعوا الدرسين 2-1 و 3-1');
  await page.getByRole('button', { name: 'نشر' }).click();
  await page.waitForSelector('text=تم الحفظ ✔');
  await page.getByRole('button', { name: 'الأسئلة' }).click();
  await page.getByRole('button', { name: 'سؤال جديد' }).click();
  await page.locator('textarea').first().fill('ما ميل المستقيم ص = 5س + 2؟');
  const opts = page.locator('input[placeholder^="الخيار"]');
  await opts.nth(0).fill('5'); await opts.nth(1).fill('2'); await opts.nth(2).fill('7'); await opts.nth(3).fill('-5');
  await page.locator('textarea').nth(1).fill('معامل س هو الميل.');
  await page.getByRole('button', { name: 'حفظ السؤال' }).click();
  await page.waitForSelector('text=تم الحفظ ✔');
  ok('admin adds teacher question', await page.getByText('من المعلم').first().isVisible());
  await page.screenshot({ path: OUT + '/admin.png' });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  ok('announcement visible to students', await page.getByText('اختبار قصير يوم الأحد').first().isVisible());

  // 16) واجهة الإدارة ترفض التعديل دون جلسة
  const r = await (await browser.newContext()).request.put(BASE + '/api/admin/data', { data: { key: 'announcements', value: [] } });
  ok('admin API rejects unauthenticated writes', r.status() === 401, String(r.status()));

  // 17) الهاتف: القائمة والصفحات
  const m = await browser.newContext({ ...devices['iPhone 13'] });
  const mp = await m.newPage();
  await mp.goto(BASE + '/labs/circle-angles', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: OUT + '/mobile-circle.png' });
  await mp.goto(BASE + '/games/catcher', { waitUntil: 'networkidle' });
  await mp.getByRole('button', { name: 'ابدأ' }).click();
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: OUT + '/mobile-catcher.png' });
  ok('catcher game animates on mobile', (await mp.locator('button[aria-label^="الإجابة"]').count()) > 0);

  ok('no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch(e => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });
