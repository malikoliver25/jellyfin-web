// auto-connect.mjs — drive the Jellyfin web UI through Add Server + login, then report.
// Usage (from repo root, with dev server running on :9000):
//   node scripts/auto-connect.mjs --server http://100.111.240.114:8096 --user Finesse
// Password comes from env JF_PASS (never argv):
//   JF_PASS='...' node scripts/auto-connect.mjs --server http://... --user Finesse
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
    a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null).filter(Boolean));
const SERVER = args.server ?? 'http://100.111.240.114:8096';
const USER = args.user ?? process.env.JF_USER ?? '';
const PASS = process.env.JF_PASS ?? '';
const BASE = args.base ?? 'http://localhost:9000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const setInput = (page, selector, value) => page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}, [selector, value]);

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

try {
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2000);
    console.log('loaded', p.url());

    // Add Server flow: hash-navigate until the host input renders (custom emby elements)
    for (let i = 0; i < 4; i++) {
        await p.evaluate(() => { location.hash = '#/addserver'; });
        await p.waitForTimeout(2500);
        if (await p.evaluate(() => !!document.querySelector('#txtServerHost'))) break;
    }
    if (!(await setInput(p, '#txtServerHost', SERVER))) throw new Error('server host input not found');
    await p.evaluate(() => document.querySelector('form')?.requestSubmit());
    console.log('submitted server', SERVER);
    await p.waitForTimeout(9000);
    console.log('now at', p.url());

    // Login if the form is present
    if (await p.evaluate(() => !!document.querySelector('#txtManualName'))) {
        if (!USER || !PASS) throw new Error('need --user and JF_PASS env for login');
        await setInput(p, '#txtManualName', USER);
        await setInput(p, '#txtManualPassword', PASS);
        await p.evaluate(() => {
            const forms = document.querySelectorAll('form');
            forms[forms.length - 1]?.requestSubmit();
        });
        console.log('submitted login for', USER);
        await p.waitForTimeout(12000);
    }
    console.log('final url:', p.url());
    const state = await p.evaluate(() => ({
        hero: !!document.querySelector('.heroBillboard.heroVisible'),
        cards: document.querySelectorAll('.cardBox').length,
        theme: document.documentElement.getAttribute('data-theme'),
        primary: getComputedStyle(document.documentElement).getPropertyValue('--jf-palette-primary-main').trim()
    }));
    console.log('STATE', JSON.stringify(state));
    await p.screenshot({ path: 'ui-shots/auto-connect.png' });
    console.log('screenshot: ui-shots/auto-connect.png');
} catch (e) {
    console.error('FAILED:', e.message);
    await p.screenshot({ path: 'ui-shots/auto-connect-fail.png' }).catch(() => {});
    process.exitCode = 1;
} finally {
    await browser.close();
}
