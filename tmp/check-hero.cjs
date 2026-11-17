const { chromium } = require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const { mkdir } = require('node:fs/promises');

(async () => {
  await mkdir('tmp/preview', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sizes = [[1440, 900], [1920, 1080], [1024, 768], [768, 1024], [640, 900], [390, 844], [320, 740]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      heading: document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(),
      photosLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0),
      fonts: [...document.fonts].map(font => ({ family: font.family, style: font.style, status: font.status })),
      actions: [...document.querySelectorAll('.hero__actions a')].map(link => ({
        label: link.innerText,
        height: link.getBoundingClientRect().height,
        left: link.getBoundingClientRect().left,
        right: link.getBoundingClientRect().right,
      })),
    }));
    if (result.scrollWidth > width) throw Error(`Horizontal overflow at ${width}: ${result.scrollWidth}`);
    if (!result.photosLoaded || result.fonts.some(font => font.status !== 'loaded')) throw Error(`Assets not loaded at ${width}`);
    if (result.actions.some(action => action.height < 44 || action.left < 0 || action.right > width)) throw Error(`Action outside viewport at ${width}`);
    console.log(JSON.stringify(result));
    if ([1440, 768, 390].includes(width)) {
      await page.screenshot({ path: `tmp/preview/hero-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText('Menu', { exact: true }).click();
  await page.locator('.mobile-menu__links').waitFor({ state: 'visible' });
  await page.screenshot({ path: 'tmp/preview/menu-390.png', fullPage: true });
  await page.keyboard.press('Escape');
  if (await page.locator('.mobile-menu').evaluate(menu => menu.open)) throw Error('Escape did not close the menu');
  await page.getByText('Menu', { exact: true }).click();
  await page.locator('h1').click();
  if (await page.locator('.mobile-menu').evaluate(menu => menu.open)) throw Error('Outside click did not close the menu');
  await page.keyboard.press('Tab');
  const contrast = (hexA, hexB) => {
    const luminance = hex => {
      const values = hex.match(/\w\w/g).map(part => parseInt(part, 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const [light, dark] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
  };
  console.log('Contrast', JSON.stringify({ creamOnTerracotta: contrast('F7F2EA', 'A35F45'), whiteOnTerracotta: contrast('FFFFFF', 'A35F45'), creamOnEarthInk: contrast('F7F2EA', '4A3F36') }));
  if (errors.length) throw Error(errors.join('\n'));
  console.log('PASS: seven viewport sizes, images, fonts, touch targets, menu and no browser errors.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
