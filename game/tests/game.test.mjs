// Regression tests for Seirin's shipped game script. Zero dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findBlockScopedFunctionDeclarations, findEs6Syntax } from './es5-scan.mjs';

const require = createRequire(import.meta.url);
const core = require('../vendor/game.js');
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'vendor', 'game.js'), 'utf8');
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

test('storage schema supplies complete, safe defaults', () => {
    const checked = core.buildStorageSchema(FS).check({ player: {}, flags: {} });
    assert.equal(checked.ok, true);
    assert.equal(checked.value.player.name, 'Рэн');
    assert.equal(checked.value.player.akatomi_alert, 0);
    assert.equal(checked.value.flags.happy_ending_achieved, false);
});

test('all declared story jumps target real labels', () => {
    const labels = [...source.matchAll(/^\s{12}([A-Za-z][A-Za-z0-9]*): \[/gm)].map(m => m[1]);
    assert.deepEqual(labels.sort(), [
        'Start',
        'SoloRoute1', 'SoloRoute2', 'SoloRoute3', 'SoloRoute4', 'SoloRoute5',
        'Solo5BadEnd', 'Solo5Standoff',
        'MiyaRoute', 'MiyaEndingHarmony', 'MiyaEndingGuardian',
        'AIRoute', 'AIEndingTranscendence', 'AIEndingIsolation'
    ].sort());
    // routeChoice constructs its jump dynamically, so inspect every supplied
    // target rather than looking for a literal `jump Label` in the source.
    const jumps = [...source.matchAll(/routeChoice\([\s\S]*?,\s*'([A-Za-z][A-Za-z0-9]*)'/g)].map(m => m[1]);
    assert.equal(jumps.length, 11);
    jumps.forEach(label => assert.ok(labels.includes(label), `missing target ${label}`));
});

test('choices use the matched FailSafe choiceEffect callback pair', () => {
    assert.match(source, /onChosen: effect\.onChosen, onRevert: effect\.onRevert/);
    assert.doesNotMatch(source, /onRevert:\s*function/);
    assert.ok((source.match(/vn\.goTo\(/g) || []).length >= 5, 'each location change is reversible');
});

test('location changes are real vn.goTo actions, never quoted command strings', () => {
    // Regression: route labels once carried 'vn.goTo("Location")' as a plain
    // string, which the engine cannot execute (unknown action id).
    assert.doesNotMatch(source, /['"]vn\.goTo\(/);
    assert.equal(source.indexOf('vn.goTo(&quot;'), -1);
});

test('stat-gated branching is actually used (vn.branch with both arms)', () => {
    assert.match(source, /vn\.branch\(/);
    const branches = [...source.matchAll(/vn\.branch\([\s\S]*?\{[\s\S]*?True:[\s\S]*?False:[\s\S]*?\}\)/g)];
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
        'Solo5BadEnd', 'Solo5Standoff', 'MiyaRoute', 'MiyaEndingHarmony', 'MiyaEndingGuardian',
        'AIRoute', 'AIEndingTranscendence', 'AIEndingIsolation']
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
    const iBelieve = source.indexOf('Believe: effectChoice');
    const iFork = source.indexOf('Home: routeChoice');
    assert.ok(iBelieve > -1, 'magic-question micro-choice missing');
    assert.ok(iFork > -1, '7-way canon fork missing');
    assert.ok(iBelieve < iFork, 'micro-choice must come before the route fork');
    assert.match(source, /reversible\(\{ akatomi_alert: 3 \}\)/);
});

test('every route teaches with a micro-choice before its commitment beat', () => {
    // Each of the 7 routes mirrors the prologue hook ladder in miniature:
    // arrival -> voice beat -> low-stakes effectChoice (instant stat feedback)
    // -> escalation into the route's commitment node. Pins order per route.
    const beats = [
        ['SoloRoute1: [', 'CouchMarathon: effectChoice', '[ ТИХОЕ ПОРАЖЕНИЕ ]'],
        ['SoloRoute2: [', 'ToastStatusQuo: effectChoice', 'vn.reversible({ procrastination: 10 })'],
        ['SoloRoute3: [', 'TaskPerfect: effectChoice', 'show character kurogane'],
        ['SoloRoute4: [', 'CheckSky: effectChoice', 'за монитором'],
        ['SoloRoute5: [', 'PrepCharges: effectChoice', 'NightStrike: effectChoice'],
        ['MiyaRoute: [', 'ArtWire: effectChoice', 'Embrace: routeChoice'],
        ['AIRoute: [', 'GreetRhythm: effectChoice', 'Connect: routeChoice']
    ];
    beats.forEach(([label, micro, commitment]) => {
        const from = source.indexOf(label);
        const atMicro = source.indexOf(micro);
        const atCommit = source.indexOf(commitment);
        assert.ok(from > -1, `route label missing: ${label}`);
        assert.ok(atMicro > from, `micro-beat ${micro} must live inside ${label}`);
        assert.ok(atCommit > atMicro, `micro-beat must precede ${commitment}`);
    });
    // Micro-beats are teaching moments, not route forks: they must never jump.
    assert.equal((source.match(/effectChoice\([\s\S]*?Do:/g) || []).length, 0);
});

test('Solo 5 balance: the watchful path can never trip Trap #1 by accident', () => {
    // Gate is akatomi_alert >= 30 after S5.1. Worst-case alert before the gate:
    // prologue anomaly 3 + fork E 10 + every S5.0/S5.1 bump except the strike.
    const s5 = source.slice(source.indexOf('SoloRoute5: ['), source.indexOf('Solo5BadEnd: ['));
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
    ['met_miya', 'met_reika', 'met_saya', 'met_kurogane', 'met_splash', 'met_stella'].forEach(flag => {
        assert.ok(source.includes(flag), `flag ${flag} is never set`);
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
