// capture-ui.mjs — screenshot the cinematic Jellyfin UI (logged in).
// Password is read from env JF_PASS (never from argv / shell history).
// Usage:
//   npm start        # terminal 1 → http://localhost:9000
//   JF_PASS='...' node capture-ui.mjs --server http://100.111.240.114:8096 --user Finesse
// Shots land in ./ui-shots/ (desktop 1440x900, mobile 390x844; home, rows, detail).
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
    a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null).filter(Boolean));
const SERVER = args.server ?? 'http://100.111.240.114:8096';
const USER = args.user ?? process.env.JF_USER ?? '';
const PASS = process.env.JF_PASS ?? '';
const BASE = args.base ?? 'http://localhost:9000';
const OUT = './ui-shots';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

const setInput = (page, selector, value) => page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}, [selector, value]);

async function login(page) {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => { location.hash = '#/addserver'; });
    await page.waitForTimeout(3000);
    await setInput(page, '#txtServerHost', SERVER);
    await page.evaluate(() => document.querySelector('form')?.requestSubmit());
    await page.waitForURL(/#\/login|#\/home/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    // login form if present
    const userSel = '#txtUsername, input[name="username"], input[type="text"]';
    if (await page.$(userSel)) {
        await setInput(page, userSel, USER);
        await setInput(page, '#txtPassword, input[type="password"]', PASS);
        await page.evaluate(() => document.querySelector('form')?.requestSubmit());
        await page.waitForURL(/#\/home|#\/library|#\/favorites/, { timeout: 25000 }).catch(() => {});
    }
    await page.waitForTimeout(5000); // hero + rows load
}

async function shoot(name, width, height) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await login(page);
    console.log(`${name} URL after login:`, page.url());
    await page.screenshot({ path: `${OUT}/${name}-home.png` });
    await page.evaluate(() => window.scrollTo(0, 650));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}-rows.png` });
    const card = await page.$('.cardBox, .card');
    if (card) {
        await card.scrollIntoViewIfNeeded().catch(() => {});
        await card.click({ force: true }).catch(() => {});
        await page.waitForTimeout(4000);
        await page.screenshot({ path: `${OUT}/${name}-detail.png` });
    }
    await ctx.close();
    console.log(`captured ${name}`);
}

await shoot('desktop', 1440, 900);
await shoot('mobile', 390, 844);
await browser.close();
console.log(`done → ${OUT}/`);
