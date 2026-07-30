// Dev probe: boots index.html in jsdom and reports what the mecha skin built.
// Not part of `npm test` — run manually: node tests/mecha-ui.probe.mjs
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
        // jsdom has no canvas backend; emulate just enough for the bakery so we
        // can prove the data-URI path runs. Real browsers use the real canvas.
        window.HTMLCanvasElement.prototype.getContext = function () {
            const noop = () => {};
            return {
                createRadialGradient: () => ({ addColorStop: noop }),
                createLinearGradient: () => ({ addColorStop: noop }),
                createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
                putImageData: noop, beginPath: noop, moveTo: noop, lineTo: noop,
                stroke: noop, fill: noop, arc: noop, ellipse: noop, closePath: noop,
                save: noop, restore: noop, translate: noop, rotate: noop,
                set strokeStyle (v) {}, set fillStyle (v) {}, set lineWidth (v) {}, set lineCap (v) {},
            };
        };
        window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
    },
});
await new Promise(r => setTimeout(r, 3500));
const w = dom.window, d = w.document;
if (!w.engine) { d.dispatchEvent(new w.Event('DOMContentLoaded')); await new Promise(r => setTimeout(r, 1200)); }

const rootStyle = d.documentElement.style;
console.log('MechaUI present        :', typeof w.MechaUI, w.MechaUI && w.MechaUI.version);
console.log('textures published     :', ['--mech-tex-brushed', '--mech-tex-grain', '--mech-tex-wear-a', '--mech-tex-wear-b', '--mech-tex-wear-c']
    .filter(p => rootStyle.getPropertyValue(p)).join(', ') || '(none — CSS fallbacks in use)');
console.log('plates mounted         :', w.MechaUI && w.MechaUI.mounted());
console.log('  [data-mech] elements :', d.querySelectorAll('[data-mech]').length);
for (const kind of ['dash', 'console', 'plate', 'chip', 'housing']) {
    console.log(`    ${kind.padEnd(8)}         :`, d.querySelectorAll(`[data-mech="${kind}"]`).length);
}
console.log('  layer nodes          :', d.querySelectorAll('.mech-l').length,
    '(face', d.querySelectorAll('.mech-l-face').length,
    '/ wear', d.querySelectorAll('.mech-l-wear').length,
    '/ gloss', d.querySelectorAll('.mech-l-gloss').length,
    '/ rivets', d.querySelectorAll('.mech-l-rivets').length,
    '/ edge', d.querySelectorAll('.mech-l-edge').length, ')');
const serials = [...d.querySelectorAll('.mech-l-wear')].map(e => e.getAttribute('data-serial'));
console.log('  stencil serials      :', serials.slice(0, 8).join(' '), serials.length > 8 ? '…' : '');
const wears = [...d.querySelectorAll('.mech-l-wear')].map(e => e.getAttribute('data-wear'));
console.log('  wear variety         :', JSON.stringify(wears.reduce((a, v) => (a[v] = (a[v] || 0) + 1, a), {})));
console.log('instrument rail        :', !!d.querySelector('.hud-instruments'),
    '| leds', d.querySelectorAll('.mech-led').length,
    '| gauges', d.querySelectorAll('.mech-gauge').length,
    '| radar', d.querySelectorAll('.mech-radar').length);
console.log('telemetry strip        :', !!d.querySelector('.mech-strip'),
    '| ticker items', d.querySelectorAll('.mech-strip-track span').length);
console.log('atmosphere             : ambient', !!d.querySelector('.mech-ambient'), '| beacon', !!d.querySelector('.mech-beacon'));

// Drive the alert level and confirm the illumination states switch.
console.log('\n-- indicator response to akatomi_alert --');
for (const level of [0, 20, 55]) {
    const p = w.engine.storage('player');
    w.engine.storage({ player: Object.assign({}, p, { akatomi_alert: level, route: level ? 'solo_1' : 'none' }) });
    const st = w.MechaUI.refresh();
    const g = [...d.querySelectorAll('.mech-gauge')].map(r => `${r.dataset.k}=${r.querySelector('.mech-gauge-v').textContent}%`).join(' ');
    console.log(`  alert ${String(level).padStart(3)} -> ${g} | --mech-alert=${rootStyle.getPropertyValue('--mech-alert')} | html.class="${d.documentElement.className}" | ${JSON.stringify(st)}`);
}

// Prove late-rendered engine markup gets skinned too.
console.log('\n-- late mount (choice buttons) --');
const start = d.querySelector('main-menu [data-action="start"]');
if (start) {
    start.click(); await new Promise(r => setTimeout(r, 1500));
    for (let i = 0; i < 6; i++) { await w.engine.run('next').catch(() => {}); await new Promise(r => setTimeout(r, 300)); }
    await new Promise(r => setTimeout(r, 500));
    const btns = d.querySelectorAll('choice-container button');
    const skinned = [...btns].filter(b => b.getAttribute('data-mech')).length;
    console.log('  choice buttons       :', btns.length, '| skinned by observer:', skinned);
    console.log('  text-box skinned     :', !!d.querySelector('text-box[data-mech]'));
    console.log('  phases (desync)      :', [...btns].map(b => b.style.getPropertyValue('--mech-phase')).join(' '));
}
console.log('\nerrors:', errors.length ? errors.join(' | ') : 'none');
dom.window.close();
