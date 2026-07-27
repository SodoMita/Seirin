/* ============================================================================
 * THE LAST FREQUENCY — game code (engine glue + story compiler + HUD).
 * ----------------------------------------------------------------------------
 * Original work. The ENGINE CODE borrowed from the Cyber-Nexus example is
 * vendor/monogatari.js + vendor/failsafe.js + vendor/icons-offline.* (the
 * Monogatari engine, the zero-dependency FailSafe rollback facade, and the
 * offline icon shim). This file, the UI in index.html, and every word of the
 * story (vendor/story.js) are original — nothing was copied from that game's
 * presentation or script. See STORY_BIBLE.md §11 and README.md.
 *
 * PART 1 is a PURE compiler (no DOM, no engine globals): it turns the
 * declarative story data in vendor/story.js into Monogatari statements and
 * FailSafe.vn facade calls, so that EVERY state mutation is rollback-safe by
 * construction (snapshot/restore, never a bare function or an onChosen without
 * an onRevert). It is exported (UMD) so tests/story.test.mjs can drive it
 * with a stub vn/engine and assert the produced shapes — zero dependencies.
 *
 * PART 2 is the browser-only game: engine wiring, an original "midnight
 * broadcast" HUD (in-story clock, storm stage, signal-clarity bars), the
 * Watch-Log codex modal, and boot (storage-schema validation + script lint +
 * the no-fetch guard).
 *
 * Constraints (per repo AGENTS.md / monogatari-offline-vn skill):
 *   - ES5 browser JS, zero deps, zero build step; double-click index.html.
 *   - No fetch/XHR/beacon/socket — FailSafe.net.guard enforces it.
 *   - Container id is "vn-root", never "monogatari".
 * ========================================================================== */

/* ============================================================================
 * PART 1 — pure story compiler (UMD, testable).
 * ========================================================================== */
(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    if (root) { root.LFCompiler = api; }
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
    'use strict';

    /* Compare a player stat by operator. Unknown operator = truthy. */
    function cmp (value, op, target) {
        switch (op) {
            case '>=': return value >= target;
            case '<=': return value <= target;
            case '>':  return value >  target;
            case '<':  return value <  target;
            case '==': return value == target; /* eslint-disable-line eqeqeq */
            case '!=': return value != target; /* eslint-disable-line eqeqeq */
            default:   return !!value;
        }
    }

    /* One branch condition -> boolean. ['flag',name] or ['stat',name,op,val]. */
    function evalCond (engine, c) {
        if (c[0] === 'flag') {
            var f = engine.storage('flags');
            return !!(f && f[c[1]]);
        }
        var p = engine.storage('player');
        return cmp(p ? p[c[1]] : undefined, c[2], c[3]);
    }

    /* Compile one declarative step into a Monogatari statement / object. */
    function compileStep (s, vn, engine) {
        if (typeof s === 'string') { return s; }                       // raw statement or 'CHAR line'

        if (s.stat)  { return vn.reversible(s.stat); }                  // player deltas
        if (s.flag)  { return vn.reversible({ flags: s.flag }); }       // flag set (rollback-safe)
        if (s.go)    { return vn.goTo(s.go); }                          // location (HUD + rollback)
        if (s.clock) {                                                  // HUD clock (rollback-safe via storage set)
            return vn.reversible({ storage: { 'player.clock': { mode: 'set', value: s.clock } } });
        }

        if (s.branch) {                                                 // stat/flag gate, both arms guaranteed
            var conds = s.branch.all || [s.branch.if];
            var pred = function () {
                for (var i = 0; i < conds.length; i++) { if (!evalCond(engine, conds[i])) { return false; } }
                return true;
            };
            return vn.branch(pred, { 'True': s.branch['True'], 'False': s.branch['False'] });
        }

        if (s.choice) {                                                 // Choice with rollback-safe effects
            var choice = { 'Dialog': s.choice.Dialog };
            (s.choice.options || []).forEach(function (o, i) {
                var node = { 'Text': o.Text, 'Do': o.Do };
                var spec = {}, has = false;
                if (o.stat) { Object.keys(o.stat).forEach(function (k) { spec[k] = o.stat[k]; }); has = true; }
                if (o.flag) { spec.flags = o.flag; has = true; }
                if (has) {
                    var eff = vn.choiceEffect(spec);                    // {onChosen,onRevert}
                    node.onChosen = eff.onChosen; node.onRevert = eff.onRevert;
                }
                choice['opt' + i] = node;
            });
            return { 'Choice': choice };
        }

        if (s.inputName) {                                              // player-name input (closes over engine)
            return {
                'Input': {
                    'Text': 'Give the night operator a name for the watch log:',
                    'Validation': function (input) { return input.trim().length > 0; },
                    'Save': function (input) { engine.storage('player').name = input.trim(); return true; },
                    'Warning': 'The watch log needs a name — even a quiet one.'
                }
            };
        }

        return s;                                                       // unknown shape: pass through (lint will flag)
    }

    function compileStory (story, vn, engine) {
        var out = {};
        Object.keys(story.labels).forEach(function (label) {
            out[label] = story.labels[label].map(function (step) { return compileStep(step, vn, engine); });
        });
        return out;
    }

    return { compileStory: compileStory, compileStep: compileStep, evalCond: evalCond, cmp: cmp };
}));

/* ============================================================================
 * PART 2 — browser game: wiring, HUD, codex, boot. Skipped under Node.
 * ========================================================================== */
(function () {
    'use strict';
    if (typeof window === 'undefined' || typeof document === 'undefined') { return; }
    if (typeof Monogatari === 'undefined') { console.error('[LastFrequency] monogatari.js did not load.'); return; }
    var FS = window.FailSafe;
    if (!FS) { console.error('[LastFrequency] failsafe.js did not load.'); return; }

    var engine = Monogatari.default;
    window.engine = engine;
    var compiler = window.LFCompiler;
    var story = window.LFStory;

    /* No-fetch guard (observe in production, block in tests). */
    var netGuard = FS.net.guard({ mode: 'observe' });
    console.info('[LastFrequency] FailSafe v' + FS.VERSION +
        ' — offline guard ' + (netGuard ? 'active' : 'unavailable') + ': this page must never fetch.');

    /* ---- tiny DOM helpers (written fresh; not copied from any example) ---- */
    function el (id) { return document.getElementById(id); }
    function on (id, ev, fn) { var e = el(id); if (e) { e.addEventListener(ev, fn); } return e; }
    function qsa (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    /* ---- rollback-safe VN facade (snapshot-based; see failsafe-api.md) ----- */
    var vn = FS.vn(engine, { onChange: function () { try { updateHUD(); } catch (e) {} } });

    /* ---- storage schema (declared once; old/corrupt saves repaired) --------- */
    var SCHEMA = FS.schema.object({
        player: FS.schema.object({
            name:     FS.schema.string().default('Noa'),
            clarity:  FS.schema.number({ int: true, min: 0, max: 3 }).default(0),
            trust:    FS.schema.number({ int: true, min: 0, max: 3 }).default(0),
            clock:    FS.schema.string().default('22:00'),
            location: FS.schema.string().default('Meridian Point — Sea Road')
        }),
        flags: FS.schema.object({
            answered_signal:     FS.schema.boolean().default(false),
            went_archive:        FS.schema.boolean().default(false),
            went_rooftop:        FS.schema.boolean().default(false),
            read_log:            FS.schema.boolean().default(false),
            mira_computed_bearing: FS.schema.boolean().default(false),
            mira_confided:       FS.schema.boolean().default(false),
            names_read:          FS.schema.boolean().default(false),
            promise_names:       FS.schema.boolean().default(false),
            harlan_confessed:    FS.schema.boolean().default(false)
        })
    });

    /* ---- HUD: in-story clock, storm stage, signal-clarity bars ------------- */
    function stormStage (clock) {
        var m = (parseInt(clock.split(':')[0], 10) * 60) + parseInt(clock.split(':')[1], 10);
        if (m < 90)  { return { t: 'STORM I — leading edge', cls: 's1' }; }
        if (m < 153) { return { t: 'STORM II — front arriving', cls: 's2' }; }
        if (m < 307) { return { t: 'STORM III — resonance peak', cls: 's3' }; }
        if (m < 330) { return { t: 'FOLD CLOSED — 05:07', cls: 's4' }; }
        return { t: 'DAWN', cls: 's5' };
    }
    function signalLit (clock, clarity) {
        var m = (parseInt(clock.split(':')[0], 10) * 60) + parseInt(clock.split(':')[1], 10);
        var dial = m >= 153;                  // the Old Set wakes at 02:33
        return [dial, clarity >= 1, clarity >= 2];
    }
    function updateHUD () {
        var p = engine.storage('player'); if (!p) { return; }
        var c = el('hud-clock'), loc = el('hud-location'), storm = el('hud-storm');
        var bars = qsa('#hud-signal .bar');
        if (c) { c.textContent = p.clock; }
        if (loc) { loc.textContent = (p.location || '').toUpperCase(); }
        var st = stormStage(p.clock || '22:00');
        if (storm) { storm.className = 'storm ' + st.cls; storm.querySelector('span').textContent = st.t; }
        var lit = signalLit(p.clock || '22:00', p.clarity || 0);
        bars.forEach(function (b, i) { b.classList.toggle('on', !!lit[i]); });
        updateCodex();
    }
    window.updateHUD = updateHUD;

    /* ---- Watch-Log codex (original lore entries, unlocked by flags) -------- */
    var CODEX = [
        { id: 'mandate', title: 'The Mandate', flag: null, portrait: null,
          body: 'NO CALL GOES UNANSWERED HERE — painted on the corridor wall since the station was rebuilt after 1986. Six words the town has touched up every year, so the letters never fade.' },
        { id: 'cordelia', title: 'MV Cordelia, 1986', flag: null, portrait: 'elara_normal.png',
          body: 'A 63-metre research vessel out of Hachinohe. Fourteen souls aboard, lost in the resonance storm of 17–18 October 1986 within sight of the cape. No wreckage was ever found. The radio officer was Elara Vance.' },
        { id: 'oldset', title: 'The Old Set', flag: null, portrait: null,
          body: 'The 1951 tube receiver and transmitter on 1420 kHz, maritime band. The staff called it Grandmother. Disconnected from the antenna for six years — and yet, on the last night, it woke.' },
        { id: 'resonance', title: 'The Resonance Storm', flag: 'went_rooftop', portrait: null,
          body: 'A ~45-year electromagnetic pattern: solar weather meeting the magnetite in the cape. Folk name — the night the sea repeats itself. When it peaks, the Old Set can hear another year on the same frequency.' },
        { id: 'taro', title: 'Taro Okita', flag: 'read_log', portrait: 'jun_alert.png',
          body: 'Operator of record on the night of the Cordelia. Jun’s father. The watch log carries his grief in a clerk’s hand that stops being careful at 05:07. He never once spoke hard of the station.' },
        { id: 'bearing', title: 'Bearing 241', flag: 'mira_computed_bearing', portrait: 'mira_smile.png',
          body: 'The safe heading. The Cordelia ran 215 onto the Needle shelf; 241 clears it to starboard and finds the true Shiogara channel. Three degrees between living and a wall of names.' }
    ];
    function buildCodex () {
        var list = el('codex-list'); if (!list) { return; }
        list.innerHTML = '';
        CODEX.forEach(function (e) {
            var row = document.createElement('div');
            row.className = 'codex-row'; row.dataset.flag = e.flag || '';
            var img = e.portrait ? '<img class="codex-portrait" src="assets/characters/' + e.portrait + '" alt="">' : '<span class="codex-portrait dial"></span>';
            row.innerHTML = img + '<div class="codex-text"><h4>' + e.title + '</h4><p>' + e.body + '</p></div>';
            list.appendChild(row);
        });
    }
    function updateCodex () {
        var flags = engine.storage('flags') || {};
        qsa('.codex-row').forEach(function (row) {
            var f = row.dataset.flag;
            var unlocked = !f || !!flags[f];
            row.classList.toggle('locked', !unlocked);
            var p = row.querySelector('.codex-text p');
            if (p) { p.hidden = !unlocked; }
            var lock = row.querySelector('.codex-locked');
            if (!lock && !unlocked) {
                lock = document.createElement('p'); lock.className = 'codex-locked';
                lock.textContent = '[ not yet heard — keep the watch ]';
                row.querySelector('.codex-text').appendChild(lock);
            } else if (lock && unlocked) { lock.remove(); }
        });
        var n = CODEX.filter(function (e) { return !e.flag || flags[e.flag]; }).length;
        var badge = el('codex-count'); if (badge) { badge.textContent = n + '/' + CODEX.length; }
    }

    /* ---- modal wiring ------------------------------------------------------ */
    function toggleModal (id, force) {
        var m = el(id); if (!m) { return false; }
        var open = (typeof force === 'boolean') ? force : !m.classList.contains('active');
        m.classList.toggle('active', open);
        return open;
    }

    /* =====================================================================
       ENGINE CONFIGURATION — all local + relative (works from file://).
       ===================================================================== */
    engine.settings({
        'Name': 'The Last Frequency',
        'Version': '1.0.0',
        'Preload': false,
        'ServiceWorkers': false,
        'Screenshots': false,
        'AutoSave': 0,
        'AssetsPath': {
            'root': 'assets', 'characters': 'characters', 'scenes': 'scenes', 'images': 'characters',
            'icons': 'icons', 'music': 'music', 'sounds': 'sounds', 'ui': 'ui',
            'videos': 'videos', 'voices': 'voices', 'gallery': 'gallery'
        },
        'Storage': { 'Adapter': 'LocalStorage', 'Store': 'LastFrequency_Save' }
    });

    engine.preferences({ 'TextSpeed': 28, 'AutoPlaySpeed': 5, 'Volume': { 'Music': 0.6, 'Voice': 0.9, 'Sound': 0.7 } });

    engine.storage({
        player: { name: 'Noa', clarity: 0, trust: 0, clock: '22:00', location: 'Meridian Point — Sea Road' },
        flags: { answered_signal: false, went_archive: false, went_rooftop: false, read_log: false,
                 mira_computed_bearing: false, mira_confided: false, names_read: false,
                 promise_names: false, harlan_confessed: false }
    });

    engine.assets('scenes', {
        'title_exterior': 'title_exterior.jpg', 'watch_room': 'watch_room.jpg', 'archive': 'archive.jpg',
        'rooftop': 'rooftop.jpg', 'breakroom': 'breakroom.jpg', 'cliff_dawn': 'cliff_dawn.jpg'
    });
    engine.assets('images', { 'elara_hope': 'elara_hopeful.png' });     // luminous vision (Ending C)
    engine.assets('voices', {
        'prologue': 'prologue.mp3', 'signal': 'signal.mp3', 'mira_breathe': 'mira_breathe.mp3',
        'harlan_confession': 'harlan_confession.mp3', 'jun_heard': 'jun_heard.mp3',
        'elara_farewell': 'elara_farewell.mp3', 'ending_b_close': 'ending_b_close.mp3'
    });

    engine.characters({
        'mira':   { name: 'Mira',         color: '#c8813f', directory: '', sprites: { normal: 'mira_normal.png', smile: 'mira_smile.png', worried: 'mira_worried.png' } },
        'elara':  { name: 'Elara Vance',  color: '#c0a060', directory: '', sprites: { normal: 'elara_normal.png', sad: 'elara_sad.png', hopeful: 'elara_hopeful.png' } },
        'harlan': { name: 'Elias Harlan', color: '#9aa0a6', directory: '', sprites: { normal: 'harlan_normal.png', stern: 'harlan_stern.png' } },
        'jun':    { name: 'Jun Okita',    color: '#e8c832', directory: '', sprites: { smile: 'jun_smile.png', alert: 'jun_alert.png' } },
        'sys':    { name: 'STATION',      color: '#d8a24a' },
        'n':      { name: '',             color: '#cdd6e0' },
        'p':      { name: '{{player.name}}', color: '#e7d8b0' }
    });

    /* =====================================================================
       STORY SCRIPT — compiled from declarative data; every mutation routes
       through the vn facade so the Back button is correct by construction.
       vn.lintScript() (boot) machine-checks the rules.
       ===================================================================== */
    engine.script(compiler.compileStory(story, vn, engine));

    /* =====================================================================
       BOOT
       ===================================================================== */
    function boot () {
        var v = vn.validateStorage(SCHEMA, { repair: true });
        if (v.isErr()) { console.error('[FailSafe] storage schema unrecoverable:', v.error); }
        var lint = vn.lintScript();
        console.info('[FailSafe] script lint: ' + (lint.ok ? 'CLEAN' : lint.issues.length + ' issue(s)') +
            ' — rollback traps, dead jumps and non-reversible choices are build errors here.');

        buildCodex();

        on('btn-watchlog', 'click', function () { toggleModal('watchlog-modal'); }, 'watch-log button');
        qsa('[data-close]').forEach(function (b) { b.addEventListener('click', function () { toggleModal(b.dataset.close, false); }); });
        qsa('.lf-modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) { m.classList.remove('active'); } }); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { qsa('.lf-modal.active').forEach(function (m) { m.classList.remove('active'); }); } });

        engine.init('#vn-root').then(function () {
            console.log('The Last Frequency — fully offline: no server, no CDN, no fetch.');
            updateHUD();
        }).catch(function (err) { console.error('Monogatari init error:', err); });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
    else { boot(); }
}());
