/* ============================================================================
 * Holoframe mockup — offline smoke test (dev-only, needs jsdom).
 *   cd design/preview/three-ui && npm i jsdom --prefix . --no-save --silent
 *   node tests/offline-smoke.mjs
 * Boots the real index.html over file:-like conditions and asserts:
 *   - zero network references (offline purity, same rule as the shipping game)
 *   - scripts boot without throwing; jsdom has no WebGL, so the mockup must
 *     take its degradation ladder: html.no-webgl + CSS nine-slice metrics
 *   - the screen router works and plates re-sync without throwing
 * ========================================================================= */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

/* 1. offline purity ------------------------------------------------------- */
const extRefs = html.match(/(src|href)\s*=\s*["'](https?:)?\/\//g) || [];
ok(extRefs.length === 0, 'no external src/href in index.html');
ok(!/fetch\(|XMLHttpRequest|WebSocket|serviceWorker/.test(html), 'no fetch/XHR/WS/service-worker in markup');

/* 2. boot ----------------------------------------------------------------- */
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(html, {
  url: 'file://' + join(ROOT, 'index.html'),
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;
window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));

await new Promise((res) => window.addEventListener('load', res, { once: true }));
await new Promise((r) => setTimeout(r, 400));

const doc = window.document;
const bootErrors = errors.filter((e) => !/WebGL|GL context|Not implemented/i.test(e));
ok(bootErrors.length === 0, 'no boot errors (got: ' + bootErrors.slice(0, 3).join(' | ') + ')');

ok(doc.documentElement.classList.contains('no-webgl'), 'headless env took the no-WebGL ladder');
ok(doc.getElementById('hf-nowebgl').hidden === false, 'fallback notice shown');

/* 3. metrics published to CSS -------------------------------------------- */
const rs = doc.documentElement.style;
ok(rs.getPropertyValue('--hf9-plate-c').trim().endsWith('px'), 'plate corner metric published');
ok(rs.getPropertyValue('--hf9-btn-corner').includes('data:image/webp'), 'btn corner data-URI published');

/* 4. router ---------------------------------------------------------------- */
const nav = [...doc.querySelectorAll('#hf-nav button')];
const labBtn = nav.find((b) => b.dataset.screen === 'screen-lab');
labBtn.click();
await new Promise((r) => setTimeout(r, 50));
ok(doc.getElementById('screen-lab').hidden === false, 'lab screen opens');
ok(doc.getElementById('screen-title').hidden === true, 'title screen hides');
ok(doc.querySelectorAll('#lab-table tr').length > 6, 'texture manifest table populated');

const gameBtn = nav.find((b) => b.dataset.screen === 'screen-game');
gameBtn.click();
await new Promise((r) => setTimeout(r, 50));
ok(doc.getElementById('screen-game').hidden === false, 'dialogue screen opens');

/* 5. dial + sliders --------------------------------------------------------- */
const vol = doc.getElementById('set-volume');
vol.value = '30';
vol.dispatchEvent(new window.Event('input'));
ok(doc.getElementById('set-volume-out').textContent === '30', 'slider readout tracks input');
const alert = doc.getElementById('set-alert');
alert.value = '62';
alert.dispatchEvent(new window.Event('input'));
ok(doc.documentElement.dataset.alert === 'critical', 'alert state escalates to critical');
ok(doc.getElementById('hud-alert').textContent === '62', 'HUD alert readout mirrors lever');

console.log(fails === 0 ? '\nSMOKE PASSED' : '\nSMOKE FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
