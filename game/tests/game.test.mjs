// Regression tests for Seirin's shipped game script. Zero dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findBlockScopedFunctionDeclarations, findEs6Syntax } from './es5-scan.mjs';

const require = createRequire(import.meta.url);
const core = require('../vendor/game.js');
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'vendor', 'game.js'), 'utf8');
const storyFiles = [
    'prologue.js',
    'procrastination.js',
    'anime_shorts.js',
    'anime_comfort.js',
    'anime_activities.js',
    'anime_watchlist.js',
    'anime_eva_01_07.js',
    'anime_eva_09_16.js',
    'anime_eva_17_24.js',
    'anime_eva_25_end.js',
    'anime_nausicaa.js',
    'anime_key.js',
    'anime_cicada.js',
    'anime_gacha.js',
    'anime_fandom.js',
    'nyan.js',
    'club.js',
    'tower.js',
    'bench.js',
    'lonewar.js',
    'miya.js',
    'ai.js',
    'momo.js'
];
const storySource = storyFiles.map(file => readFileSync(join(here, '..', 'vendor', 'story', file), 'utf8')).join('\n');
const shippedSource = source + '\n' + storySource;
const FS = require('../vendor/failsafe.js');

test('game module is loadable without a browser and exports only its pure core', () => {
    assert.deepEqual(Object.keys(core), ['buildStorageSchema']);
    assert.equal(typeof core.buildStorageSchema, 'function');
});

test('game.js is ES5 plain-script code with no network dependency', () => {
    assert.deepEqual(findBlockScopedFunctionDeclarations(source), []);
    assert.deepEqual(findEs6Syntax(source), []);
    assert.doesNotThrow(() => new Function('"use strict";\n' + source));
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bsendBeacon\b/, /\bWebSocket\b/,
        /\bserviceWorker\b/, /https?:\/\//].forEach(forbidden => {
        assert.equal(forbidden.test(code), false, `forbidden offline API: ${forbidden}`);
    });
});


test('story arcs are standalone ES5 modules and are loaded before the bootstrap', () => {
    const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
    storyFiles.forEach(file => {
        assert.ok(html.includes('vendor/story/' + file), 'missing script tag for ' + file);
        const arc = readFileSync(join(here, '..', 'vendor', 'story', file), 'utf8');
        assert.deepEqual(findBlockScopedFunctionDeclarations(arc), [], file + ' has a block-scoped function');
        assert.deepEqual(findEs6Syntax(arc), [], file + ' is not ES5');
        assert.match(arc, /registry\.register\(/, file + ' does not register an arc');
    });
    assert.match(source, /buildStoryFromArcs/);
});

test('every story file parses and registers its arc (boot regression)', () => {
    // Regression: a missing comma before an inserted 'jump' statement made
    // the file fail to parse in the browser, the arc never registered, and
    // boot aborted with "Не загружена арка: anime_eva_01_07" while the
    // static ES5 scans still passed. The file must actually EVALUATE, the
    // same way the <script> tag does — syntax errors cannot hide here.
    storyFiles.forEach(file => {
        const arc = readFileSync(join(here, '..', 'vendor', 'story', file), 'utf8');
        const sandbox = { window: {} };
        assert.doesNotThrow(() => runInNewContext(arc, sandbox, { filename: file }),
            file + ' must parse when evaluated like a <script>');
        const arcs = sandbox.window.SeirinStory && sandbox.window.SeirinStory.arcs;
        const expected = file.replace(/\.js$/, '');
        assert.ok(arcs && typeof arcs[expected] === 'function',
            file + ' must register arc ' + expected);
    });
});

test('storage schema supplies complete, safe defaults', () => {
    const checked = core.buildStorageSchema(FS).check({ player: {}, flags: {} });
    assert.equal(checked.ok, true);
    assert.equal(checked.value.player.name, 'Рэн');
    assert.equal(checked.value.player.akatomi_alert, 0);
    assert.equal(checked.value.player.momo_affinity, 0);
    assert.equal(checked.value.flags.met_momo, false);
    assert.equal(checked.value.flags.happy_ending_achieved, false);
    // Resource variables: the night starts at 21:00 (=1260 min), with ¥1000.
    assert.equal(checked.value.player.time, 1260, 'default time must be 21:00');
    assert.equal(checked.value.player.money, 1000);
    assert.equal(checked.value.player.locale, 'ru-RU', 'default locale must be ru-RU');
    assert.deepEqual(checked.value.player.items, {});
    assert.deepEqual(checked.value.player.unlocked, {});
});

test('time uses dedicated set/add primitives (clock drift regression)', () => {
    // Regression: vn.reversible({ time: 1267 }) is a DELTA, so the HUD clock
    // read 23:07 while the text said 21:07 (13:00 + 13:00 + 21:07 mod 24).
    // Time writes now go through vn.setTime (absolute: baselines/endings) and
    // vn.addTime (delta: progression — the default), never a bare reversible
    // time delta. Item writes use storage deltas so they accumulate.
    const badTimeDelta = storySource.match(/vn\.reversible\(\{\s*time:/g) || [];
    assert.equal(badTimeDelta.length, 0, 'bare { time: N } would delta-apply — use vn.addTime/vn.setTime');
    assert.match(storySource, /vn\.setTime\(/, 'vn.setTime must be used for baselines/endings');
    assert.match(storySource, /vn\.addTime\(/, 'vn.addTime must be used for progression');
    assert.ok((storySource.match(/vn\.addTime\(/g) || []).length > (storySource.match(/vn\.setTime\(/g) || []).length,
        'addTime should be the more common time write');
    assert.doesNotMatch(storySource, /vn\.reversible\(\{[^}]*items: \{/, 'items must go through storage form to accumulate');
    assert.match(storySource, /'player\.items\.[a-z_]+'\s*:\s*\{ mode: 'delta'/,
        'item pickups must use storage deltas');
    // HUD + narration derive from the same variable.
    assert.match(source, /player\.time_hhmm/, 'procedural clock token must exist');
    assert.match(source, /fmtHHMM/, 'format helper must exist');
    // Date derives from absolute time: 15 июля + floor(time/1440).
    assert.match(source, /fmtDateTime/, 'date-time helper must exist');
    assert.match(storySource, /\{\{player\.date_time\}\}/, 'procedural date+time token must exist');
    assert.match(storySource, /\{\{player\.date\}\}/, 'procedural date token must exist');
    // Post-midnight anchors are absolute (day 2 = +1440), never bare 0-1440.
    assert.ok(storySource.indexOf('setTime(1635)') > -1, 'descent anchor must be absolute 03:15 day 2');
    // Date derives from absolute time: addTime rolls it (no separate variable).
    assert.match(source, /Math\.floor\(m \/ 1440\)/, 'date must derive from absolute minutes');
    // i18n: locale variable + Date.toLocaleString drive date formatting.
    assert.match(source, /locale:.*ru-RU/, 'locale variable must ship with ru-RU default');
    assert.match(source, /toLocaleString/, 'date formatting must use Date.toLocaleString');
    // Every narration time must derive from the variable: no hardcoded prefixes.
    const hardcoded = [...storySource.matchAll(/'p \d{2}:\d{2}/g)];
    assert.equal(hardcoded.length, 0, "no hardcoded 'p HH:MM' prefixes — all must be {{player.time_hhmm}}");
    // Cyclic hub breaks by time: Solo1Hub routes to the final hour past 05:20.
    assert.match(storySource, /vn\.getTime\(\)/, 'hub gate must read the clock');
    assert.match(storySource, /1440 \+ 1440\) % 1440 >= 500/, 'hub gate must trip 500 min into the night (05:20)');
    assert.match(storySource, /'jump Solo1Final_Hour'/, 'hub gate must lead to the final hour');
});

test('all declared story jumps target real labels', () => {
    const labels = [...storySource.matchAll(/^\s{12}([A-Za-z][A-Za-z0-9_]*): \[/gm)].map(m => m[1]);
    // core labels that must exist even after splitting into many files
    const required = [
        'Start',
        'SoloRoute1', 'SoloRoute2', 'SoloRoute3', 'SoloRoute4', 'SoloRoute5',
        'Solo1FeedEnd', 'Solo1LoopExitEnd',
        'Solo1LateRunEnd', 'Solo1LateMissEnd', 'Solo1LateRepairEnd',
        'Solo1Radio', 'Solo1RadioEnd', 'Solo1RadioAnswerEnd', 'Solo1RadioStaticEnd', 'Solo1RepairEnd',
        'Solo2DriftEnd', 'Solo2MuteEnd', 'Solo2CallEnd',
        'Solo5BadEnd', 'Solo5Standoff',
        'MiyaRoute', 'MiyaEndingHarmony', 'MiyaEndingGuardian',
        'AIRoute', 'AIEndingTranscendence', 'AIEndingIsolation',
        'MomoRoute', 'MomoEndingSong', 'MomoEndingEncore'
    ];
    required.forEach(r => assert.ok(labels.includes(r), `required label missing ${r}`));
    // routeChoice constructs its jump dynamically, so inspect every supplied target
    const jumps = [...storySource.matchAll(/routeChoice\([\s\S]*?,\s*'([A-Za-z][A-Za-z0-9_]+)'/g)].map(m => m[1]);
    assert.ok(jumps.length >= 18, 'expanded routes must retain all fork targets');
    jumps.forEach(label => assert.ok(labels.includes(label), `missing target ${label} among ${labels.length} labels`));
    // anime path labels — at least some must exist
    const animeLabels = labels.filter(l => l.startsWith('Anime'));
    assert.ok(animeLabels.length >= 10, 'anime procrastination branch must have many labels');
});

test('choices use the matched FailSafe choiceEffect callback pair', () => {
    assert.match(source, /onChosen: effect\.onChosen, onRevert: effect\.onRevert/);
    assert.doesNotMatch(shippedSource, /onRevert:\s*function/);
    assert.ok((storySource.match(/vn\.goTo\(/g) || []).length >= 5, 'each location change is reversible');
});

test('location changes are real vn.goTo actions, never quoted command strings', () => {
    // Regression: route labels once carried 'vn.goTo("Location")' as a plain
    // string, which the engine cannot execute (unknown action id).
    assert.doesNotMatch(storySource, /['"]vn\.goTo\(/);
    assert.equal(storySource.indexOf('vn.goTo(&quot;'), -1);
});

test('stat-gated branching is actually used (vn.branch with both arms)', () => {
    assert.match(storySource, /vn\.branch\(/);
    const branches = [...storySource.matchAll(/vn\.branch\([\s\S]*?\{[\s\S]*?True:[\s\S]*?False:[\s\S]*?\}\)/g)];
    assert.ok(branches.length >= 1, 'at least one vn.branch with True and False arms');
});

test('index.html ships the engine markup skeleton (white-screen regression)', () => {
    // The engine renders INTO screen/menu custom elements but never creates
    // them. An empty <div id="vn-root"> made init abort -> white screen with
    // no main menu (cyber-nexus/index.html ships the full skeleton).
    const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
    const rootMatch = html.match(/<div id="vn-root">([\s\S]*?)<\/div>\s*<!--/);
    assert.ok(rootMatch, '#vn-root container missing');
    ['visual-novel', 'loading-screen', 'main-screen', 'main-menu',
        'game-screen', 'text-box', 'quick-menu', 'dialog-log',
        'load-screen', 'save-screen', 'settings-screen', 'help-screen']
        .forEach(tag => {
            assert.ok(html.includes('<' + tag + '>'), `missing <${tag}> in skeleton`);
        });
    assert.ok(rootMatch[1].includes('<main-menu>'), '#vn-root must not be an empty div');
});

test('debug route atlas: menu entry, overlay, generator and teleport are wired', () => {
    const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
    // The atlas must live in the MAIN MENU, never as an in-game HUD button.
    assert.doesNotMatch(html, /id="btn-graph"/);
    assert.match(html, /id="graph-overlay"/);
    assert.match(html, /fa-network-wired/);
    assert.match(source, /registerListener\('open-graph'/);
    assert.match(source, /menuConfig\.buttons\.push\(\{ string: 'GraphAtlas'/);
    assert.match(source, /GraphAtlas/);
    // The engine configuration setter replaces config wholesale — a partial
    // object there kills boot (lost quick-menu/credits). Pin the safe path.
    const configStart = source.indexOf('var menuConfig = engine.configuration');
    const configBlock = source.slice(configStart, configStart + 600);
    assert.doesNotMatch(configBlock, /engine\.configuration\(\{/);
    assert.match(source, /function renderGraph \(\)/);
    assert.match(source, /data-graph-jump/);
    assert.match(source, /engine\.run\('jump ' \+ label\)/);
    // Every shipped label has a hand-written atlas title (structure itself is
    // auto-derived from engine.script(); titles are the only manual part).
    const start = source.indexOf('var LABEL_TITLES');
    const titlesBlock = source.slice(start, source.indexOf('};', start));
    ['Start', 'SoloRoute1', 'SoloRoute2', 'SoloRoute3', 'SoloRoute4', 'SoloRoute5',
        'Solo1LoopEnd', 'Solo1FeedEnd', 'Solo1LoopExitEnd',
        'Solo1LateRunEnd', 'Solo1LateMissEnd', 'Solo1LateRepairEnd',
        'Solo1Radio', 'Solo1RadioEnd', 'Solo1RadioAnswerEnd', 'Solo1RadioStaticEnd', 'Solo1RepairEnd',
        'Solo2DriftEnd', 'Solo2MuteEnd', 'Solo2CallEnd',
        'Solo5BadEnd', 'Solo5Standoff', 'MiyaRoute', 'MiyaEndingHarmony', 'MiyaEndingGuardian',
        'AIRoute', 'AIEndingTranscendence', 'AIEndingIsolation',
        'MomoRoute', 'MomoEndingSong', 'MomoEndingEncore']
        .forEach(label => assert.ok(titlesBlock.includes(label + ':'), `LABEL_TITLES missing ${label}`));
});

test('stat-only choices carry a real engine action (rollback regression)', () => {
    // Regression: callback-only choices (onChosen, no Do) broke the Back
    // command — engine.revert(undefined) rejected, stats stayed applied and
    // the choice never reappeared. effectChoice must ship Do = vn.reversible.
    assert.match(source, /function effectChoice \(text, effectSpec\) \{\s*return \{ Text: text, Do: vn\.reversible\(effectSpec\) \};/);
    assert.doesNotMatch(source, /return \{ Text: text, onChosen: effect\.onChosen, onRevert: effect\.onRevert \};/);
});

test('boot watchdog shows a visible error card instead of a silent white screen', () => {
    // Regression: when ANY boot prerequisite failed (stale cached vendor js,
    // blocked localStorage, truncated monogatari.js), the page used to stay
    // an empty white void. The watchdog must hook both error channels and be
    // installed BEFORE the guarded engine block (it exists precisely for the
    // case when Monogatari itself never loads).
    assert.match(source, /'seirin-boot-banner'/);
    assert.match(source, /unhandledrejection/);
    assert.match(source, /window\.SeirinBoot/);
    assert.ok(source.indexOf('BOOT WATCHDOG') < source.indexOf('window.Monogatari && window.FailSafe'),
        'watchdog must be installed before the engine-wiring guard');
});

test('init failure and success both surface visibly (build badge + fail hook)', () => {
    assert.match(source, /stampBuildBadge/);
    assert.match(source, /SeirinBoot\.fail/);
});

test('every local asset reference in index.html carries a cache-busting version', () => {
    // A player who opened an older build may otherwise keep running the
    // broken cached game.js/custom-ui.css long after the fix shipped.
    const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
    const refs = html.match(/(?:src|href)="(?:vendor|assets)\/[^"]+"/g) || [];
    assert.ok(refs.length >= 8, 'expected at least 8 local asset references, got ' + refs.length);
    refs.forEach(function (ref) {
        assert.ok(/\?v=\d{6,}/.test(ref), 'missing cache-bust version: ' + ref);
    });
});

test('engine settings use the real AssetsPath key (dead Assets key removed)', () => {
    // The engine ONLY reads AssetsPath (same as cyber-nexus). A stray
    // 'Assets' key silently did nothing.
    assert.match(source, /'AssetsPath':\s*\{/);
    assert.doesNotMatch(source, /'Assets':\s*\{/);
});

test('debug overlays stack above system screens (graph visible over the menu)', () => {
    const css = readFileSync(join(here, '..', 'vendor', 'custom-ui.css'), 'utf8');
    assert.match(css, /\.graph-overlay\s*\{[^}]*z-index:\s*200/);
    assert.match(css, /\.archives-overlay\s*\{[^}]*z-index:\s*200/);
});

test('system screens stack above the HUD (settings must stay closable on mobile)', () => {
    // Regression: vendored monogatari.css gives screens no z-index, so the
    // z-80 HUD covered the settings screen AND its [data-action=back] circle.
    const css = readFileSync(join(here, '..', 'vendor', 'custom-ui.css'), 'utf8');
    assert.match(css, /\[data-screen\]:not\(\[data-screen="game"\]\)\s*\{[^}]*z-index:\s*90/);
    assert.match(css, /\[data-action="back"\]\s*\{[^}]*border: 1px solid var\(--sn-glass-border\)/);
});

test('interface animations exist and respect reduced-motion preference', () => {
    const css = readFileSync(join(here, '..', 'vendor', 'custom-ui.css'), 'utf8');
    ['modalIn', 'fadeSlideUp', 'titleGlow', 'textboxIn', 'nodeFlash'].forEach(name => {
        assert.ok(css.includes('@keyframes ' + name), `missing @keyframes ${name}`);
    });
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    // Choice cascade must exist for at least the first three buttons.
    assert.match(css, /\[data-ui="choices"\] button:nth-child\(3\)\s*\{\s*animation-delay/);
});

test('fast-forward is wired: HUD button in markup, Skip > 0 in settings', () => {
    const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
    assert.match(html, /id="btn-skip"/);
    assert.match(html, /fa-fast-forward/);
    // engine.skip(true) refuses to run when setting('Skip') === 0, so a missing
    // setting silently yields a dead button — pin it here.
    assert.match(source, /'Skip':\s*[1-9]\d*/);
    assert.match(source, /engine\.skip\(!engine\.global\('skip'\)\)/);
});

test('first-15-minutes hook: micro-choice teaches stats BEFORE the 7-way fork', () => {
    // Miya's magic question (effectChoice, no jump) must precede the canon
    // route fork, and the city anomaly must bump akatomi_alert visibly.
    const iBelieve = storySource.indexOf('Believe: effectChoice');
    const iFork = storySource.indexOf('Home: routeChoice');
    assert.ok(iBelieve > -1, 'magic-question micro-choice missing');
    assert.ok(iFork > -1, '7-way canon fork missing');
    assert.ok(iBelieve < iFork, 'micro-choice must come before the route fork');
    assert.match(storySource, /reversible\(\{ akatomi_alert: 3 \}\)/);
});

test('every route teaches with a micro-choice before its commitment beat', () => {
    // Each route mirrors prologue hook ladder: arrival -> voice -> micro effectChoice -> commitment
    // After splitting into many files and expanding procrastination, SoloRoute1 no longer has CouchMarathon directly
    const beats = [
        ['SoloRoute1: [', 'Water: effectChoice', 'ToHub: routeChoice'],
        ['SoloRoute2: [', 'ToastStatusQuo: effectChoice', 'DanceAway: routeChoice'],
        ['SoloRoute3: [', 'TaskPerfect: effectChoice', 'show character kurogane'],
        ['SoloRoute4: [', 'CheckSky: effectChoice', 'за монитором'],
        ['SoloRoute5: [', 'PrepCharges: effectChoice', 'NightStrike: effectChoice'],
        ['MiyaRoute: [', 'ArtWire: effectChoice', 'Embrace: routeChoice'],
        ['AIRoute: [', 'GreetRhythm: effectChoice', 'Connect: routeChoice'],
        ['MomoRoute: [', 'SweetLie: effectChoice', 'SingHerSong: routeChoice']
    ];
    beats.forEach(([label, micro, commitment]) => {
        const from = storySource.indexOf(label);
        const atMicro = storySource.indexOf(micro, from);
        const atCommit = storySource.indexOf(commitment, from);
        assert.ok(from > -1, `route label missing: ${label}`);
        assert.ok(atMicro > from, `micro-beat ${micro} must live inside ${label} after ${from}`);
        assert.ok(atCommit > atMicro, `micro-beat must precede ${commitment} in ${label}`);
    });
    // Micro-beats are teaching moments, not route forks: they must never jump.
    assert.equal((storySource.match(/effectChoice\([\s\S]*?Do:/g) || []).length, 0);
});

test('Solo 5 balance: the watchful path can never trip Trap #1 by accident', () => {
    // Gate is akatomi_alert >= 30 after S5.1. Worst-case alert before the gate:
    // prologue anomaly 3 + fork E 10 + every S5.0/S5.1 bump except the strike.
    const s5 = storySource.slice(storySource.indexOf('SoloRoute5: ['), storySource.indexOf('Solo5BadEnd: ['));
    const bumps = (s5.match(/akatomi_alert: (\d+)/g) || [])
        .map(text => Number(text.replace(/\D+/g, '')));
    const strike = Math.max.apply(null, bumps);
    const watchful = 3 + 10 + bumps.filter(n => n !== strike).reduce((a, b) => a + b, 0);
    assert.ok(strike >= 30 - 13, 'night strike must always trip the 30% gate');
    assert.ok(watchful < 30, `prep + observe alert ${watchful} must stay below the 30% gate`);
});

test('every canon met_* contact has a route step that can set it', () => {
    // met_lumina stays unreachable for now (no Chorus of the Abyss route yet);
    // everything else must be settable or the Archives codex lies.
    ['met_miya', 'met_reika', 'met_saya', 'met_kurogane', 'met_splash', 'met_stella', 'met_momo'].forEach(flag => {
        assert.ok(storySource.includes(flag), `flag ${flag} is never set`);
    });
});

test('Momo route: retention methods are literal named options, both endings shipped', () => {
    // The route's teaching micro-choice literalizes the canon retention
    // toolkit — sugar overload, pomp, honesty — as named choice keys.
    const momo = storySource.slice(storySource.indexOf('MomoRoute: ['), storySource.indexOf('MomoEndingSong: ['));
    ['SweetLie: effectChoice', 'GrandPathos: effectChoice', 'HonestWrench: effectChoice'].forEach(key => {
        assert.ok(momo.includes(key), `Momo micro-choice missing ${key}`);
    });
    assert.ok(momo.indexOf('SingHerSong: routeChoice') > momo.indexOf('SweetLie: effectChoice'),
        'commitment node MO.1 must follow the teaching micro-choice');
    assert.ok(momo.includes('SingTheHymn: routeChoice'), 'bitter ending choice missing');
    // The happy arm must actually light the Archives happy-ending flag.
    const song = storySource.slice(storySource.indexOf('MomoEndingSong: ['), storySource.indexOf('MomoEndingEncore: ['));
    assert.ok(song.includes('happy_ending_achieved: true'), 'MomoEndingSong must set happy_ending_achieved');
    // Ren's pilot identity is load-bearing in the route body (mecha + bike).
    assert.ok(momo.includes('Титан') && momo.includes('Стриж'), 'route must feature both machines');
    assert.ok(song.includes('Титан'), 'the mecha must deliver the happy ending');
});

test('Ren pilots a combat mecha and a motorcycle across the whole script', () => {
    // Owner mandate: the machines are route furniture everywhere — prologue,
    // solo routes, Miya and Momo — never a single offhand mention. Machine
    // references land in the first lines of a route, so a fixed window is
    // enough and stays robust against later reordering.
    const startBlock = storySource.slice(storySource.indexOf('Start: ['), storySource.indexOf('SoloRoute1: ['));
    assert.ok(startBlock.includes('Стриж'), 'prologue must establish the motorcycle');
    assert.ok(startBlock.includes('Титан'), 'prologue must establish the mecha');
    ['SoloRoute1: [', 'SoloRoute2: [', 'SoloRoute3: [', 'SoloRoute5: [', 'MiyaRoute: [', 'MomoRoute: [']
        .forEach(label => {
            const block = storySource.slice(storySource.indexOf(label), storySource.indexOf(label) + 6000);
            assert.ok(/Стриж|Титан|Опекун/.test(block), `${label} must reference a machine`);
        });
});

test('graph teleport wipes presentation + history so Back cannot cross the jump boundary', () => {
    // Root cause of the "empty slide you cannot leave" deadlock: rollback() at
    // step 0 scans history('jump') for {label,0} destinations; a teleport left
    // there made Back cross into the pre-jump session (Start->Start self-edge),
    // replaying statements forward into a corrupted half-state where forward
    // clicks oscillate step -1/0/1 and the scene state has no <img>.
    const teleportBlock = source.slice(source.indexOf('Debug teleport.'), source.indexOf('function openGraph'));
    assert.ok(teleportBlock.includes('function wipePresentationAndHistory'),
        'teleport must have a presentation/history wiper');
    assert.ok((teleportBlock.match(/wipePresentationAndHistory\(\);/g) || []).length >= 2,
        'wiper must be called before AND after run(jump) (jump re-records a garbage entry)');
    assert.ok(teleportBlock.includes("hist[ns] = []"),
        'wiper must empty every history namespace (incl. history("jump"))');
    assert.ok(teleportBlock.includes("engine.state({ characters: [], images: [], scene: '' })"),
        'wiper must reset presentation state');
    assert.ok(teleportBlock.includes('.click()'),
        'teleport must auto-chain once so the player lands on a visible statement, not an empty slide');
    assert.ok(!/engine\.run\('jump ' \+ label\);\s*\}/.test(teleportBlock),
        'run(jump) must never be the last step of teleport again');
});

test('sprites scale by height only: engine max-width:100% is overridden', () => {
    const css = readFileSync(join(here, '..', 'vendor', 'custom-ui.css'), 'utf8');
    assert.ok(css.includes('max-width: none'),
        'custom-ui.css must override the engine default [data-character] max-width:100%');
    const worldScale = css.slice(css.indexOf('Sprite world scale'));
    assert.ok(worldScale.includes('[data-character="miya"]'),
        'per-character world scale table must exist');
});

test('world-scale table keeps sense: child smallest, CEO tallest of the roster', () => {
    const css = readFileSync(join(here, '..', 'vendor', 'custom-ui.css'), 'utf8');
    const heights = {};
    for (const m of css.matchAll(/\[data-character="([a-z]+)"\]\s+\{ max-height: ([\d.]+)vh/g)) {
        heights[m[1]] = Number(m[2]);
    }
    assert.ok(heights.miya && heights.momo && heights.yuki, 'world-scale rows missing');
    assert.ok(heights.miya < 60, 'Miya is a child — must stay clearly smaller');
    assert.ok(heights.momo < heights.yuki, 'Momo 152cm must be shorter than Yuki 167cm');
    assert.ok(heights.kurogane >= Math.max.apply(null, Object.values(heights)),
        'Kurogane is the tallest');
});

test('balcony cat easter egg: hidden node, prop sprite, reversible unlock, codex row', () => {
    const nyan = readFileSync(join(here, '..', 'vendor', 'story', 'nyan.js'), 'utf8');
    // Reachable from the balcony only — no atlas-visible route fork, no ending.
    const balcony = storySource.slice(storySource.indexOf('Solo1Home_Balcony: ['), storySource.indexOf('Solo1Home_BalconyDrones: ['));
    assert.match(balcony, /BalconyCat: routeChoice\([^)]*'Solo1Home_BalconyCat'/, 'balcony must offer the cat option');
    assert.match(nyan, /Solo1Home_BalconyCat: \[/);
    assert.doesNotMatch(nyan, /'end'/, 'the cat is a beat, not an ending');
    assert.match(nyan, /'jump Solo1Hub'|'Solo1Hub'/, 'the beat must return to the procrastination hub');
    // The sprite enters and LEAVES mid-scene (first character to do so).
    assert.match(nyan, /show character nyan normal/);
    assert.match(nyan, /hide character nyan with fadeOut/);
    // Unlock is a reversible storage set, read by the codex only once true.
    assert.match(nyan, /'player\.unlocked\.met_nyan': \{ mode: 'set', value: true \}/);
    assert.match(source, /p\.unlocked\.met_nyan === true/, 'archives must gate the row on the unlock');
    assert.match(source, /nyan: \{ name: 'НЯН'[^}]*sprites: \{ normal: 'nyan_normal\.svg' \}/, 'nyan is a prop character like radio');
    assert.ok(source.indexOf("'nyan', 'club'") > -1, 'nyan arc must be in the load order');
    assert.ok(source.slice(source.indexOf('var LABEL_TITLES')).includes('Solo1Home_BalconyCat:'), 'atlas title missing');
    // Offline: the sprite is a local hand-written SVG with no external refs.
    const svg = readFileSync(join(here, '..', 'assets', 'characters', 'nyan_normal.svg'), 'utf8');
    assert.doesNotMatch(svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, ''), /https?:\/\//);
    assert.match(svg, /<animate /, 'blink is SMIL inside the SVG (no JS)');
});

test('sprites hidden with an exit animation are actually removed (ghost-sprite regression)', () => {
    // The engine removes a hidden sprite on `animationend`, but mecha-ui.css
    // pins `animation: none !important` on every sprite, so the exit
    // animation never ran and the <img> stayed at full opacity until the
    // next `show scene`. custom-ui.css must re-arm the exit keyed on the
    // engine's own data-visibility="invisible" state.
    const css = readFileSync(join(here, '..', 'vendor', 'custom-ui.css'), 'utf8');
    const rule = css.match(/game-screen \[data-character\]\[data-visibility="invisible"\]\.animated\s*\{([^}]*)\}/);
    assert.ok(rule, 'exit-animation override missing');
    assert.match(rule[1], /animation-name:\s*fadeOut\s*!important/);
    assert.match(rule[1], /animation-iteration-count:\s*1\s*!important/);
    assert.match(rule[1], /animation-fill-mode:\s*both\s*!important/);
});
