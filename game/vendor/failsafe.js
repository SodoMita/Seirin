/* ============================================================================
 * FailSafe — zero-dependency failsafe abstractions for Monogatari visual novels.
 * ----------------------------------------------------------------------------
 * Motivation
 * ----------
 * Monogatari has no story DSL: the script is raw JS, so the engine cannot
 * validate it, cannot validate your storage, and cannot invert state mutations
 * when the player presses Back. Anything non-trivial (stats, flags, routes,
 * save migration) therefore needs a small set of *failsafe primitives*.
 *
 * This library vendors those primitives as one file with NO dependencies, NO
 * build step, NO CDN and NO network fetches — it must work from file:// by
 * double-clicking index.html, and it must be safe to copy into any Monogatari
 * project. It is a humane, browser-friendly distillation of the well-known
 * failsafe libraries (all are recommended for server/bundled setups — see
 * ai_agent_docs/additionallibs1.md), re-implemented in their smallest useful
 * form for offline single-file games:
 *
 *   FailSafe.result   ~ neverthrow       (explicit success/failure values)
 *   FailSafe.schema   ~ zod              (validate & repair storage / saves)
 *   FailSafe.immut    ~ immer            (clone-apply-freeze state updates)
 *   FailSafe.match    ~ ts-pattern       (exhaustive branching)
 *   FailSafe.machine  ~ xstate           (finite-state route/phase logic)
 *   FailSafe.vn       ~ monogatari glue  (rollback-safe mutations & linters)
 *   FailSafe.net      ~ offline guard    (any fetch in a no-server game = bug)
 *
 * Coding style: ES5-compatible (runs everywhere Monogatari runs), exposed as
 * `window.FailSafe` in browsers and `module.exports` under Node for tests.
 * ========================================================================== */
(function (global, factory) {
    'use strict';
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    global.FailSafe = api;
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    /* ------------------------------------------------------------------------
     * Small utilities
     * --------------------------------------------------------------------- */
    function isPlainObject (v) {
        return v !== null && typeof v === 'object' &&
            (v.constructor === Object || Object.getPrototypeOf(v) === null);
    }

    function deepClone (value, seen) {
        if (value === null || typeof value !== 'object') { return value; }
        seen = seen || new Map();
        if (seen.has(value)) { return seen.get(value); }
        var out = Array.isArray(value) ? [] : {};
        seen.set(value, out);
        var keys = Object.keys(value);
        for (var i = 0; i < keys.length; i++) {
            out[keys[i]] = deepClone(value[keys[i]], seen);
        }
        return out;
    }

    function deepFreeze (value, seen) {
        if (value === null || typeof value !== 'object' || Object.isFrozen(value)) { return value; }
        seen = seen || new Set();
        if (seen.has(value)) { return value; }
        seen.add(value);
        Object.keys(value).forEach(function (k) { deepFreeze(value[k], seen); });
        return Object.freeze(value);
    }

    function fmt (v) {
        try { return JSON.stringify(v); } catch (e) { return String(v); }
    }

    function log (level, args) {
        var c = (typeof console !== 'undefined') ? console : null;
        if (c && c[level]) { c[level].apply(c, args); }
    }
    function warn () { log('warn', ['[FailSafe]'].concat([].slice.call(arguments))); }
    function error () { log('error', ['[FailSafe]'].concat([].slice.call(arguments))); }

    /* ========================================================================
     * result — explicit success/failure instead of hidden throws (neverthrow)
     * ===================================================================== */
    function ok (value) {
        return {
            ok: true, value: value, error: undefined,
            isOk: function () { return true; },
            isErr: function () { return false; },
            map: function (f) { return attemptCall(function () { return f(value); }); },
            mapErr: function () { return this; },
            andThen: function (f) { return f(value); },
            unwrapOr: function () { return value; },
            match: function (arms) { return arms.ok(value); }
        };
    }
    function err (error) {
        return {
            ok: false, value: undefined, error: error,
            isOk: function () { return false; },
            isErr: function () { return true; },
            map: function () { return this; },
            mapErr: function (f) { return err(f(error)); },
            andThen: function () { return this; },
            unwrapOr: function (fallback) { return fallback; },
            match: function (arms) { return arms.err(error); }
        };
    }
    function attemptCall (f) {
        try { return ok(f()); } catch (e) { return err(e); }
    }
    function fromPromise (p) {
        return Promise.resolve(p).then(
            function (v) { return ok(v); },
            function (e) { return err(e); }
        );
    }
    var result = { ok: ok, err: err, attempt: attemptCall, fromPromise: fromPromise };

    /* ========================================================================
     * schema — validate & repair storage / saves (zod-lite)
     * ------------------------------------------------------------------------
     * Every check returns a plain report:
     *   { ok: true,  value: <coerced value>, issues: [] }  — with defaults applied
     *   { ok: false, value: undefined,       issues: [...] }
     * An "issue" is { path, message, expected, got }.
     * ===================================================================== */
    function Issue (path, message, expected, got) {
        return { path: path || '', message: message, expected: expected, got: got };
    }

    function makeType (kind, test, opts) {
        opts = opts || {};
        var t = {
            kind: kind,
            opts: opts,
            _defaultSet: false,
            _default: undefined,
            _optional: false,
            default: function (v) { var c = cloneType(t); c._defaultSet = true; c._default = v; return c; },
            optional: function () { var c = cloneType(t); c._optional = true; return c; },
            describe: function () {
                return kind + (opts.args ? '(' + fmt(opts.args) + ')' : '');
            },
            check: function (value, path) { return checkType(t, value, path); }
        };
        return t;
    }
    function cloneType (t) {
        var c = makeType(t.kind, null, t.opts);
        c._defaultSet = t._defaultSet; c._default = t._default; c._optional = t._optional;
        return c;
    }
    function checkType (t, value, path) {
        path = path || '';
        if (value === undefined || value === null) {
            if (t._defaultSet) { return { ok: true, value: deepClone(t._default), issues: [] }; }
            if (t._optional) { return { ok: true, value: value, issues: [] }; }
            return { ok: false, value: undefined,
                issues: [Issue(path, 'missing required ' + t.describe(), t.describe(), fmt(value))] };
        }
        switch (t.kind) {
        case 'any':
            return { ok: true, value: value, issues: [] };
        case 'string':
            return (typeof value === 'string')
                ? { ok: true, value: value, issues: [] }
                : { ok: false, value: undefined, issues: [Issue(path, 'expected string', 'string', fmt(value))] };
        case 'number': {
            var bad = typeof value !== 'number' || isNaN(value) || !isFinite(value);
            if (!bad && t.opts.int === true && Math.floor(value) !== value) { bad = true; }
            if (!bad && t.opts.min !== undefined && value < t.opts.min) { bad = true; }
            if (!bad && t.opts.max !== undefined && value > t.opts.max) { bad = true; }
            return bad
                ? { ok: false, value: undefined, issues: [Issue(path, 'expected number' + (t.opts.int ? ' (int)' : ''), t.describe(), fmt(value))] }
                : { ok: true, value: value, issues: [] };
        }
        case 'boolean':
            return (typeof value === 'boolean')
                ? { ok: true, value: value, issues: [] }
                : { ok: false, value: undefined, issues: [Issue(path, 'expected boolean', 'boolean', fmt(value))] };
        case 'literal':
            return (value === t.opts.args)
                ? { ok: true, value: value, issues: [] }
                : { ok: false, value: undefined, issues: [Issue(path, 'expected literal ' + fmt(t.opts.args), fmt(t.opts.args), fmt(value))] };
        case 'enum':
            return (t.opts.args.indexOf(value) !== -1)
                ? { ok: true, value: value, issues: [] }
                : { ok: false, value: undefined, issues: [Issue(path, 'expected one of ' + t.opts.args.join(', '), t.opts.args.join('|'), fmt(value))] };
        case 'array': {
            if (!Array.isArray(value)) {
                return { ok: false, value: undefined, issues: [Issue(path, 'expected array', 'array', fmt(value))] };
            }
            var out = [], issues = [], itemType = t.opts.args;
            for (var i = 0; i < value.length; i++) {
                var r = itemType.check(value[i], path + '[' + i + ']');
                if (r.ok) { out.push(r.value); } else { issues = issues.concat(r.issues); }
            }
            if (issues.length) { return { ok: false, value: undefined, issues: issues }; }
            return { ok: true, value: out, issues: [] };
        }
        case 'record': {
            if (!isPlainObject(value)) {
                return { ok: false, value: undefined, issues: [Issue(path, 'expected record object', 'object', fmt(value))] };
            }
            var recOut = {}, recIssues = [], valueType = t.opts.args;
            Object.keys(value).forEach(function (k) {
                var r = valueType.check(value[k], path ? path + '.' + k : k);
                if (r.ok) { recOut[k] = r.value; } else { recIssues = recIssues.concat(r.issues); }
            });
            if (recIssues.length) { return { ok: false, value: undefined, issues: recIssues }; }
            return { ok: true, value: recOut, issues: [] };
        }
        case 'object': {
            if (!isPlainObject(value)) {
                return { ok: false, value: undefined, issues: [Issue(path, 'expected object', 'object', fmt(value))] };
            }
            var shape = t.opts.args, objOut = {}, objIssues = [], unknown = [];
            Object.keys(shape).forEach(function (k) {
                var r = shape[k].check(value[k], path ? path + '.' + k : k);
                if (r.ok) {
                    if (r.value !== undefined || value[k] !== undefined) { objOut[k] = r.value; }
                } else { objIssues = objIssues.concat(r.issues); }
            });
            Object.keys(value).forEach(function (k) {
                if (!(k in shape)) { unknown.push(path ? path + '.' + k : k); objOut[k] = deepClone(value[k]); }
            });
            if (unknown.length && t.opts.strict !== false) {
                objIssues.push(Issue(path, 'unknown key(s): ' + unknown.join(', '), 'known keys only', unknown.join(', ')));
            }
            if (objIssues.length) { return { ok: false, value: undefined, issues: objIssues }; }
            return { ok: true, value: objOut, issues: [] };
        }
        case 'union': {
            var options = t.opts.args, collected = [];
            for (var u = 0; u < options.length; u++) {
                var ur = options[u].check(value, path);
                if (ur.ok) { return ur; }
                collected = collected.concat(ur.issues);
            }
            return { ok: false, value: undefined,
                issues: [Issue(path, 'matched no union option', options.map(function (o) { return o.describe(); }).join(' | '), fmt(value))].concat(collected.slice(0, 3)) };
        }
        }
        return { ok: false, value: undefined, issues: [Issue(path, 'unknown schema kind: ' + t.kind)] };
    }

    var schema = {
        string: function () { return makeType('string', null); },
        number: function (opts) { return makeType('number', null, { int: opts && opts.int, min: opts && opts.min, max: opts && opts.max }); },
        boolean: function () { return makeType('boolean', null); },
        literal: function (v) { return makeType('literal', null, { args: v }); },
        enumeration: function (values) { return makeType('enum', null, { args: values.slice() }); },
        arrayOf: function (itemType) { return makeType('array', null, { args: itemType }); },
        record: function (valueType) { return makeType('record', null, { args: valueType }); },
        object: function (shape, opts) { return makeType('object', null, { args: shape, strict: !(opts && opts.passthrough) }); },
        union: function (options) { return makeType('union', null, { args: options.slice() }); },
        any: function () { return makeType('any', null); }
    };

    /* ========================================================================
     * immut — produce the next state without mutating the base (immer-lite)
     * ------------------------------------------------------------------------
     * produce(base, recipe): CLONES base, runs recipe(draft) on the clone,
     * deep-freezes the return value and hands it back. Inside game code the
     * clone is cheap (VN state is tiny); correctness beats micro-performance.
     * ===================================================================== */
    function produce (base, recipe) {
        var draft = deepClone(base);
        var returned = recipe(draft);
        return deepFreeze(returned === undefined ? draft : returned);
    }
    var immut = { produce: produce, deepFreeze: deepFreeze, clone: deepClone };

    /* ========================================================================
     * match — exhaustive pattern branching (ts-pattern-lite)
     * ------------------------------------------------------------------------
     * Patterns: primitives (deep equality), arrays (element-wise, same length),
     * plain objects (SUBSET pattern: every key in pattern must match), RegExp
     * (against strings), predicate functions, and `match._` wildcard.
     *
     *   match(v)
     *     .with({route:'endings', ending: 'A'}, fn)
     *     .with(match._, fallback)
     *     .exhaustive()   // throws MatchError when nothing matched
     * ===================================================================== */
    function MatchError (value) {
        var e = new Error('Non-exhaustive match: no branch matched value ' + fmt(value));
        e.name = 'MatchError';
        return e;
    }
    var WILDCARD = { __failsafe_wildcard: true };
    function patternMatch (pattern, value) {
        if (pattern === WILDCARD) { return true; }
        if (typeof pattern === 'function') { return !!pattern(value); }
        if (pattern instanceof RegExp) { return typeof value === 'string' && pattern.test(value); }
        if (Array.isArray(pattern)) {
            return Array.isArray(value) && pattern.length === value.length &&
                pattern.every(function (p, i) { return patternMatch(p, value[i]); });
        }
        if (isPlainObject(pattern)) {
            if (!isPlainObject(value)) { return false; }
            return Object.keys(pattern).every(function (k) { return patternMatch(pattern[k], value[k]); });
        }
        return pattern === value;
    }
    function match (value) {
        var arms = [];
        var builder = {
            with: function (pattern, handler) { arms.push({ pattern: pattern, handler: handler }); return builder; },
            when: function (predicate, handler) { return builder.with(predicate, handler); },
            run: function () {
                for (var i = 0; i < arms.length; i++) {
                    if (patternMatch(arms[i].pattern, value)) { return arms[i].handler(value); }
                }
                return undefined;
            },
            otherwise: function (fallback) {
                var hit = builder.run();
                return hit === undefined
                    ? (typeof fallback === 'function' ? fallback(value) : fallback)
                    : hit;
            },
            exhaustive: function () {
                for (var i = 0; i < arms.length; i++) {
                    if (patternMatch(arms[i].pattern, value)) { return arms[i].handler(value); }
                }
                throw MatchError(value);
            }
        };
        return builder;
    }
    match._ = WILDCARD;
    match.MatchError = MatchError;

    /* ========================================================================
     * machine — tiny finite-state machine for route/phase logic (xstate-lite)
     * ------------------------------------------------------------------------
     *   var m = machine({
     *     id: 'routes', initial: 'prologue',
     *     context: { trust: 0 },
     *     states: {
     *       prologue: { on: { MEET: 'chapter1' } },
     *       chapter1: { on: { BEFRIEND: { target: 'ally', guard: (ctx) => ctx.trust > 0,
     *                                    assign: (ctx, ev) => ({ trust: ctx.trust + 1 }) } } },
     *       ally:     { type: 'final' }
     *     }
     *   });
     *   m.transition('prologue', { type: 'MEET' });            // -> { state, context, changed }
     * Guards reject impossible transitions; unknown events are no-ops with
     * changed:false (never a crash), and every violation is reported.
     * ===================================================================== */
    function createMachine (config) {
        if (!config || !config.initial || !config.states || !config.states[config.initial]) {
            throw new Error('machine(): config.initial must name a state present in config.states');
        }
        var states = config.states;
        var initialContext = deepFreeze(deepClone(config.context || {}));

        function step (state, context, event) {
            if (typeof event === 'string') { event = { type: event }; }
            var node = states[state];
            if (!node) { return { state: state, context: context, changed: false, error: 'Unknown state: ' + state }; }
            var edge = node.on && node.on[event.type];
            if (!edge) { return { state: state, context: context, changed: false }; }
            var target = (typeof edge === 'string') ? { target: edge } : edge;
            if (!target.target || !states[target.target]) {
                return { state: state, context: context, changed: false,
                    error: 'Transition ' + event.type + ' in state ' + state + ' targets unknown state: ' + target.target };
            }
            if (target.guard && !target.guard(context, event)) {
                return { state: state, context: context, changed: false, blocked: true };
            }
            var nextContext = context;
            if (target.assign) {
                nextContext = produce(context, function (draft) {
                    var patch = target.assign(draft, event) || {};
                    Object.keys(patch).forEach(function (k) { draft[k] = patch[k]; });
                });
            }
            return { state: target.target, context: nextContext, changed: true };
        }

        return {
            id: config.id || 'machine',
            initialState: config.initial,
            initialContext: initialContext,
            states: Object.keys(states),
            isFinal: function (state) { return !!(states[state] && states[state].type === 'final'); },
            can: function (state, eventType) {
                var edge = states[state] && states[state].on && states[state].on[eventType];
                return !!edge;
            },
            transition: function (state, event) {
                var r = step(state, initialContext, event);
                return { state: r.state, context: r.context, changed: r.changed, blocked: !!r.blocked, error: r.error || null };
            },
            resolve: function (state, context, event) { return step(state, context, event); }
        };
    }

    /* ========================================================================
     * vn — Monogatari-specific failsafes
     * ------------------------------------------------------------------------
     * Created per-game:  var vn = FailSafe.vn(engine, { storageKeys, onChange })
     *
     * The core principle: SNAPSHOT, don't invert by hand.
     * The naive rollback helper inverts a mutation by applying its opposite
     * (subtract the stat, boolean-NOT the flag). That silently corrupts state:
     * boolean-NOT destroys a flag that was already true before the choice, and
     * value-setting mutations have no inverse at all. Instead, every Apply
     * captures the previous values of exactly the keys it touches, and Revert
     * restores those captured values. Rollback becomes correct BY CONSTRUCTION.
     * ===================================================================== */
    function createVN (engine, opts) {
        opts = opts || {};
        var onChange = (typeof opts.onChange === 'function') ? opts.onChange : function () {};
        var strictLog = opts.silent ? function () {} : warn;

        function keyRoot (key) {
            // storage keys may be dotted: 'flags.met_nyx' -> root 'flags'
            return String(key).split('.')[0];
        }

        function bucketFor (key) {
            try { return engine.storage(keyRoot(key)); } catch (e) { return undefined; }
        }

        /* Deeply get/set dotted keys inside a storage root. */
        function getPath (rootObj, key) {
            var parts = String(key).split('.').slice(1);
            var cur = rootObj;
            for (var i = 0; i < parts.length; i++) {
                if (cur === undefined || cur === null) { return undefined; }
                cur = cur[parts[i]];
            }
            return cur;
        }
        function setPath (rootObj, key, value) {
            var parts = String(key).split('.').slice(1);
            var cur = rootObj;
            for (var i = 0; i < parts.length - 1; i++) {
                if (!isPlainObject(cur[parts[i]])) { cur[parts[i]] = {}; }
                cur = cur[parts[i]];
            }
            if (parts.length) { cur[parts[parts.length - 1]] = value; }
        }

        /* Normalise a mutation spec into {key -> {mode, value}}.
         * Modes: 'delta' (numbers add) | 'set' (assign). */
        var STRUCTURAL_KEYS = ['stats', 'delta', 'set', 'flags', 'storage', 'scope', 'location', 'onApply', 'onRevert'];
        function normalise (spec) {
            var mutations = {};
            function addAll (obj, mode) {
                if (!obj) { return; }
                Object.keys(obj).forEach(function (k) { mutations[k] = { mode: mode, value: obj[k] }; });
            }
            var isStructural = isPlainObject(spec) && STRUCTURAL_KEYS.some(function (k) { return k in spec; });
            if (!isStructural) {
                // Shorthand: reversible({ creds: 100 }) = numeric deltas on root 'player'
                addAll(spec, 'delta');
                return { scope: 'player', mutations: mutations, extra: {} };
            }
            var scope = spec.scope || 'player';
            addAll(spec.stats || spec.delta, 'delta');
            addAll(spec.set, 'set');
            // Non-structural top-level keys still count as player deltas, so
            // mixed forms like { karma: 20, flags: {...} } behave intuitively.
            Object.keys(spec).forEach(function (k) {
                if (STRUCTURAL_KEYS.indexOf(k) === -1) { mutations[k] = { mode: 'delta', value: spec[k] }; }
            });
            if (spec.flags) {
                Object.keys(spec.flags).forEach(function (f) {
                    mutations['flags.' + f] = { mode: 'set', value: spec.flags[f] };
                });
            }
            if (spec.storage) {
                Object.keys(spec.storage).forEach(function (k) {
                    var entry = spec.storage[k];
                    mutations[k] = { mode: (entry && entry.mode) || 'delta', value: (entry && entry.value) !== undefined ? entry.value : entry };
                });
            }
            return { scope: scope, mutations: mutations, extra: spec };
        }

        /* Apply a normalised mutation set, returning the snapshot needed to revert. */
        function applyMutations (norm) {
            var snapshot = {};
            Object.keys(norm.mutations).forEach(function (key) {
                var m = norm.mutations[key];
                var effectiveKey = (key.indexOf('.') === -1) ? norm.scope + '.' + key : key;
                var root = bucketFor(keyRoot(effectiveKey));
                if (root === undefined) { strictLog('storage root missing for key:', effectiveKey); return; }
                var current = getPath(root, effectiveKey);
                snapshot[effectiveKey] = deepClone(current);
                var next = (m.mode === 'delta' && typeof current === 'number' && typeof m.value === 'number')
                    ? current + m.value : deepClone(m.value);
                setPath(root, effectiveKey, next);
            });
            if (norm.extra && norm.extra.location !== undefined) {
                var playerRoot = bucketFor('player');
                if (playerRoot !== undefined) {
                    if (snapshot['player.location'] === undefined) { snapshot['player.location'] = deepClone(playerRoot.location); }
                    playerRoot.location = norm.extra.location;
                }
            }
            return snapshot;
        }

        function restoreSnapshot (snapshot) {
            Object.keys(snapshot).forEach(function (key) {
                var root = bucketFor(key);
                if (root === undefined) { return; }
                setPath(root, key, deepClone(snapshot[key]));
            });
        }

        /* ---- Public primitives ------------------------------------------------ */

        /* Rollback-safe time-of-day writes. player.time is minutes-of-day
         * (0..1440); the night of one day starts at 21:00 (1260).
         *   setTime(mins) — ABSOLUTE: replaces player.time (baselines, endings)
         *   addTime(mins) — DELTA: adds to current player.time (progression —
         *                   the default, so inserted beats shift times naturally)
         *   getTime()     — current minutes-of-day (0 if unset/never touched)
         * Both writes are reversible (Apply/Revert snapshots) like vn.reversible. */
        function setTime (minutes) {
            return reversible({ set: { time: minutes } });
        }
        function addTime (minutes) {
            return reversible({ time: minutes });
        }
        function getTime () {
            try {
                var p = engine.storage('player') || {};
                return (typeof p.time === 'number' && isFinite(p.time)) ? p.time : 0;
            } catch (e) { return 0; }
        }

        /* Rollback-safe Function action:
         *   vn.reversible({ creds: 100, hacking: 1 })                         // deltas on player
         *   vn.reversible({ stats: {...}, flags: { met_x: true }, location }) // full form
         *   vn.reversible({ set: { name: 'Zed' } })                            // value set        */
        function reversible (spec, extra) {
            if (extra) { spec = Object.assign({}, spec, extra); }
            var norm = normalise(spec);
            // LIFO stack: Monogatari reverts actions in reverse apply order, and
            // the same statement can be applied again after a replayed jump, so
            // every Apply pushes its own snapshot for its matching Revert to pop.
            var snapshots = [];
            return {
                'Function': {
                    'Apply': function () {
                        snapshots.push(applyMutations(norm));
                        if (norm.extra && typeof norm.extra.onApply === 'function') { norm.extra.onApply(snapshots[snapshots.length - 1]); }
                        onChange();
                        return true;
                    },
                    'Revert': function () {
                        restoreSnapshot(snapshots.pop() || {});
                        if (norm.extra && typeof norm.extra.onRevert === 'function') { norm.extra.onRevert(); }
                        onChange();
                        return true;
                    }
                }
            };
        }

        /* Matched onChosen/onRevert pair for engine Choices (same snapshot rule).
         * Accepts either choiceEffect({ karma: 20 }, { side_flag: true }) or a
         * single structural spec — matching the classic two-argument helper. */
        function choiceEffect (spec, extra) {
            if (extra) { spec = Object.assign({}, spec, extra); }
            var norm = normalise(spec);
            var snapshots = [];
            return {
                onChosen: function () {
                    snapshots.push(applyMutations(norm));
                    onChange();
                },
                onRevert: function () {
                    restoreSnapshot(snapshots.pop() || {});
                    onChange();
                }
            };
        }

        /* Rollback-safe location change; the previous location is captured at
         * apply-time so reverting goes back EXACTLY where the player was. */
        function goTo (location) {
            var prev = null;
            return {
                'Function': {
                    'Apply': function () {
                        prev = engine.storage('player').location;
                        engine.storage('player').location = location;
                        onChange();
                        return true;
                    },
                    'Revert': function () {
                        engine.storage('player').location = prev;
                        onChange();
                        return true;
                    }
                }
            };
        }

        /* Conditional wrapper that can never crash the script: a throwing or
         * rejecting condition logs and falls into the 'False' branch. */
        function branch (conditionFn, arms) {
            arms = arms || {};
            if (!('False' in arms)) {
                strictLog('branch(): no False arm supplied; the engine needs every branch defined. Adding an empty one.');
                arms.False = '';
            }
            return {
                'Conditional': {
                    'Condition': function () {
                        try {
                            return !!conditionFn.call(this);
                        } catch (e) {
                            error('branch(): condition threw, taking False branch.', e);
                            return false;
                        }
                    },
                    'True': arms.True,
                    'False': arms.False
                }
            };
        }

        /* Validate storage against a FailSafe.schema, repair with defaults, and
         * report instead of crashing. Returns a FailSafe.result. */
        function validateStorage (schemaType, options) {
            options = options || {};
            var current = {};
            try { current = engine.storage(); } catch (e) { return err(e); }
            var check = schemaType.check(deepClone(current));
            if (check.ok) {
                var unknownFree = true;
                // Object schemas report unknown keys as issues (non-fatal for us);
                // values were validated — apply defaults for anything missing.
                try { engine.storage(check.value); } catch (e2) { return err(e2); }
                return ok({ value: check.value, repaired: false, unknownFree: unknownFree });
            }
            var fatal = check.issues.filter(function (i) { return i.message.indexOf('unknown key') !== 0; });
            if (options.repair !== false) {
                var repaired = immut.produce(current, function (draft) {
                    check.issues.forEach(function (issue) {
                        if (issue.message.indexOf('missing required') === 0) {
                            // re-run leaf check against undefined to pull the default
                            var parts = issue.path.split('.').filter(Boolean);
                            var typeAt = schemaType;
                            for (var i = 0; i < parts.length && typeAt; i++) {
                                typeAt = typeAt.opts && typeAt.opts.args && typeAt.opts.args[parts[i]];
                            }
                            if (typeAt && typeAt._defaultSet) {
                                var cur = draft;
                                for (var j = 0; j < parts.length - 1; j++) {
                                    if (!isPlainObject(cur[parts[j]])) { cur[parts[j]] = {}; }
                                    cur = cur[parts[j]];
                                }
                                cur[parts[parts.length - 1]] = deepClone(typeAt._default);
                            }
                        }
                    });
                });
                try { engine.storage(repaired); } catch (e3) { return err(e3); }
            }
            check.issues.forEach(function (i) { strictLog('storage issue at "' + i.path + '": ' + i.message + ' (got ' + i.got + ')'); });
            if (fatal.length) { return err({ issues: check.issues }); }
            return ok({ value: current, repaired: true, issues: check.issues });
        }

        /* Static script linter: encodes the rollback traps as machine-checkable
         * rules. Never throws; returns an issues report (and pretty-prints it). */
        function lintScript (options) {
            options = options || {};
            var script;
            try { script = engine.script(); } catch (e) {
                try { script = engine._script; } catch (e2) { script = engine.script; }
            }
            if (typeof script === 'function') { try { script = script.call(engine); } catch (e3) {} }
            var issues = [];
            function add (severity, label, index, rule, detail) {
                issues.push({ severity: severity, label: label, step: index, rule: rule, detail: detail || '' });
            }
            /* NOTE: declared as a function *expression* at function scope, not as
             * a `function checkTarget()` declaration inside the `else` block —
             * function declarations in blocks are illegal in strict-mode ES5 and
             * this file's contract is ES5 compatibility. It closes over
             * `labelSet`, which is assigned below before any call happens. */
            var labelSet = {};
            var JUMP_RE = /^(jump|call)\s+(.+)$/;
            var checkTarget = function (label, index, statement) {
                var m = (typeof statement === 'string') ? statement.trim().match(JUMP_RE) : null;
                if (m && !labelSet[m[2]]) {
                    add('error', label, index, 'missing-label', '"' + m[0] + '" targets a label that does not exist');
                }
            };
            if (!isPlainObject(script)) {
                add('error', '?', -1, 'no-script', 'engine.script() did not return a label map');
            } else {
                var labels = Object.keys(script);
                labels.forEach(function (l) { labelSet[l] = true; });
                labels.forEach(function (label) {
                    var steps = script[label];
                    if (!Array.isArray(steps)) {
                        add('error', label, -1, 'not-an-array', 'label content must be an array of statements');
                        return;
                    }
                    steps.forEach(function (statement, i) {
                        if (typeof statement === 'function') {
                            add('error', label, i, 'bare-function',
                                'bare JS function steps are NOT reversible and block rollback; wrap with FailSafe.vn.reversible()');
                        }
                        if (typeof statement === 'string') { checkTarget(label, i, statement); }
                        if (!isPlainObject(statement)) { return; }
                        if (statement.Choice && isPlainObject(statement.Choice)) {
                            Object.keys(statement.Choice).forEach(function (cid) {
                                var c = statement.Choice[cid];
                                if (!isPlainObject(c)) { return; }
                                if (typeof c.Do === 'string') { checkTarget(label, i, c.Do); }
                                if (typeof c.onChosen === 'function' && typeof c.onRevert !== 'function') {
                                    add('error', label, i, 'non-reversible-choice',
                                        'choice "' + cid + '" has onChosen but no onRevert; use FailSafe.vn.choiceEffect()');
                                }
                            });
                        }
                        if (statement.Conditional && isPlainObject(statement.Conditional)) {
                            var cond = statement.Conditional;
                            if (!('False' in cond)) {
                                add('warn', label, i, 'missing-false-branch',
                                    'Conditional has no False branch; a failed/throwing condition falls back to False');
                            }
                            ['True', 'False'].forEach(function (k) {
                                if (typeof cond[k] === 'string') { checkTarget(label, i, cond[k]); }
                            });
                        }
                        if (statement.Function && isPlainObject(statement.Function)) {
                            if (typeof statement.Function.Revert !== 'function' && typeof statement.Function.Reverse !== 'function') {
                                add('warn', label, i, 'function-without-revert',
                                    'Function action has Apply but no Revert/Reverse; rollback will skip it');
                            }
                        }
                    });
                });
            }
            var errors = issues.filter(function (i) { return i.severity === 'error'; });
            if (!options.silent) {
                if (issues.length === 0) {
                    log('info', ['[FailSafe] script lint: no issues across', Object.keys(script || {}).length, 'labels']);
                } else {
                    issues.forEach(function (i) {
                        strictLog('lint [' + i.severity + '] ' + i.label + '[' + i.step + '] ' + i.rule + ': ' + i.detail);
                    });
                }
            }
            return { ok: errors.length === 0, issues: issues };
        }

        return {
            engine: engine,
            reversible: reversible,
            choiceEffect: choiceEffect,
            goTo: goTo,
            branch: branch,
            setTime: setTime,
            addTime: addTime,
            getTime: getTime,
            validateStorage: validateStorage,
            lintScript: lintScript
        };
    }

    /* ========================================================================
     * net — offline/no-server guard
     * ------------------------------------------------------------------------
     * A distributable Monogatari page must run 100% from disk. Any fetch(),
     * XHR, sendBeacon, WebSocket or EventSource at runtime is therefore a BUG
     * (a feature accidentally needs a server). net.guard() makes those bugs
     * loud immediately: it records every violation with a stack trace and, in
     * 'block' mode, fails the call so tests catch it too. Mode 'observe' only
     * logs — use it in production builds so nothing ever breaks the game.
     * ===================================================================== */
    var net = {
        violations: [],
        _restoreFns: [],
        guard: function (options) {
            options = options || {};
            var mode = options.mode || 'observe'; // 'observe' | 'block'
            var onViolation = (typeof options.onViolation === 'function') ? options.onViolation : function (v) {
                warn('net.' + mode + ': network attempt in offline page —', v.kind, v.target, '\n' + (v.stack || ''));
            };
            function record (kind, target) {
                var v = { kind: kind, target: String(target), stack: (new Error()).stack || '', blocked: mode === 'block' };
                net.violations.push(v);
                onViolation(v);
                return v;
            }
            var g = typeof window !== 'undefined' ? window
                : (typeof self !== 'undefined' ? self : globalThis);

            /* fetch() accepts a string, a URL or a Request. Only Request has a
             * `.url` property, so reading `.url` unconditionally reported
             * `fetch(new URL(...))` violations with target `undefined` — the
             * guard fired but the report was useless. Cover all three shapes
             * and never fall through to undefined. */
            function fetchTarget (input) {
                if (typeof input === 'string') { return input; }
                if (input === null || input === undefined) { return String(input); }
                if (typeof URL === 'function' && input instanceof URL) { return input.href; }
                if (typeof input.url === 'string') { return input.url; }        // Request
                if (typeof input.href === 'string') { return input.href; }      // URL-alike
                return String(input);
            }

            if (typeof g.fetch === 'function') {
                var origFetch = g.fetch;
                g.fetch = function (input, init) {
                    var target = fetchTarget(input);
                    record('fetch', target);
                    if (mode === 'block') { return Promise.reject(new Error('[FailSafe.net] blocked fetch: ' + target)); }
                    return origFetch.apply(this, arguments);
                };
                net._restoreFns.push(function () { g.fetch = origFetch; });
            }
            if (typeof g.XMLHttpRequest === 'function') {
                var OrigXHR = g.XMLHttpRequest;
                /* The instance handed back is a genuine OrigXHR (a constructor
                 * returning an object overrides `this`), which is what makes
                 * the per-instance `open` patch work. On its own that leaves a
                 * broken *constructor*: no readyState constants on
                 * `XMLHttpRequest.DONE`, and a `.prototype` unrelated to the
                 * real one. Both are repaired below so the guarded global is
                 * substitutable for the original. */
                var Wrapped = function () {
                    var xhr = new OrigXHR();
                    var origOpen = xhr.open;
                    xhr.open = function (m, url) {
                        record('xhr', url);
                        if (mode === 'block') { throw new Error('[FailSafe.net] blocked XHR: ' + url); }
                        return origOpen.apply(xhr, arguments);
                    };
                    return xhr;
                };
                Wrapped.prototype = OrigXHR.prototype;   // instanceof + prototype methods
                /* Static readyState constants (UNSENT … DONE) are non-enumerable
                 * own properties of the constructor, so copy them by name and
                 * then sweep anything else the host exposes. */
                ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'].forEach(function (k) {
                    if (k in OrigXHR) { try { Wrapped[k] = OrigXHR[k]; } catch (e) {} }
                });
                Object.getOwnPropertyNames(OrigXHR).forEach(function (k) {
                    if (k === 'prototype' || k === 'length' || k === 'name' || k === 'caller' || k === 'arguments') { return; }
                    if (Object.prototype.hasOwnProperty.call(Wrapped, k)) { return; }
                    try { Wrapped[k] = OrigXHR[k]; } catch (e) {}
                });
                g.XMLHttpRequest = Wrapped;
                net._restoreFns.push(function () { g.XMLHttpRequest = OrigXHR; });
            }
            if (g.navigator && typeof g.navigator.sendBeacon === 'function') {
                var origBeacon = g.navigator.sendBeacon.bind(g.navigator);
                g.navigator.sendBeacon = function (url, data) {
                    record('beacon', url);
                    if (mode === 'block') { return false; }
                    return origBeacon(url, data);
                };
                net._restoreFns.push(function () { g.navigator.sendBeacon = origBeacon; });
            }
            ['WebSocket', 'EventSource'].forEach(function (ctorName) {
                if (typeof g[ctorName] === 'function') {
                    var Orig = g[ctorName];
                    g[ctorName] = function (url) {
                        record(ctorName.toLowerCase(), url);
                        if (mode === 'block') { throw new Error('[FailSafe.net] blocked ' + ctorName + ': ' + url); }
                        return new Orig(url);
                    };
                    net._restoreFns.push(function () { g[ctorName] = Orig; });
                }
            });
            return {
                violations: net.violations,
                stop: function () {
                    while (net._restoreFns.length) { net._restoreFns.pop()(); }
                }
            };
        }
    };

    return {
        VERSION: VERSION,
        result: result,
        schema: schema,
        immut: immut,
        match: match,
        machine: createMachine,
        vn: createVN,
        net: net,
        _internals: { deepClone: deepClone, deepFreeze: deepFreeze, isPlainObject: isPlainObject }
    };
}));
