// Unit tests for cyber-nexus/vendor/icons-offline.js
// Run with zero dependencies:  node --test cyber-nexus/tests/icons-offline.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const IconsOffline = require('../vendor/icons-offline.js');

const here = dirname(fileURLToPath(import.meta.url));

test('icon class classifier: engine/game icons are icons, modifiers are not', () => {
    const icons = ['fa-arrow-left', 'fa-cog', 'fa-comments', 'fa-eye', 'fa-eye-slash',
        'fa-fast-forward', 'fa-lock', 'fa-play-circle', 'fa-save', 'fa-sort',
        'fa-stop-circle', 'fa-times', 'fa-times-circle', 'fa-undo', 'fa-bolt',
        'fa-book', 'fa-building', 'fa-check', 'fa-coins', 'fa-database',
        'fa-exclamation-triangle', 'fa-hand-holding-heart', 'fa-handshake',
        'fa-map-marker-alt', 'fa-microchip', 'fa-network-wired', 'fa-question',
        'fa-shield-alt', 'fa-terminal', 'fa-user-secret', 'fa-volume-mute', 'fa-volume-up'];
    const notIcons = ['fa', 'fa-fw', 'fa-2x', 'fa-10x', 'fa-xs', 'fa-sm', 'fa-lg',
        'fa-spin', 'fa-pulse', 'fa-border', 'fa-inverse', 'fa-li', 'fa-ul',
        'fa-stack', 'fa-stack-1x', 'fa-stack-2x', 'fa-layers', 'fa-layers-text',
        'fa-layers-bottom-left', 'fa-layers-top-right', 'fa-flip-horizontal',
        'fa-flip-both', 'fa-rotate-90', 'fa-rotate-180', 'fa-pull-left', 'fa-pull-right',
        'fa-swap-opacity', 'fa-primary', 'fa-primary-color', 'fa-secondary-opacity',
        'fa-transform', 'fa-symbol', 'fa-mask', 'fa-mask-id', 'fa-i2svg', 'fa-title-id',
        'fa-pseudo-element', 'fa-pseudo-element-pending', 'fa-w-12'];
    icons.forEach(c => assert.equal(IconsOffline.isIconClass(c), true, `${c} should be an icon`));
    notIcons.forEach(c => assert.equal(IconsOffline.isIconClass(c), false, `${c} should NOT be an icon`));
});

test('every known icon has a glyph rule in icons-offline.css (CSS/JS maps in sync)', () => {
    const css = readFileSync(join(here, '..', 'vendor', 'icons-offline.css'), 'utf8');
    for (const name of IconsOffline.knownIcons) {
        assert.ok(css.includes(`.${name}::before`), `missing CSS glyph rule for .${name}`);
    }
});

test('all fa-* classes used by index.html are covered by the glyph map', () => {
    const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
    const used = [...new Set([...html.matchAll(/fa-[a-z0-9-]+/g)].map(m => m[0]))]
        .filter(c => IconsOffline.isIconClass(c));
    const missing = used.filter(c => !IconsOffline.knownIcons.includes(c));
    assert.deepEqual(missing, [], `unmapped icons used in index.html: ${missing.join(', ')}`);
});

test('all fa-* icons emitted by the vendored engine markup are covered', () => {
    const js = readFileSync(join(here, '..', 'vendor', 'monogatari.js'), 'utf8');
    const used = [...new Set([...js.matchAll(/"(fa[srbl]? fa-[a-z0-9-]+)"/g)].map(m => m[1].split(' ')[1]))]
        .filter(c => IconsOffline.isIconClass(c));
    const missing = used.filter(c => !IconsOffline.knownIcons.includes(c));
    assert.deepEqual(missing, [], `unmapped engine icons: ${missing.join(', ')}`);
});
