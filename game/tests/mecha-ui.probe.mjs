// Dev probe: boots index.html in jsdom and reports what the pure-CSS mecha
// skin shipped. Not part of `npm test` — run manually: node tests/mecha-ui.probe.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, '..', 'index.html');
const { JSDOM, VirtualConsole } = await import('jsdom');
process.on('unhandledRejection', () => {});

const errors = [];
const vc = new VirtualConsole();
vc.on('error', m => errors.push(String(m)));
vc.on('jsdomError', e => { if (!/localStorage|not implemented|Could not parse CSS/i.test(e.message)) errors.push(e.message); });

const dom = await JSDOM.fromFile(page, {
    url: pathToFileURL(page).href, resources: 'usable', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole: vc,
    beforeParse (window) {
        window.addEventListener('error', ev => errors.push(String(ev.error || ev.message)));
        window.HTMLMediaElement.prototype.play = () => Promise.resolve();
        window.HTMLMediaElement.prototype.pause = () => {};
    },
});
await new Promise(r => setTimeout(r, 3500));
const w = dom.window, d = w.document;
if (!w.engine) { d.dispatchEvent(new w.Event('DOMContentLoaded')); await new Promise(r => setTimeout(r, 1200)); }

const cs = w.getComputedStyle(d.documentElement);
console.log('MechaUI (JS) retired   :', typeof w.MechaUI === 'undefined' ? 'yes' : 'NO — still present');
console.log('[data-mech] elements   :', d.querySelectorAll('[data-mech]').length, '(expect 0)');
console.log('.mech-l layer nodes    :', d.querySelectorAll('.mech-l').length, '(expect 0)');

// The skin is now static markup + CSS: prove the structure shipped in HTML.
console.log('title block (static)   :', !!d.querySelector('.mech-title-block'),
    '|', d.querySelector('.mech-title') ? d.querySelector('.mech-title').textContent.trim() : '-');
console.log('instrument rail        :', !!d.querySelector('.hud-instruments'),
    '| leds', d.querySelectorAll('.mech-led').length,
    '| gauges', d.querySelectorAll('.mech-gauge').length,
    '| radar', !!d.querySelector('.mech-radar'),
    '| serial', !!d.querySelector('.mech-serial'));
console.log('telemetry strip        :', !!d.querySelector('.mech-strip'),
    '| ticker items', d.querySelectorAll('.mech-strip-track span').length);
console.log('atmosphere             : ambient', !!d.querySelector('.mech-ambient'),
    '| beacon', !!d.querySelector('.mech-beacon'));

// CSS tokens: the steel family and accents must be defined for the skin.
console.log('CSS tokens             :',
    ['--mech-c', '--mech-c-l1', '--mech-c-l4', '--mech-c-d1', '--mech-c-d4', '--mech-cyan', '--mech-amber', '--mech-face']
        .map(v => `${v}=${cs.getPropertyValue(v).trim() || 'MISSING'}`).join(' '));

// Alert level drives the pure-CSS caution/alarm states via game.js. The hook
// lives in game.js updateHUD, which fires on vn.reversible() Apply — so drive
// it through the real reversible Function steps in the prologue (the
// `akatomi_alert: 3` step is among them), not a raw engine.storage() write.
console.log('\n-- alert state response (via reversible actions) --');
const startSteps = (w.engine.script().Start || []);
const fns = startSteps.map(s => s && s.Function).filter(Boolean);
function alertNow () { return w.engine.storage('player').akatomi_alert || 0; }
function hasCls (c) { return (' ' + d.documentElement.className + ' ').indexOf(' ' + c + ' ') !== -1; }
if (fns.length) {
    console.log('  reversible steps in Start :', fns.length);
    console.log('  rest state               : alert=' + alertNow() + ' caution=' + hasCls('mech-caution') + ' alarm=' + hasCls('mech-alarm'));
    let guard = 0;
    while (alertNow() < 15 && guard++ < 40) { fns.forEach(f => f.Apply()); }
    await new Promise(r => setTimeout(r, 40));
    console.log('  pushed to caution        : alert=' + alertNow() + ' caution=' + hasCls('mech-caution'));
    guard = 0;
    while (alertNow() < 40 && guard++ < 40) { fns.forEach(f => f.Apply()); }
    await new Promise(r => setTimeout(r, 40));
    console.log('  pushed to alarm          : alert=' + alertNow() + ' alarm=' + hasCls('mech-alarm'));
    // Rewind back to a clean state so the rest of the probe is unaffected.
    for (let i = 0; i < 40; i++) { fns.forEach(f => { try { f.Revert(); } catch (e) {} }); }
    await new Promise(r => setTimeout(r, 40));
    console.log('  rewound                  : alert=' + alertNow() + ' caution=' + hasCls('mech-caution') + ' alarm=' + hasCls('mech-alarm'));
}

// The chamfered plates are painted by CSS on the real engine markup.
console.log('\n-- plate selectors present (no JS mounting needed) --');
const start = d.querySelector('main-menu [data-action="start"]');
console.log('  main-menu buttons     :', d.querySelectorAll('main-menu button').length);
console.log('  hud buttons           :', d.querySelectorAll('.hud-btn').length);
if (start) {
    start.click(); await new Promise(r => setTimeout(r, 1500));
    for (let i = 0; i < 6; i++) { await w.engine.run('next').catch(() => {}); await new Promise(r => setTimeout(r, 300)); }
    await new Promise(r => setTimeout(r, 500));
    console.log('  choice buttons        :', d.querySelectorAll('choice-container button').length);
    console.log('  text-box present      :', !!d.querySelector('text-box'));
}
console.log('\nerrors:', errors.length ? errors.join(' | ') : 'none');
dom.window.close();
