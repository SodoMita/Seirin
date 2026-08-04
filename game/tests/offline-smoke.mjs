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
// White-screen regression: the engine never creates its screen skeleton, so
// index.html must ship it. An empty #vn-root used to mean no main menu at all.
const menuEl = w.document.querySelector('main-screen main-menu');
const gameScreenEl = w.document.querySelector('game-screen text-box');
check('engine markup skeleton present (main-menu, text-box)', !!menuEl && !!gameScreenEl,
    'main-menu=' + !!menuEl + ', text-box=' + !!gameScreenEl);
if (menuEl) {
    // Components render lazily on connect; if the menu buttons are there the
    // engine's menu setup survived boot in this environment.
    const menuButtons = menuEl.querySelectorAll('button');
    check('main menu renders its buttons', menuButtons.length >= 4, String(menuButtons.length));
    // Debug atlas entry point: a MAIN MENU button, never an in-game HUD button.
    const menuGraph = menuEl.querySelector('[data-action="open-graph"]');
    check('debug atlas lives in the main menu, not the HUD',
        !!menuGraph && !w.document.getElementById('btn-graph'),
        'menu entry=' + !!menuGraph + ', hud button=' + !!w.document.getElementById('btn-graph'));
    if (menuGraph) {
        menuGraph.click(); await new Promise(resolve => setTimeout(resolve, 250));
        const overlay = w.document.getElementById('graph-overlay');
        check('atlas opens from the main menu (pre-start)', overlay && overlay.hidden === false);
        const closeBtn = w.document.getElementById('btn-graph-close');
        if (closeBtn) { closeBtn.click(); await new Promise(resolve => setTimeout(resolve, 120)); }
        check('atlas closes again', overlay && overlay.hidden === true);
    }
}
check('runtime makes no network calls', network.length === 0, network.join(', '));
const lint = w.engine ? w.eval('(() => window.FailSafe.vn(window.engine, { silent: true }).lintScript({ silent: true }))()') : { ok: false, issues: ['engine did not boot'] };
check('shipped script passes rollback-safety lint', lint.ok, JSON.stringify(lint.issues));
const miyaChoice = w.engine && w.engine.script().Start
    .map(function (step) { return step && step.Choice; }).filter(Boolean)
    .find(function (choice) { return !!choice.Miya; });
const miya = miyaChoice && miyaChoice.Miya;
if (miya) {
    const before = w.engine.storage('player').miya_affinity;
    miya.onChosen();
    const chosen = w.engine.storage('player').miya_affinity;
    miya.onRevert();
    check('real choice callbacks apply and rewind exactly', chosen === before + 5 && w.engine.storage('player').miya_affinity === before);
}
const microChoice = w.engine && w.engine.script().Start
    .map(function (step) { return step && step.Choice; }).filter(Boolean)
    .find(function (choice) { return !!choice.Believe; });
if (microChoice) {
    // Stat-only choices are real engine actions: Do = vn.reversible(spec).
    const fn = microChoice.Believe.Do && microChoice.Believe.Do.Function;
    check('belief micro-choice is a reversible Function action', !!fn && typeof fn.Apply === 'function');
    if (fn) {
        const before = w.engine.storage('player').miya_affinity;
        fn.Apply();
        const chosen = w.engine.storage('player').miya_affinity;
        fn.Revert();
        check('belief micro-choice applies +2 affinity and rewinds exactly',
            chosen === before + 2 && w.engine.storage('player').miya_affinity === before);
    }
}
// Route first-minutes beats: every micro-choice must apply and rewind exactly.
const routeBeats = [
    ['SoloRoute1', 'Water', 'philosophical_depth', 1],
    ['SoloRoute2', 'ToastStatusQuo', 'procrastination', 3],
    ['SoloRoute3', 'TaskQuestions', 'philosophical_depth', 2],
    ['SoloRoute4', 'CheckMemory', 'philosophical_depth', 3],
    ['SoloRoute5', 'PrepSchedule', 'philosophical_depth', 2],
    ['MiyaRoute', 'ArtWire', 'miya_affinity', 2],
    ['AIRoute', 'GreetRhythm', 'ai_empathy', 2],
    ['MomoRoute', 'SweetLie', 'momo_affinity', 2]
];
routeBeats.forEach(function (beat) {
    if (!w.engine) { return; }
    const choice = w.engine.script()[beat[0]]
        .map(function (step) { return step && step.Choice; }).filter(Boolean)
        .find(function (c) { return !!c[beat[1]]; });
    check('route micro-beat exists: ' + beat[0] + ' / ' + beat[1], !!choice);
    if (choice) {
        const fn = choice[beat[1]].Do && choice[beat[1]].Do.Function;
        check('route micro-beat ' + beat[1] + ' is a reversible Function action',
            !!fn && typeof fn.Apply === 'function' && typeof fn.Revert === 'function');
        if (fn) {
            const before = w.engine.storage('player')[beat[2]];
            fn.Apply();
            const chosen = w.engine.storage('player')[beat[2]];
            fn.Revert();
            check('route micro-beat ' + beat[1] + ' applies +' + beat[3] + ' and rewinds',
                chosen === before + beat[3] && w.engine.storage('player')[beat[2]] === before);
        }
    }
});
const start = w.document.querySelector('main-menu [data-action="start"]');
if (start) {
    start.click(); await new Promise(resolve => setTimeout(resolve, 1800));
    check('new game reaches Start', w.engine.state('label') === 'Start');
    const count = () => w.document.querySelectorAll('choice-container button[data-choice]').length;
    let steps = 0;
    while (count() === 0 && steps < 30) {
        await w.engine.run('next').catch(() => {}); await new Promise(resolve => setTimeout(resolve, 250)); steps++;
    }
    check('prologue reaches the belief micro-choice', count() === 3, String(count()));
    if (count() === 3) {
        const before = w.engine.storage('player').miya_affinity;
        w.document.querySelectorAll('choice-container button[data-choice]')[0].click();
        await new Promise(resolve => setTimeout(resolve, 400));
        check('belief micro-choice applies its effect', w.engine.storage('player').miya_affinity === before + 2);
        // ROLLBACK REGRESSION: the engine Back command reverts choice.Do;
        // stat-only choices must rewind stats and re-present the choice.
        await w.engine.revert().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 800));
        check('back after a stat-only choice rewinds stats and reshows it',
            w.engine.storage('player').miya_affinity === before && count() === 3,
            'affinity=' + w.engine.storage('player').miya_affinity + ', options=' + count());
        w.document.querySelectorAll('choice-container button[data-choice]')[0].click();
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    while (count() === 0 && steps < 45) {
        await w.engine.run('next').catch(() => {}); await new Promise(resolve => setTimeout(resolve, 250)); steps++;
    }
    const choices = w.document.querySelectorAll('choice-container button[data-choice]');
    check('escalation reaches the 8-way canon route choice', choices.length === 8, String(choices.length));
    if (choices.length) {
        const before = w.engine.storage('player').miya_affinity;
        const beforeMomo = w.engine.storage('player').momo_affinity;
        // Choice order: Home, Bar, Freelance, Philosophy, LoneFighter, Miya, AI, Momo.
        check('Momo fork option exists with met_momo wired',
            w.engine.script().Start
                .map(function (step) { return step && step.Choice; }).filter(Boolean)
                .some(function (c) { return c.Momo && c.Momo.Do === 'jump MomoRoute'; }));
        choices[5].click(); await new Promise(resolve => setTimeout(resolve, 900));
        check('Miya choice applies its affinity effect', w.engine.storage('player').miya_affinity === before + 5);
        // ROLLBACK REGRESSION: route choices rewind the jump AND the stats.
        await w.engine.revert().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 900));
        check('back after a route choice returns to the 8-way fork',
            w.engine.storage('player').miya_affinity === before && count() === 8,
            'affinity=' + w.engine.storage('player').miya_affinity + ', options=' + count());
        // The 8th option must drive the live game into the romance route.
        w.document.querySelectorAll('choice-container button[data-choice]')[7].click();
        await new Promise(resolve => setTimeout(resolve, 1200));
        check('Momo route choice enters the romance route with its effects',
            w.engine.state('label') === 'MomoRoute' &&
                w.engine.storage('player').momo_affinity === beforeMomo + 5 &&
                w.engine.storage('flags').met_momo === true,
            'label=' + w.engine.state('label') + ', affinity=' + w.engine.storage('player').momo_affinity);
        await w.engine.revert().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 900));
        check('back from the Momo route returns to the fork',
            w.engine.storage('player').momo_affinity === beforeMomo && count() === 8,
            'affinity=' + w.engine.storage('player').momo_affinity + ', options=' + count());
        w.document.querySelectorAll('choice-container button[data-choice]')[5].click();
        await new Promise(resolve => setTimeout(resolve, 900));
        const action = w.engine.script().MiyaRoute.find(step => step && step.Function && step.Function.Apply);
        const prior = w.engine.storage('player').miya_affinity;
        action.Function.Apply(); action.Function.Revert();
        check('reversible action restores exact snapshot', w.engine.storage('player').miya_affinity === prior);
    }
}
const archivesBtn = w.document.getElementById('btn-archives');
if (archivesBtn) {
    archivesBtn.click(); await new Promise(resolve => setTimeout(resolve, 200));
    const overlay = w.document.getElementById('archives-overlay');
    const body = w.document.getElementById('archives-body');
    check('archives codex opens from live storage',
        overlay && overlay.hidden === false && body && body.innerHTML.length > 0);
    const closeBtn = w.document.getElementById('btn-archives-close');
    if (closeBtn) { closeBtn.click(); await new Promise(resolve => setTimeout(resolve, 100)); }
    check('archives codex closes again', overlay && overlay.hidden === true);
}
const skipBtn = w.document.getElementById('btn-skip');
if (skipBtn) {
    check('fast-forward enabled by engine settings', w.engine.setting('Skip') > 0, String(w.engine.setting('Skip')));
    skipBtn.click(); await new Promise(resolve => setTimeout(resolve, 300));
    check('fast-forward button engages the skip loop',
        !!w.engine.global('skip') && skipBtn.classList.contains('active'));
    skipBtn.click(); await new Promise(resolve => setTimeout(resolve, 120));
    check('fast-forward button disengages cleanly',
        !w.engine.global('skip') && !skipBtn.classList.contains('active'));
}
const graphMenuBtn = w.document.querySelector('[data-action="open-graph"]');
if (graphMenuBtn) {
    graphMenuBtn.click(); await new Promise(resolve => setTimeout(resolve, 250));
    const overlay = w.document.getElementById('graph-overlay');
    check('debug route atlas opens mid-game too', overlay && overlay.hidden === false);
    const nodes = w.document.querySelectorAll('.graph-node');
    check('route atlas auto-renders all 25 shipped labels', nodes.length === 25, String(nodes.length));
    const branchCard = w.document.getElementById('graph-node-SoloRoute5');
    check('atlas shows the vn.branch forks of Solo 5',
        !!(branchCard && branchCard.querySelector('[data-graph-goto="Solo5BadEnd"]') &&
            branchCard.querySelector('[data-graph-goto="Solo5Standoff"]')));
    const miyaChip = w.document.querySelector('#graph-node-Start [data-graph-goto="MiyaRoute"]');
    if (miyaChip) {
        miyaChip.click(); await new Promise(resolve => setTimeout(resolve, 150));
        const targetCard = w.document.getElementById('graph-node-MiyaRoute');
        check('atlas edge chips flash their target card',
            !!(targetCard && targetCard.classList.contains('flash')));
    }
    const jumpBtn = w.document.querySelector('[data-graph-jump="SoloRoute4"]');
    if (jumpBtn) {
        jumpBtn.click(); await new Promise(resolve => setTimeout(resolve, 1500));
        check('atlas teleport moves the live game into the node',
            w.engine.state('label') === 'SoloRoute4', String(w.engine.state('label')));
        check('atlas overlay closes on teleport', overlay.hidden === true);
    }
}
check('no unmapped icons', Object.keys((w.IconsOffline && w.IconsOffline.missing) || {}).length === 0);
// "Attempted to hide a character that was not being shown" is a true no-op
// notice the engine logs when a route's leading hide runs after the atlas
// teleport wiped presentation state (organic play always has the sprite up).
const relevant = errors.filter(error =>
    !/settings saved|first time|Cannot convert undefined|null to object|localStorage|Attempted to hide a character/i.test(error));
check('no unexpected console errors', relevant.length === 0, relevant.join(' | '));
dom.window.close();
if (failures.length) { console.error('SMOKE FAILED: ' + failures.join(', ')); process.exit(1); }
console.log('SMOKE PASSED — file:// boot, routes, rollback, icons, and offline guard verified.');
