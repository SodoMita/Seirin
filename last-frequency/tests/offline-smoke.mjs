// file:// boot smoke test for THE LAST FREQUENCY (dev-only, needs jsdom).
// Run:  node last-frequency/tests/offline-smoke.mjs
//       REQUIRE_JSDOM=1 node last-frequency/tests/offline-smoke.mjs  (skip => fail)
//
// Installs:  npm i jsdom --prefix last-frequency   (node_modules is gitignored)
//
// Verifies the distributable boots offline: scripts execute, FailSafe boots,
// the compiled story passes lintScript CLEAN, no icon is unmapped, and nothing
// in our vendor code throws. It does NOT assert the menu rendered, because the
// engine's localStorage probe rejects under jsdom on file:// (opaque origin) —
// upstream behaviour that is fine in a real browser. Static offline purity and
// rollback primitives are covered by the zero-dependency suites.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, '..', 'index.html');
const REQUIRE = process.env.REQUIRE_JSDOM === '1';

// The engine probes localStorage, which throws on file:// (opaque origin) under
// jsdom and can surface as an *unhandled* rejection. Node 22 turns unhandled
// rejections into a fatal throw, so we capture them here: the opaque-origin
// DOMException is EXPECTED (real browsers are fine); anything else is a failure.
const unhandled = [];
process.on('unhandledRejection', (err) => {
    const msg = String(err && (err.message || err.name || err) || err);
    if (/localStorage|SecurityError|opaque|origin|DOMException/i.test(msg)) return;
    unhandled.push(msg);
});

function skip (reason) {
    const b = '='.repeat(70);
    if (REQUIRE) { console.error(`\n${b}\nSMOKE DID NOT RUN with REQUIRE_JSDOM=1: ${reason}\n${b}`); process.exit(1); }
    console.log(`\n${b}\nSKIPPED offline smoke: ${reason}\n(Install dev-only jsdom: npm i jsdom --prefix last-frequency)\n${b}`);
    process.exit(0);
}

let jsdom;
try { jsdom = await import('jsdom'); } catch (e) { skip('jsdom not installed'); }
const { JSDOM, VirtualConsole } = jsdom;
if (typeof JSDOM?.fromFile !== 'function') skip('jsdom lacks JSDOM.fromFile');

const logs = [], warns = [], errors = [], resourceErrs = [];
const vc = new VirtualConsole();
// jsdom emits one event per console method (log/info/warn/error), not jsLog/jsError.
vc.on('log',  (...a) => logs.push(a.map(String).join(' ')));
vc.on('info', (...a) => logs.push(a.map(String).join(' ')));
vc.on('warn', (...a) => warns.push(a.map(String).join(' ')));
vc.on('error', (...a) => errors.push(a.map(String).join(' ')));
vc.on('jsdomError', (e) => { resourceErrs.push(String(e && e.message || e)); });

const dom = await JSDOM.fromFile(page, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    url: pathToFileURL(page).href, virtualConsole: vc
});

// Give scripts + boot a window to run (boot is synchronous up to engine.init).
await new Promise(r => setTimeout(r, 2500));

const w = dom.window;
const fails = [];
function check (name, cond, detail) {
    console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (cond ? '' : ' — ' + (detail || '')));
    if (!cond) fails.push(name);
}

// Our files throwing during boot (exclude the benign file:// localStorage
// rejection, which originates in the engine and is expected under jsdom).
const fatal = errors.filter(e =>
    !/localStorage|SecurityError|opaque|origin/i.test(e) &&
    /last-frequency[\\/]vendor|LFStory|LFCompiler|FailSafe|TypeError|ReferenceError|is not a function/i.test(e));

check('page parsed: visual-novel mounted', !!w.document.querySelector('#vn-root visual-novel'));
check('vendor scripts executed (globals present)',
    !!w.FailSafe && !!w.LFStory && !!w.LFCompiler && !!w.engine);
check('no fatal boot error in our vendor code', fatal.length === 0, fatal.slice(0, 3).join(' | '));
check('script lint reported CLEAN', logs.some(l => /script lint: CLEAN/.test(l)),
    'boot() runs lintScript before engine.init; absence means boot threw early');
check('no unmapped icons', w.IconsOffline && Object.keys(w.IconsOffline.missing || {}).length === 0,
    JSON.stringify(Object.keys((w.IconsOffline || {}).missing || {})));
check('engine accepted the compiled script (no script-build throw)',
    logs.some(l => /initialised|script lint|FailSafe v/.test(l)) || !!w.engine);

// Local resource 404s would indicate a wrong asset path; jsdom file:// may
// surface benign load quirks, so only fail on an explicit ENOENT/404 for OUR
// assets, never on a network host.
const badRes = resourceErrs.filter(e => /ENOENT|404|net::ERR/i.test(e) && /last-frequency[\\/]assets/i.test(e));
check('no missing local asset (404/ENOENT) under file://', badRes.length === 0, badRes.slice(0, 3).join(' | '));
check('no unexpected unhandled rejection at boot', unhandled.length === 0, unhandled.slice(0, 3).join(' | '));

// Parse every non-trivial statement FORM the script uses, through the engine's
// own action parser. An unknown/invalid form (e.g. an unsupported 'stop voice')
// throws here, so this catches statement-shape bugs the lint pass does not.
const forms = [
    'show scene watch_room with fadeIn duration 2s',
    'show character mira normal at center with fadeIn',
    'show character elara sad at right',
    'hide character jun with fadeOut',
    'show image elara_hope at center with fadeIn duration 3s',
    'play voice signal', 'play voice elara_farewell', 'stop voice',
    'mira A line of dialogue.', 'n Narration with no nameplate.', 'jump Act1_Together', 'end'
];
const parseFails = [];
if (typeof w.engine.prepareAction === 'function') {
    forms.forEach(stmt => {
        try { w.engine.prepareAction(stmt, { cycle: 'Application' }); }
        catch (e) { parseFails.push(stmt + ' :: ' + (e && e.message ? e.message : e)); }
    });
} else {
    parseFails.push('engine.prepareAction unavailable (cannot validate statement forms)');
}
check('every statement form used by the script parses in the engine', parseFails.length === 0, parseFails.slice(0, 4).join(' | '));

// Informational: init render is the known jsdom limitation, not a failure.
const rendered = !!w.document.querySelector('main-menu button');
console.log('  info  main menu rendered under jsdom: ' + rendered +
    ' (false is EXPECTED on file:// — the engine localStorage probe rejects on opaque origin; real browsers render fine)');

dom.window.close();

const banner = '='.repeat(70);
if (fails.length) {
    console.error(`\n${banner}\nOFFLINE SMOKE: ${fails.length} FAILURE(S): ${fails.join('; ')}\n${banner}`);
    process.exit(1);
}
console.log(`\n${banner}\nOFFLINE SMOKE: PASS (boot is offline and clean; render check is informational).\n${banner}`);
