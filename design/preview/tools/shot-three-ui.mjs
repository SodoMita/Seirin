/* ============================================================================
 * design/preview/tools/shot-three-ui.mjs — DEV-ONLY verification harness
 * ----------------------------------------------------------------------------
 * Boots design/preview/three-ui-demo.html in headless Chromium (software GL)
 * and reports MEASUREMENTS, not impressions:
 *
 *   · console/page errors and any network attempt
 *   · WebGL liveness + SeirinThreeUI.stats() (fps, draw calls, anchors)
 *   · hit-testing: elementFromPoint at every .key centre must return that key
 *   · screenshots of every screen at three viewports (converted to JPEG by
 *     the caller — design/preview/shots/ is JPEG-only)
 *
 * Needs playwright-core + @sparticuz/chromium (see design/HANDOFF.md §1).
 * Run:  LD_LIBRARY_PATH=/tmp/cbin/lib/lib NODE_PATH=/tmp/pw/node_modules \
 *       node design/preview/tools/shot-three-ui.mjs
 * ========================================================================== */
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, '..', 'three-ui-demo.html')).href;
const outDir = join(here, '..', '_shots');
mkdirSync(outDir, { recursive: true });

/* playwright-core is dev-only and lives outside the repo (NODE_PATH-style);
   ESM ignores NODE_PATH, so resolve it through createRequire. */
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = req(process.env.PW_DIR
    ? process.env.PW_DIR + '/playwright-core'
    : '/tmp/pw/node_modules/playwright-core');

const browser = await chromium.launch({
    executablePath: '/tmp/cbin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
        '--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files']
});

const VIEWPORTS = [
    ['desktop', 1440, 900],
    ['phone', 390, 844],
    ['phone_land', 880, 400]
];

const report = { errors: [], network: [], pages: [] };

async function shoot (ctx, label, vp) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') { errs.push(m.text()); } });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('request', r => { if (!r.url().startsWith('file://')) { report.network.push(r.url()); } });
    await page.setViewportSize({ width: vp[1], height: vp[2] });
    await page.goto(pageUrl);
    await page.waitForTimeout(1600);

    const stats = await page.evaluate(() => (window.SeirinThreeUI ? window.SeirinThreeUI.stats() : null));
    const noWebgl = await page.evaluate(() => document.documentElement.classList.contains('no-webgl'));

    const entry = { label: label + '@' + vp[0], webgl: !noWebgl, stats, errs, hits: [] };

    async function shot (name) {
        await page.screenshot({ path: join(outDir, name + '.png') });
    }

    await shot('11_three_ui_title_' + vp[0]);
    /* keep the readout out of the remaining shots; it gets its own below */
    await page.evaluate(() => { const d = document.getElementById('diag'); if (d) { d.hidden = true; } });

    /* into the game screen */
    await page.click('[data-goto="game"]');
    await page.waitForTimeout(900);
    await page.click('#console');
    await page.waitForTimeout(700);
    await shot('11_three_ui_game_' + vp[0]);

    /* hit-test every visible key: a drifting hit box is the classic failure */
    entry.hits = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('#scr-game .key, #scr-game .console').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) { return; }
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) {
                out.push({ el: el.textContent.trim().slice(0, 12), off: true });
                return;
            }
            const hit = document.elementFromPoint(cx, cy);
            out.push({ el: el.textContent.trim().slice(0, 12) || el.className, ok: el.contains(hit) || hit === el });
        });
        return out;
    });

    /* alarm escalation */
    await page.evaluate(() => {
        const s = document.getElementById('diag-alert');
        s.value = '65';
        s.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(700);
    await shot('11_three_ui_alarm_' + vp[0]);
    entry.tier = await page.evaluate(() => document.documentElement.getAttribute('data-alert-tier'));

    if (vp[0] === 'desktop') {
        /* choices state */
        await page.evaluate(() => {
            const s = document.getElementById('diag-alert');
            s.value = '12'; s.dispatchEvent(new Event('input', { bubbles: true }));
        });
        for (let i = 0; i < 5; i++) { await page.click('#console'); await page.waitForTimeout(250); }
        await page.waitForTimeout(400);
        await shot('11_three_ui_choices_desktop');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await page.click('#scr-title [data-goto="settings"]');
        await page.waitForTimeout(700);
        await shot('11_three_ui_settings_desktop');
        await page.click('#scr-settings [data-goto="title"]');
        await page.waitForTimeout(500);
        await page.click('#scr-title [data-goto="save"]');
        await page.waitForTimeout(700);
        await shot('11_three_ui_save_desktop');
    }

    entry.errs = errs;
    report.pages.push(entry);
    await page.close();
}

const ctx = await browser.newContext();
for (const vp of VIEWPORTS) { await shoot(ctx, 'webgl', vp); }

/* the no-WebGL fallback ladder */
{
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(pageUrl + '?nowebgl');
    await page.waitForTimeout(1200);
    await page.click('[data-goto="game"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, '11_three_ui_nowebgl_desktop.png') });
    report.pages.push({ label: 'nowebgl@desktop', webgl: false, errs, hits: [] });
    await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
const bad = report.pages.filter(p => p.errs.length || (p.hits || []).some(h => h.ok === false || h.off));
console.log(bad.length ? 'PROBLEMS: ' + bad.length : 'ALL CLEAN');
