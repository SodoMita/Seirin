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
    /* The ticker is the topmost band of the interface and the dashboard sits
       under it. Publish the ticker's measured height as --mech-hud-top so the
       dashboard clears it at any font scale (the UI-scale setting changes the
       ticker's height, so this cannot be a constant). */
    function syncStripTop () {
        var strip = doc.querySelector('.mech-strip');
        var h = 0;
        if (strip && strip.getBoundingClientRect) {
            try {
                var sr = strip.getBoundingClientRect();
                /* A hidden ticker reports 0; the dashboard then sits at the
                   normal inset instead of leaving a gap for nothing. */
                if (sr && sr.height && getComputedStyle(strip).display !== 'none') { h = sr.height; }
            } catch (e) { h = 0; }
        }
        doc.documentElement.style.setProperty('--mech-hud-top', Math.round(h + 8) + 'px');
    }

    /* The engine's quick-menu owns the bottom edge, and its height is not
       knowable from CSS: the caption row wraps to two lines on narrow screens.
       Publish the measured height so the text box, the build badge and the
       choice window can all clear it instead of printing over Back/Quit. */
    function syncQuickMenu () {
        var qm = doc.querySelector('quick-menu');
        if (!qm || !qm.getBoundingClientRect) { return; }
        var r;
        try { r = qm.getBoundingClientRect(); } catch (e) { return; }
        /* A hidden quick-menu (splash screen, distraction-free) reports 0 —
           fall back to the CSS default rather than collapsing the layout. */
        if (!r || !r.height) { return; }
        doc.documentElement.style.setProperty('--mech-qm-h', Math.round(r.height) + 'px');
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

    /* Drifting motes over the stage. Deterministic placement so the scene is
       reproducible; injected into game-screen so they sit above the backdrop
       but below the console. Skipped entirely under reduced motion. */
    function buildMotes () {
        var stage = doc.querySelector('game-screen');
        if (!stage || doc.querySelector('.mech-motes')) { return; }
        if (prefersReducedMotion()) { return; }
        var box = el('div', 'mech-motes');
        box.setAttribute('aria-hidden', 'true');
        var rand = rng(0x5EED10);
        var i, m;
        for (i = 0; i < 14; i++) {
            m = el('span', 'mech-mote' + (rand() > 0.62 ? ' warm' : ''));
            m.style.left = (rand() * 100).toFixed(2) + '%';
            m.style.animationDuration = (16 + rand() * 22).toFixed(1) + 's';
            m.style.animationDelay = '-' + (rand() * 24).toFixed(1) + 's';
            m.style.opacity = (0.35 + rand() * 0.5).toFixed(2);
            box.appendChild(m);
        }
        stage.appendChild(box);
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
                try { syncChoices(); } catch (e) { /* never break the page */ }
                        try { syncModalFlag(); } catch (e) { /* never break the page */ }
            }, 120);
        });
        try {
            observer.observe(doc.documentElement, { childList: true, subtree: true });
        } catch (e) { observer = null; }
    }

    /* ================================================================== *
     * 4b. CHOICE OVERFLOW INDICATOR
     * ------------------------------------------------------------------
     * The 8-way fork is taller than its scroll window: four plates were
     * invisible with nothing on screen saying so, so the fork read as a
     * 4-option fork and two whole routes were undiscoverable.
     *
     * Approach: the hint is a STICKY child appended inside the scroller
     * itself. Earlier attempts used (a) ::after on the container, which
     * scrolls away with the content, and (b) an absolutely positioned
     * wrapper, which measured 0px tall because the engine's container does
     * not contribute height to a wrapper it is positioned out of. A sticky
     * element is laid out in normal flow at the end of the list but paints
     * pinned to the bottom edge of the visible window — no geometry
     * duplication, and it cannot desync from the container's real box.
     * ================================================================== */

    /* The badge lives OUTSIDE the scroller, in the empty gap between the last
       visible plate and the dialogue console (measured ~90px at 1440x810).
       Both earlier attempts printed over a choice label: ::after and a sticky
       footer are pinned to the bottom EDGE of the scrollport, which is exactly
       where the next option is being clipped. Sitting below the list, the
       badge can never cover text, and it doubles as a visual full-stop for
       where the list ends. */
    function ensureHint () {
        var hint = doc.querySelector('.mech-scroll-hint');
        if (hint) { return hint; }
        var stage = doc.querySelector('game-screen');
        if (!stage) { return null; }
        hint = doc.createElement('div');
        hint.className = 'mech-scroll-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.setAttribute('data-more', '0');
        stage.appendChild(hint);
        return hint;
    }

    function updateChoiceHint (container) {
        if (!container) { return; }
        var hint = ensureHint();
        if (!hint) { return; }
        var over = container.scrollHeight > container.clientHeight + 8;
        var atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 14;
        if (container.classList) {
            if (over) { container.classList.add('has-overflow'); }
            else { container.classList.remove('has-overflow'); }
        }
        if (!over) { hint.className = 'mech-scroll-hint'; return; }

        var btns = container.querySelectorAll('button');
        var cRect = container.getBoundingClientRect();
        var hidden = 0, i, r;
        for (i = 0; i < btns.length; i++) {
            r = btns[i].getBoundingClientRect();
            if (r.bottom > cRect.bottom + 2) { hidden++; }
        }
        hint.setAttribute('data-more', String(hidden));
        /* Park it just under the list, horizontally centred on it. */
        var stage = doc.querySelector('game-screen');
        var sRect = stage ? stage.getBoundingClientRect() : { left: 0, top: 0 };
        hint.style.left = Math.round(cRect.left - sRect.left + cRect.width / 2) + 'px';
        hint.style.top = Math.round(cRect.bottom - sRect.top + 8) + 'px';
        hint.className = 'mech-scroll-hint' + (hidden > 0 && !atBottom ? ' show' : '');
    }

    /* ================================================================== *
     * 4c. SLIDER FILL
     * ------------------------------------------------------------------
     * Firefox draws the filled portion of a range with ::-moz-range-progress,
     * but WebKit/Blink has no equivalent — the track is uniformly unlit and a
     * player cannot see at a glance how loud "loud" is. The fill is therefore
     * painted as a background gradient sized to the value and refreshed on
     * input, which works in every engine.
     * ================================================================== */
    function paintSlider (input) {
        var min = parseFloat(input.min || '0');
        var max = parseFloat(input.max || '100');
        var val = parseFloat(input.value || '0');
        var pct = (max > min) ? ((val - min) / (max - min)) * 100 : 0;
        if (pct < 0) { pct = 0; } else if (pct > 100) { pct = 100; }
        input.style.setProperty('--mech-fill', pct.toFixed(2) + '%');
    }

    function bindSliders () {
        var inputs = doc.querySelectorAll('settings-screen input[type="range"]');
        var i;
        for (i = 0; i < inputs.length; i++) {
            if (!inputs[i].__mechBound) {
                inputs[i].__mechBound = true;
                /* Named function so both events share one handler instance. */
                inputs[i].addEventListener('input', function (e) { paintSlider(e.target); }, false);
                inputs[i].addEventListener('change', function (e) { paintSlider(e.target); }, false);
            }
            paintSlider(inputs[i]);
        }
    }

    /* ================================================================== *
     * 4d. FIRST-PARTY ICON GUARD
     * ------------------------------------------------------------------
     * Font Awesome's JS replaces every <i class="fas fa-x"> with an
     * <svg class="svg-inline--fa fa-x">, which drops the .fas class our
     * mask rules key on — the HUD buttons fell back to the icon shim's
     * Unicode glyph (the graph modal's close button rendered a stray "х").
     * Re-tag the replacement with .mech-icon and the original fa-* name so
     * the CSS mask applies to whichever form is in the DOM.
     * ================================================================== */
    function retagIcons () {
        var scopes = doc.querySelectorAll('.cyber-top-hud, .archives-head, .graph-head, .hud-btn');
        var i, svgs, j, svg, cls, m;
        for (i = 0; i < scopes.length; i++) {
            svgs = scopes[i].querySelectorAll('svg.svg-inline--fa');
            for (j = 0; j < svgs.length; j++) {
                svg = svgs[j];
                if (svg.__mechTagged) { continue; }
                svg.__mechTagged = true;
                cls = svg.getAttribute('class') || '';
                m = cls.match(/fa-[a-z0-9-]+/);
                if (!m) { continue; }
                /* Insert a span carrying the mask, and hide the SVG via CSS. */
                var span = doc.createElement('span');
                span.className = 'mech-icon ' + m[0];
                span.setAttribute('aria-hidden', 'true');
                if (svg.parentNode) { svg.parentNode.insertBefore(span, svg); }
            }
        }
    }

    /* ================================================================== *
     * 4e. HISTORY LOG — click a line to rewind to it (Ren'Py style)
     * ------------------------------------------------------------------
     * The engine's <dialog-log> is display-only. Rows are appended in
     * play order, so the Nth row from the END is N rollbacks away.
     *
     * Rewinding uses engine.rollback() in a chain rather than a jump: every
     * step reversal runs the action's own revert (and therefore FailSafe's
     * onRevert for stat changes), so affinities, flags and the alert level
     * unwind exactly as the Back button would. A jump would teleport the
     * cursor and leave the stats where they were — silently corrupting a
     * playthrough, which is far worse than not offering the feature.
     *
     * Rows are only made clickable while the log is open and the game is
     * actually playing.
     * ================================================================== */
    var rewinding = false;

    function rewindSteps (count) {
        if (rewinding || count <= 0) { return; }
        if (!global.engine || typeof global.engine.rollback !== 'function') { return; }
        rewinding = true;
        var left = count;
        var step = function () {
            if (left <= 0) {
                rewinding = false;
                /* Close the log so the player sees where they landed. */
                try {
                    var dl = doc.querySelector('dialog-log');
                    if (dl && dl.setState) { dl.setState({ active: false }); }
                    else if (dl && dl.classList) { dl.classList.remove('modal--active'); }
                } catch (e) { /* leave it open rather than throw */ }
                return;
            }
            left--;
            var r;
            try { r = global.engine.rollback(); } catch (e) { rewinding = false; return; }
            Promise.resolve(r).then(function () {
                global.setTimeout(step, 40);
            }).catch(function () { rewinding = false; });
        };
        step();
    }

    function tagLogRows () {
        var log = doc.querySelector('dialog-log [data-content="log"]');
        if (!log) { return; }
        var rows = log.querySelectorAll('[data-spoke]');
        var total = rows.length;
        var playing = false;
        try { playing = !!(global.engine && global.engine.global('playing')); } catch (e) { playing = false; }
        var i, row, back;
        for (i = 0; i < total; i++) {
            row = rows[i];
            /* Distance from the newest line: the last row is "here" (0). */
            back = total - 1 - i;
            if (!playing || back <= 0) {
                row.removeAttribute('data-log-jump');
                row.removeAttribute('tabindex');
                row.removeAttribute('role');
                continue;
            }
            row.setAttribute('data-log-jump', String(back));
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('title', 'Вернуться к этой реплике (−' + back + ')');
        }
        if (!log.__mechLogBound) {
            log.__mechLogBound = true;
            log.addEventListener('click', function (evt) {
                var el = evt.target;
                while (el && el !== log) {
                    if (el.getAttribute && el.getAttribute('data-log-jump')) {
                        rewindSteps(parseInt(el.getAttribute('data-log-jump'), 10) || 0);
                        return;
                    }
                    el = el.parentNode;
                }
            }, false);
            log.addEventListener('keydown', function (evt) {
                var key = evt.key;
                if (key !== 'Enter' && key !== ' ' && evt.keyCode !== 13 && evt.keyCode !== 32) { return; }
                var el = evt.target;
                if (el && el.getAttribute && el.getAttribute('data-log-jump')) {
                    evt.preventDefault();
                    rewindSteps(parseInt(el.getAttribute('data-log-jump'), 10) || 0);
                }
            }, false);
        }
        /* One-line explanation of the affordance, above the entries. */
        var content = doc.querySelector('dialog-log .modal__content');
        if (content && playing && total > 1 && !content.querySelector('.mech-log-hint')) {
            var hint = el('p', 'mech-log-hint', 'НАЖМИТЕ НА РЕПЛИКУ, ЧТОБЫ ВЕРНУТЬСЯ К НЕЙ');
            content.insertBefore(hint, content.firstChild);
        }
    }

    /* ================================================================== *
     * 4f. UI SCALE ("нет в настройках выбора dpi")
     * ------------------------------------------------------------------
     * The engine ships a Resolution control, but it is Electron-only: its
     * settings screen calls it from electron() and a browser build never
     * renders it. On a phone the whole interface is therefore locked to the
     * device's own DPI, which is why the HUD feels oversized in landscape.
     *
     * This adds a real, browser-native control: a scale factor applied as
     * font-size on the root, so every rem-based measurement in the theme
     * follows it. The value persists in localStorage (already the engine's
     * storage backend, so no new dependency and no network).
     * ================================================================== */
    var SCALE_KEY = 'SeirinGame_UIScale';
    var SCALE_MIN = 60;      /* percent */
    var SCALE_MAX = 160;
    var SCALE_STEP = 5;

    function readScale () {
        var raw = null;
        try { raw = global.localStorage ? global.localStorage.getItem(SCALE_KEY) : null; } catch (e) { raw = null; }
        var n = parseFloat(raw);
        if (!n || n < SCALE_MIN / 100 || n > SCALE_MAX / 100) { return 1; }
        return n;
    }

    function applyScale (n) {
        /* 100% == 16px, the browser default the theme was designed against. */
        doc.documentElement.style.fontSize = (16 * n).toFixed(3) + 'px';
        try { if (global.localStorage) { global.localStorage.setItem(SCALE_KEY, String(n)); } } catch (e) { /* private mode */ }
        /* Every chrome measurement is in rem, so re-measure after a change. */
        try { syncStripTop(); syncQuickMenu(); } catch (e) { /* ignore */ }
    }

    /* Numeric UI-scale control: a percentage readout with −/+ steppers and a
       slider, replacing the five preset buttons. The user asked to set the
       value as a NUMBER rather than picking a named size. */
    function buildScaleControl () {
        var screen = doc.querySelector('settings-screen');
        if (!screen || doc.querySelector('.mech-scale')) { return; }
        var host = screen.querySelector('[data-content="auto-play-speed-controller"]');
        if (!host) { host = screen.querySelector('[data-settings="audio"]'); }
        if (!host || !host.parentNode) { return; }

        var pct = Math.round(readScale() * 100);
        var box = el('div', 'mech-scale');
        box.setAttribute('data-settings', 'scale');
        box.innerHTML =
            '<h3>МАСШТАБ ИНТЕРФЕЙСА</h3>' +
            '<div class="mech-scale-row">' +
              '<button type="button" class="mech-scale-step" data-step="-' + SCALE_STEP + '" aria-label="Уменьшить">&minus;</button>' +
              '<div class="mech-scale-readout"><span class="mech-scale-value">' + pct + '</span><span class="mech-scale-unit">%</span></div>' +
              '<button type="button" class="mech-scale-step" data-step="' + SCALE_STEP + '" aria-label="Увеличить">+</button>' +
              '<button type="button" class="mech-scale-reset" data-reset="1">СБРОС</button>' +
            '</div>' +
            '<input type="range" class="mech-scale-range" min="' + SCALE_MIN + '" max="' + SCALE_MAX +
              '" step="' + SCALE_STEP + '" value="' + pct + '" aria-label="Масштаб интерфейса">' +
            '<p class="mech-scale-note">' + SCALE_MIN + '\u2013' + SCALE_MAX +
              '%. Меняет размер всего интерфейса — полезно на телефоне в горизонтальном режиме.</p>';
        host.parentNode.insertBefore(box, host.nextSibling);

        var readout = box.querySelector('.mech-scale-value');
        var range = box.querySelector('.mech-scale-range');

        function setPct (v) {
            v = Math.round(v / SCALE_STEP) * SCALE_STEP;
            if (v < SCALE_MIN) { v = SCALE_MIN; }
            if (v > SCALE_MAX) { v = SCALE_MAX; }
            readout.textContent = String(v);
            if (range.value !== String(v)) { range.value = String(v); }
            paintSlider(range);
            applyScale(v / 100);
            /* Flash the number so a stepper press is visibly acknowledged. */
            readout.className = 'mech-scale-value';
            /* eslint-disable-next-line no-unused-expressions */
            readout.offsetWidth;
            readout.className = 'mech-scale-value set';
        }

        box.addEventListener('click', function (evt) {
            var t = evt.target;
            while (t && t !== box && !(t.getAttribute &&
                (t.getAttribute('data-step') || t.getAttribute('data-reset')))) { t = t.parentNode; }
            if (!t || t === box) { return; }
            if (t.getAttribute('data-reset')) { setPct(100); return; }
            setPct(parseInt(readout.textContent, 10) + parseInt(t.getAttribute('data-step'), 10));
        }, false);
        range.addEventListener('input', function () { setPct(parseInt(range.value, 10)); }, false);
        paintSlider(range);
    }

    /* NOTE: there is deliberately no speaker-plate code here any more.
       The nameplate used to be mirrored into a sibling element and positioned
       from JS every frame-ish, which the user correctly spotted as "выглядит
       будто имя перемещается скриптом" — it lagged a frame behind the line.
       It is now pure CSS: <text-box> is a transparent container and the
       console plating lives on [data-content="text"], so the engine's own
       name row is simply the list item above the background. See the SPEAKER
       NAMEPLATE block in mecha-ui.css. */

    /* ================================================================== *
     * 4h. MODAL-OPEN FLAG (performance)
     * ------------------------------------------------------------------
     * Measured: the route atlas scrolled at 6 fps because 73 CSS animations
     * kept running on the page behind it, all invisible, all still being
     * re-sampled by the overlay's backdrop-filter every frame.
     *
     * Setting one class on <html> lets the stylesheet pause that work while
     * any overlay is up (see section 27). Cheap to compute, and it also
     * covers the archives modal and the engine's own dialog-log / alert.
     * ================================================================== */
    function syncModalFlag () {
        var open = false;
        var i, el2, ov;
        var overlays = ['#graph-overlay', '#archives-overlay'];
        for (i = 0; i < overlays.length; i++) {
            ov = doc.querySelector(overlays[i]);
            if (ov && !ov.hidden) { open = true; break; }
        }
        if (!open) {
            /* Engine modals mark themselves with .modal--active. */
            el2 = doc.querySelector('dialog-log.modal--active, alert-modal.modal--active, message-modal.modal--active');
            if (el2) { open = true; }
        }
        var root = doc.documentElement;
        var has = root.className.indexOf('mech-modal-open') !== -1;
        if (open && !has) { root.className = root.className + ' mech-modal-open'; }
        else if (!open && has) {
            root.className = root.className.replace(/\s*mech-modal-open\b/g, '');
        }
    }

    function syncChoices () {
        var c = doc.querySelector('choice-container');
        var hint;
        if (!c) {
            hint = doc.querySelector('.mech-scroll-hint');
            if (hint) { hint.className = 'mech-scroll-hint'; }
            return;
        }
        if (!c.__mechScrollBound) {
            c.__mechScrollBound = true;
            c.addEventListener('scroll', function () { updateChoiceHint(c); }, false);
        }
        updateChoiceHint(c);
    }

    function start () {
        /* Restore the saved UI scale before anything measures the layout. */
        try { applyScale(readScale()); } catch (e) { /* default 16px */ }
        try { bakeAll(); } catch (e) { /* CSS fallbacks cover this */ }
        try { buildAtmosphere(); } catch (e) { /* decorative only */ }
        try { buildInstruments(); } catch (e) { /* decorative only */ }
        try { buildStrip(); } catch (e) { /* decorative only */ }
        try { mountAll(doc); } catch (e) { /* decorative only */ }
        try { syncStripTop(); } catch (e) { /* decorative only */ }
        try { syncQuickMenu(); } catch (e) { /* decorative only */ }
        try { tagLogRows(); } catch (e) { /* decorative only */ }
        try { buildScaleControl(); } catch (e) { /* decorative only */ }
        try { syncModalFlag(); } catch (e) { /* decorative only */ }
        try { observeDom(); } catch (e) { /* decorative only */ }
        try { bindParallax(); } catch (e) { /* decorative only */ }
        try { bindResize(); } catch (e) { /* decorative only */ }
        try { refresh(); } catch (e) { /* decorative only */ }
        try { syncChoices(); } catch (e) { /* decorative only */ }
        try { buildMotes(); } catch (e) { /* decorative only */ }
        try { bindSliders(); } catch (e) { /* decorative only */ }
        try { retagIcons(); } catch (e) { /* decorative only */ }
        /* The engine has no "state changed" event we can rely on offline, and
           game.js already repaints the HUD on every mutation — a slow poll is
           the cheapest way to stay in sync without touching game state. */
        if (!pollTimer) {
            pollTimer = global.setInterval(function () {
                try { refresh(); } catch (e) { /* ignore */ }
                try { syncChoices(); } catch (e) { /* ignore */ }
                try { buildMotes(); } catch (e) { /* ignore */ }
                try { bindSliders(); } catch (e) { /* ignore */ }
                try { retagIcons(); } catch (e) { /* ignore */ }
                try { syncQuickMenu(); } catch (e) { /* ignore */ }
                try { tagLogRows(); } catch (e) { /* ignore */ }
                try { buildScaleControl(); } catch (e) { /* ignore */ }
                try { syncModalFlag(); } catch (e) { /* ignore */ }
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
        syncChoices: syncChoices,
        bindSliders: bindSliders,
        retagIcons: retagIcons,
        syncStripTop: syncStripTop,
        syncQuickMenu: syncQuickMenu,
        tagLogRows: tagLogRows,
        syncModalFlag: syncModalFlag,
        applyScale: applyScale,
        readScale: readScale,
        rewindSteps: rewindSteps,
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
