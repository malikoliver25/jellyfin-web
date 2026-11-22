// capture-ui.mjs — screenshot the cinematic Jellyfin UI after you are logged in.
// Usage:
//   1. npm start                       # dev server on http://localhost:9000
//   2. Open http://localhost:9000 in Chrome, add server http://100.111.240.114:8096, log in.
//      Complete login INSIDE the Playwright-controlled browser below instead:
//   node capture-ui.mjs --server http://100.111.240.114:8096 --user YOUR_USER --pass YOUR_PASS
// Screenshots land in ./ui-shots/ (desktop 1440x900 and mobile 390x844).
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
    a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null).filter(Boolean));
const SERVER = args.server ?? 'http://100.111.240.114:8096';
const USER = args.user ?? '';
const PASS = args.pass ?? '';
const BASE = args.base ?? 'http://localhost:9000';
const OUT = './ui-shots';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox']
});

async function shoot(name, width, height) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // If server not connected yet, add it
    const addServer = await page.$('text=Add Server, text=Add server, .btnAddServer');
    if (addServer) {
        await addServer.click();
        await page.fill('input[type="text"], input[name="server"]', SERVER).catch(() => {});
        await page.click('text=Connect, .btnConnect, button[type=submit]').catch(() => {});
        await page.waitForTimeout(3000);
    }
    // Login if the login form is showing
    const userField = await page.$('input[name="username"], input[name="pw"], input[type="password"]');
    if (userField && USER) {
        await page.fill('input[name="username"]', USER);
        await page.fill('input[name="pw"], input[type="password"]', PASS);
        await page.click('button[type="submit"], .btnSubmit, text=Sign in');
        await page.waitForURL(/#\/home|#\/library/, { timeout: 20000 }).catch(() => {});
    }
    await page.waitForTimeout(4000); // let hero + sections load
    await page.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: false });
    // scroll to rows
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}-rows.png` });
    // open first card -> detail page
    const card = await page.$('.card, .cardBox');
    if (card) {
        await card.click();
        await page.waitForTimeout(3500);
        await page.screenshot({ path: `${OUT}/${name}-detail.png` });
    }
    await ctx.close();
    console.log(`captured ${name} set`);
}

await shoot('desktop', 1440, 900);
await shoot('mobile', 390, 844);
await browser.close();
console.log(`done → ${OUT}/`);
