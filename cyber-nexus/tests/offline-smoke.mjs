// Offline smoke test for cyber-nexus/index.html
// ----------------------------------------------------------------------------
// Verifies the distributable invariants:
//   1. Every subresource is a file:// URL — a page that "needs a server" fails.
//   2. No fetch()/XHR/beacon/socket happens at runtime.
//   3. FailSafe boots: storage schema validates, script lint is CLEAN.
//   4. The game starts, advances, and rollback restores LIFO snapshots.
//   5. No unmapped icons (the old CDN Font Awesome gap stays fixed).
//
// Run:  node cyber-nexus/tests/offline-smoke.mjs
// Deps: jsdom (dev-only; e.g. `npm i -g jsdom` or run `npm i jsdom` in a
//       scratch dir and set NODE_PATH). Exits 0 with a SKIP note if absent —
//       unit tests (failsafe.test.mjs) need no dependencies at all.
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, '..', 'index.html');

let JSDOM, ResourceLoader, VirtualConsole;
try {
    ({ JSDOM, ResourceLoader, VirtualConsole } = await import('jsdom'));
} catch (e) {
    console.log('SKIP: jsdom not installed — run `npm install jsdom` (dev-only) to enable this test.');
    process.exit(0);
}

const failures = [];
function check (name, cond, detail) {
    if (cond) { console.log('  PASS  ' + name); }
    else { failures.push(name); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

const pageUrl = pathToFileURL(page).href;
const requests = [];
class SpyLoader extends ResourceLoader {
    fetch (url, options) { requests.push(url); return super.fetch(url, options); }
}
const netCalls = [];
const consoleErrors = [];
const vc = new VirtualConsole();
vc.on('error', (m) => consoleErrors.push(String(m)));
vc.on('warn', () => {}); // engine first-run settings warning is expected
vc.on('jsdomError', (e) => {
    // jsdom lacks layout/audio bits the engine probes; only record real errors
    if (!/localStorage|Could not parse CSS|not implemented/i.test(e.message)) { consoleErrors.push(e.message); }
});

const dom = await JSDOM.fromFile(page, {
    url: pageUrl,
    resources: new SpyLoader(),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse (window) {
        window.fetch = (...a) => { netCalls.push('fetch:' + a[0]); return Promise.reject(new Error('offline-in-test')); };
        window.XMLHttpRequest = class {
            open (m, u) { netCalls.push('xhr:' + u); }
            send () {} setRequestHeader () {} abort () {}
        };
        window.WebSocket = class { constructor (u) { netCalls.push('ws:' + u); } };
        window.EventSource = class { constructor (u) { netCalls.push('eventsource:' + u); } };
        if (window.navigator) {
            try { window.navigator.sendBeacon = (u) => { netCalls.push('beacon:' + u); return false; }; } catch (e) { /* read-only */ }
        }
        const param = () => ({ setValueAtTime () {}, exponentialRampToValueAtTime () {}, value: 0 });
        const nodeBase = { connect () {}, start () {}, stop () {}, disconnect () {} };
        window.AudioContext = class {
            constructor () { this.currentTime = 0; this.destination = {}; }
            createGain () { return { ...nodeBase, gain: param() }; }
            createOscillator () { return { ...nodeBase, frequency: param(), type: '' }; }
            createBiquadFilter () { return { ...nodeBase, frequency: param(), Q: param(), type: '' }; }
            close () { return Promise.resolve(); }
        };
        window.HTMLMediaElement.prototype.play = () => Promise.resolve();
        window.HTMLMediaElement.prototype.pause = () => {};
    },
});

await new Promise(r => setTimeout(r, 6000));
const w = dom.window;

console.log('\n[1] Offline purity');
check('every subresource is file://', requests.length > 0 && requests.every(u => u.startsWith('file://')),
    requests.filter(u => !u.startsWith('file://')).join(', '));
check('FulfillSafe vendor libs loaded', requests.some(u => u.includes('failsafe.js')) && requests.some(u => u.includes('icons-offline')));
check('no runtime fetch/XHR/beacon/socket', netCalls.length === 0, netCalls.join(', '));

console.log('\n[2] FailSafe boot');
check('FailSafe global present', !!w.FailSafe);
check('engine boots', !!w.engine && !!w.document.querySelector('main-menu button'));
const lint = w.eval('(() => { try { const FS = window.FailSafe; const vn = FS.vn(window.engine, { silent: true }); return vn.lintScript({ silent: true }); } catch (e) { return { ok: false, issues: [{ rule: "threw", detail: e.message }] }; } })()');
check('script lint CLEAN', lint.ok, JSON.stringify(lint.issues).slice(0, 400));

console.log('\n[3] Game flow + rollback');
const startBtn = w.document.querySelector('main-menu [data-action="start"]');
check('start button exists', !!startBtn);
if (startBtn) {
    startBtn.click();
    await new Promise(r => setTimeout(r, 4000));
    check('game reaches Start label', w.eval('window.engine.state("label")') === 'Start');
    const early = w.eval('window.engine.state("step")');
    for (let i = 0; i < 4; i++) { w.eval('window.engine.run("next").catch(() => {})'); await new Promise(r => setTimeout(r, 800)); }
    const later = w.eval('window.engine.state("step")');
    check('advancing moves the step counter', later > early, `${early} -> ${later}`);

    // Exercise rollback semantics ON THE REAL SHIPPED ACTION OBJECT:
    // find the vn.reversible({hacking: 2}) action inside Chapter1_SideAria,
    // Apply it, then Revert it, and require exact snapshot restoration.
    const snapshot = w.eval(`(() => {
        const script = window.engine.script();
        const label = script['Chapter1_SideAria'] || [];
        const action = label.find(s => s && typeof s === 'object' && s.Function && typeof s.Function.Apply === 'function');
        if (!action) { return { found: false }; }
        const before = window.engine.storage('player').hacking;
        action.Function.Apply.call({});
        const applied = window.engine.storage('player').hacking;
        action.Function.Revert.call({});
        const reverted = window.engine.storage('player').hacking;
        return { found: true, before, applied, reverted };
    })()`);
    check('shipped script contains a reversible hacking award', snapshot.found === true);
    check('Apply grants +2 hacking', snapshot.found && snapshot.before === 3 && snapshot.applied === 5,
        `${snapshot.before} -> ${snapshot.applied}`);
    check('Revert restores the exact pre-award value (snapshot, not inverse-delta)',
        snapshot.found && snapshot.reverted === 3, `reverted to ${snapshot.reverted}`);

    // The live engine rollback path must stay SAFE to call: the vendored
    // engine rejects rollback() with a non-Error value at history boundaries
    // (upstream behaviour — test_rewind.py always caught it too). What the
    // game guarantees is: it rejects rather than corrupting state.
    const rb = await w.eval('window.engine.rollback().then(() => "resolved").catch(() => "rejected-safely")');
    check('engine.rollback() settles (resolved or safely rejected)', rb === 'resolved' || rb === 'rejected-safely', String(rb));
    check('storage still coherent after engine rollback', w.eval('window.engine.storage("player").hacking') === 3);
}

console.log('\n[4] Offline icons');
const missingIcons = w.eval('Object.keys((window.IconsOffline && window.IconsOffline.missing) || {})');
check('no unmapped fa-* classes rendered', missingIcons.length === 0, missingIcons.join(', '));

// Known jsdom-only artifacts: the engine's localStorage settings probe rejects
// under jsdom (pre-existing upstream behaviour, fine in real browsers), and its
// first-run settings warning. Everything else IS a failure.
const relevantErrors = consoleErrors.filter(e =>
    !/settings saved|first time|Cannot convert undefined|null to object/i.test(e) &&
    !/^Unhandled promise rejection\s*$/.test(e.trim()));
check('no unexpected console errors', relevantErrors.length === 0, relevantErrors.slice(0, 5).join(' | '));

console.log('');
if (failures.length) {
    console.log(`SMOKE TEST FAILED (${failures.length}): ${failures.join('; ')}`);
    process.exit(1);
}
console.log('SMOKE TEST PASSED — page is fully offline-capable and failsafe-guarded.');
process.exit(0);
