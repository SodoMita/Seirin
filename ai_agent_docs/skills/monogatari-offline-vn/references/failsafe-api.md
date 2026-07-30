# FailSafe API cheat sheet — cyber-nexus/vendor/failsafe.js

ES5, zero-dependency, UMD: `window.FailSafe` in browsers, `require()` in Node.
Every module below is covered by `cyber-nexus/tests/failsafe.test.mjs`.

## FailSafe.result — explicit success/failure (neverthrow-style)
- `ok(value)`, `err(error)` → Result
- `attempt(fn)` → ok(return) or err(thrown)
- `fromPromise(promise)` → Promise<Result>
- `r.map(f)`, `r.mapErr(f)`, `r.andThen(f)`, `r.unwrapOr(fallback)`,
  `r.match({ok, err})`, `r.isOk()/isErr()`

## FailSafe.schema — validate & repair storage/saves (zod-style)
- Types: `string()`, `number({int,min,max})`, `boolean()`, `literal(v)`,
  `enumeration([...])`, `arrayOf(t)`, `record(t)`, `object(shape, {passthrough})`,
  `union([t...])`, `any()`
- Modifiers: `.default(v)`, `.optional()`
- `type.check(value, path?)` → `{ok, value, issues:[{path,message,expected,got}]}`

## FailSafe.immut — clone-apply-freeze (immer-style)
- `produce(base, recipe)` → frozen next state; base untouched
- `deepFreeze(obj)`, `clone(obj)`

## FailSafe.match — pattern branching (ts-pattern-style)
- `match(v).with(pattern, handler).when(pred, handler).otherwise(fb)`
- `.exhaustive()` throws `MatchError` when nothing matches
- Patterns: primitives (equality), arrays (element-wise), objects (SUBSET),
  RegExp (vs strings), predicate functions, `match._` wildcard

## FailSafe.machine — route/phase FSM (xstate-style)
- `machine({id, initial, context, states: {S: {on: {E: target | {target, guard, assign}}}}})`
- `m.transition(state, event)` (uses initialContext), `m.resolve(state, ctx, event)`
- Both return `{state, context, changed, blocked?, error?}` — invalid events
  are `{changed:false}`, guards reject with `{blocked:true}`; never throws on
  bad input. `m.can(state, E)`, `m.isFinal(state)`.

## FailSafe.vn(engine, {onChange, silent?}) — Monogatari glue, snapshot-based
Applies capture previous values; reverts restore them (LIFO stack) — no
hand-written inverse arithmetic.
- `reversible(spec)` → `{'Function': {Apply, Revert}}`
  - spec shorthand `{ karma: 20 }` = deltas on `player`
  - structural `{ stats|delta:{}, set:{}, flags:{}, storage:{'a.b':{mode,value}}, location }`
  - legacy two-arg form `reversible({creds:100}, {flags:{...}})` works
- `choiceEffect(deltasOrSpec, flagsSpec?)` → `{onChosen, onRevert}`
- `goTo(location)` → Function action; previous location captured at apply-time
- `branch(condFn, {True, False})` → Conditional that logs-and-takes-False on
  throw, and auto-adds a missing False arm
- `validateStorage(schemaType, {repair?})` → Result; repairs missing fields
  from defaults, logs every issue
- `lintScript({silent?})` → `{ok, issues:[{severity,label,step,rule,detail}]}`;
  rules: bare-function, missing-label, non-reversible-choice,
  missing-false-branch, function-without-revert

## FailSafe.net — no-fetch guard
- `net.guard({mode: 'observe' | 'block', onViolation?})` wraps fetch/XHR/
  sendBeacon/WebSocket/EventSource; records `{kind,target,stack,blocked}`;
  returns `{stop, violations}`. `observe` logs (production), `block` hard-fails
  (tests).
