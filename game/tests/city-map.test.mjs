// Static contract tests for the vector-first city atlas. The shipping map is
// browser-only, so these checks pin its offline/ES5 shape without requiring a
// DOM implementation or raster fixture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlockScopedFunctionDeclarations, findEs6Syntax } from './es5-scan.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = readFileSync(join(root, 'vendor', 'city-map.js'), 'utf8');
const css = readFileSync(join(root, 'vendor', 'city-map.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

test('city atlas is ES5, local-only and vector-first', () => {
    assert.deepEqual(findBlockScopedFunctionDeclarations(source), []);
    assert.deepEqual(findEs6Syntax(source), []);
    assert.doesNotThrow(() => new Function('"use strict";\n' + source));
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
        .replace(/http:\/\/www\.w3\.org\/2000\/svg/g, 'SVG_NAMESPACE');
    [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /https?:\/\//,
        /<image\b/i, /\.png\b/i, /\.jpe?g\b/i, /\.webp\b/i].forEach(forbidden => {
        assert.equal(forbidden.test(code), false, `forbidden map dependency: ${forbidden}`);
    });
    assert.match(source, /createElementNS\(SVG_NS/);
    assert.match(source, /root\.setAttribute\('viewBox', '0 0 1200 760'\)/);
    assert.match(source, /SEIRIN-2032\|/);
});

test('atlas covers the setting geography and both camera modes', () => {
    ['mountain', 'tsukimachi', 'civic', 'hikari', 'midori', 'tetsuba', 'port'].forEach(id => {
        assert.match(source, new RegExp("id: '" + id + "'"));
    });
    assert.match(source, /data-city-view/);
    assert.match(css, /\.city-map-stage\.view-3d \.city-map-svg/);
    assert.match(css, /\.city-building-side/);
    assert.match(html, /data-city-view="2d"/);
    assert.match(html, /data-city-view="3d"/);
});

test('soft city signals read VN state and remain read-only', () => {
    assert.match(source, /function metricsFor \(district, player\)/);
    ['miya_affinity', 'momo_affinity', 'ai_empathy', 'akatomi_alert', 'philosophical_depth', 'money', 'time'].forEach(key => {
        assert.match(source, new RegExp('player\\.' + key));
    });
    assert.match(source, /function playerState \(\)/);
    assert.doesNotMatch(source, /storage\s*\(\s*\{/);
    assert.doesNotMatch(source, /storage\s*\([^)]*,/);
    ['economy', 'social', 'pressure'].forEach(layer => {
        assert.match(source, new RegExp("data-map-layer=\\\"" + layer + "\\\"|currentLayer === '" + layer + "'"));
    });
    assert.match(html, /СЮЖЕТ НЕ МЕНЯЕТСЯ/);
});

test('atlas is reachable from the HUD and main menu, with cache-busted local files', () => {
    assert.match(html, /id="btn-city-map"/);
    assert.match(html, /id="city-map-overlay"/);
    assert.match(html, /id="city-map-svg"/);
    assert.match(html, /vendor\/city-map\.css\?v=\d{6,}/);
    assert.match(html, /vendor\/city-map\.js\?v=\d{6,}/);
    assert.match(source, /open-city-map/);
    assert.match(source, /registerListener\('open-city-map'/);
    assert.match(readFileSync(join(root, 'vendor', 'game.js'), 'utf8'), /string: 'CityMap'/);
});
