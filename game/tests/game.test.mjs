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
    // The engine script is a plain ES5 browser file, so derive the route
    // labels directly from its script-object entries rather than relying on
    // an undeclared test fixture.
    const labels = [...source.matchAll(/^\s{12}([A-Za-z][A-Za-z0-9]*): \[/gm)].map(m => m[1]);
    assert.deepEqual(labels.sort(), ['AIRoute', 'MiyaRoute', 'SoloRoute1', 'SoloRoute4', 'Start'].sort());
    // routeChoice constructs its jump dynamically, so inspect every supplied
    // target rather than looking for a literal `jump Label` in the source.
    const jumps = [...source.matchAll(/routeChoice\([\s\S]*?,\s*'([A-Za-z][A-Za-z0-9]*)'/g)].map(m => m[1]);
    assert.equal(jumps.length, 4);
    jumps.forEach(label => assert.ok(labels.includes(label), `missing target ${label}`));
});

test('choices use the matched FailSafe choiceEffect callback pair', () => {
    assert.match(source, /onChosen: effect\.onChosen, onRevert: effect\.onRevert/);
    assert.doesNotMatch(source, /onRevert:\s*function/);
    assert.ok((source.match(/vn\.goTo\(/g) || []).length >= 5, 'each location change is reversible');
});
