// Run with: node test.js
// Launches Chromium with the extension loaded, opens claude.ai + Handshake,
// enables cover letters, starts applying, and streams all output to stdout.

const { chromium } = require('/home/chimn/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core');
const PWD = __dirname;

(async () => {
  const context = await chromium.launchPersistentContext('/tmp/handshake-plus-profile-2', {
    headless: false,
    executablePath: '/home/chimn/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
    args: [
      '--disable-extensions-except=' + PWD,
      '--load-extension=' + PWD,
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
    ],
    viewport: null,
    ignoreDefaultArgs: ['--enable-automation']
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Alerts from claude.js / content.js
  context.on('dialog', async d => {
    console.log('\n[ALERT]\n' + d.message().slice(0, 800) + '\n');
    await d.accept();
  });

  // Background service worker logs
  context.on('serviceworker', sw => {
    sw.on('console', msg => console.log('[BG]', msg.text()));
  });

  // Open claude.ai first so claude.js is ready to receive messages
  const claudePage = await context.newPage();
  await claudePage.goto('https://claude.ai/new');
  await claudePage.waitForTimeout(4000);
  console.log('[claude.ai] ready, title:', await claudePage.title());

  // Open Handshake
  const hsPage = await context.newPage();
  await hsPage.goto('https://app.joinhandshake.com/job-search?query=%20');
  await hsPage.waitForTimeout(6000);
  console.log('[handshake] url:', hsPage.url());

  const cards = await hsPage.$$('a[href*="/job-search/"]');
  console.log('[handshake] job cards:', cards.length);
  if (!cards.length) { console.log('Not logged in — stopping.'); return; }

  // Enable cover letters
  const cb = await hsPage.$('#handshake-plus-cover-letter');
  if (cb && !(await cb.isChecked())) { await cb.click(); console.log('[panel] cover letters enabled'); }

  // Start
  await hsPage.click('#handshake-plus-start');
  console.log('[panel] started — streaming status every 5s...\n');

  // Stream panel status until stopped
  while (true) {
    try {
      await hsPage.waitForTimeout(5000);
      const status = await hsPage.$eval('#handshake-plus-status', el => el.textContent).catch(() => '?');
      const count  = await hsPage.$eval('#handshake-plus-count',  el => el.textContent).catch(() => '?');
      process.stdout.write(`[${new Date().toLocaleTimeString()}] ${status} | applied: ${count}\n`);
    } catch (e) {
      process.stdout.write(`[${new Date().toLocaleTimeString()}] [page error: ${e.message.split('\n')[0]}]\n`);
    }
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
