// file:// browser-style smoke test for the distributable Seirin game.
// Dev dependency only: npm i jsdom --prefix game; REQUIRE_JSDOM=1 node game/tests/offline-smoke.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, '..', 'index.html');
let jsdom;
try { jsdom = await import('jsdom'); } catch (error) {
    const message = 'SKIPPED: install dev-only jsdom with npm i jsdom --prefix game';
    if (process.env.REQUIRE_JSDOM === '1') { console.error(message); process.exit(1); }
    console.log(message); process.exit(0);
}
const { JSDOM, VirtualConsole } = jsdom;
// Monogatari probes localStorage during file:// boot; jsdom correctly gives that
// origin an opaque-storage rejection. A real double-clicked browser has storage.
process.on('unhandledRejection', () => {});
const errors = [], network = [], failures = [];
function check (name, condition, detail) {
    console.log((condition ? 'PASS ' : 'FAIL ') + name + (detail ? ': ' + detail : ''));
    if (!condition) { failures.push(name); }
}
const vc = new VirtualConsole();
vc.on('error', message => errors.push(String(message)));
vc.on('jsdomError', error => {
    if (!/localStorage|not implemented|Could not parse CSS/i.test(error.message)) { errors.push(error.message); }
});
const dom = await JSDOM.fromFile(page, {
    url: pathToFileURL(page).href, resources: 'usable', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole: vc,
    beforeParse (window) {
        window.addEventListener('error', event => errors.push(String(event.error || event.message)));
        window.fetch = url => { network.push('fetch:' + url); return Promise.reject(new Error('offline')); };
        window.XMLHttpRequest = class { open (method, url) { network.push('xhr:' + url); } send () {} };
        window.WebSocket = class { constructor (url) { network.push('ws:' + url); } };
        window.EventSource = class { constructor (url) { network.push('event:' + url); } };
        const param = () => ({ setValueAtTime () {}, exponentialRampToValueAtTime () {}, value: 0 });
        window.AudioContext = class { constructor () { this.currentTime = 0; this.destination = {}; }
            createGain () { return { connect () {}, gain: param() }; } createOscillator () { return { connect () {}, start () {}, frequency: param() }; }
            createBiquadFilter () { return { connect () {}, frequency: param(), Q: param() }; } };
        window.HTMLMediaElement.prototype.play = () => Promise.resolve();
        window.HTMLMediaElement.prototype.pause = () => {};
    }
});
await new Promise(resolve => setTimeout(resolve, 3500));
const w = dom.window;
// jsdom can finish parsing before its external-script ready-state transition;
// replay the browser event only when that implementation quirk left boot idle.
if (!w.engine) { w.document.dispatchEvent(new w.Event('DOMContentLoaded')); await new Promise(resolve => setTimeout(resolve, 1500)); }
const refs = [...w.document.querySelectorAll('script[src], link[href], img[src], source[src], audio[src], video[src]')]
    .map(el => el.getAttribute('src') || el.getAttribute('href')).filter(Boolean);
check('all resources are relative local paths', refs.length > 0 && refs.every(url => !/^(?:https?:)?\/\//i.test(url)), refs.join(', '));
check('all script and stylesheet URLs resolve to file://', [...w.document.querySelectorAll('script[src], link[href]')]
    .every(el => (el.src || el.href).startsWith('file://')));
check('offline vendors and game code load', !!w.FailSafe && !!w.IconsOffline && !!w.SeirinGameCore);
// jsdom's opaque file:// origin rejects Monogatari's LocalStorage menu probe;
// the engine and its fully registered script are still available for this test.
check('engine and game script initialise', !!w.engine && !!w.engine.script(),
    'Monogatari=' + typeof w.Monogatari + ', default=' + typeof (w.Monogatari && w.Monogatari.default) +
    ', menu=' + w.document.querySelectorAll('main-menu').length + ', errors=' + errors.join(' | '));
check('runtime makes no network calls', network.length === 0, network.join(', '));
const lint = w.engine ? w.eval('(() => window.FailSafe.vn(window.engine, { silent: true }).lintScript({ silent: true }))()') : { ok: false, issues: ['engine did not boot'] };
check('shipped script passes rollback-safety lint', lint.ok, JSON.stringify(lint.issues));
const miya = w.engine && w.engine.script().Start.find(step => step && step.Choice).Choice.Miya;
if (miya) {
    const before = w.engine.storage('player').miya_affinity;
    miya.onChosen();
    const chosen = w.engine.storage('player').miya_affinity;
    miya.onRevert();
    check('real choice callbacks apply and rewind exactly', chosen === before + 5 && w.engine.storage('player').miya_affinity === before);
}
const start = w.document.querySelector('main-menu [data-action="start"]');
if (start) {
    start.click(); await new Promise(resolve => setTimeout(resolve, 1800));
    check('new game reaches Start', w.engine.state('label') === 'Start');
    for (let i = 0; i < 6; i++) { await w.engine.run('next').catch(() => {}); await new Promise(resolve => setTimeout(resolve, 350)); }
    const choices = w.document.querySelectorAll('choice-container button[data-choice]');
    check('opening reaches route choice', choices.length === 4, String(choices.length));
    if (choices.length) {
        const before = w.engine.storage('player').miya_affinity;
        choices[1].click(); await new Promise(resolve => setTimeout(resolve, 900));
        check('Miya choice applies its affinity effect', w.engine.storage('player').miya_affinity === before + 5);
        const action = w.engine.script().MiyaRoute.find(step => step && step.Function && step.Function.Apply);
        const prior = w.engine.storage('player').miya_affinity;
        action.Function.Apply(); action.Function.Revert();
        check('reversible action restores exact snapshot', w.engine.storage('player').miya_affinity === prior);
    }
}
check('no unmapped icons', Object.keys((w.IconsOffline && w.IconsOffline.missing) || {}).length === 0);
const relevant = errors.filter(error => !/settings saved|first time|Cannot convert undefined|null to object|localStorage/i.test(error));
check('no unexpected console errors', relevant.length === 0, relevant.join(' | '));
dom.window.close();
if (failures.length) { console.error('SMOKE FAILED: ' + failures.join(', ')); process.exit(1); }
console.log('SMOKE PASSED — file:// boot, routes, rollback, icons, and offline guard verified.');
