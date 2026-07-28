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
