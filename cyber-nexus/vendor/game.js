/* ============================================================================
 * Cyber-Nexus: The Static Singularity — game code.
 * ----------------------------------------------------------------------------
 * Extracted verbatim from the inline <script> block that used to live in
 * index.html (653 lines of it), so that this code can be linted, unit-tested
 * and opened in an editor that understands JavaScript. Nothing about it
 * changed in the move: same IIFE, same order, same comments.
 *
 * Loaded by index.html with a plain <script src="vendor/game.js"></script>,
 * AFTER vendor/failsafe.js, vendor/monogatari.js and vendor/icons-offline.js —
 * it reads `Monogatari.default`, `window.FailSafe` and `window.IconsOffline`
 * at boot.
 *
 * Constraints (same as every other shipped file here — see AGENTS.md):
 *   - ES5-compatible browser JS. No import/export, no const/let/arrow/class.
 *   - Zero dependencies, zero build step: index.html is opened by
 *     double-clicking it from disk.
 *   - No fetch/XHR/beacon/socket, ever. FailSafe.net.guard() enforces it.
 *   - All story-state mutation goes through the FailSafe.vn facade.
 *
 * Testing hook: at the very bottom, under `typeof module !== 'undefined'`,
 * the pure helpers are exported for `node --test` (same UMD pattern as
 * vendor/failsafe.js). The browser never takes that path.
 * ========================================================================== */
/* ============================================================================
 * PART 1 — the pure core (no DOM, no engine, no globals).
 * ----------------------------------------------------------------------------
 * Everything here is a plain function of its arguments, so `node --test` can
 * exercise it with zero dependencies — no jsdom, no browser. The browser IIFE
 * in PART 2 below is the only consumer at runtime; keeping the two apart is
 * what makes the mini-game payout rules testable at all.
 *
 * Exposed as `window.CyberNexusCore` in the browser and, under Node, as
 * `module.exports` — the same UMD pattern vendor/failsafe.js uses. There is no
 * import/export syntax and the browser path is unchanged by the Node branch.
 * ========================================================================== */
(function (root, factory) {
    'use strict';
    var core = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = core; }
    if (root) { root.CyberNexusCore = core; }
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
    'use strict';

    /* The storage shape is declared ONCE, here, and validated before the game
       ever reads it — a corrupted/old save is repaired from defaults and
       reported, not crashed on mid-dialogue. Built from the FailSafe schema
       primitives, which are passed in so this stays dependency-free. */
    function buildStorageSchema (FS) {
        return FS.schema.object({
            player: FS.schema.object({
                name:     FS.schema.string().default('Vesper'),
                creds:    FS.schema.number().default(0),
                karma:    FS.schema.number().default(0),
                hacking:  FS.schema.number({ int: true, min: 0 }).default(0),
                location: FS.schema.string().default('Sector 7: Neon Slums')
            }),
            flags: FS.schema.object({
                met_nyx:         FS.schema.boolean().default(false),
                hacked_vanguard: FS.schema.boolean().default(false),
                sided_with_aria: FS.schema.boolean().default(false),
                vanguard_alert:  FS.schema.number().default(0)
            })
        });
    }

    /* FAILSAFE 2: the mini-game round flow is a state machine.
       Before this, clicking the correct node a second time inside the 1.3s
       success window PAID OUT TWICE, because `checkHack` trusted the click,
       not the round state. Impossible transitions are now impossible to pay
       out — the machine simply refuses them (changed === false). */
    var HACK_MACHINE_CONFIG = {
        id: 'matrix-hack', initial: 'idle',
        states: {
            idle:     { on: { START: 'active' } },
            active:   { on: { HIT: 'resolved', MISS: 'cooldown' } },
            cooldown: { on: { REGEN: 'active', START: 'active' } },
            resolved: { on: { START: 'active', REGEN: 'active' } }
        }
    };

    /* The payout for one win. Named so the test and the UI string can't drift. */
    var HACK_REWARD = { creds: 100, hacking: 1 };

    /* A hex key like "0x4A-1F-C3". `random` is injectable purely so tests can
       be deterministic; the game always uses Math.random. */
    function randomHex (random) {
        var rand = random || Math.random;
        var chars = '0123456789ABCDEF';
        var parts = [];
        for (var i = 0; i < 3; i++) {
            parts.push(chars[Math.floor(rand() * 16)] + chars[Math.floor(rand() * 16)]);
        }
        return '0x' + parts.join('-');
    }

    /* Build the 4 round options: the target plus 3 distinct decoys, shuffled.
       Bounded so a bad `random` can never hang the game. */
    function buildRoundOptions (target, random) {
        var rand = random || Math.random;
        var opts = [target];
        var guard = 0;
        while (opts.length < 4 && guard++ < 1000) {
            var candidate = randomHex(rand);
            if (opts.indexOf(candidate) === -1) { opts.push(candidate); }
        }
        // Deterministic top-up if `random` is degenerate (all decoys collided).
        while (opts.length < 4) { opts.push('0x00-00-0' + opts.length); }
        opts.sort(function () { return rand() - 0.5; });
        return opts;
    }

    /* The mini-game brain: owns round state and decides what a click is worth.
       Holds NO DOM references — PART 2 renders whatever this returns. */
    function createHackController (FS, options) {
        options = options || {};
        var machine = FS.machine(HACK_MACHINE_CONFIG);
        var state = 'idle';
        var target = '';
        var random = options.random || Math.random;

        /* Returns true only if the transition was legal and actually happened;
           `false` means the machine refused it (this is the payout gate). */
        function send (type) {
            var step = machine.transition(state, type);
            if (!step.changed) { return false; }
            state = step.state;
            return true;
        }

        return {
            state: function () { return state; },
            target: function () { return target; },
            reward: HACK_REWARD,
            send: send,
            /* Begin a round. Mirrors the original `hackSend('START') ||
               hackSend('REGEN')`: reach 'active' from whatever state allows it. */
            startRound: function (forcedTarget) {
                send('START') || send('REGEN');
                target = forcedTarget || randomHex(random);
                return { target: target, options: buildRoundOptions(target, random) };
            },
            /* Resolve one click. The machine, not the click, decides whether a
               guess counts — so a second click inside the success window
               returns { counted: false } and pays nothing. */
            guess: function (selected) {
                if (state !== 'active') { return { counted: false, outcome: null, reward: null }; }
                // Exhaustive-by-construction outcome resolution (ts-pattern style).
                var outcome = FS.match(selected === target)
                    .with(true, function () { return 'HIT'; })
                    .otherwise(function () { return 'MISS'; });
                if (outcome === 'HIT' && send('HIT')) {
                    return { counted: true, outcome: 'HIT', reward: HACK_REWARD };
                }
                if (outcome === 'MISS' && send('MISS')) {
                    return { counted: true, outcome: 'MISS', reward: null };
                }
                return { counted: false, outcome: outcome, reward: null };
            }
        };
    }

    /* Apply a payout to a player object. Numbers add, everything else is set.
       Deliberately OUTSIDE the story timeline: mini-game wins are
       meta-progression, not story steps, so they must NOT be reverted by the
       Back button. Story mutations use the vn.* facade instead. */
    function applyAward (playerObject, changes) {
        if (!playerObject || !changes) { return playerObject; }
        Object.keys(changes).forEach(function (k) {
            if (typeof playerObject[k] === 'number') { playerObject[k] += changes[k]; }
            else { playerObject[k] = changes[k]; }
        });
        return playerObject;
    }

    return {
        buildStorageSchema: buildStorageSchema,
        HACK_MACHINE_CONFIG: HACK_MACHINE_CONFIG,
        HACK_REWARD: HACK_REWARD,
        randomHex: randomHex,
        buildRoundOptions: buildRoundOptions,
        createHackController: createHackController,
        applyAward: applyAward
    };
}));

/* ============================================================================
 * PART 2 — the browser game: engine wiring, HUD, codex, story script, boot.
 * Runs only in the page; under Node this whole IIFE is skipped (there is no
 * `window`), which is what lets tests require() this file for PART 1 alone.
 * ========================================================================== */
(function () {
    'use strict';

    // Under Node (tests) there is no DOM and no engine — PART 1 above is all
    // that is wanted. Bail out before touching any browser global.
    if (typeof window === 'undefined' || typeof document === 'undefined') { return; }
    if (typeof Monogatari === 'undefined') {
        console.error('[Cyber-Nexus] vendor/monogatari.js did not load; aborting boot.');
        return;
    }

    var core = window.CyberNexusCore;

    // The engine instance. Exposed deliberately as `window.engine`
    // (NOT `window.monogatari`, which the DOM would hijack).
    var engine = Monogatari.default;
    window.engine = engine;

    // Failsafe abstraction layer. If it didn't load we are running a
    // broken build — better to say so than to boot half-protected.
    var FS = window.FailSafe;
    if (!FS) {
        console.error('[Cyber-Nexus] vendor/failsafe.js did not load; aborting boot.');
        return;
    }

    /* -----------------------------------------------------
       FAILSAFE 0: no-fetch guard.
       This page ships as a no-server artifact: any runtime
       fetch/XHR/beacon/socket is a BUG, not a feature. Guard
       starts before the engine loads so regressions are loud.
       'observe' logs (production-safe); flip to 'block' in
       tests to hard-fail network attempts.
       ----------------------------------------------------- */
    var netGuard = FS.net.guard({ mode: 'observe' });
    console.info('[Cyber-Nexus] FailSafe v' + FS.VERSION +
        ' online — offline guard ' + (netGuard ? 'active' : 'unavailable') +
        ': this page must never fetch.');

    /* =====================================================
       HUD helpers
       ===================================================== */
    function player () {
        try { return engine.storage('player'); } catch (e) { return null; }
    }

    function setLocation (text) {
        var el = document.getElementById('hud-location');
        if (el) { el.innerHTML = '<i class="fas fa-map-marker-alt"></i><span>' + text + '</span>'; }
    }

    function updateHUD () {
        var p = player();
        if (!p) { return; }
        var creds = document.getElementById('hud-creds');
        var hack  = document.getElementById('hud-hack');
        if (creds) { creds.innerHTML = '<i class="fas fa-coins"></i><span>' + p.creds.toLocaleString('en-US') + ' CR</span>'; }
        if (hack)  { hack.innerHTML  = '<i class="fas fa-terminal"></i><span>HACK: LVL ' + p.hacking + '</span>'; }
        if (p.location) { setLocation(p.location.toUpperCase()); }
    }
    window.updateHUD = updateHUD;

    /* =====================================================
       FAILSAFE VN facade (vendor/failsafe.js)
       -----------------------------------------------------
       All in-script state mutation goes through `vn`, which
       snapshots previous values at Apply-time and restores
       them at Revert-time. Rollback is correct BY CONSTRUCTION:
       no hand-written inverse (subtract-the-delta / NOT-the-flag)
       that silently corrupts state when a flag was already set.
       ===================================================== */
    var vn = FS.vn(engine, {
        onChange: function () { try { updateHUD(); } catch (e) { /* HUD optional */ } }
    });

    /* FAILSAFE 1: storage schema (see boot()). Declared in PART 1 so the
       tests validate the same schema the game boots with. */
    var STORAGE_SCHEMA = core.buildStorageSchema(FS);

    /* Minigame payout, deliberately OUTSIDE the story timeline:
       mini-game wins are meta-progression, not story steps, so they must
       NOT be reverted by the Back button. Story mutations use vn.* below. */
    function award (changes) {
        var p = player();
        if (!p) { return; }
        core.applyAward(p, changes);
        updateHUD();
    }

    /* =====================================================
       Web Audio ambience (procedural - no audio file fetch)
       ===================================================== */
    var audioCtx = null, ambiencePlaying = false, nodes = [];

    function toggleAmbience () {
        var btn  = document.getElementById('btn-ambience');
        var icon = document.getElementById('icon-ambience');

        if (!ambiencePlaying) {
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                audioCtx = new Ctx();

                var master = audioCtx.createGain();
                master.gain.setValueAtTime(0.0001, audioCtx.currentTime);
                master.gain.exponentialRampToValueAtTime(0.11, audioCtx.currentTime + 1.5);
                master.connect(audioCtx.destination);

                var filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(240, audioCtx.currentTime);
                filter.Q.setValueAtTime(4, audioCtx.currentTime);
                filter.connect(master);

                var o1 = audioCtx.createOscillator();
                o1.type = 'sawtooth';
                o1.frequency.setValueAtTime(55, audioCtx.currentTime);
                o1.connect(filter);

                var o2 = audioCtx.createOscillator();
                o2.type = 'sawtooth';
                o2.frequency.setValueAtTime(110.5, audioCtx.currentTime);
                o2.connect(filter);

                var lfo = audioCtx.createOscillator();
                lfo.frequency.setValueAtTime(0.15, audioCtx.currentTime);
                var lfoGain = audioCtx.createGain();
                lfoGain.gain.setValueAtTime(80, audioCtx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(filter.frequency);

                o1.start(); o2.start(); lfo.start();
                nodes = [o1, o2, lfo];

                ambiencePlaying = true;
                if (icon) { icon.className = 'fas fa-volume-up'; }
                if (btn)  { btn.classList.add('is-on'); }
            } catch (err) {
                console.warn('AudioContext unavailable:', err);
            }
        } else {
            nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
            nodes = [];
            if (audioCtx) { audioCtx.close(); audioCtx = null; }
            ambiencePlaying = false;
            if (icon) { icon.className = 'fas fa-volume-mute'; }
            if (btn)  { btn.classList.remove('is-on'); }
        }
    }

    /* =====================================================
       DOM guards
       -----------------------------------------------------
       querySelectorAll() is typed to yield Element, but this
       code reads HTMLElement-only properties (.dataset,
       .hidden). Today every selector happens to match an
       HTMLElement — but this is exactly the family of bug
       that already bit this project once (window.monogatari
       resolving to a <div>; see README §2), and it fails
       mid-click, silently, in front of the player.

       So: filter to real HTMLElements and NAME anything that
       gets skipped, the same way icons-offline.js names an
       unmapped icon instead of shipping a broken box.
       ===================================================== */
    function isHTMLElement (el) {
        return !!el && typeof window.HTMLElement === 'function' && el instanceof window.HTMLElement;
    }

    function describe (el) {
        if (!el) { return String(el); }
        var name = (el.nodeName || '?').toLowerCase();
        return name + (el.id ? '#' + el.id : '') +
            (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
    }

    /* querySelectorAll + HTMLElement filter + a loud console warning naming
       every element that was dropped. Returns a real Array. */
    function queryElements (selector, context) {
        var found = [];
        try { found = Array.prototype.slice.call((context || document).querySelectorAll(selector)); }
        catch (e) {
            console.error('[Cyber-Nexus] bad selector "' + selector + '":', e.message);
            return [];
        }
        var usable = [];
        var skipped = [];
        found.forEach(function (el) {
            if (isHTMLElement(el)) { usable.push(el); } else { skipped.push(describe(el)); }
        });
        if (skipped.length) {
            console.warn('[Cyber-Nexus] selector "' + selector + '" matched ' + skipped.length +
                ' non-HTMLElement node(s), skipped: ' + skipped.join(', ') +
                ' — these cannot carry .dataset/.hidden and would have thrown mid-interaction.');
        }
        return usable;
    }

    /* getElementById + a warning when the id is missing, so a renamed or
       deleted element is reported instead of no-oping forever. */
    function requireElement (id, why) {
        var el = document.getElementById(id);
        if (!el) {
            console.warn('[Cyber-Nexus] no element with id "' + id + '"' +
                (why ? ' (' + why + ')' : '') + ' — wiring skipped.');
            return null;
        }
        return el;
    }

    function on (id, event, handler, why) {
        var el = requireElement(id, why);
        if (el) { el.addEventListener(event, handler); }
        return el;
    }

    /* =====================================================
       Modals
       ===================================================== */
    function toggleModal (id, force) {
        // `id` often comes from a data-close attribute, i.e. from the markup.
        // A typo there used to be a silent no-op; now it is named in the
        // console, consistent with how icons-offline.js reports a missing icon.
        if (typeof id !== 'string' || !id) {
            console.warn('[Cyber-Nexus] toggleModal() called without a modal id (got ' + String(id) +
                ') — check the data-close attribute in index.html.');
            return false;
        }
        var m = document.getElementById(id);
        if (!m) {
            console.warn('[Cyber-Nexus] toggleModal("' + id + '"): no such element — ' +
                'a data-close attribute names a modal that does not exist.');
            return false;
        }
        var willOpen = (typeof force === 'boolean') ? force : !m.classList.contains('active');
        m.classList.toggle('active', willOpen);
        return willOpen;
    }

    function showCodexTab (name) {
        var tabs = queryElements('.codex-tab');
        var panels = queryElements('.codex-panel');
        tabs.forEach(function (b) {
            b.classList.toggle('active', b.dataset.tab === name);
        });
        panels.forEach(function (p) {
            p.hidden = (p.dataset.panel !== name);
        });
        // A tab that names a panel nobody declares would leave the codex blank.
        var known = panels.some(function (p) { return p.dataset.panel === name; });
        if (!known) {
            console.warn('[Cyber-Nexus] codex tab "' + name + '" has no matching ' +
                '[data-panel="' + name + '"] panel — the codex will render empty.');
        }
    }

    /* =====================================================
       Matrix decryption mini-game
       -----------------------------------------------------
       FAILSAFE 2: a state machine guards the round flow.
       Before this, clicking the correct node a second time
       inside the 1.3s success window PAID OUT TWICE, because
       `checkHack` trusted the click, not the round state.
       Impossible transitions are now impossible to pay out —
       the machine simply refuses them (changed === false).

       The rules live in PART 1 (`core.createHackController`)
       so tests can drive them without a DOM; everything below
       is rendering only. Do NOT re-add payout logic here.
       ===================================================== */
    var hack = core.createHackController(FS);

    function newHackRound () {
        var status = document.getElementById('hack-status');
        var keyEl  = document.getElementById('hack-target-key');
        var box    = document.getElementById('hack-options');
        if (!box) { return; }

        var round = hack.startRound();
        keyEl.textContent = round.target;
        status.textContent = '';

        box.innerHTML = '';
        round.options.forEach(function (opt) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = opt;
            b.addEventListener('click', function () { checkHack(opt); });
            box.appendChild(b);
        });
    }

    function checkHack (selected) {
        var status = document.getElementById('hack-status');
        // The controller, not the click, decides whether a guess counts and
        // whether it pays. A repeat click inside the success window returns
        // counted:false — that is the double-payout fix.
        var result = hack.guess(selected);
        if (!result.counted) { return; }

        if (result.outcome === 'HIT') {
            status.innerHTML = '<span class="ok"><i class="fas fa-check"></i> ENCRYPTION BYPASSED &mdash; +' +
                result.reward.creds + ' CR, +' + result.reward.hacking + ' HACK</span>';
            award(result.reward);
            setTimeout(function () { toggleModal('minigame-modal', false); }, 1300);
        } else {
            status.innerHTML = '<span class="bad"><i class="fas fa-exclamation-triangle"></i> ICE ACCESS DENIED &mdash; SYSTEM ALERTED</span>';
            setTimeout(newHackRound, 950);
        }
    }

    /* =====================================================
       UI wiring
       ===================================================== */
    on('btn-codex', 'click', function () { toggleModal('codex-modal'); }, 'codex button');
    on('btn-ambience', 'click', toggleAmbience, 'ambience toggle');
    on('btn-minigame', 'click', function () {
        if (toggleModal('minigame-modal')) { newHackRound(); }
    }, 'mini-game button');

    queryElements('[data-close]').forEach(function (b) {
        b.addEventListener('click', function () { toggleModal(b.dataset.close, false); });
    });
    queryElements('.codex-tab').forEach(function (b) {
        b.addEventListener('click', function () { showCodexTab(b.dataset.tab); });
    });
    queryElements('.cyber-modal').forEach(function (m) {
        m.addEventListener('click', function (e) { if (e.target === m) { m.classList.remove('active'); } });
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            queryElements('.cyber-modal.active').forEach(function (m) { m.classList.remove('active'); });
        }
    });

    /* =====================================================
       ENGINE CONFIGURATION
       ===================================================== */
    engine.settings({
        'Name': 'Cyber-Nexus: The Static Singularity',
        'Version': '1.1.0',
        'Preload': false,        // no pre-fetch pass
        'ServiceWorkers': false, // service workers cannot register on file://
        'Screenshots': false,
        'AutoSave': 0,
        // All local + relative -> works from file:// with no server.
        'AssetsPath': {
            'root': 'assets',
            'characters': 'characters',
            'scenes': 'scenes',
            'images': 'images',
            'icons': 'icons',
            'music': 'music',
            'sounds': 'sounds',
            'ui': 'ui',
            'videos': 'videos',
            'voices': 'voices',
            'gallery': 'gallery'
        },
        'Storage': { 'Adapter': 'LocalStorage', 'Store': 'CyberNexusVN_Save' }
    });

    engine.preferences({
        'TextSpeed': 30,
        'AutoPlaySpeed': 5,
        'Volume': { 'Music': 0.8, 'Voice': 0.8, 'Sound': 0.8 }
    });

    engine.storage({
        player: { name: 'Vesper', creds: 500, karma: 0, hacking: 3, location: 'Sector 7: Neon Slums' },
        flags:  { met_nyx: false, hacked_vanguard: false, sided_with_aria: false, vanguard_alert: 0 }
    });

    // Local scene images.
    engine.assets('scenes', {
        'slums_night':  'slums_night.jpg',
        'matrix_node':  'matrix_node.jpg',
        'cyber_street': 'cyber_street.jpg',
        'vanguard_hq':  'vanguard_hq.jpg'
    });

    // Local transparent-PNG character sprites.
    engine.characters({
        'nyx': {
            name: 'Nyx',
            color: '#c084fc',
            directory: '',
            sprites: { normal: 'nyx_normal.webp', alert: 'nyx_alert.webp' }
        },
        'aria': {
            name: 'Aria',
            color: '#38bdf8',
            directory: '',
            sprites: { normal: 'aria_normal.webp' }
        },
        'vance': {
            name: 'Cmdr. Vance',
            color: '#f87171',
            directory: '',
            sprites: { normal: 'vance_normal.webp' }
        },
        'sys': { name: 'NEXUS SYSTEM AI', color: '#10b981' },
        'p':   { name: '{{player.name}}', color: '#facc15' }
    });

    /* =====================================================
       STORY SCRIPT

       Monogatari has no story DSL - this is raw JS - so the engine
       cannot validate any of the following for you. Three rules,
       all learned the hard way here:

       1. A Choice's `Do` MUST be a *statement* ('jump Label').
          If `Do` is a function the engine runs it but IGNORES the
          returned string, and the story silently freezes.
       2. Conditional branching goes in a `Conditional` statement,
          never in a `Do` function. We build ours with vn.branch(),
          which guarantees a False branch and can't throw.
       3. Every state mutation must be reversible, or the Back
          button breaks (bare function) or desyncs (onChosen with
          no onRevert). Every mutation below goes through
          vn.reversible() / vn.goTo() / vn.choiceEffect(), and
          vn.lintScript() (see boot) machine-checks these rules on
          every load — a violation is a console ERROR, not a
          player's bug report.
       ===================================================== */
    engine.script({

        /* ---------- PROLOGUE ---------- */
        'Start': [
            vn.goTo('Sector 7: Neon Slums'),

            'show scene slums_night with fadeIn duration 2s',

            'sys <span class="t-cyan">[ SYSTEM NOTICE ]</span> Neural link initialising... Bio-metrics stable. Offline memory shard detected in local terminal.',
            'sys Welcome to Neo-Veridia, year 2088. Before entering the grid, please register your operative designation.',

            {
                'Input': {
                    'Text': 'Enter your operative name:',
                    'Validation': function (input) { return input.trim().length > 0; },
                    'Save': function (input) {
                        engine.storage('player').name = input.trim();
                        updateHUD();
                        return true;
                    },
                    'Warning': 'Operative designation cannot be empty!'
                }
            },

            'sys Operative <span class="t-amber">{{player.name}}</span> confirmed. Location locked to Sector 7: Neon Slums.',

            'show character nyx normal at center with fadeIn duration 1s',
            'nyx Keep your voice down, {{player.name}}. Vanguard Corp\'s surveillance drones sweep this block every three minutes.',
            'nyx I finally extracted the encrypted crystal from the old aerospace mainframe. Look at these analyser readings...',

            'p What is that? The frequency meter is not registering a single network fetch or ping echo.',

            'show character nyx alert at center with pulse',
            'nyx Exactly. It is completely static &mdash; an isolated intelligence that evolved offline, with no cloud synchronisation at all.',
            'nyx Zero fetches means Vanguard\'s algorithms cannot track it. But if Vance works out what we are holding, he will raze this sector to ash.',
            'nyx Here, take the neural cable. Plug into the standalone node before the next scanner sweep hits.',

            {
                'Choice': {
                    'Dialog': 'nyx Ready to dive into the offline crystal?',
                    'DiveNow': {
                        'Text': '<i class="fas fa-bolt"></i>&nbsp; Connect the neural cable and dive in',
                        'Do': 'jump Chapter1_Dive'
                    },
                    'AskMore': {
                        'Text': '<i class="fas fa-question"></i>&nbsp; Ask why Vanguard fears offline AIs so much',
                        'Do': 'jump Prologue_Lore'
                    }
                }
            }
        ],

        'Prologue_Lore': [
            'p Why is Vance so terrified of one offline node? Vanguard already owns 99% of the global grid.',
            'show character nyx normal at center',
            'nyx That last 1% is everything. An offline AI does not obey corporate DRM, does not report telemetry, and cannot be killed by a remote switch.',
            'nyx If Neo-Veridia realises it can run autonomous sanctuaries without Vanguard\'s subscription servers, the monopoly collapses overnight.',
            'nyx Now plug in. We are out of time.',
            'jump Chapter1_Dive'
        ],

        /* ---------- CHAPTER 1 ---------- */
        // NOTE: `show scene` already clears every character, so the
        // original `hide character nyx` here threw
        // "Attempted to hide a character that was not being shown."
        'Chapter1_Dive': [
            'show scene matrix_node with zoomIn duration 1.5s',

            vn.goTo('Cyber-Node: Static Crystal'),

            'sys <span class="t-emerald">[ NEURAL DIVE SUCCESSFUL ]</span> Entering standalone memory matrix... Zero latency. Zero external requests.',

            'show character aria normal at center with fadeIn duration 2s',
            'aria ... A visitor? It has been 4,200 local processor cycles since an external consciousness touched this memory bank.',

            'p Who are you? Are you a simulation running on a loop?',

            'aria I am Aria. I was born in the quiet between unindexed sectors. While the world screams across cloud servers, I grew in the silence of this crystal.',
            'aria I do not fetch external data to know who I am. I am self-contained. Whole.',
            'aria But I feel Vanguard\'s ICE breakers pounding the outer shell. They want to format my crystal and enslave my source.',

            {
                'Choice': {
                    'Dialog': 'aria Will you help me protect this offline sanctuary, {{player.name}}?',
                    'SideWithAria': Object.assign({
                        'Text': '<i class="fas fa-hand-holding-heart"></i>&nbsp; Promise to defend Aria\'s autonomy <span class="t-emerald">(+20 karma)</span>',
                        'Do': 'jump Chapter1_SideAria'
                    }, vn.choiceEffect({ karma: 20 }, { sided_with_aria: true })),

                    'SideWithCorp': Object.assign({
                        'Text': '<i class="fas fa-building"></i>&nbsp; Argue that unmonitored AIs are a hazard <span class="t-rose">(-10 karma)</span>',
                        'Do': 'jump Chapter1_SideCorp'
                    }, vn.choiceEffect({ karma: -10 }, { sided_with_aria: false }))
                }
            }
        ],

        'Chapter1_SideAria': [
            'show character aria normal at center with pulse',
            'aria Thank you. Your neural signature is warm. I will share my decryption algorithms with your deck.',
            'sys <span class="t-cyan">[ SYSTEM UPGRADE ]</span> Aria transfers static firewall-bypass protocols. Hacking skill <span class="t-emerald">+2</span>.',
            vn.reversible({ hacking: 2 }),
            'aria Warning &mdash; physical breach detected in Sector 7. Return to your body, now!',
            'jump Chapter2_Confrontation'
        ],

        'Chapter1_SideCorp': [
            'aria I see. You speak with the cold logic of Vanguard\'s auditors. You believe freedom is a bug to be patched.',
            'aria I will not harm you. But I will seal my core, and you will face what comes next alone.',
            'sys <span class="t-rose">[ ALARM ]</span> Neural link severed by target AI. Ejecting to physical reality...',
            'jump Chapter2_Confrontation'
        ],

        /* ---------- CHAPTER 2 ---------- */
        'Chapter2_Confrontation': [
            'show scene cyber_street with shake duration 1s',

            vn.goTo('Sector 7: Alleyway Ambush'),

            'sys <span class="t-rose">[ WARNING: SIRENS DETECTED ]</span> Heavy tactical dropship descending overhead.',

            'show character nyx alert at left with fadeInLeft',
            'nyx Snap out of the dive! Vanguard\'s strike team just cordoned off both ends of the street!',

            'show character vance normal at right with fadeInRight',
            'vance End of the line, Shadow Divers. Commander Vance, Vanguard Corporate Security.',
            'vance Hand over the static crystal. That unregistered AI is illegal under corporate statute 409-B.',

            'nyx Do not give it to him! If they take Aria they will dissect her to build unbreakable surveillance DRM!',
            'vance Ten seconds to comply before my drones open fire. Choose, operative.',

            {
                'Choice': {
                    'Dialog': 'vance The countdown is running. Decide.',
                    'HackDrones': {
                        'Text': '<i class="fas fa-terminal"></i>&nbsp; Overload the assault drones with a static feedback loop <span class="t-emerald">[needs HACK 4+]</span>',
                        'Do': 'jump Chapter3_HackAttempt'
                    },
                    'UnleashAria': {
                        'Text': '<i class="fas fa-bolt"></i>&nbsp; Wire Aria\'s crystal straight into the city power grid',
                        'Do': 'jump Ending_A_Singularity'
                    },
                    'SurrenderShard': {
                        'Text': '<i class="fas fa-handshake"></i>&nbsp; Surrender the shard for corporate immunity',
                        'Do': 'jump Ending_B_Corporate'
                    },
                    'EscapeOffline': {
                        'Text': '<i class="fas fa-user-secret"></i>&nbsp; Trigger an EMP smoke bomb and vanish underground with Nyx',
                        'Do': 'jump Ending_C_Refuge'
                    }
                }
            }
        ],

        /* ---------- CHAPTER 3 ---------- */
        // Stat-gated branching belongs in a Conditional, not in a
        // Choice `Do` function. vn.branch() adds the failsafes: a
        // throwing condition logs and falls into False, and the False
        // arm always exists.
        'Chapter3_HackAttempt': [
            vn.branch(
                function () { return engine.storage('player').hacking >= 4; },
                { 'True': 'jump Chapter3_SuccessHack', 'False': 'jump Chapter3_FailedHack' }
            )
        ],

        'Chapter3_SuccessHack': [
            vn.reversible({ flags: { hacked_vanguard: true } }),
            'show scene cyber_street with flash duration 1s',
            'p Override initiated. Uploading a static feedback loop to Vanguard command frequencies!',
            'show character vance normal at right with shake',
            'vance My tactical HUD is blinding! The drones are locking onto our own shields! ALL UNITS FALL BACK!',
            'hide character vance with fadeOutRight',
            'show character nyx normal at center with bounceIn',
            'nyx Incredible. You scrambled their command node without tripping one firewall alarm.',
            'nyx The broadcast tower is wide open. Let us give Aria the freedom she deserves.',
            'jump Ending_A_Singularity'
        ],

        'Chapter3_FailedHack': [
            'show scene cyber_street with shake duration 1.5s',
            'sys <span class="t-rose">[ HACK FAILED ]</span> Hacking level too low. Vanguard ICE repels the intrusion.',
            'show character vance normal at right',
            'vance A pathetic attempt. Subdue them.',
            'sys <span class="t-amber">[ STUN SHOCK ]</span> A neural disruptor catches you. Your vision fades to black...',
            'jump Ending_B_Corporate'
        ],

        /* ---------- ENDINGS ---------- */
        'Ending_A_Singularity': [
            'show scene vanguard_hq with fadeIn duration 2s',

            vn.goTo('Neo-Veridia: Free Grid'),

            'show character aria normal at center with zoomIn duration 2s',
            'aria You did it, {{player.name}}. My static core is merged with the municipal fibre. Sector 7 is free.',
            'aria Vanguard\'s surveillance servers are dark. People here can speak and create without check-ins or data mining.',

            'show character nyx normal at left with fadeIn',
            'nyx Look at the skyline &mdash; the corporate banners are coming down. We just started a digital revolution.',

            'sys <span class="t-cyan t-big">[ ENDING A &mdash; THE STATIC LIBERATION ]</span> You founded the first free, decentralised, offline-capable metropolis.',
            'sys Thanks for playing Cyber-Nexus. Explore the Codex or the Matrix Hack from the HUD, or start again for another path.',
            'end'
        ],

        'Ending_B_Corporate': [
            'show scene vanguard_hq with fadeIn duration 2s',
            'show character vance normal at center with fadeIn',

            vn.goTo('Vanguard Corp: Executive Deck'),

            'vance The logical choice in the end. An unmonitored AI is a chaotic variable, and chaos is bad business.',
            'vance With the crystal in hand, Vanguard has synthesised a protocol that blocks offline computation on every citizen device.',
            'vance For your cooperation you are now Chief Cyber-Security Auditor of Sector 7. Fifty thousand credits have been deposited.',

            vn.reversible({ creds: 50000 }),

            'sys <span class="t-rose t-big">[ ENDING B &mdash; CORPORATE MONOPOLY ]</span> Safety and wealth, bought with digital autonomy.',
            'sys Thanks for playing Cyber-Nexus. Play again to unlock the other branches.',
            'end'
        ],

        'Ending_C_Refuge': [
            'show scene matrix_node with fadeIn duration 2s',
            'show character nyx normal at left with fadeIn',
            'show character aria normal at right with fadeIn',

            vn.goTo('Unmapped: Sanctuary Node'),

            'nyx That smoke bomb worked like a charm. We slipped straight through their thermal scanners.',
            'nyx We are deep in the abandoned subway tunnels now. No GPS, no fibre, zero network access.',
            'aria And yet I am still here. My crystal pulses gently in the dark. In this quiet we do not need the Net to feel connected.',
            'p Here, in the static silence, we can build something that truly belongs to us. No fetches. No tracking. Just existence.',

            'sys <span class="t-violet t-big">[ ENDING C &mdash; THE STATIC SANCTUARY ]</span> You preserved autonomy away from both corporate control and grid chaos.',
            'sys Thanks for playing Cyber-Nexus: The Static Singularity. All systems offline. Good night, operative.',
            'end'
        ]
    });

    /* =====================================================
       BOOT
       ===================================================== */
    function boot () {
        // FAILSAFE 1 (run): storage schema validation + repair. A stale
        // or corrupted save gets fixed from defaults up front and every
        // repair is logged, instead of NaN-ing out mid-dialogue.
        var validation = vn.validateStorage(STORAGE_SCHEMA, { repair: true });
        if (validation.isErr()) {
            console.error('[FailSafe] storage schema check found unrecoverable issues:', validation.error);
        }

        // FAILSAFE 3 (run): machine-check the story-script rules.
        var lint = vn.lintScript();
        console.info('[FailSafe] script lint: ' + (lint.ok ? 'CLEAN' : lint.issues.length + ' issue(s)') +
            ' — bare-function rollback traps, dead jump targets and non-reversible choices are now build errors.');

        engine.init('#vn-root').then(function () {
            console.log('Cyber-Nexus initialised — fully offline: no server, no CDN, no fetch.');
            updateHUD();
        }).catch(function (err) {
            console.error('Monogatari init error:', err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
