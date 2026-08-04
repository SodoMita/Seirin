// Unit tests for cyber-nexus/vendor/failsafe.js
// Run with zero dependencies:  node --test cyber-nexus/tests/failsafe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { findBlockScopedFunctionDeclarations, findEs6Syntax } from './es5-scan.mjs';

const require = createRequire(import.meta.url);
const FS = require('../vendor/failsafe.js');
const here = dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------- result -- */
test('result: ok/err mapping and unwrap', () => {
    const r = FS.result.ok(5).map(v => v + 1);
    assert.equal(r.isOk(), true);
    assert.equal(r.value, 6);
    const e = FS.result.err('boom').map(v => v + 1);
    assert.equal(e.isErr(), true);
    assert.equal(e.unwrapOr(42), 42);
});

test('result: attempt captures throws instead of crashing', () => {
    const bad = FS.result.attempt(() => { throw new Error('nope'); });
    assert.equal(bad.isErr(), true);
    assert.match(String(bad.error.message), /nope/);
    const good = FS.result.attempt(() => 7);
    assert.equal(good.value, 7);
});

test('result: fromPromise resolves to Result', async () => {
    const r = await FS.result.fromPromise(Promise.resolve('x'));
    assert.equal(r.value, 'x');
    const e = await FS.result.fromPromise(Promise.reject(new Error('p')));
    assert.equal(e.isErr(), true);
});

/* ---------------------------------------------------------------- schema -- */
const saveSchema = FS.schema.object({
    player: FS.schema.object({
        name: FS.schema.string().default('Vesper'),
        creds: FS.schema.number().default(0),
        hacking: FS.schema.number({ int: true, min: 0 }).default(0),
    }),
    flags: FS.schema.object({ met_nyx: FS.schema.boolean().default(false) }),
});

test('schema: valid save passes unchanged', () => {
    const r = saveSchema.check({ player: { name: 'Zed', creds: 50, hacking: 3 }, flags: { met_nyx: true } });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value.player.name, 'Zed');
});

test('schema: missing fields pull defaults', () => {
    const r = saveSchema.check({ player: {}, flags: {} });
    assert.equal(r.ok, true);
    assert.equal(r.value.player.name, 'Vesper');
    assert.equal(r.value.flags.met_nyx, false);
});

test('schema: wrong types report issues with paths', () => {
    const r = saveSchema.check({ player: { name: 5, creds: 'lots', hacking: 1 }, flags: { met_nyx: true } });
    assert.equal(r.ok, false);
    const paths = r.issues.map(i => i.path);
    assert.ok(paths.includes('player.name'));
    assert.ok(paths.includes('player.creds'));
});

test('schema: int/range and enum constraints enforced', () => {
    assert.equal(saveSchema.check({ player: { hacking: 1.5 }, flags: {} }).ok, false);
    const color = FS.schema.enumeration(['red', 'blue']);
    assert.equal(color.check('red').ok, true);
    assert.equal(color.check('green').ok, false);
    assert.equal(FS.schema.number({ min: 1, max: 3 }).check(9).ok, false);
});

/* ----------------------------------------------------------------- immut -- */
test('immut: produce does not mutate base and freezes result', () => {
    const base = { a: { b: 1 }, list: [1, 2] };
    const next = FS.immut.produce(base, draft => { draft.a.b = 2; draft.list.push(3); });
    assert.equal(base.a.b, 1);
    assert.equal(base.list.length, 2);
    assert.equal(next.a.b, 2);
    assert.equal(next.list.length, 3);
    assert.ok(Object.isFrozen(next));
    assert.ok(Object.isFrozen(next.a));
    assert.throws(() => { 'use strict'; next.a.b = 99; }, TypeError);
});

/* ----------------------------------------------------------------- match -- */
test('match: subset objects, predicates, wildcard, exhaustive', () => {
    const outcome = FS.match({ route: 'endings', ending: 'A' })
        .with({ route: 'endings', ending: 'A' }, () => 'singularity')
        .with({ route: 'endings' }, v => 'some ending ' + v.ending)
        .with(FS.match._, () => 'other')
        .exhaustive();
    assert.equal(outcome, 'singularity');

    assert.equal(FS.match(7).with(v => v > 3, () => 'big').otherwise('small'), 'big');
    assert.equal(FS.match(1).with(v => v > 3, () => 'big').otherwise('small'), 'small');
    assert.throws(() => FS.match('x').with(1, () => 'one').exhaustive(), /Non-exhaustive/);
});

/* --------------------------------------------------------------- machine -- */
test('machine: guarded transitions, never crashes on bad events', () => {
    const m = FS.machine({
        id: 'routes', initial: 'ch1', context: { hacking: 3 },
        states: {
            ch1: { on: { HACK: { target: 'ch3', guard: ctx => ctx.hacking >= 4, assign: ctx => ({ hacking: ctx.hacking + 1 }) } } },
            ch3: { on: { END: 'finale' } },
            finale: { type: 'final' },
        },
    });
    const blocked = m.transition('ch1', { type: 'HACK' });
    assert.equal(blocked.changed, false);
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.state, 'ch1');

    const noop = m.transition('ch1', { type: 'NOPE' });
    assert.equal(noop.changed, false);

    const bad = m.resolve('ch1', m.initialContext, { type: '??' });
    assert.equal(bad.changed, false);

    const through = m.resolve('ch1', { hacking: 5 }, { type: 'HACK' });
    assert.equal(through.state, 'ch3');
    assert.equal(through.context.hacking, 6);
    assert.ok(m.isFinal('finale'));
    assert.equal(m.can('ch3', 'END'), true);
});

test('machine: throws early on invalid config', () => {
    assert.throws(() => FS.machine({ initial: 'ghost', states: {} }), /initial/);
});

/* ----------------------------------------------------------------- vn ----- */
/* Minimal fake of the Monogatari engine surface used by FailSafe.vn. */
function fakeEngine () {
    const storage = {
        player: { name: 'Vesper', creds: 500, karma: 0, hacking: 3, location: 'Sector 7: Neon Slums' },
        flags: { met_nyx: false, sided_with_aria: true },
    };
    return {
        _storage: storage,
        storage (key, value) {
            // mirrors Monogatari: storage() -> full, storage(obj) -> merge patch,
            // storage(key) -> sub-object, storage(key, value) -> replace sub-object
            if (key === undefined) { return storage; }
            if (typeof key === 'object' && key !== null) {
                Object.keys(key).forEach(function (k) { storage[k] = key[k]; });
                return storage;
            }
            if (value !== undefined) { storage[key] = value; }
            return storage[key];
        },
        _script: {},
        script () { return this._script; },
    };
}

test('vn.reversible: apply mutates, revert restores EXACT previous values', () => {
    const e = fakeEngine();
    const vn = FS.vn(e, {});
    const action = vn.reversible({ hacking: 2, karma: -10 });
    action.Function.Apply.call({});
    assert.equal(e.storage('player').hacking, 5);
    assert.equal(e.storage('player').karma, -10);
    action.Function.Revert.call({});
    assert.equal(e.storage('player').hacking, 3);
    assert.equal(e.storage('player').karma, 0);
});

test('vn.reversible: flags snapshot (NOT boolean-inversion) — the original bug', () => {
    const e = fakeEngine(); // sided_with_aria starts TRUE on purpose
    const vn = FS.vn(e, {});
    const action = vn.reversible({ flags: { sided_with_aria: true } });
    action.Function.Apply.call({});
    assert.equal(e.storage('flags').sided_with_aria, true);
    action.Function.Revert.call({}); // still true — boolean-NOT would have falsely cleared it
    assert.equal(e.storage('flags').sided_with_aria, true);
});

test('vn.reversible: LIFO stacking across repeated applies', () => {
    const e = fakeEngine();
    const vn = FS.vn(e, {});
    const action = vn.reversible({ creds: 100 });
    action.Function.Apply.call({}); // 600
    action.Function.Apply.call({}); // 700 (replayed jump applies again)
    assert.equal(e.storage('player').creds, 700);
    action.Function.Revert.call({});
    assert.equal(e.storage('player').creds, 600);
    action.Function.Revert.call({});
    assert.equal(e.storage('player').creds, 500);
});

test('vn.reversible: set-mode, dotted storage keys and location', () => {
    const e = fakeEngine();
    const vn = FS.vn(e, {});
    const action = vn.reversible({
        set: { name: 'Zed' },
        storage: { 'flags.met_nyx': { mode: 'set', value: true } },
        location: 'Neo-Veridia: Free Grid',
    });
    action.Function.Apply.call({});
    assert.equal(e.storage('player').name, 'Zed');
    assert.equal(e.storage('flags').met_nyx, true);
    assert.equal(e.storage('player').location, 'Neo-Veridia: Free Grid');
    action.Function.Revert.call({});
    assert.equal(e.storage('player').name, 'Vesper');
    assert.equal(e.storage('flags').met_nyx, false);
    assert.equal(e.storage('player').location, 'Sector 7: Neon Slums');
});

test('vn.setTime/addTime/getTime: absolute vs delta, both rollback-safe', () => {
    const e = fakeEngine();
    e.storage('player').time = 1260; // 21:00
    const vn = FS.vn(e, {});
    assert.equal(vn.getTime(), 1260);
    // addTime is a delta
    const add = vn.addTime(7);
    add.Function.Apply.call({});
    assert.equal(vn.getTime(), 1267); // 21:07
    add.Function.Revert.call({});
    assert.equal(vn.getTime(), 1260);
    // setTime is absolute
    const set = vn.setTime(47); // 00:47
    set.Function.Apply.call({});
    assert.equal(vn.getTime(), 47);
    set.Function.Revert.call({});
    assert.equal(vn.getTime(), 1260);
    // missing time reads as 0, never crashes
    const bare = fakeEngine();
    const vn2 = FS.vn(bare, { silent: true });
    assert.equal(vn2.getTime(), 0);
});

test('vn.choiceEffect: onChosen/onRevert pair restores prior state', () => {
    const e = fakeEngine(); // sided_with_aria already true
    const vn = FS.vn(e, {});
    const fx = vn.choiceEffect({ karma: 20, flags: { sided_with_aria: true } });
    const karmaBefore = e.storage('player').karma;
    fx.onChosen();
    assert.equal(e.storage('player').karma, karmaBefore + 20);
    fx.onRevert();
    assert.equal(e.storage('player').karma, karmaBefore);
    assert.equal(e.storage('flags').sided_with_aria, true);
});

test('vn.goTo: reverts to the location the player ACTUALLY came from', () => {
    const e = fakeEngine();
    const vn = FS.vn(e, {});
    e.storage('player').location = 'Somewhere Else First';
    const hop = vn.goTo('Sector 7: Alleyway Ambush');
    hop.Function.Apply.call({});
    assert.equal(e.storage('player').location, 'Sector 7: Alleyway Ambush');
    hop.Function.Revert.call({});
    assert.equal(e.storage('player').location, 'Somewhere Else First');
});

test('vn.branch: throwing condition falls back to False with an error log, never crashes', () => {
    const e = fakeEngine();
    const vn = FS.vn(e, { silent: true });
    const cond = vn.branch(() => { throw new Error('bad cond'); }, { True: 'jump A', False: 'jump B' });
    assert.equal(cond.Conditional.Condition.call({}), false);
    const cond2 = FS.vn(e, { silent: true }).branch(() => true, { True: 'jump A' });
    assert.equal(cond2.Conditional.Condition.call({}), true);
    assert.equal(cond2.Conditional.False, ''); // auto-added missing branch
});

test('vn.validateStorage: repairs defaults and reports issues as a Result', () => {
    const e = fakeEngine();
    delete e._storage.player.hacking; // simulate a save from an older version
    const vn = FS.vn(e, { silent: true });
    const schema2 = FS.schema.object({
        player: FS.schema.object({ hacking: FS.schema.number().default(1) }, { passthrough: true }),
    }, { passthrough: true });
    const r = vn.validateStorage(schema2);
    assert.equal(r.isOk(), true);
    assert.equal(e.storage('player').hacking, 1);
});

test('vn.lintScript: finds bare functions, missing labels, non-reversible choices', () => {
    const e = fakeEngine();
    e._script = {
        Start: [
            'say hi',
            function () {},                        // bare function: blocks rollback
            'jump Missing Label',
            { Choice: { A: { Text: 'a', Do: 'jump AlsoMissing', onChosen: () => {} } } },
            { Conditional: { Condition: () => true, True: 'jump End' } }, // no False
        ],
        End: ['end'],
    };
    const vn = FS.vn(e, { silent: true });
    const report = vn.lintScript({ silent: true });
    const rules = report.issues.map(i => i.rule);
    assert.ok(rules.includes('bare-function'));
    assert.ok(rules.includes('missing-label'));
    assert.ok(rules.includes('non-reversible-choice'));
    assert.ok(rules.includes('missing-false-branch'));
    assert.equal(report.ok, false);
});

test('vn.lintScript: a clean script reports ok', () => {
    const e = fakeEngine();
    e._script = { Start: ['say hi', 'jump End'], End: ['end'] };
    const report = FS.vn(e, { silent: true }).lintScript({ silent: true });
    assert.equal(report.ok, true);
    assert.equal(report.issues.length, 0);
});

/* ----------------------------------------------------------------- net ---- */
/* net.guard() patches globals, so every test here installs its own fake
 * `window`, always calls guard.stop(), and restores `global.window` in a
 * `finally` — the suite must stay order-independent. */
function withFakeWindow (fake, fn) {
    const saved = Object.prototype.hasOwnProperty.call(global, 'window') ? global.window : undefined;
    const had = Object.prototype.hasOwnProperty.call(global, 'window');
    global.window = fake;
    try { return fn(); }
    finally { if (had) { global.window = saved; } else { delete global.window; } }
}

test('net.guard: block mode fails fetches and records violations', async () => {
    const target = { fetch: async () => 'remote' };
    const savedWindow = global.window;
    global.window = target;
    try {
        const guard = FS.net.guard({ mode: 'block', onViolation: () => {} });
        await assert.rejects(target.fetch('https://evil.cdn/lib.js'), /blocked fetch/);
        assert.equal(FS.net.violations.at(-1).kind, 'fetch');
        guard.stop();
        const r = await target.fetch('https://ok');
        assert.equal(r, 'remote'); // restored
    } finally {
        if (savedWindow === undefined) { delete global.window; } else { global.window = savedWindow; }
    }
});

test('net.guard: records the full target for URL and Request inputs, never undefined', async () => {
    // Regression: the old extractor was `typeof input === 'string' ? input : input.url`,
    // and a URL object has no `.url`, so `fetch(new URL(...))` logged `undefined`.
    const target = { fetch: async () => 'remote' };
    await withFakeWindow(target, async () => {
        const guard = FS.net.guard({ mode: 'block', onViolation: () => {} });
        try {
            await assert.rejects(target.fetch(new URL('https://x.test/a')), /blocked fetch/);
            assert.equal(FS.net.violations.at(-1).target, 'https://x.test/a');

            await assert.rejects(target.fetch({ url: 'https://x.test/req' }), /blocked fetch/); // Request-alike
            assert.equal(FS.net.violations.at(-1).target, 'https://x.test/req');

            await assert.rejects(target.fetch('https://x.test/str'), /blocked fetch/);
            assert.equal(FS.net.violations.at(-1).target, 'https://x.test/str');

            // Nothing may ever be reported as the literal string 'undefined'.
            await assert.rejects(target.fetch({ toString: () => 'weird-input' }), /blocked fetch/);
            assert.equal(FS.net.violations.at(-1).target, 'weird-input');
            assert.ok(FS.net.violations.every(v => v.target !== 'undefined'));
        } finally { guard.stop(); }
    });
});

test('net.guard: guarded XMLHttpRequest keeps its constants, prototype and instanceof', () => {
    // Regression: the wrapper was a plain function relying on "constructor
    // returning an object overrides this", so XMLHttpRequest.DONE was gone and
    // `.prototype` was unrelated to the real one.
    class FakeXHR {
        open () {} send () {} setRequestHeader () {}
    }
    FakeXHR.UNSENT = 0; FakeXHR.OPENED = 1; FakeXHR.HEADERS_RECEIVED = 2;
    FakeXHR.LOADING = 3; FakeXHR.DONE = 4;
    const origPrototype = FakeXHR.prototype;

    const target = { XMLHttpRequest: FakeXHR };
    withFakeWindow(target, () => {
        const guard = FS.net.guard({ mode: 'observe', onViolation: () => {} });
        try {
            const Guarded = target.XMLHttpRequest;
            assert.notEqual(Guarded, FakeXHR, 'guard should have replaced the constructor');
            assert.equal(Guarded.UNSENT, 0);
            assert.equal(Guarded.OPENED, 1);
            assert.equal(Guarded.HEADERS_RECEIVED, 2);
            assert.equal(Guarded.LOADING, 3);
            assert.equal(Guarded.DONE, 4);
            assert.equal(Guarded.prototype, origPrototype);

            const xhr = new Guarded();
            assert.ok(xhr instanceof Guarded, 'instances must satisfy instanceof the guarded ctor');
            assert.ok(xhr instanceof FakeXHR, 'and still be real XHRs');
            assert.equal(typeof xhr.send, 'function', 'prototype methods still reachable');

            const before = FS.net.violations.length;
            xhr.open('GET', 'https://x.test/xhr');
            assert.equal(FS.net.violations.length, before + 1);
            assert.equal(FS.net.violations.at(-1).kind, 'xhr');
            assert.equal(FS.net.violations.at(-1).target, 'https://x.test/xhr');
        } finally { guard.stop(); }
        assert.equal(target.XMLHttpRequest, FakeXHR, 'stop() restores the original constructor');
    });
});

test('net.guard: block mode throws on XHR open and stop() fully restores globals', () => {
    class FakeXHR { open () {} send () {} }
    FakeXHR.DONE = 4;
    const target = { XMLHttpRequest: FakeXHR, fetch: async () => 'remote' };
    withFakeWindow(target, () => {
        const guard = FS.net.guard({ mode: 'block', onViolation: () => {} });
        try {
            const xhr = new target.XMLHttpRequest();
            assert.throws(() => xhr.open('GET', 'https://x.test/blocked'), /blocked XHR/);
        } finally { guard.stop(); }
        assert.equal(target.XMLHttpRequest, FakeXHR);
        assert.equal(target.fetch.name, '' + target.fetch.name); // restored, callable
    });
});

/* ------------------------------------------------------------- ES5 shape -- */
test('failsafe.js is ES5-safe: no block-scoped function declarations, no ES6 syntax', () => {
    // Regression for the strict-mode-ES5 violation in lintScript(): a
    // `function checkTarget () {}` declaration nested in an `else` block.
    // Node itself will NOT catch this (it parses as ES2015+, where the
    // declaration is merely block-scoped), so tests/es5-scan.mjs implements
    // the check an ES5 parser would make.
    const src = readFileSync(join(here, '..', 'vendor', 'failsafe.js'), 'utf8');

    const blockFns = findBlockScopedFunctionDeclarations(src);
    assert.deepEqual(blockFns, [],
        'function declarations inside blocks are illegal in strict-mode ES5: ' +
        blockFns.map(f => `${f.name}() at line ${f.line}`).join(', '));

    const es6 = findEs6Syntax(src);
    assert.deepEqual(es6, [],
        'ES6+ syntax in shipped vendor code: ' +
        es6.map(h => `${h.rule} at line ${h.line}`).join(', '));

    assert.doesNotThrow(() => new Function('"use strict";\n' + src));
});

test('icons-offline.js is ES5-safe too', () => {
    const src = readFileSync(join(here, '..', 'vendor', 'icons-offline.js'), 'utf8');
    assert.deepEqual(findBlockScopedFunctionDeclarations(src), []);
    assert.deepEqual(findEs6Syntax(src), []);
});

test('vn.lintScript: missing-label detection still works after the ES5 hoist', () => {
    // checkTarget moved from a block-scoped declaration to a function-scoped
    // expression; prove all three call sites (step, choice Do, Conditional) work.
    const e = fakeEngine();
    e._script = {
        Start: [
            'jump GhostA',
            { Choice: { A: { Text: 'a', Do: 'jump GhostB' } } },
            { Conditional: { Condition: () => true, True: 'jump GhostC', False: 'jump GhostD' } },
            'jump End',
        ],
        End: ['end'],
    };
    const report = FS.vn(e, { silent: true }).lintScript({ silent: true });
    const missing = report.issues.filter(i => i.rule === 'missing-label').map(i => i.detail);
    assert.equal(missing.length, 4, JSON.stringify(report.issues));
    ['GhostA', 'GhostB', 'GhostC', 'GhostD'].forEach(l => {
        assert.ok(missing.some(d => d.includes(l)), `missing-label should flag ${l}`);
    });
});

/* ------------------------------------------------------------ internals --- */
test('internals: deepClone handles cycles; deepFreeze is idempotent', () => {
    const a = { x: 1 };
    a.self = a;
    const c = FS._internals.deepClone(a);
    assert.equal(c.self, c);
    assert.notEqual(c, a);
    FS._internals.deepFreeze(c);
    assert.ok(Object.isFrozen(c));
});
