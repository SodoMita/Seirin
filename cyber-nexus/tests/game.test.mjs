// Unit tests for cyber-nexus/vendor/game.js (PART 1 — the pure core).
// ----------------------------------------------------------------------------
// These run with ZERO dependencies: `node --test cyber-nexus/tests/game.test.mjs`.
// Before the game code was extracted from index.html's inline <script>, none of
// this was reachable by any test except the jsdom smoke test — which skips by
// default, so in practice the game logic was never executed by CI at all.
//
// The star of the file is the double-payout regression: clicking the correct
// node twice inside the 1.3s success window used to pay out twice, which is the
// entire reason the mini-game state machine exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findBlockScopedFunctionDeclarations, findEs6Syntax } from './es5-scan.mjs';

const require = createRequire(import.meta.url);
const FS = require('../vendor/failsafe.js');
const core = require('../vendor/game.js');
const here = dirname(fileURLToPath(import.meta.url));
const gameSrc = readFileSync(join(here, '..', 'vendor', 'game.js'), 'utf8');

/** Deterministic stand-in for Math.random: cycles a fixed list. */
function seededRandom (values) {
    let i = 0;
    return () => values[i++ % values.length];
}

/* ------------------------------------------------------- loading contract -- */
test('game.js loads under Node with no DOM and exports only the pure core', () => {
    // The browser IIFE (PART 2) must bail out before touching window/document,
    // otherwise requiring this file in a test would throw.
    assert.equal(typeof globalThis.window, 'undefined', 'precondition: no DOM in this process');
    assert.deepEqual(Object.keys(core).sort(), [
        'HACK_MACHINE_CONFIG', 'HACK_REWARD', 'applyAward', 'buildRoundOptions',
        'buildStorageSchema', 'createHackController', 'randomHex',
    ]);
});

test('game.js ships as ES5 with no module syntax (it is a plain <script src>)', () => {
    assert.deepEqual(findBlockScopedFunctionDeclarations(gameSrc), []);
    assert.deepEqual(findEs6Syntax(gameSrc), []);
    assert.ok(!/^\s*(?:import|export)\s/m.test(gameSrc), 'no import/export in shipped game code');
    assert.doesNotThrow(() => new Function('"use strict";\n' + gameSrc));
});

test('game.js contains no network calls — the page must never need a server', () => {
    const code = gameSrc
        .replace(/\/\*[\s\S]*?\*\//g, '')       // block comments
        .replace(/^\s*\/\/.*$/gm, '');           // line comments
    for (const forbidden of [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bsendBeacon\b/,
        /\bnew\s+WebSocket\b/, /\bnew\s+EventSource\b/, /\bimportScripts\b/,
        /\bserviceWorker\b/, /https?:\/\//]) {
        assert.equal(forbidden.test(code), false, `game.js must not contain ${forbidden}`);
    }
});

/* ------------------------------------------------------------- randomHex -- */
test('randomHex: shape is 0xNN-NN-NN with uppercase hex', () => {
    for (let i = 0; i < 200; i++) {
        assert.match(core.randomHex(), /^0x[0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2}$/);
    }
});

test('randomHex: injectable randomness makes it deterministic', () => {
    // 0 -> '0', 1 (just under) -> 'F'; six draws, one per nibble.
    assert.equal(core.randomHex(seededRandom([0])), '0x00-00-00');
    assert.equal(core.randomHex(seededRandom([0.9999])), '0xFF-FF-FF');
    const a = core.randomHex(seededRandom([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]));
    const b = core.randomHex(seededRandom([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]));
    assert.equal(a, b, 'same seed must give the same key');
});

test('randomHex: uses the whole 16-value alphabet, not a biased subset', () => {
    const seen = new Set();
    for (let i = 0; i < 3000; i++) {
        for (const ch of core.randomHex().replace(/^0x/, '').replace(/-/g, '')) { seen.add(ch); }
    }
    assert.equal(seen.size, 16, `expected all 16 hex digits, saw ${[...seen].sort().join('')}`);
});

/* ------------------------------------------------------ buildRoundOptions -- */
test('buildRoundOptions: always 4 distinct choices including the target', () => {
    for (let i = 0; i < 100; i++) {
        const target = core.randomHex();
        const opts = core.buildRoundOptions(target);
        assert.equal(opts.length, 4);
        assert.equal(new Set(opts).size, 4, 'decoys must be distinct');
        assert.ok(opts.includes(target), 'the target must be among the options');
    }
});

test('buildRoundOptions: a degenerate random source cannot hang the game', () => {
    // Every generated decoy collides with the target; the loop must still
    // terminate and still return a well-formed round.
    const opts = core.buildRoundOptions('0x00-00-00', () => 0);
    assert.equal(opts.length, 4);
    assert.equal(new Set(opts).size, 4);
    assert.ok(opts.includes('0x00-00-00'));
});

/* --------------------------------------------------------- hack machine --- */
test('hack machine config: only the intended transitions exist', () => {
    const m = FS.machine(core.HACK_MACHINE_CONFIG);
    assert.equal(m.transition('idle', 'START').state, 'active');
    assert.equal(m.transition('active', 'HIT').state, 'resolved');
    assert.equal(m.transition('active', 'MISS').state, 'cooldown');
    assert.equal(m.transition('cooldown', 'REGEN').state, 'active');
    assert.equal(m.transition('resolved', 'START').state, 'active');

    // The transitions that must NOT exist — these are the payout holes.
    assert.equal(m.transition('resolved', 'HIT').changed, false, 'no second HIT from resolved');
    assert.equal(m.transition('idle', 'HIT').changed, false, 'no HIT without a round');
    assert.equal(m.transition('cooldown', 'HIT').changed, false, 'no HIT during cooldown');
    assert.equal(m.transition('active', 'START').changed, false, 'no restart mid-round');
});

test('hack machine: an unknown event never throws, it just does not move', () => {
    const m = FS.machine(core.HACK_MACHINE_CONFIG);
    const r = m.transition('active', 'DEFINITELY_NOT_AN_EVENT');
    assert.equal(r.changed, false);
    assert.equal(r.state, 'active');
});

/* ------------------------------------------------- hack controller / payout */
test('hack controller: a correct first guess pays exactly once', () => {
    const hack = core.createHackController(FS);
    const round = hack.startRound();
    assert.equal(hack.state(), 'active');
    const result = hack.guess(round.target);
    assert.equal(result.counted, true);
    assert.equal(result.outcome, 'HIT');
    assert.deepEqual(result.reward, { creds: 100, hacking: 1 });
    assert.equal(hack.state(), 'resolved');
});

test('REGRESSION: a second correct click inside the success window pays NOTHING', () => {
    // This is the exact bug the state machine was introduced to fix: the old
    // code trusted the click, so double-clicking the right node during the
    // 1.3s close delay awarded +200 CR / +2 HACK.
    const hack = core.createHackController(FS);
    const round = hack.startRound();
    const player = { creds: 500, hacking: 3 };

    const first = hack.guess(round.target);
    assert.equal(first.counted, true);
    core.applyAward(player, first.reward);
    assert.deepEqual(player, { creds: 600, hacking: 4 });

    // Spam the same node the way an impatient player does.
    for (let i = 0; i < 10; i++) {
        const again = hack.guess(round.target);
        assert.equal(again.counted, false, 'repeat clicks must not count');
        assert.equal(again.reward, null, 'repeat clicks must not carry a reward');
        if (again.reward) { core.applyAward(player, again.reward); }
    }
    assert.deepEqual(player, { creds: 600, hacking: 4 }, 'payout must still be exactly one win');
});

test('hack controller: a wrong guess pays nothing and goes to cooldown', () => {
    const hack = core.createHackController(FS);
    hack.startRound('0xAA-BB-CC');
    const result = hack.guess('0x11-22-33');
    assert.equal(result.counted, true);
    assert.equal(result.outcome, 'MISS');
    assert.equal(result.reward, null);
    assert.equal(hack.state(), 'cooldown');
});

test('hack controller: guesses before a round starts are ignored', () => {
    const hack = core.createHackController(FS);
    assert.equal(hack.state(), 'idle');
    const result = hack.guess('0xAA-BB-CC');
    assert.equal(result.counted, false);
    assert.equal(result.reward, null);
    assert.equal(hack.state(), 'idle', 'a stray click must not start a round');
});

test('hack controller: MISS then a new round is playable and pays once', () => {
    const hack = core.createHackController(FS);
    hack.startRound('0xAA-BB-CC');
    hack.guess('0x11-22-33');                     // MISS -> cooldown
    assert.equal(hack.state(), 'cooldown');
    hack.startRound('0xDD-EE-FF');                // REGEN -> active
    assert.equal(hack.state(), 'active');
    const win = hack.guess('0xDD-EE-FF');
    assert.equal(win.counted, true);
    assert.deepEqual(win.reward, core.HACK_REWARD);
});

test('hack controller: many rounds pay exactly one reward per win', () => {
    const hack = core.createHackController(FS);
    const player = { creds: 0, hacking: 0 };
    let wins = 0;
    for (let i = 0; i < 25; i++) {
        const round = hack.startRound();
        const outcomes = [round.target, round.target, round.target]; // triple-click every time
        for (const guess of outcomes) {
            const r = hack.guess(guess);
            if (r.counted && r.reward) { core.applyAward(player, r.reward); wins++; }
        }
    }
    assert.equal(wins, 25, 'one payout per round, never more');
    assert.deepEqual(player, { creds: 2500, hacking: 25 });
});

test('hack controller: reward object is not mutated by applyAward', () => {
    // The controller hands out a shared constant; a caller must not be able to
    // corrupt future payouts by mutating the object it received.
    const hack = core.createHackController(FS);
    const round = hack.startRound();
    const reward = hack.guess(round.target).reward;
    const player = { creds: 0, hacking: 0 };
    core.applyAward(player, reward);
    assert.deepEqual(core.HACK_REWARD, { creds: 100, hacking: 1 }, 'HACK_REWARD must stay pristine');
    assert.deepEqual(reward, { creds: 100, hacking: 1 });
});

/* ------------------------------------------------------------ applyAward -- */
test('applyAward: numbers accumulate, non-numbers are replaced', () => {
    const p = { creds: 500, hacking: 3, name: 'Vesper', location: 'Sector 7' };
    core.applyAward(p, { creds: 100, hacking: 1 });
    assert.deepEqual(p, { creds: 600, hacking: 4, name: 'Vesper', location: 'Sector 7' });
    core.applyAward(p, { location: 'Neo-Veridia' });
    assert.equal(p.location, 'Neo-Veridia');
});

test('applyAward: tolerates missing player / empty changes instead of throwing', () => {
    assert.doesNotThrow(() => core.applyAward(null, { creds: 1 }));
    assert.doesNotThrow(() => core.applyAward({ creds: 0 }, null));
    const p = { creds: 5 };
    core.applyAward(p, {});
    assert.equal(p.creds, 5);
});

/* --------------------------------------------------------- storage schema -- */
test('storage schema: a fresh save validates and fills every default', () => {
    const schema = core.buildStorageSchema(FS);
    const r = schema.check({ player: {}, flags: {} });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, {
        player: { name: 'Vesper', creds: 0, karma: 0, hacking: 0, location: 'Sector 7: Neon Slums' },
        flags: { met_nyx: false, hacked_vanguard: false, sided_with_aria: false, vanguard_alert: 0 },
    });
});

test('storage schema: rejects the wrong types and reports the paths', () => {
    const schema = core.buildStorageSchema(FS);
    const r = schema.check({
        player: { name: 42, creds: 'lots', karma: 0, hacking: 1, location: 'x' },
        flags: { met_nyx: 'yes', hacked_vanguard: false, sided_with_aria: false, vanguard_alert: 0 },
    });
    assert.equal(r.ok, false);
    const paths = r.issues.map(i => i.path);
    assert.ok(paths.includes('player.name'));
    assert.ok(paths.includes('player.creds'));
    assert.ok(paths.includes('flags.met_nyx'));
});

test('storage schema: hacking is a non-negative integer (a mini-game payout target)', () => {
    const schema = core.buildStorageSchema(FS);
    assert.equal(schema.check({ player: { hacking: 2.5 }, flags: {} }).ok, false, 'no fractional levels');
    assert.equal(schema.check({ player: { hacking: -1 }, flags: {} }).ok, false, 'no negative levels');
    assert.equal(schema.check({ player: { hacking: 7 }, flags: {} }).ok, true);
});

test('storage schema: an award keeps storage valid (payout cannot corrupt a save)', () => {
    const schema = core.buildStorageSchema(FS);
    const state = schema.check({ player: {}, flags: {} }).value;
    core.applyAward(state.player, core.HACK_REWARD);
    const after = schema.check(state);
    assert.equal(after.ok, true, JSON.stringify(after.issues));
    assert.equal(after.value.player.creds, 100);
    assert.equal(after.value.player.hacking, 1);
});

/* -------------------------------------------------- story-script contract -- */
test('vendor/game.js keeps the machine-checkable editing rules as comments', () => {
    // The story-script header documents the traps lintScript() enforces. If the
    // rules are deleted, the next author loses the only in-file warning.
    for (const phrase of ['vn.reversible', 'vn.choiceEffect', 'vn.branch', 'onRevert']) {
        assert.ok(gameSrc.includes(phrase), `game.js must still document ${phrase}`);
    }
});

test('vendor/game.js adds no NEW raw storage writes outside the vn facade', () => {
    // AGENTS.md: all story-state mutation goes through FailSafe.vn, so that
    // rollback is correct by construction. A direct `storage(...).x = ...` is
    // exactly what that rule forbids.
    //
    // There is ONE pre-existing exception, left as-is deliberately (changing it
    // is a behaviour change, not a test change): the Input step's `Save`
    // handler writes `engine.storage('player').name`. vn.lintScript() does not
    // inspect Input handlers, so nothing else catches it. It is comparatively
    // benign — the engine re-prompts for the name on replay — but it IS a hole,
    // and it is recorded here so it stays visible.
    const KNOWN_EXCEPTIONS = ["engine.storage('player').name = input.trim();"];

    const code = gameSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const writes = [...code.matchAll(/[A-Za-z_$][\w$.]*storage\([^)]*\)\s*\.\s*[A-Za-z_$][\w$]*\s*[+-]?=[^=]/g)]
        .map(m => m[0].trim().replace(/\s+/g, ' '));
    const unexpected = writes.filter(w => !KNOWN_EXCEPTIONS.some(k => k.startsWith(w.slice(0, -1).trim())));

    assert.deepEqual(unexpected, [],
        'new direct storage mutation(s) found — use FailSafe.vn.* so rollback stays correct');
    assert.equal(writes.length, KNOWN_EXCEPTIONS.length,
        'the set of known raw storage writes changed; update KNOWN_EXCEPTIONS deliberately');
});
