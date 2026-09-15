/* ============================================================================
 * Seirin "Holoframe" mockup — GLSL library + material factories (DEV ONLY).
 * ---------------------------------------------------------------------------
 * Ground rules that keep textures honest:
 *
 * 1. PX-SPACE UVs. Every fragment that samples a tiling map derives its UV from
 *    `vPx` (the vertex position in CSS pixels), never from a 0..1 vUv stretched
 *    over the quad. A 200px and a 1200px panel therefore show identical grain:
 *    the map repeats by physical size, so nothing can stretch.
 * 2. ASPECT-CORRECT "cover". hfCoverUV() reproduces CSS `background-size: cover`
 *    in the shader from quad/tex aspect uniforms — the hologram photo card can
 *    never be squeezed by a resize.
 * 3. PROCEDURAL FIRST. Anything animated (energy, scanlines, grid, radar,
 *    motes, fresnel) is computed in the shader; runtime CanvasTextures carry
 *    only things raster is genuinely better at (dial ticks, printed labels).
 * 4. No texture is ever sampled outside 0..1 without RepeatWrapping set on the
 *    texture object itself (see textures.js), so no clamp-edge seams.
 * ========================================================================= */
(function (root) {
  'use strict';
  var HF = (root.HF = root.HF || {});

  /* ------------------------------------------------------------ GLSL chunks */
  var CHUNK = {
    common: [
      'varying vec2 vUv;',
      'varying vec2 vPx;',          // vertex position in CSS px (unscaled UV space)
      'varying vec3 vNrm;',
      'varying vec3 vView;',
      '',
      'float hfHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
      'float hfNoise(vec2 p){',
      '  vec2 i = floor(p), f = fract(p);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hfHash(i), hfHash(i + vec2(1,0)), u.x),',
      '             mix(hfHash(i + vec2(0,1)), hfHash(i + vec2(1,1)), u.x), u.y);',
      '}',
      'float hfFbm(vec2 p){',
      '  float v = 0.0, a = 0.5;',
      '  for (int i = 0; i < 4; i++) { v += a * hfNoise(p); p = p * 2.03 + 17.1; a *= 0.5; }',
      '  return v;',
      '}',
      '/* CSS background-size:cover, in the shader, from aspect ratios. */',
      '/* CSS background-size:cover in the shader: the visible UV window is the',
      '   crop box, so the photo keeps its aspect at any quad shape. */',
      'vec2 hfCoverUV(vec2 uv, float quadA, float texA){',
      '  vec2 win = vec2(min(1.0, texA / quadA), min(1.0, quadA / texA));',
      '  return (uv - 0.5) * win + 0.5;',
      '}',
      '/* thin bright line, antialiased by fwidth where available */',
      'float hfLine(float x, float w){ float d = abs(fract(x) - 0.5); return smoothstep(w, w * 0.35, d); }',
    ].join('\n'),

    vertPlain: [
      'void main(){',
      '  vUv = uv;',
      '  vPx = position.xy;',
      '  vNrm = normalize(normalMatrix * normal);',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vView = normalize(-mv.xyz);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),

    vertPoint: [
      'attribute float aSize;',
      'attribute float aPhase;',
      'uniform float uTime;',
      'uniform float uPxRatio;',
      'varying float vPhase;',
      'void main(){',
      '  vPhase = aPhase;',
      '  vec3 p = position;',
      '  p.y += sin(uTime * 0.25 + aPhase * 6.2831) * 14.0;',
      '  p.x += cos(uTime * 0.17 + aPhase * 6.2831) * 10.0;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = aSize * uPxRatio * (1200.0 / -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
  };

  /* ------------------------------------------------------- material factory */
  function shader(opts) {
    var m = new THREE.ShaderMaterial(opts);
    return m;
  }

  var GLSL = (HF.GLSL = CHUNK);

  /**
   * Plate CENTRE: fully procedural surface (no image albedo) + two tiling maps
   * sampled in px space: a runtime-baked grain CanvasTexture and the AI trace
   * sheet as a faint emissive circuit. Energy glow decays from the inner rim.
   */
  HF.matPlateCenter = function (grainTex, traceTex) {
    return shader({
      uniforms: {
        uTime: { value: 0 },
        uGrain: { value: grainTex },
        uTrace: { value: traceTex },
        uGlow: { value: new THREE.Color('#38bdf8') },
        uEnergy: { value: 0.55 },
        uSize: { value: new THREE.Vector2(600, 200) },   // css px, for rim distance
        uTraceScale: { value: 620 },                      // px per trace tile
        uGrainScale: { value: 256 },                      // px per grain tile
        uAlert: { value: 0 },
      },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPlain,
      fragmentShader: CHUNK.common + [
        'uniform float uTime; uniform sampler2D uGrain; uniform sampler2D uTrace;',
        'uniform vec3 uGlow; uniform float uEnergy; uniform vec2 uSize;',
        'uniform float uTraceScale; uniform float uGrainScale; uniform float uAlert;',
        'void main(){',
        '  vec2 p = vPx;',
        '  /* brushed anisotropy: stretch noise hard along x */',
        '  float brush = hfFbm(p * vec2(0.012, 0.9)) * 0.55 + hfFbm(p * vec2(0.05, 2.6)) * 0.25;',
        '  vec3 base = mix(vec3(0.043, 0.055, 0.075), vec3(0.086, 0.106, 0.135), brush);',
        '  float grain = texture2D(uGrain, p / uGrainScale).r;',
        '  base *= 0.82 + grain * 0.36;',
        '  /* emissive circuitry, px-space so density is size-independent */',
        '  vec3 tr = texture2D(uTrace, p / uTraceScale).rgb;',
        '  float trMask = 0.10 + 0.10 * sin(uTime * 0.7 + p.x * 0.01);',
        '  /* travelling scanline */',
        '  float scan = hfLine(p.y * 0.010 - uTime * 0.10, 0.06) * 0.05;',
        '  /* rim energy: distance to the inner rim of the plate */',
        '  vec2 d = abs(p) - (uSize * 0.5 - vec2(6.0));',
        '  float rim = clamp(exp(-max(max(d.x, d.y), 0.0) / 26.0), 0.0, 1.0);',
        '  vec3 glow = uGlow * (rim * uEnergy * (0.75 + 0.25 * sin(uTime * 2.1)));',
        '  vec3 alert = vec3(0.95, 0.25, 0.22) * uAlert * rim;',
        '  vec3 col = base + tr * trMask * uGlow + glow + alert + scan * uGlow;',
        '  gl_FragColor = vec4(col, 0.96);',
        '}',
      ].join('\n'),
      transparent: true,
    });
  };

  /** Plate frame parts (corner / edge strips): sampled 1:1, tinted, lit sweep. */
  HF.matFramePart = function (map) {
    return shader({
      uniforms: {
        uMap: { value: map },
        uTime: { value: 0 },
        uTint: { value: new THREE.Color('#ffffff') },
        uSweep: { value: -2.0 },       // -2..2 sweep position across the plate
        uGlow: { value: new THREE.Color('#38bdf8') },
        uOpacity: { value: 1 },
      },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPlain,
      fragmentShader: CHUNK.common + [
        'uniform sampler2D uMap; uniform float uTime; uniform vec3 uTint;',
        'uniform float uSweep; uniform vec3 uGlow; uniform float uOpacity;',
        'void main(){',
        '  vec4 t = texture2D(uMap, vUv);',
        '  /* machined specular sweep, driven in px space so speed is constant */',
        '  float sw = exp(-pow((vPx.x + vPx.y) * 0.004 - uSweep, 2.0) * 6.0);',
        '  vec3 col = t.rgb * uTint + sw * 0.10 * uGlow;',
        '  /* faint cyan bounce on the bright channel pixels */',
        '  float chan = smoothstep(0.55, 0.9, t.g * 0.6 + t.b * 0.6 - t.r * 0.5);',
        '  col += chan * uGlow * (0.16 + 0.08 * sin(uTime * 2.4));',
        '  gl_FragColor = vec4(col, t.a * uOpacity);',
        '}',
      ].join('\n'),
      transparent: true,
    });
  };

  /** Holographic floor grid: pure shader, distance-faded, sweep pulse. */
  HF.matFloor = function () {
    return shader({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#22d3ee') } },
      vertexShader: CHUNK.common + [
        'varying vec3 vWorld;',
        'void main(){ vUv = uv; vPx = position.xy; vec4 w = modelMatrix * vec4(position,1.0);',
        '  vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      ].join('\n'),
      fragmentShader: CHUNK.common + [
        'uniform float uTime; uniform vec3 uColor; varying vec3 vWorld;',
        'void main(){',
        '  vec2 g = vWorld.xz / 90.0;',
        '  vec2 f = abs(fract(g) - 0.5);',
        '  float line = smoothstep(0.48, 0.5, max(f.x, f.y));',
        '  float major = smoothstep(0.48, 0.5, max(abs(fract(vWorld.x / 450.0) - 0.5), abs(fract(vWorld.z / 450.0) - 0.5)));',
        '  float dist = length(vWorld.xz);',
        '  float fade = exp(-dist / 1400.0);',
        '  float sweep = exp(-pow((dist - mod(uTime * 260.0, 2600.0)) / 180.0, 2.0));',
        '  float a = (line * 0.30 + major * 0.35) * fade + sweep * fade * 0.35;',
        '  gl_FragColor = vec4(uColor * (0.6 + sweep), a);',
        '}',
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  };

  /** Resonance core: fresnel shell + fbm energy, no textures at all. */
  HF.matCore = function () {
    return shader({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#67e8f9') }, uHeat: { value: 0.35 } },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPlain,
      fragmentShader: CHUNK.common + [
        'uniform float uTime; uniform vec3 uColor; uniform float uHeat;',
        'void main(){',
        '  float fres = pow(1.0 - clamp(dot(normalize(vNrm), normalize(vView)), 0.0, 1.0), 2.2);',
        '  vec2 sp = vNrm.xy * 3.0 + vec2(uTime * 0.12, -uTime * 0.08);',
        '  float e = hfFbm(sp * 2.2);',
        '  float pulse = 0.6 + 0.4 * sin(uTime * 1.7);',
        '  vec3 col = uColor * (fres * 1.4 + e * 0.5 * uHeat * pulse);',
        '  float a = clamp(fres * 0.9 + e * 0.25 * uHeat, 0.0, 1.0);',
        '  gl_FragColor = vec4(col, a);',
        '}',
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  };

  /** Dust motes: shader-drawn soft discs (gl_PointCoord) — no sprite sheet. */
  HF.matMotes = function () {
    return shader({
      uniforms: { uTime: { value: 0 }, uPxRatio: { value: 1 }, uColor: { value: new THREE.Color('#7dd3fc') } },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPoint,
      fragmentShader: CHUNK.common + [
        'uniform vec3 uColor; uniform float uTime; varying float vPhase;',
        'void main(){',
        '  vec2 c = gl_PointCoord - 0.5;',
        '  float d = length(c);',
        '  float a = smoothstep(0.5, 0.06, d) * (0.25 + 0.35 * sin(uTime * 1.3 + vPhase * 20.0));',
        '  if (a < 0.01) discard;',
        '  gl_FragColor = vec4(uColor, a);',
        '}',
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  };

  /**
   * Hologram photo card: aspect-correct cover sampling + scanlines + flicker.
   * uQuadAspect / uTexAspect are kept in sync by the caller on every resize.
   */
  HF.matHoloCard = function (map, texAspect) {
    return shader({
      uniforms: {
        uMap: { value: map },
        uTime: { value: 0 },
        uQuadAspect: { value: new THREE.Vector2(16, 9) },
        uTexAspect: { value: new THREE.Vector2(texAspect, 1) },
        uGlow: { value: new THREE.Color('#22d3ee') },
      },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPlain,
      fragmentShader: CHUNK.common + [
        'uniform sampler2D uMap; uniform float uTime; uniform vec2 uQuadAspect; uniform vec2 uTexAspect; uniform vec3 uGlow;',
        'void main(){',
        '  vec2 uv = hfCoverUV(vUv, uQuadAspect.x, uTexAspect.x);',
        '  vec3 t = texture2D(uMap, uv).rgb;',
        '  float scan = 0.92 + 0.08 * sin(vPx.y * 1.4 + uTime * 6.0);',
        '  float flick = 0.96 + 0.04 * hfHash(vec2(floor(uTime * 12.0), 3.0));',
        '  vec2 e = smoothstep(vec2(0.0), vec2(0.06), vUv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - vUv);',
        '  float edge = 1.0 - e.x * e.y;',
        '  vec3 col = t * scan * flick + uGlow * edge * 0.5;',
        '  gl_FragColor = vec4(col, 0.94);',
        '}',
      ].join('\n'),
      transparent: true,
    });
  };

  /** Radar disc for the HUD bay: rings + rotating sweep + procedural blips. */
  HF.matRadar = function () {
    return shader({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#34d399') } },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPlain,
      fragmentShader: CHUNK.common + [
        'uniform float uTime; uniform vec3 uColor;',
        'void main(){',
        '  vec2 p = vUv - 0.5;',
        '  float r = length(p) * 2.0;',
        '  if (r > 1.0) discard;',
        '  float ang = atan(p.y, p.x);',
        '  float rings = hfLine(r * 3.0, 0.10) * 0.35;',
        '  float sweepA = mod(uTime * 1.1, 6.2831);',
        '  float d = mod(sweepA - ang, 6.2831);',
        '  float sweep = exp(-d * 2.2) * 0.8;',
        '  float blip = 0.0;',
        '  for (int i = 0; i < 3; i++) {',
        '    float fi = float(i);',
        '    vec2 bp = vec2(hfHash(vec2(fi, 1.0)), hfHash(vec2(fi, 2.0))) - 0.5;',
        '    float ba = atan(bp.y, bp.x); float br = length(bp) * 2.0;',
        '    float bd = mod(sweepA - ba, 6.2831);',
        '    blip += exp(-bd * 3.0) * smoothstep(0.12, 0.0, length(p - bp)) * 1.6;',
        '  }',
        '  float a = clamp(rings + sweep * (1.0 - r) + blip, 0.0, 1.0) * smoothstep(1.0, 0.96, r);',
        '  gl_FragColor = vec4(uColor * (0.5 + sweep + blip), a);',
        '}',
      ].join('\n'),
      transparent: true,
      depthWrite: false,
    });
  };

  /** Armour shard: metal map at constant px density over box UVs + fresnel. */
  HF.matShard = function (map) {
    return shader({
      uniforms: { uMap: { value: map }, uTime: { value: 0 }, uGlow: { value: new THREE.Color('#38bdf8') } },
      vertexShader: CHUNK.common + '\n' + CHUNK.vertPlain,
      fragmentShader: CHUNK.common + [
        'uniform sampler2D uMap; uniform float uTime; uniform vec3 uGlow;',
        'void main(){',
        '  vec3 t = texture2D(uMap, vUv).rgb;',
        '  float fres = pow(1.0 - clamp(dot(normalize(vNrm), normalize(vView)), 0.0, 1.0), 3.0);',
        '  vec3 col = t * 0.9 + fres * uGlow * 0.35;',
        '  gl_FragColor = vec4(col, 0.9);',
        '}',
      ].join('\n'),
      transparent: true,
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
