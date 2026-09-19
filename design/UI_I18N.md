# UI localization

The shipping `game/` supports `ru` (default), `en`, `zh` (Simplified Chinese),
`ja`, `hi`, and `sw`. Choose a native language name from the main-menu selector
or from **Settings → Appearance**. Changes apply immediately without restarting
or changing the current story position. The selection is saved separately in
`SeirinGame_UILanguage`; blocked localStorage falls back to an in-memory choice.
Invalid stored locales fall back to Russian.

## Scope

Translated: main/in-game menus, settings, help, save/load and confirmation
prompts, quick-menu labels/tooltips, shell accessible labels, status text,
appearance options, dialogue-log rewind hints, archives stat labels and route
atlas controls. CSS-generated headings use translated custom properties.

Intentionally unchanged: story modules, dialogue, choices, character names,
locations, route/ending titles, inventory lore and story excerpts in the atlas
or log. UI language does not write `player.locale` (used for story timestamps),
engine story language, storage, flags, script labels, or save data. Developer
boot-error diagnostics remain technical source text.

## Implementation and maintenance

- `vendor/locales/ui.js`: six plain local JS catalogs, keyed by source UI text.
  Most source keys are Russian; remaining vendored-engine source keys are
  English. Every locale must have the same keys and interpolation placeholders.
- `vendor/i18n.js`: ES5 browser module, loaded before the bootstrap. Exposes
  `SeirinI18n.t(source, params)`, `setLanguage(code)`, `getLanguage()`,
  `installEngine(engine)`, `refresh()` and `languages`.
- Monogatari keeps its internal `English` translation-table namespace.
  `installEngine` snapshots the bootstrap's source table and translates its
  values; no engine script-language switching or vendored engine edits.
- The DOM adapter walks an explicit UI allowlist, preserving text-node source
  keys for repeat switching. It handles asynchronously mounted engine screens,
  `data-string` elements and UI attributes without rebuilding controls or
  removing icons/listeners. Story text/choices are never traversal roots;
  story-bearing descendants in UI overlays are explicitly excluded.
- Dynamic chrome templates (build number, node count, rewind distance) use
  `{n}`. New dynamic strings should use `t()` with named placeholders, not
  concatenated translated fragments.
- New custom UI should live in an approved chrome region and have catalog
  entries. If adding a new region, extend the allowlist narrowly and add a
  story-isolation test. Do not expand it to `body`, `text-box`, or game screens.
- New CSS headings should use a `--ui-*` property registered in `cssStrings`.
- Missing translations fall back to English, then the source key. Language
  names stay in their native script. CJK and Hindi use local system font
  fallbacks; there are no network fonts or runtime translation requests.

## Checks

```sh
npm install --prefix game --no-save --package-lock=false
npm run test:i18n --prefix game
node game/tests/es5-scan.mjs game/vendor/i18n.js game/vendor/locales/ui.js
REQUIRE_JSDOM=1 node game/tests/offline-smoke.mjs
```

Unit tests cover catalog/placeholder parity, repeated switching, persistence,
invalid locales, storage failures, async UI insertion, accessibility attributes,
CSS labels, engine strings and story isolation. The actual `file://` smoke test
switches all six locales and verifies scripts/save state remain unchanged.
