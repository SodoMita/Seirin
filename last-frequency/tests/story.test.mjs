// Zero-dependency integrity + compiler tests for THE LAST FREQUENCY.
// Run:  node --test last-frequency/tests/story.test.mjs
//
// Verifies, with no browser and no jsdom:
//   1. Word count of dialogue + narration >= 10 000 (the brief's hard floor).
//   2. Every jump target exists (no dead labels).
//   3. Every referenced scene / character-sprite / image / voice asset exists on disk.
//   4. Choice options use string `Do` jumps; branches have both arms.
//   5. Every ending label is completable (contains 'end' or a jump to one).
//   6. Offline purity (static): index.html / game.js / story.js contain no live
//      http(s) resource, no fetch/XHR/socket, and the engine keeps
//      ServiceWorkers + Preload off.
//   7. The pure compiler (vendor/game.js PART 1) routes every mutation through
//      the vn facade with the correct shapes (rollback-safe by construction).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const story = require(join(root, 'vendor', 'story.js'));
const compiler = require(join(root, 'vendor', 'game.js'));

const labels = story.labels;
const CMD = /^(show|hide|jump|play|stop|end|next|wait)\b/;
const SCENE_RE = /^show scene (\S+)/;
const CHAR_RE = /^show character (\S+) (\S+)/;
const IMAGE_RE = /^show image (\S+)/;
const VOICE_RE = /^play voice (\S+)/;
const JUMP_RE = /^jump (\S+)/;

const CHARACTERS = {
    mira: ['normal', 'smile', 'worried'], elara: ['normal', 'sad', 'hopeful'],
    harlan: ['normal', 'stern'], jun: ['smile', 'alert']
};
const IMAGES = { elara_hope: 'elara_hopeful.png' };

function words (s) { return s.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length; }

/* ---- collect everything we need in one pass ---- */
let totalWords = 0;
const jumps = [];
const sceneRefs = [], charRefs = [], imageRefs = [], voiceRefs = [];
const endings = ['Ending_HarborLight', 'Ending_TheLongMemorial', 'Ending_Static'];

for (const [label, steps] of Object.entries(labels)) {
    for (const s of steps) {
        if (typeof s === 'string') {
            if (!CMD.test(s)) totalWords += words(s);
            let m;
            if ((m = s.match(SCENE_RE))) sceneRefs.push(m[1]);
            if ((m = s.match(CHAR_RE)))  charRefs.push([m[1], m[2]]);
            if ((m = s.match(IMAGE_RE))) imageRefs.push(m[1]);
            if ((m = s.match(VOICE_RE))) voiceRefs.push(m[1]);
            if ((m = s.match(JUMP_RE)))  jumps.push(m[1]);
        } else if (s && s.choice) {
            totalWords += words(s.choice.Dialog || '');
            for (const o of s.choice.options) {
                totalWords += words(o.Text || '');
                if (JUMP_RE.test(o.Do || '')) jumps.push(o.Do.replace('jump ', ''));
            }
        } else if (s && s.branch) {
            jumps.push(s.branch['True'].replace('jump ', ''));
            jumps.push(s.branch['False'].replace('jump ', ''));
        }
    }
}

test('word count of dialogue + narration is at least 10,000', () => {
    console.log('  measured story words:', totalWords);
    assert.ok(totalWords >= 10000, `only ${totalWords} words (need >= 10000)`);
});

test('every jump target resolves to a real label', () => {
    const missing = [...new Set(jumps)].filter(j => !labels[j]);
    assert.deepEqual(missing, [], 'dead jump targets: ' + missing.join(', '));
});

test('every show scene references an existing background file', () => {
    const bad = [...new Set(sceneRefs)].filter(id => !existsSync(join(root, 'assets', 'scenes', id + '.jpg')));
    assert.deepEqual(bad, [], 'missing scene assets: ' + bad.join(', '));
});

test('every show character references a declared sprite that exists on disk', () => {
    const bad = [];
    for (const [id, spr] of charRefs) {
        if (!CHARACTERS[id] || CHARACTERS[id].indexOf(spr) === -1) { bad.push(id + '.' + spr + ' (undeclared)'); continue; }
        if (!existsSync(join(root, 'assets', 'characters', spr === undefined ? id : (id === 'mira' ? 'mira_' : id === 'elara' ? 'elara_' : id === 'harlan' ? 'harlan_' : 'jun_') + spr + '.png'))) {
            // fall back to the exact sprite filename used by game.js
        }
        const file = id + '_' + spr + '.png';
        if (!existsSync(join(root, 'assets', 'characters', file))) bad.push(file);
    }
    assert.deepEqual(bad, [], 'missing character sprites: ' + bad.join(', '));
});

test('every show image references a registered image that exists on disk', () => {
    const bad = [...new Set(imageRefs)].filter(id => !IMAGES[id] || !existsSync(join(root, 'assets', 'characters', IMAGES[id])));
    assert.deepEqual(bad, [], 'missing image assets: ' + bad.join(', '));
});

test('every play voice references an existing voice clip', () => {
    const bad = [...new Set(voiceRefs)].filter(id => !existsSync(join(root, 'assets', 'voices', id + '.mp3')));
    assert.deepEqual(bad, [], 'missing voice clips: ' + bad.join(', '));
});

test('choice options use string Do-jumps and branches have both arms', () => {
    const problems = [];
    for (const [label, steps] of Object.entries(labels)) {
        for (const s of steps) {
            if (s && s.choice) for (const o of s.choice.options) {
                if (typeof o.Do !== 'string' || !JUMP_RE.test(o.Do)) problems.push(label + ': non-string Do');
            }
            if (s && s.branch) {
                if (!s.branch['True'] || !s.branch['False']) problems.push(label + ': branch missing arm');
            }
        }
    }
    assert.deepEqual(problems, [], problems.join('; '));
});

test('every ending is completable (ends or jumps to an end)', () => {
    const reachEnd = (label, seen = new Set()) => {
        if (seen.has(label)) return false; seen.add(label);
        for (const s of labels[label] || []) {
            if (s === 'end') return true;
            if (typeof s === 'string' && JUMP_RE.test(s) && reachEnd(s.replace('jump ', ''), seen)) return true;
        }
        return false;
    };
    const bad = endings.filter(e => !reachEnd(e));
    assert.deepEqual(bad, [], 'endings that never terminate: ' + bad.join(', '));
});

test('offline purity: no live http(s) resources or runtime fetch in shipped files', () => {
    const idx = readFileSync(join(root, 'index.html'), 'utf8');
    const game = readFileSync(join(root, 'vendor', 'game.js'), 'utf8');
    const st = readFileSync(join(root, 'vendor', 'story.js'), 'utf8');
    const liveScript = /<script[^>]*src=["']https?:\/\//i.test(idx);
    const liveLink = /<link[^>]*href=["']https?:\/\//i.test(idx);
    const liveCssUrl = /url\(\s*['"]?https?:\/\//i.test(idx);
    const netApi = /fetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource/i.test(idx + game + st);
    assert.ok(!liveScript, 'index.html has a live http <script src>');
    assert.ok(!liveLink, 'index.html has a live http <link href>');
    assert.ok(!liveCssUrl, 'index.html CSS references a remote url()');
    assert.ok(!netApi, 'runtime network API present in shipped code');
    assert.ok(/['"]ServiceWorkers['"]\s*:\s*false/.test(game), 'ServiceWorkers not disabled');
    assert.ok(/['"]Preload['"]\s*:\s*false/.test(game), 'Preload not disabled');
});

/* ---------------- compiler unit tests (stub vn/engine) ---------------- */
function stubVn () {
    const calls = { reversible: [], goTo: [], branch: [] };
    return {
        calls,
        reversible (spec) { calls.reversible.push(spec); return { _reversible: spec }; },
        goTo (loc) { calls.goTo.push(loc); return { _goTo: loc }; },
        branch (pred, arms) { calls.branch.push({ pred, arms }); return { _branch: { pred, arms } }; },
        choiceEffect (spec) { return { onChosen: ['onChosen', spec], onRevert: ['onRevert', spec] }; }
    };
}
function stubEngine (player, flags) {
    const store = { player: player || {}, flags: flags || {} };
    return { storage (k) { return store[k]; } };
}

test('compiler: stat step is a player delta via vn.reversible', () => {
    const vn = stubVn();
    compiler.compileStep({ stat: { clarity: 1 } }, vn, stubEngine());
    assert.deepEqual(vn.calls.reversible[0], { clarity: 1 });
});

test('compiler: flag step routes through reversible({flags})', () => {
    const vn = stubVn();
    compiler.compileStep({ flag: { answered_signal: true } }, vn, stubEngine());
    assert.deepEqual(vn.calls.reversible[0], { flags: { answered_signal: true } });
});

test('compiler: clock step is a rollback-safe storage set on player.clock', () => {
    const vn = stubVn();
    compiler.compileStep({ clock: '03:00' }, vn, stubEngine());
    assert.deepEqual(vn.calls.reversible[0], { storage: { 'player.clock': { mode: 'set', value: '03:00' } } });
});

test('compiler: go step calls vn.goTo', () => {
    const vn = stubVn();
    compiler.compileStep({ go: 'Watch Room' }, vn, stubEngine());
    assert.deepEqual(vn.calls.goTo, ['Watch Room']);
});

test('compiler: choice attaches onChosen/onRevert only to options with effects', () => {
    const vn = stubVn();
    const out = compiler.compileStep({
        choice: { Dialog: 'pick', options: [
            { Text: 'plain', Do: 'jump A' },
            { Text: 'stat',  Do: 'jump B', stat: { trust: 1 } },
            { Text: 'flag',  Do: 'jump C', flag: { f: true } }
        ] }
    }, vn, stubEngine());
    const c = out.Choice;
    assert.equal(c.Dialog, 'pick');
    assert.equal(c.opt0.onChosen, undefined, 'plain option must have NO onChosen');
    assert.ok(c.opt1.onChosen && c.opt1.onRevert, 'stat option needs the matched pair');
    assert.deepEqual(c.opt1.onChosen[1], { trust: 1 });
    assert.deepEqual(c.opt2.onChosen[1], { flags: { f: true } });
    assert.equal(c.opt1.Do, 'jump B', 'Do stays a statement string');
});

test('compiler: branch predicate evaluates flags + stats with AND semantics', () => {
    const vn = stubVn();
    compiler.compileStep({
        branch: { all: [['flag', 'answered_signal'], ['stat', 'clarity', '>=', 2]], 'True': 'jump A', 'False': 'jump B' }
    }, vn, stubEngine({ clarity: 2 }, { answered_signal: true }));
    const { pred, arms } = vn.calls.branch[0];
    assert.equal(pred(), true, 'all conditions met');
    assert.equal(arms['True'], 'jump A'); assert.equal(arms['False'], 'jump B');

    const vn2 = stubVn();
    compiler.compileStep({
        branch: { all: [['flag', 'answered_signal'], ['stat', 'clarity', '>=', 2]], 'True': 'jump A', 'False': 'jump B' }
    }, vn2, stubEngine({ clarity: 1 }, { answered_signal: true }));
    assert.equal(vn2.calls.branch[0].pred(), false, 'clarity too low');

    const vn3 = stubVn();
    compiler.compileStep({
        branch: { all: [['flag', 'answered_signal'], ['stat', 'clarity', '>=', 2]], 'True': 'jump A', 'False': 'jump B' }
    }, vn3, stubEngine({ clarity: 2 }, { answered_signal: false }));
    assert.equal(vn3.calls.branch[0].pred(), false, 'never answered');
});

test('compiler: inputName produces an Input statement that writes the player name', () => {
    const vn = stubVn();
    const eng = stubEngine({ name: 'Noa' });
    const out = compiler.compileStep({ inputName: true }, vn, eng);
    assert.ok(out.Input, 'expected an Input object');
    assert.equal(out.Input.Validation('   '), false);
    assert.equal(out.Input.Validation('Mira'), true);
    assert.equal(out.Input.Save('  Kai  '), true);
    assert.equal(eng.storage('player').name, 'Kai');
});

test('compiler: raw strings pass through untouched', () => {
    const vn = stubVn();
    assert.equal(compiler.compileStep('show scene watch_room', vn, stubEngine()), 'show scene watch_room');
    assert.equal(compiler.compileStep('mira Hello.', vn, stubEngine()), 'mira Hello.');
});

test('compiler: compileStory compiles every label without throwing', () => {
    const vn = stubVn();
    const eng = stubEngine({ clarity: 0, trust: 0 }, {});
    const compiled = compiler.compileStory(story, vn, eng);
    assert.deepEqual(Object.keys(compiled).sort(), Object.keys(labels).sort());
});
