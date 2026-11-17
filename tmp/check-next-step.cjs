const { chromium } = require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(require('node:url').pathToFileURL(require('node:path').resolve('index.html')).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.next-step').scrollIntoViewIfNeeded();
    const info = await page.locator('.next-step').evaluate(section => {
      const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
      const heading = section.querySelector('h2');
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heading: box(heading), content: box(section.querySelector('.next-step__content')), headingFont: getComputedStyle(heading).fontSize, headingLineHeight: getComputedStyle(heading).lineHeight, links: [...section.querySelectorAll('a')].map(a => ({ ...box(a), href: a.getAttribute('href'), font: parseFloat(getComputedStyle(a).fontSize) })) };
    });
    if (info.scrollWidth > width || info.heading.bottom > info.content.top || info.links.some(a => a.left < 0 || a.right > width || a.height < 44 || a.font < 14 || a.href !== '#')) throw new Error(JSON.stringify(info));
    console.log(JSON.stringify(info));
    if ([390, 768, 1440].includes(width)) await page.locator('.next-step').screenshot({ path: `tmp/preview/next-step-${width}.png` });
    if (width === 1440) {
      const t = await page.locator('.testimonial').boundingBox();
      const c = await page.locator('.next-step').boundingBox();
      await page.screenshot({ path: 'tmp/preview/testimonial-next-step-1440.png', clip: { x: 0, y: t.y, width, height: c.y + c.height - t.y } });
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.locator('.next-step').scrollIntoViewIfNeeded();
  const enlarged = await page.locator('.next-step').evaluate(s => ({ width: innerWidth, overflow: [...s.querySelectorAll('h2, p, a')].some(el => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth) }));
  if (enlarged.overflow) {
    console.log(await page.locator('.next-step').evaluate(s => [...s.querySelectorAll('h2, p, a')].map(el => ({ tag: el.tagName, text: el.textContent.trim(), width: el.clientWidth, scrollWidth: el.scrollWidth, right: el.getBoundingClientRect().right, font: getComputedStyle(el).fontSize }))));
    await page.locator('.next-step').screenshot({ path: 'tmp/preview/next-step-390-text-200.png' });
    throw new Error('CTA overflows with enlarged text: ' + JSON.stringify(enlarged));
  }
  await page.locator('.next-step').screenshot({ path: 'tmp/preview/next-step-390-text-200.png' });
  await page.locator('.next-step a').first().focus();
  const focus = await page.locator('.next-step a').first().evaluate(a => getComputedStyle(a).outlineStyle);
  if (focus === 'none') throw new Error('Missing keyboard focus outline');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: seven viewports, CTA links, heading separation, 200% text, keyboard focus, no browser errors.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
