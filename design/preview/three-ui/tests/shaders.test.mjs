/* ============================================================================
 * GLSL syntax gate. No GPU exists in CI/sandbox, so the cheapest real check on
 * the shader library is a parse: every vertex/fragment source produced by the
 * material factories must be valid GLSL ES. Catches the class of bug that would
 * otherwise only surface as a black screen in a browser.
 *   node --test tests/shaders.test.mjs
 * ========================================================================= */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parse } from '@shaderfrog/glsl-parser';
const require = createRequire(import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* load the vendored three IIFE + shader factories into a bare global scope */
function loadThree() {
  const src = readFileSync(join(ROOT, 'vendor', 'three.iife.min.js'), 'utf8');
  return new Function(src + '\nreturn THREE;')();
}
globalThis.THREE = loadThree();
require('../js/shaders.js');
const HF = globalThis.HF;

const noop = { isTexture: true };
const factories = {
  matPlateCenter: () => HF.matPlateCenter(noop, noop),
  matFramePart: () => HF.matFramePart(noop),
  matFloor: () => HF.matFloor(),
  matCore: () => HF.matCore(),
  matMotes: () => HF.matMotes(),
  matHoloCard: () => HF.matHoloCard(noop, 16 / 9),
  matRadar: () => HF.matRadar(),
  matShard: () => HF.matShard(noop),
};

for (const [name, make] of Object.entries(factories)) {
  const mat = make();
  for (const stage of ['vertexShader', 'fragmentShader']) {
    test(`${name}.${stage} parses as GLSL ES`, () => {
      const src = mat[stage];
      assert.ok(src && src.length > 40, 'shader source present');
      let ast;
      assert.doesNotThrow(() => { ast = parse(src); }, 'parse throws');
      assert.ok(ast && Array.isArray(ast.program), 'AST produced');
    });
  }
}

test('every fragment shader that samples a map declares it as uniform sampler2D', () => {
  for (const [name, make] of Object.entries(factories)) {
    const src = make().fragmentShader;
    const uses = (src.match(/texture2D\(/g) || []).length;
    const decls = (src.match(/uniform sampler2D /g) || []).length;
    if (uses) assert.ok(decls >= 1, name + ' samples without declaring a sampler');
  }
});

test('px-space sampling: tiling materials derive UVs from vPx, not stretched vUv', () => {
  const center = HF.matPlateCenter(noop, noop).fragmentShader;
  assert.ok(/vec2 p = vPx;/.test(center), 'centre uses px-space coordinate');
  assert.ok(/p \/ uTraceScale/.test(center) && /p \/ uGrainScale/.test(center), 'tiling maps sampled in px space');
});

test('holo card uses aspect-correct cover sampling', () => {
  const src = HF.matHoloCard(noop, 16 / 9).fragmentShader;
  assert.ok(/hfCoverUV\(vUv, uQuadAspect\.x, uTexAspect\.x\)/.test(src), 'cover UV call present');
});
