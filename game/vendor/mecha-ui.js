/* ============================================================================
 * Seirin: Night Shift — Resonance 2030
 * MECHA-UI (JS side) — the machine that makes vendor/mecha-ui.css live.
 * ----------------------------------------------------------------------------
 * ES5, UMD, zero dependencies, zero network. Pairs with vendor/mecha-ui.css.
 *
 * Responsibilities, in the order they happen at boot:
 *
 *  1. BAKE TEXTURES  — draws brushed-metal grain, noise and three "bruise"
 *     sheets (scratches, dents, chipped paint, rust bloom, grease) onto an
 *     offscreen <canvas>, exports them as PNG data URIs and publishes them as
 *     CSS custom properties (--mech-tex-*). No binary asset is committed and
 *     nothing is fetched. Deterministic PRNG => identical wear every run, so
 *     the art is stable and screenshots are reproducible.
 *
 *  2. MOUNT LAYERS   — for every element matching a selector in PLATES,
 *     injects the empty <i class="mech-l mech-l-*"> children the CSS paints
 *     into, tags it with data-mech="<kind>", gives it a stable stencil serial
 *     and a phase offset so animations do not run in lockstep. A
 *     MutationObserver re-mounts anything the engine renders later (choice
 *     buttons, save slots, settings panels).
 *
 *  3. INSTRUMENTS    — builds the HUD instrument rail (LED column, three
 *     segmented gauges, radar disc) and the scrolling telemetry strip, then
 *     keeps them in sync with engine storage: RES from resonance-ish stats,
 *     PWR from route progress, HEAT from akatomi_alert. Crossing thresholds
 *     switches the whole interface into caution / alarm illumination.
 *
 *  4. PARALLAX 2.5D  — writes pointer position into --mech-mx/--mech-my so
 *     plates tilt and the specular highlight tracks the cursor.
 *
 * FAILSAFE CONTRACT
 *   - Never throws into the page: every entry point is wrapped in try/catch.
 *   - Never mutates game state. It only READS engine.storage(); all writes
 *     still go through FailSafe.vn elsewhere.
 *   - Never adds an element the engine could mistake for content: injected
 *     nodes are <i class="mech-l"> with aria-hidden and no text.
 *   - Degrades to plain CSS if <canvas>, MutationObserver or the engine are
 *     missing (this is what makes the jsdom smoke test pass unchanged).
 *   - Honours prefers-reduced-motion: sets --mech-tilt to 0 and skips the
 *     pointer listener; CSS switches off the rest.
 * ========================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    if (!doc) { return; }

    /* ------------------------------------------------------------------ *
     * Deterministic PRNG (mulberry32). Same wear pattern on every boot.
     * ------------------------------------------------------------------ */
    function rng (seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function canvasOf (size) {
        var c = doc.createElement('canvas');
        c.width = size;
        c.height = size;
        var ctx = c.getContext ? c.getContext('2d') : null;
        return ctx ? { canvas: c, ctx: ctx } : null;
    }

    /* ================================================================== *
     * 1. TEXTURE BAKERY
     * ================================================================== */

    /* Brushed-metal grain: horizontal streaks of varying length + opacity. */
    function bakeBrushed () {
        var s = canvasOf(128);
        if (!s) { return null; }
        var ctx = s.ctx;
        var rand = rng(0x5E1717);
        var i, y, x, len, a;
        for (i = 0; i < 900; i++) {
            y = Math.floor(rand() * 128);
            x = Math.floor(rand() * 128);
            len = 6 + rand() * 46;
            a = 0.02 + rand() * 0.06;
            ctx.strokeStyle = rand() > 0.5
                ? 'rgba(255,255,255,' + a.toFixed(3) + ')'
                : 'rgba(0,0,0,' + (a * 1.3).toFixed(3) + ')';
            ctx.lineWidth = rand() > 0.85 ? 1.4 : 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y + 0.5);
            ctx.lineTo(x + len, y + 0.5);
            ctx.stroke();
        }
        return s.canvas.toDataURL('image/png');
    }

    /* Fine sensor/film noise so flat gradients never band. */
    function bakeGrain () {
        var s = canvasOf(128);
        if (!s) { return null; }
        var ctx = s.ctx;
        var img = ctx.createImageData(128, 128);
        var d = img.data;
        var rand = rng(0x00C0FFEE);
        var i, v;
        for (i = 0; i < d.length; i += 4) {
            v = 108 + Math.floor(rand() * 40);
            d[i] = v; d[i + 1] = v; d[i + 2] = v;
            d[i + 3] = 46;
        }
        ctx.putImageData(img, 0, 0);
        return s.canvas.toDataURL('image/png');
    }

    /* ---- bruise vocabulary ------------------------------------------- *
     * Each mark is drawn with a dark "cut" and a light "lip" one pixel
     * offset — the two-light-source rule from the critique board is what
     * makes damage read as carved into metal instead of printed on it.
     * ------------------------------------------------------------------ */

    function drawScratch (ctx, rand) {
        var x = rand() * 256;
        var y = rand() * 256;
        var ang = (rand() - 0.5) * 1.5;
        var len = 12 + rand() * 90;
        var dx = Math.cos(ang) * len;
        var dy = Math.sin(ang) * len;
        var w = rand() > 0.8 ? 1.5 : 0.8;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(8,11,17,' + (0.18 + rand() * 0.22).toFixed(3) + ')';
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        /* The lit lip, offset 1px up: cut + highlight is what reads as a
           groove in metal rather than a drawn line. */
        ctx.strokeStyle = 'rgba(226,239,255,' + (0.06 + rand() * 0.12).toFixed(3) + ')';
        ctx.lineWidth = w * 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y - 0.9);
        ctx.lineTo(x + dx, y + dy - 0.9);
        ctx.stroke();
    }

    /* An impact dent: dark crescent with a bright bounce on the far rim. */
    function drawDent (ctx, rand) {
        var x = 14 + rand() * 228;
        var y = 14 + rand() * 228;
        var r = 4 + rand() * 13;
        var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
        g.addColorStop(0, 'rgba(6,9,14,0.26)');
        g.addColorStop(0.72, 'rgba(6,9,14,0.12)');
        g.addColorStop(1, 'rgba(6,9,14,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        /* Bounce light on the far rim — the second light source. Keep it faint:
           this is the highlight that makes a dent concave, and overdoing it
           turns the dent into a bubble. */
        ctx.strokeStyle = 'rgba(214,232,255,0.13)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.82, Math.PI * 0.15, Math.PI * 0.95);
        ctx.stroke();
    }

    /* Chipped paint: an irregular polygon of exposed metal.
       Deliberately LOW contrast. An earlier pass filled these at ~0.36 alpha
       and every plate looked speckled with bright confetti instead of worn;
       real chips are a subtle value shift plus a dark edge where the paint
       lifted. The dark lip does most of the work. */
    function drawChip (ctx, rand) {
        var cx = 12 + rand() * 232;
        var cy = 12 + rand() * 232;
        var r = 2.5 + rand() * 7;
        var pts = 5 + Math.floor(rand() * 4);
        var i, a, rr;
        ctx.beginPath();
        for (i = 0; i < pts; i++) {
            a = (i / pts) * Math.PI * 2;
            rr = r * (0.55 + rand() * 0.75);
            if (i === 0) { ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
            else { ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(150,168,192,' + (0.05 + rand() * 0.07).toFixed(3) + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(5,8,13,' + (0.20 + rand() * 0.16).toFixed(3) + ')';
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    /* Rust bloom: warm stain bleeding downward from a chip. */
    function drawRust (ctx, rand) {
        var x = rand() * 256;
        var y = rand() * 256;
        var w = 8 + rand() * 26;
        var h = 10 + rand() * 40;
        var g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, 'rgba(150,84,38,' + (0.16 + rand() * 0.16).toFixed(3) + ')');
        g.addColorStop(0.5, 'rgba(122,66,30,0.10)');
        g.addColorStop(1, 'rgba(96,52,24,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse
            ? ctx.ellipse(x, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
            : ctx.arc(x, y + h / 2, w / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /* Grease smear: broad, low-opacity dark wash. */
    function drawGrease (ctx, rand) {
        var x = rand() * 256;
        var y = rand() * 256;
        var w = 26 + rand() * 76;
        var h = 12 + rand() * 34;
        var g = ctx.createRadialGradient(x, y, 1, x, y, Math.max(w, h) / 2);
        g.addColorStop(0, 'rgba(4,7,12,0.26)');
        g.addColorStop(1, 'rgba(4,7,12,0)');
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rand() - 0.5) * 1.2);
        ctx.translate(-x, -y);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse
            ? ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2)
            : ctx.arc(x, y, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* One 256px tileable bruise sheet. `mix` weights the damage vocabulary
       so variant A is scuffed, B is battle-damaged, C is oil-stained. */
    function bakeWear (seed, mix) {
        var s = canvasOf(256);
        if (!s) { return null; }
        var ctx = s.ctx;
        var rand = rng(seed);
        var i;
        for (i = 0; i < mix.grease; i++) { drawGrease(ctx, rand); }
        for (i = 0; i < mix.rust; i++)   { drawRust(ctx, rand); }
        for (i = 0; i < mix.dents; i++)  { drawDent(ctx, rand); }
        for (i = 0; i < mix.chips; i++)  { drawChip(ctx, rand); }
        for (i = 0; i < mix.scratches; i++) { drawScratch(ctx, rand); }
        return s.canvas.toDataURL('image/png');
    }

    var TEXTURES = [
        { prop: '--mech-tex-brushed', make: bakeBrushed },
        { prop: '--mech-tex-grain',   make: bakeGrain },
        { prop: '--mech-tex-wear-a',  make: function () {
            return bakeWear(0xA11CE, { scratches: 46, chips: 5,  dents: 3, rust: 1, grease: 2 }); } },
        { prop: '--mech-tex-wear-b',  make: function () {
            return bakeWear(0xB0B, { scratches: 30, chips: 11, dents: 8, rust: 4, grease: 2 }); } },
        { prop: '--mech-tex-wear-c',  make: function () {
            return bakeWear(0xC0FFEE, { scratches: 22, chips: 4,  dents: 4, rust: 2, grease: 6 }); } }
    ];

    function bakeAll () {
        var root = doc.documentElement;
        var made = 0;
        var i, uri;
        for (i = 0; i < TEXTURES.length; i++) {
            try {
                uri = TEXTURES[i].make();
                if (uri && uri.indexOf('data:image') === 0) {
                    root.style.setProperty(TEXTURES[i].prop, 'url("' + uri + '")');
                    made++;
                }
            } catch (e) { /* fall back to the CSS default for this one */ }
        }
        return made;
    }

    /* ================================================================== *
     * 2. LAYER MOUNTING
     * ================================================================== */

    /* selector -> kind + which layers that kind gets.
       Order matters only for readability; CSS controls paint order. */
    var PLATES = [
        { sel: '.cyber-top-hud', kind: 'dash',    layers: 'face wear gloss rivets edge', serial: 'HUD-00' },
        { sel: 'text-box',       kind: 'console', layers: 'face wear gloss rivets edge' },
        { sel: 'main-menu button',                kind: 'plate', layers: 'face wear gloss edge' },
        { sel: 'choice-container button',         kind: 'plate', layers: 'face wear gloss edge' },
        { sel: '.hud-btn',       kind: 'chip',    layers: 'face gloss edge' },
        { sel: '.archives-panel', kind: 'housing', layers: 'face wear gloss edge', serial: 'ARC-11' },
        { sel: '.graph-panel',    kind: 'housing', layers: 'face wear gloss edge', serial: 'MAP-07' },
        { sel: 'save-slot',      kind: 'plate',   layers: 'face wear gloss edge' },
        { sel: '[data-screen]:not([data-screen="game"]) [data-action="back"]', kind: 'chip', layers: 'face gloss' }
    ];

    var WEAR_VARIANTS = ['a', 'b', 'c'];
    var SERIAL_BLOCKS = ['RSN', 'SEI', 'TSU', 'AKT', 'AQF'];
    var mountCount = 0;

    /* Stable per-element identity: same element always gets the same wear
       sheet, serial and animation phase, so nothing "reshuffles" on re-render. */
    function hashString (str) {
        var h = 2166136261;
        var i;
        for (i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0);
    }

    function identityFor (el, spec, index) {
        var key = spec.kind + '|' + (el.id || '') + '|' + (el.getAttribute('data-action') || '') +
            '|' + (el.getAttribute('data-choice') || '') + '|' + (el.textContent || '').slice(0, 24) +
            '|' + index;
        return hashString(key);
    }

    function makeLayer (name) {
        var el = doc.createElement('i');
        el.className = 'mech-l mech-l-' + name;
        el.setAttribute('aria-hidden', 'true');
        return el;
    }

    /* True when a previously skinned element still owns its layer stack.
       The engine re-renders several components by assigning innerHTML, which
       would silently strip the layers while leaving data-mech in place — the
       plate would then keep its rim but lose face, wear and gloss forever.
       Checking for a surviving .mech-l child makes mounting self-healing. */
    function isIntact (el) {
        var kids = el.children;
        var i;
        for (i = 0; i < kids.length; i++) {
            if (kids[i].className && String(kids[i].className).indexOf('mech-l') === 0) { return true; }
        }
        return false;
    }

    function mount (el, spec, index) {
        if (!el) { return false; }
        if (el.getAttribute('data-mech')) {
            if (isIntact(el)) { return false; }
            el.removeAttribute('data-mech');      /* fall through and re-skin */
        }
        var h = identityFor(el, spec, index);
        var names = spec.layers.split(' ');
        var frag = doc.createDocumentFragment();
        var i, layer, serial;

        for (i = 0; i < names.length; i++) {
            layer = makeLayer(names[i]);
            if (names[i] === 'wear') {
                /* NOTE: every shift here is UNSIGNED (>>>). `h >> 3` returns a
                   SIGNED int32, so for hashes above 2^31 the modulo went
                   negative and produced serials like "undefined--337". */
                layer.setAttribute('data-wear', WEAR_VARIANTS[h % WEAR_VARIANTS.length]);
                serial = spec.serial || (SERIAL_BLOCKS[(h >>> 3) % SERIAL_BLOCKS.length] + '-' +
                    (100 + ((h >>> 7) % 900)));
                layer.setAttribute('data-serial', serial);
            }
            frag.appendChild(layer);
        }

        el.setAttribute('data-mech', spec.kind);
        /* The layer stack needs a positioned host. Doing this in CSS cost us
           the HUD: `[data-mech]{position:relative}` outranked
           `.cyber-top-hud{position:absolute}` on load order and the dashboard
           fell out of its pinned corner. Only promote hosts that are actually
           static, and do it inline so an element that positions itself keeps
           whatever the layout rules gave it. */
        if (global.getComputedStyle) {
            try {
                if (global.getComputedStyle(el).position === 'static') {
                    el.style.position = 'relative';
                }
            } catch (e) { el.style.position = 'relative'; }
        }
        /* Phase spreads the specular sweep across elements. Must land in 0..1:
           a signed shift here yielded negative phases, which CSS clamps to 0
           and re-synchronised those plates into a visible lockstep blink. */
        el.style.setProperty('--mech-phase', (((h >>> 11) % 100) / 100).toFixed(2));
        /* Layers go FIRST so any existing children keep their source order. */
        if (el.firstChild) { el.insertBefore(frag, el.firstChild); } else { el.appendChild(frag); }
        mountCount++;
        return true;
    }

    /* NOTE: there is deliberately no padding compensation here. An absolutely
       positioned child resolves against its ancestor's PADDING box, which for
       these borderless plates equals the border box — `inset: 0` in the CSS
       already covers the whole plate. A previous revision "corrected" for
       padding and pushed every layer outside its plate. See the
       CONTAINING-BLOCK NOTE in mecha-ui.css before changing this. */

    /* Park the telemetry strip directly under the dashboard. The HUD's height
       is not knowable from CSS (it depends on the instrument rail, the font
       and whether the badges wrapped), so measure it. */
    function syncStripTop () {
        var hud = doc.querySelector('.cyber-top-hud');
        if (!hud || !hud.getBoundingClientRect) { return; }
        var r;
        try { r = hud.getBoundingClientRect(); } catch (e) { return; }
        if (!r || !r.height) { return; }
        doc.documentElement.style.setProperty('--mech-strip-top', Math.round(r.bottom + 6) + 'px');
    }

    function mountAll (root) {
        var scope = root || doc;
        var i, j, found;
        for (i = 0; i < PLATES.length; i++) {
            try {
                found = scope.querySelectorAll(PLATES[i].sel);
            } catch (e) { continue; }
            for (j = 0; j < found.length; j++) {
                try { mount(found[j], PLATES[i], j); } catch (e) { /* skip this node */ }
            }
        }
        return mountCount;
    }

    /* ================================================================== *
     * 3. INSTRUMENTS
     * ================================================================== */

    var GAUGES = [
        { k: 'res',  label: 'RES' },
        { k: 'pwr',  label: 'PWR' },
        { k: 'heat', label: 'HEAT' }
    ];

    var LEDS = [
        { state: 'ready',  label: 'RDY' },
        { state: 'active', label: 'ACT' },
        { state: 'alert',  label: 'ALR' }
    ];

    var TICKER = [
        '<b>SEIRIN NET</b> · RESONANCE GRID NOMINAL',
        'СЕТЬ ЦУКИМАТИ · <i>УЗЕЛ 04 СТАБИЛЕН</i>',
        '<b>SCRAP-TITAN 04</b> · HYDRAULICS 98% · COOLANT OK',
        'АКАТОМИ · ПАТРУЛЬНЫЙ КОНТУР · <i>СЛУШАЕТ</i>',
        '<b>AQUAFORGE</b> · COLLOID CORE SYNC 1.00',
        'МОТОЦИКЛ «СТРИЖ» · ДВИГАТЕЛЬ ХОЛОДНЫЙ',
        '<b>NIGHT SHIFT</b> · 2030.11.04 · 23:41 JST'
    ];

    var els = { rail: null, strip: null, gauges: {}, leds: {}, values: {} };

    function el (tag, cls, html) {
        var n = doc.createElement(tag);
        if (cls) { n.className = cls; }
        if (html !== undefined) { n.innerHTML = html; }
        return n;
    }

    function buildInstruments () {
        var hud = doc.querySelector('.cyber-top-hud');
        if (!hud || doc.querySelector('.hud-instruments')) { return; }

        var rail = el('div', 'hud-instruments');
        rail.setAttribute('aria-hidden', 'true');   /* decorative telemetry */

        var ledBox = el('div', 'mech-leds');
        var i, led, g, bar, fill, val, row;
        for (i = 0; i < LEDS.length; i++) {
            led = el('span', 'mech-led', LEDS[i].label);
            led.setAttribute('data-state', LEDS[i].state);
            ledBox.appendChild(led);
            els.leds[LEDS[i].state] = led;
        }
        rail.appendChild(ledBox);

        var gaugeBox = el('div', 'mech-gauges');
        for (i = 0; i < GAUGES.length; i++) {
            row = el('div', 'mech-gauge');
            row.setAttribute('data-k', GAUGES[i].k);
            g = el('span', 'mech-gauge-k', GAUGES[i].label);
            bar = el('span', 'mech-gauge-bar');
            fill = el('span', 'mech-gauge-fill');
            bar.appendChild(fill);
            val = el('span', 'mech-gauge-v', '0');
            row.appendChild(g);
            row.appendChild(bar);
            row.appendChild(val);
            gaugeBox.appendChild(row);
            els.gauges[GAUGES[i].k] = { row: row, fill: fill, val: val, last: -1 };
        }
        rail.appendChild(gaugeBox);
        rail.appendChild(el('div', 'mech-radar'));
        rail.appendChild(el('div', 'mech-serial', 'UNIT RGC-08'));

        /* Sits between the badges and the buttons, i.e. reads as the
           instrument cluster in the middle of a dashboard. */
        var groups = hud.querySelectorAll('.hud-group');
        if (groups.length >= 3) { hud.insertBefore(rail, groups[2]); }
        else { hud.appendChild(rail); }
        els.rail = rail;
    }

    function buildStrip () {
        if (doc.querySelector('.mech-strip')) { return; }
        var strip = el('div', 'mech-strip');
        strip.setAttribute('aria-hidden', 'true');
        var track = el('div', 'mech-strip-track');
        /* Duplicated content makes the -50% marquee loop seamless. */
        var once = '<span>' + TICKER.join('</span><span>') + '</span>';
        track.innerHTML = once + once;
        strip.appendChild(track);
        var host = doc.querySelector('.cyber-top-hud');
        if (host && host.parentNode) { host.parentNode.insertBefore(strip, host.nextSibling); }
        else { doc.body.appendChild(strip); }
        els.strip = strip;
    }

    function buildAtmosphere () {
        if (!doc.body) { return; }
        if (!doc.querySelector('.mech-ambient')) {
            var amb = el('div', 'mech-ambient');
            amb.setAttribute('aria-hidden', 'true');
            doc.body.appendChild(amb);
        }
        if (!doc.querySelector('.mech-beacon')) {
            var bcn = el('div', 'mech-beacon');
            bcn.setAttribute('aria-hidden', 'true');
            doc.body.appendChild(bcn);
        }
        if (!doc.querySelector('.mech-bootwipe')) {
            var wipe = el('div', 'mech-bootwipe');
            wipe.setAttribute('aria-hidden', 'true');
            doc.body.appendChild(wipe);
            global.setTimeout(function () {
                if (wipe.parentNode) { wipe.parentNode.removeChild(wipe); }
            }, 1600);
        }
    }

    function clamp (n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

    function setGauge (key, pct) {
        var g = els.gauges[key];
        if (!g) { return; }
        pct = clamp(Math.round(pct), 0, 100);
        if (g.last === pct) { return; }
        g.last = pct;
        g.fill.style.width = pct + '%';
        g.val.textContent = String(pct);
        /* retrigger the digit flash */
        g.val.className = 'mech-gauge-v';
        /* eslint-disable-next-line no-unused-expressions */
        g.val.offsetWidth;
        g.val.className = 'mech-gauge-v set';
        if (pct >= 70) { g.row.className = 'mech-gauge crit'; }
        else { g.row.className = 'mech-gauge'; }
        g.row.setAttribute('data-k', key);
    }

    /* Reads engine storage and drives every indicator. Read-only by design. */
    function refresh () {
        var p = null;
        try {
            if (global.engine && typeof global.engine.storage === 'function') {
                p = global.engine.storage('player');
            }
        } catch (e) { p = null; }
        if (!p) { p = {}; }

        var alert = clamp(Number(p.akatomi_alert) || 0, 0, 100);
        var affinity = (Number(p.miya_affinity) || 0) + (Number(p.momo_affinity) || 0) +
            (Number(p.ai_empathy) || 0);
        var depth = Number(p.philosophical_depth) || 0;
        var routed = p.route && p.route !== 'none';

        /* RES — resonance coupling: how connected Ren is to people/AI.
           PWR — rig readiness: baseline 62%, rises once a route commits.
           HEAT — Akatomi attention, the actual danger number. */
        setGauge('res', clamp(28 + affinity * 3.6 + depth * 1.1, 0, 100));
        setGauge('pwr', clamp(routed ? 74 + affinity * 1.2 : 62 + depth * 0.6, 0, 100));
        setGauge('heat', alert);

        doc.documentElement.style.setProperty('--mech-alert', (alert / 100).toFixed(3));

        var caution = alert >= 15 && alert < 40;
        var alarm = alert >= 40;
        var cls = doc.documentElement.className.replace(/\s*mech-(caution|alarm)\b/g, '');
        if (caution) { cls += ' mech-caution'; }
        if (alarm) { cls += ' mech-alarm'; }
        doc.documentElement.className = cls.replace(/^\s+/, '');

        if (els.leds.alert) {
            els.leds.alert.className = 'mech-led' + (alarm ? ' crit' : (alert > 0 ? '' : ' off'));
        }
        if (els.leds.active) {
            els.leds.active.className = 'mech-led' + (routed ? '' : ' off');
        }
        return { alert: alert, caution: caution, alarm: alarm };
    }

    /* ================================================================== *
     * 4. PARALLAX
     * ================================================================== */
    var pointerBound = false;
    var pending = false;
    var lastX = 0, lastY = 0;

    function applyPointer () {
        pending = false;
        var w = global.innerWidth || 1;
        var h = global.innerHeight || 1;
        var mx = clamp((lastX / w) * 2 - 1, -1, 1);
        var my = clamp((lastY / h) * 2 - 1, -1, 1);
        var st = doc.documentElement.style;
        st.setProperty('--mech-mx', mx.toFixed(3));
        st.setProperty('--mech-my', my.toFixed(3));
    }

    function onPointer (evt) {
        lastX = evt.clientX;
        lastY = evt.clientY;
        if (pending) { return; }
        pending = true;
        if (global.requestAnimationFrame) { global.requestAnimationFrame(applyPointer); }
        else { global.setTimeout(applyPointer, 32); }
    }

    function prefersReducedMotion () {
        try {
            return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { return false; }
    }

    function bindParallax () {
        if (pointerBound) { return; }
        if (prefersReducedMotion()) {
            doc.documentElement.style.setProperty('--mech-tilt', '0');
            return;
        }
        doc.addEventListener('mousemove', onPointer, true);
        pointerBound = true;
    }

    /* The dashboard's height changes at breakpoints, so the strip offset has
       to be re-measured when the viewport does. Debounced: resize storms are
       common on mobile (address-bar show/hide fires continuously). */
    var resizeTimer = null;
    function bindResize () {
        if (!global.addEventListener) { return; }
        global.addEventListener('resize', function () {
            if (resizeTimer) { global.clearTimeout(resizeTimer); }
            resizeTimer = global.setTimeout(function () {
                resizeTimer = null;
                try { syncStripTop(); } catch (e) { /* ignore */ }
            }, 160);
        }, false);
    }

    /* ================================================================== *
     * 5. BOOT
     * ================================================================== */
    var observer = null;
    var pollTimer = null;

    function observeDom () {
        if (observer || typeof global.MutationObserver !== 'function') { return; }
        var queued = null;
        observer = new global.MutationObserver(function () {
            if (queued) { return; }
            queued = global.setTimeout(function () {
                queued = null;
                try { mountAll(doc); } catch (e) { /* never break the page */ }
            }, 120);
        });
        try {
            observer.observe(doc.documentElement, { childList: true, subtree: true });
        } catch (e) { observer = null; }
    }

    function start () {
        try { bakeAll(); } catch (e) { /* CSS fallbacks cover this */ }
        try { buildAtmosphere(); } catch (e) { /* decorative only */ }
        try { buildInstruments(); } catch (e) { /* decorative only */ }
        try { buildStrip(); } catch (e) { /* decorative only */ }
        try { mountAll(doc); } catch (e) { /* decorative only */ }
        try { syncStripTop(); } catch (e) { /* decorative only */ }
        try { observeDom(); } catch (e) { /* decorative only */ }
        try { bindParallax(); } catch (e) { /* decorative only */ }
        try { bindResize(); } catch (e) { /* decorative only */ }
        try { refresh(); } catch (e) { /* decorative only */ }
        /* The engine has no "state changed" event we can rely on offline, and
           game.js already repaints the HUD on every mutation — a slow poll is
           the cheapest way to stay in sync without touching game state. */
        if (!pollTimer) {
            pollTimer = global.setInterval(function () {
                try { refresh(); } catch (e) { /* ignore */ }
            }, 900);
        }
    }

    if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start); }
    else { start(); }

    var MechaUI = {
        version: '1.0.0',
        start: start,
        refresh: refresh,
        mountAll: mountAll,
        syncStripTop: syncStripTop,
        bakeTextures: bakeAll,
        plates: PLATES,
        mounted: function () { return mountCount; },
        stop: function () {
            if (pollTimer) { global.clearInterval(pollTimer); pollTimer = null; }
            if (observer) { observer.disconnect(); observer = null; }
            if (pointerBound) { doc.removeEventListener('mousemove', onPointer, true); pointerBound = false; }
        }
    };

    global.MechaUI = MechaUI;
    if (typeof module !== 'undefined' && module.exports) { module.exports = MechaUI; }
}(typeof self !== 'undefined' ? self : this));
