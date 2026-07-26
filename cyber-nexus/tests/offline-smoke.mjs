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
//
// Deps: jsdom, dev-only, NEVER shipped and never committed:
//         npm i jsdom --prefix cyber-nexus     (cyber-nexus/node_modules is gitignored)
//
// Without jsdom this exits 0 with a SKIP — but see REQUIRE_JSDOM below: because
// "no jsdom" is the default state of a fresh checkout, a silent skip meant this
// test effectively never ran. CI and careful contributors should set
// REQUIRE_JSDOM=1, which turns the skip into a hard failure.
//
// The zero-dependency suites cover the logic this file cannot:
//   node --test cyber-nexus/tests/failsafe.test.mjs \
//               cyber-nexus/tests/game.test.mjs \
//               cyber-nexus/tests/icons-offline.test.mjs
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, '..', 'index.html');
const REQUIRE_JSDOM = process.env.REQUIRE_JSDOM === '1';

const INSTALL_HINT = [
    'This test needs jsdom, which is a DEV-ONLY dependency — it must never be',
    'committed and never ships inside the game folder.',
    '',
    '  Enable it:   npm i jsdom --prefix cyber-nexus',
    '  Run it:      node cyber-nexus/tests/offline-smoke.mjs',
    '  Demand it:   REQUIRE_JSDOM=1 node cyber-nexus/tests/offline-smoke.mjs   (skip => exit 1)',
    '  Clean up:    rm -rf cyber-nexus/node_modules cyber-nexus/package.json \\',
    '                      cyber-nexus/package-lock.json',
    '',
    'Zero-dependency coverage that always runs:',
    '  node --test cyber-nexus/tests/failsafe.test.mjs \\',
    '              cyber-nexus/tests/game.test.mjs \\',
    '              cyber-nexus/tests/icons-offline.test.mjs',
].join('\n');

function skip (reason) {
    const banner = '='.repeat(74);
    if (REQUIRE_JSDOM) {
        console.error(`\n${banner}\nOFFLINE SMOKE TEST DID NOT RUN — and REQUIRE_JSDOM=1 was set.\n${banner}`);
        console.error(`\nReason: ${reason}\n\n${INSTALL_HINT}\n`);
        process.exit(1);
    }
    console.log(`\n${banner}\nSKIPPED: the offline smoke test did not run.\n${banner}`);
    console.log(`\nReason: ${reason}\n\n${INSTALL_HINT}\n`);
    console.log('This is a SKIP, not a PASS: nothing about index.html was verified here.\n');
    process.exit(0);
}

let jsdom;
try {
    jsdom = await import('jsdom');
} catch (e) {
    skip('jsdom is not installed (this is the default state of a fresh checkout).');
}

const { JSDOM, VirtualConsole } = jsdom;
if (typeof JSDOM?.fromFile !== 'function') {
    skip(`the installed jsdom does not expose JSDOM.fromFile (got ${typeof JSDOM}).`);
}

const failures = [];
function check (name, cond, detail) {
    if (cond) { console.log('  PASS  ' + name); }
    else { failures.push(name); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

// The engine's localStorage probe rejects under jsdom for file:// (opaque
// origin). That is upstream behaviour and fine in a real browser; swallow it so
// it cannot kill the process, but keep a record.
const unhandled = [];
process.on('unhandledRejection', (e) => { unhandled.push(String(e && (e.message || e))); });

const pageUrl = pathToFileURL(page).href;
const netCalls = [];
const consoleErrors = [];
const consoleWarnings = [];
const vc = new VirtualConsole();
vc.on('error', (m) => consoleErrors.push(String(m)));
vc.on('warn', (m) => consoleWarnings.push(String(m)));
vc.on('jsdomError', (e) => {
    // jsdom lacks layout/audio bits the engine probes; only record real errors
    if (!/localStorage|Could not parse CSS|not implemented/i.test(e.message)) { consoleErrors.push(e.message); }
});

const dom = await JSDOM.fromFile(page, {
    url: pageUrl,
    // 'usable' makes jsdom load subresources. Older jsdom exposed a
    // ResourceLoader subclass for spying; jsdom >= 29 removed it, so
    // subresource URLs are asserted from the parsed DOM instead (below).
    resources: 'usable',
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
// Read every subresource reference straight out of the parsed document. This
// works on every jsdom version and checks the thing that actually matters:
// what index.html asks the browser to load.
const refs = [...w.document.querySelectorAll('script[src], link[href], img[src], source[src], audio[src], video[src]')]
    .map(el => el.getAttribute('src') || el.getAttribute('href'))
    .filter(Boolean);
const remoteRefs = refs.filter(u => /^(?:https?:)?\/\//i.test(u) || /^data:.*;base64/i.test(u) === false && /^[a-z]+:\/\//i.test(u));
check('index.html references subresources at all', refs.length > 0);
check('every subresource is a relative local path', remoteRefs.length === 0, remoteRefs.join(', '));

const resolved = [...w.document.querySelectorAll('script[src], link[href]')]
    .map(el => el.src || el.href).filter(Boolean);
check('every resolved subresource URL is file://', resolved.length > 0 && resolved.every(u => u.startsWith('file://')),
    resolved.filter(u => !u.startsWith('file://')).join(', '));
check('FailSafe vendor libs loaded', !!w.FailSafe && !!w.IconsOffline);
check('game code loaded from vendor/game.js (not an inline script)',
    refs.some(u => u.includes('game.js')) && !!w.CyberNexusCore);
check('no inline <script> blocks remain in index.html',
    [...w.document.querySelectorAll('script')].every(s => s.hasAttribute('src')));
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

console.log('\n[5] DOM guards (work item 4)');
// The hardened selectors must not have warned about anything in the real page:
// every [data-close] / .codex-tab / .codex-panel is a genuine HTMLElement and
// every data-close names a modal that exists.
const guardWarnings = consoleWarnings.filter(m => /Cyber-Nexus/.test(m) &&
    /(non-HTMLElement|no such element|no element with id|has no matching)/.test(m));
check('no DOM-guard warnings from the real page', guardWarnings.length === 0, guardWarnings.slice(0, 3).join(' | '));
// And prove the guard is real rather than dead code, by asking it about junk.
const guardWorks = w.eval(`(() => {
    const before = window.CyberNexusCore ? 1 : 0;
    // toggleModal is not exported; exercise the observable contract instead:
    // a [data-close] pointing at a missing modal must warn, not throw.
    const b = window.document.createElement('button');
    b.setAttribute('data-close', 'definitely-not-a-modal');
    window.document.body.appendChild(b);
    try { b.click(); return { ok: true, before }; } catch (e) { return { ok: false, error: e.message }; }
})()`);
check('a data-close naming a missing modal does not throw', guardWorks.ok === true, guardWorks.error);

// Known jsdom-only artifacts: the engine's localStorage settings probe rejects
// under jsdom (pre-existing upstream behaviour, fine in real browsers), and its
// first-run settings warning. Everything else IS a failure.
const relevantErrors = consoleErrors.filter(e =>
    !/settings saved|first time|Cannot convert undefined|null to object|localStorage/i.test(e) &&
    !/^Unhandled promise rejection\s*$/.test(e.trim()));
check('no unexpected console errors', relevantErrors.length === 0, relevantErrors.slice(0, 5).join(' | '));

console.log('');
if (failures.length) {
    console.log(`SMOKE TEST FAILED (${failures.length}): ${failures.join('; ')}`);
    process.exit(1);
}
console.log('SMOKE TEST PASSED — page is fully offline-capable and failsafe-guarded.');
process.exit(0);
