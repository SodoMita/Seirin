/* ============================================================================
 * Seirin — three-ui 3D layer (DESIGN PREVIEW HARNESS ONLY)
 * ----------------------------------------------------------------------------
 * Vendor: design/preview/vendor/three.min.js (three r149 UMD, MIT, dev-only).
 * Pairs with three-ui.css. This file must never be referenced from game/.
 *
 * THE CONTRACT
 *   CSS OWNS LAYOUT. Every 3D part is anchored to a live DOM rect measured
 *   with getBoundingClientRect + ResizeObserver; the WebGL layer never
 *   positions anything the stylesheet does not already position. Resizing,
 *   zoom, font scaling and media-query reflows move the 3D parts for free.
 *
 * TWO CANVASES, ONE RENDERER EACH
 *   #ui3d-bg  z0   behind the DOM — shader background field, dust motes and
 *                  the title reactor (plasma sphere + ring rig).
 *   #ui3d-fg  z40  above panel surfaces, pointer-events:none — instruments
 *                  (gauge arcs, radar), key rims, corner brackets, emblem
 *                  rings. Its geometry only occupies rims/wells/corners, so
 *                  DOM text underneath stays crisp, selectable and clickable.
 *   The split is what lets real AI-image plate surfaces (DOM) sit *between*
 *   the background field and the live instruments.
 *
 * WHY NO TEXTURES
 *   Over file:// Chromium taints locally loaded images, and texImage2D from a
 *   tainted source throws SecurityError — a double-clicked page can therefore
 *   not put the AI plates into WebGL. Everything here is procedural GLSL; the
 *   AI plates live in the CSS layer where they belong. (See THREE_UI.md.)
 *
 * BEHAVIOUR
 *   · Never throws: boot is wrapped; missing THREE / WebGL / context loss all
 *     land on html.no-webgl, where the CSS fallbacks take over.
 *   · prefers-reduced-motion: the loop renders on demand (state changes and
 *     re-measures) instead of every frame; the material design survives.
 *   · document.hidden: the loop idles.
 *   · DPR capped at 2; one renderer per canvas; ~25 draw calls total.
 * ========================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    if (!doc) { return; }

    function noWebGL () {
        doc.documentElement.classList.add('no-webgl');
    }

    /* ?nowebgl — review hook: force the CSS fallback ladder so the no-WebGL
       experience can be screenshotted and compared. */
    if (global.location && /(?:\?|&)nowebgl\b/.test(global.location.search || '')) { noWebGL(); return; }

    if (!global.THREE) { noWebGL(); return; }

    var THREE = global.THREE;
    var TAU = Math.PI * 2;

    /* ---------------------------------------------------------------- state */
    var state = {
        alert: 12,
        tint: new THREE.Color(0x3ae6ff),
        time: 0,
        motion: 1,
        pointer: { x: -9999, y: -9999 },
        reduced: false,
        dirty: true,
        alive: true
    };

    var mqReduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    if (mqReduce) {
        state.reduced = mqReduce.matches;
        state.motion = mqReduce.matches ? 0 : 1;
        if (mqReduce.addEventListener) {
            mqReduce.addEventListener('change', function (e) {
                state.reduced = e.matches;
                state.motion = e.matches ? 0 : 1;
                state.dirty = true;
            });
        }
    }

    /* ------------------------------------------------------------- renderers */
    var bgCanvas = doc.getElementById('ui3d-bg');
    var fgCanvas = doc.getElementById('ui3d-fg');
    var bgRenderer, fgRenderer;

    function makeRenderer (canvas, alpha) {
        var r = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: alpha,
            antialias: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
        });
        r.setClearColor(alpha ? 0x000000 : 0x04070b, alpha ? 0 : 1);
        return r;
    }

    try {
        bgRenderer = makeRenderer(bgCanvas, false);
        fgRenderer = makeRenderer(fgCanvas, true);
    } catch (err) {
        noWebGL();
        return;
    }
    if (!bgRenderer.getContext() || !fgRenderer.getContext()) { noWebGL(); return; }

    [bgCanvas, fgCanvas].forEach(function (c) {
        c.addEventListener('webglcontextlost', function (e) {
            e.preventDefault();
            state.alive = false;
            noWebGL();
        }, false);
    });

    var DPR = Math.min(global.devicePixelRatio || 1, 2);
    bgRenderer.setPixelRatio(DPR);
    fgRenderer.setPixelRatio(DPR);

    /* Orthographic cameras in CSS-pixel space: 1 world unit = 1 CSS px,
       origin at the viewport centre, y up. DOM rect -> world is then trivial
       and stays crisp at any DPR / zoom. */
    var bgScene = new THREE.Scene();
    var fgScene = new THREE.Scene();
    var bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    var fgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    bgCam.position.z = 100;
    fgCam.position.z = 100;

    var W = 1, H = 1;

    /* ================================================================ GLSL */
    var V_PLANE = [
        'varying vec2 vUv;',
        'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');

    /* ---- background field: night-port resonance, pure procedure --------- */
    var F_FIELD = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform vec2 uRes; uniform float uTime; uniform vec3 uTint;',
        'uniform float uAlert; uniform float uMotion;',
        'float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }',
        'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
        '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
        'float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.02; a*=0.5; } return s; }',
        'void main(){',
        '  vec2 uv = vUv;',
        '  vec2 p = (uv-0.5)*vec2(uRes.x/uRes.y, 1.0);',
        '  float t = uTime*uMotion;',
        '  vec3 col = mix(vec3(0.012,0.022,0.033), vec3(0.004,0.008,0.014), uv.y);',
        // city glow hugging the deck
        '  col += uTint * exp(-pow((uv.y-0.06)*3.4, 2.0)) * 0.11;',
        // drifting fog banks
        '  float fog = fbm(vec2(p.x*2.1 + t*0.03, p.y*3.2 - t*0.012));',
        '  col += vec3(0.028,0.055,0.075) * fog * smoothstep(0.95,0.05,uv.y) * 0.9;',
        // perspective deck grid
        '  float hz = 0.15;',
        '  if (uv.y < hz) {',
        '    float d = hz - uv.y;',
        '    float z = 0.02/max(d,0.0035);',
        '    vec2 g = vec2(p.x*z*1.5, z + t*0.22);',
        '    vec2 cell = abs(fract(g)-0.5);',
        '    float line = 1.0 - smoothstep(0.0,0.07,min(cell.x,cell.y));',
        '    float fade = smoothstep(hz,0.0,d)*(1.0-smoothstep(0.0,0.015,d));',
        '    col += uTint * line * fade * 0.17;',
        '  }',
        // resonance pulses radiating from the mecha's side of the sky
        '  float r = length(p - vec2(0.44,0.10));',
        '  float rr = abs(fract(r*1.5 - t*0.10)-0.5);',
        '  col += uTint * smoothstep(0.47,0.5,rr) * smoothstep(1.5,0.15,r) * 0.10;',
        // alarm wash climbs from the deck
        '  col += vec3(0.52,0.05,0.09) * uAlert * (0.05+0.05*sin(t*6.0)) * smoothstep(0.95,0.15,uv.y);',
        // scanlines, grain, vignette
        '  col -= 0.014*sin(gl_FragCoord.y*1.9);',
        '  col += (hash(gl_FragCoord.xy + fract(t)*137.0)-0.5)*0.022;',
        '  col *= mix(0.5, 1.0, smoothstep(1.28,0.34,length(p*vec2(0.85,1.0))));',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    /* ---- dust motes ------------------------------------------------------ */
    var V_MOTES = [
        'attribute float aSeed;',
        'uniform float uTime; uniform float uPix; uniform float uMotion;',
        'varying float vA;',
        'void main(){',
        '  vec3 pos = position;',
        '  float t = uTime*uMotion;',
        '  pos.y += sin(t*0.25 + aSeed*6.28)*16.0;',
        '  pos.x += cos(t*0.17 + aSeed*12.0)*12.0;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);',
        '  vA = 0.30 + 0.70*fract(aSeed*7.31 + t*0.13);',
        '  gl_PointSize = uPix*(1.4 + 2.6*fract(aSeed*3.7));',
        '}'
    ].join('\n');
    var F_MOTES = [
        'precision mediump float;',
        'uniform vec3 uTint; varying float vA;',
        'void main(){',
        '  float d = length(gl_PointCoord-0.5);',
        '  float a = smoothstep(0.5,0.06,d)*vA*0.55;',
        '  gl_FragColor = vec4(uTint*a, a);',
        '}'
    ].join('\n');

    /* ---- plasma core ----------------------------------------------------- */
    var V_CORE = [
        'varying vec3 vN; varying vec3 vP;',
        'void main(){ vN = normalize(normalMatrix*normal); vP = position;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var F_CORE = [
        'precision highp float;',
        'uniform float uTime; uniform vec3 uTint; uniform float uMotion;',
        'varying vec3 vN; varying vec3 vP;',
        'float hash(vec3 p){ p = fract(p*0.3183099+vec3(0.1,0.2,0.3)); p *= 17.0;',
        '  return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
        'float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);',
        '  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),',
        '                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
        '             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),',
        '                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }',
        'void main(){',
        '  float t = uTime*uMotion;',
        '  vec3 n = normalize(vN);',
        '  float fres = pow(1.0-abs(n.z), 2.2);',
        '  float sw = noise(vP*2.6 + vec3(0.0,0.0,t*0.35)) * 0.6 + noise(vP*6.0 - vec3(t*0.2)) * 0.4;',
        '  vec3 col = mix(uTint*0.2, uTint*1.6, sw);',
        '  col += uTint * fres * 1.8;',
        '  col += vec3(1.0) * pow(sw, 4.0) * 0.5;',
        '  float a = clamp(0.10 + fres*0.5 + pow(sw,3.0)*0.25, 0.0, 1.0);',
        '  gl_FragColor = vec4(col*a, a);',
        '}'
    ].join('\n');

    /* ---- machined ring rig (torus) + holo rings -------------------------- */
    var V_RING = [
        'varying vec2 vUv2; varying vec3 vN;',
        'void main(){ vUv2 = uv; vN = normalize(normalMatrix*normal);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var F_RING = [
        'precision highp float;',
        'uniform float uTime; uniform vec3 uTint; uniform float uMotion;',
        'uniform float uSpeed; uniform float uHolo;',
        'varying vec2 vUv2; varying vec3 vN;',
        'void main(){',
        '  float t = uTime*uMotion;',
        '  float b = abs(fract(vUv2.x - t*uSpeed)-0.5);',
        '  float band = smoothstep(0.44,0.5,b);',
        '  float dash = step(0.35, fract(vUv2.x*22.0 + t*uSpeed*0.5));',
        '  vec3 steel = mix(vec3(0.05,0.08,0.11), vec3(0.24,0.32,0.38),',
        '                   smoothstep(-0.4,1.0,vN.y)*0.8 + pow(1.0-abs(vN.z),2.0)*0.4);',
        '  vec3 col = mix(steel, uTint*2.0, band);',
        '  float a = 1.0;',
        '  if (uHolo > 0.5) { col = uTint*(0.8+band*1.6); a = (0.25 + band*0.75)*dash*0.9; }',
        '  gl_FragColor = vec4(col*a, a);',
        '}'
    ].join('\n');

    /* ---- gauge arc: 270° segmented cockpit gauge ------------------------- */
    var V_GAUGE = [
        'varying float vAng; varying float vT;',
        'uniform float uInner; uniform float uOuter;',
        'void main(){ vAng = atan(position.y, position.x);',
        '  vT = (length(position.xy)-uInner)/(uOuter-uInner);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var F_GAUGE = [
        'precision highp float;',
        'uniform float uValue; uniform vec3 uTint; uniform float uTime; uniform float uMotion;',
        'varying float vAng; varying float vT;',
        'void main(){',
        '  const float A0 = 2.35619449019;',   // 135°
        '  const float AL = 4.71238898038;',   // 270° sweep
        '  float an = vAng; if (an < 0.0) an += 6.28318530718;',
        '  float t01 = an >= A0 ? (an-A0)/AL : (an+6.28318530718-A0)/AL;',
        '  t01 = clamp(t01, 0.0, 1.0);',
        '  float seg = fract(t01*22.0);',
        '  float gap = smoothstep(0.0,0.10,seg)*smoothstep(1.0,0.90,seg);',
        '  float th = smoothstep(0.0,0.30,vT)*smoothstep(1.0,0.70,vT);',
        '  float on = step(t01, uValue);',
        '  float tip = smoothstep(0.05,0.0,abs(t01-uValue));',
        '  float live = 0.85 + 0.15*sin(uTime*uMotion*3.0 + t01*24.0);',
        '  vec3 col = mix(vec3(0.09,0.13,0.17), uTint*live, on);',
        '  col += uTint*tip*1.6 + vec3(1.0)*tip*0.5;',
        '  float a = gap*th*(0.22 + on*0.85) + tip*th*0.6;',
        '  gl_FragColor = vec4(col*a, a);',
        '}'
    ].join('\n');

    /* ---- radar disc ------------------------------------------------------- */
    var V_RADAR = [
        'varying vec2 vP;',
        'void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var F_RADAR = [
        'precision highp float;',
        'uniform float uTime; uniform vec3 uTint; uniform float uMotion;',
        'varying vec2 vP;',
        'void main(){',
        '  float t = uTime*uMotion;',
        '  float r = length(vP);',
        '  if (r > 1.0) discard;',
        '  float ang = atan(vP.y, vP.x);',
        '  float sweep = fract(ang/6.28318530718 - t*0.16);',
        '  float beam = pow(1.0-sweep, 7.0);',
        '  float rings = smoothstep(0.03,0.0,abs(fract(r*3.0)-0.5)-0.47);',
        '  float cross = smoothstep(0.02,0.0,min(abs(vP.x),abs(vP.y)))*0.5;',
        // three deterministic contacts with afterglow
        '  float blip = 0.0;',
        '  for (int i=0;i<3;i++){',
        '    float fi = float(i);',
        '    vec2 bp = vec2(cos(fi*2.4+1.3), sin(fi*2.4+1.3))*(0.35+0.22*fi);',
        '    float d = length(vP-bp);',
        '    float ba = fract(atan(bp.y,bp.x)/6.28318530718 - t*0.16);',
        '    blip += smoothstep(0.09,0.0,d)*(0.35+0.65*pow(1.0-ba,4.0));',
        '  }',
        '  vec3 col = uTint*(0.10 + beam*0.85 + rings*0.22 + cross*0.2) + uTint*blip*1.8;',
        '  float a = (0.16 + beam*0.5 + rings*0.30 + cross*0.2 + blip*0.8) * smoothstep(1.0,0.96,r);',
        '  a += smoothstep(0.03,0.0,abs(r-0.98))*0.8;',   // bezel
        '  gl_FragColor = vec4(col*a, a);',
        '}'
    ].join('\n');

    /* ---- key rim: rounded-rect SDF energy border + pointer specular ------ */
    var V_RIM = [
        'varying vec2 vL;',
        'void main(){ vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var F_RIM = [
        'precision highp float;',
        'uniform vec2 uSize; uniform float uRadius; uniform float uThick;',
        'uniform vec3 uTint; uniform vec2 uMouse; uniform float uHot; uniform float uPress;',
        'uniform float uTime; uniform float uMotion;',
        'varying vec2 vL;',
        'float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }',
        'void main(){',
        '  vec2 p = vL*uSize;',
        '  float d = sdBox(p, uSize*0.5 - uThick*0.5, uRadius);',
        '  float band = smoothstep(uThick, uThick*0.2, abs(d));',
        '  float ang = atan(p.y, p.x)/6.28318530718;',
        '  float run = smoothstep(0.40,0.5,abs(fract(ang - uTime*uMotion*0.10)-0.5));',
        '  vec2 dm = p-uMouse;',
        '  float sp = exp(-dot(dm,dm)/(uSize.x*uSize.x*0.05))*uHot;',
        '  float a = band*(0.30 + 0.45*run + 0.45*uPress) + sp*0.45;',
        '  vec3 col = uTint*(0.9+run*0.9) + vec3(1.0)*sp*0.5;',
        '  gl_FragColor = vec4(col*a, a);',
        '}'
    ].join('\n');

    /* ---- instanced corner brackets: machined metal ----------------------- */
    var V_METAL = [
        'varying vec3 vN;',
        'void main(){ vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);',
        '  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }'
    ].join('\n');
    var F_METAL = [
        'precision highp float;',
        'uniform vec3 uTint;',
        'varying vec3 vN;',
        'void main(){',
        '  vec3 n = normalize(vN);',
        '  float top = smoothstep(-0.3,1.0,n.y);',
        '  float fres = pow(1.0-abs(n.z), 2.0);',
        '  vec3 col = mix(vec3(0.045,0.07,0.10), vec3(0.20,0.28,0.34), top*0.75 + fres*0.45);',
        '  col += uTint*fres*0.30;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    /* ============================================================== builders */
    var anchors = [];          // { el, kind, obj, mats, uniforms, pad, hot, rect }
    var bracketPanels = [];    // { el, idx0 }
    var bracketMesh = null;
    var bracketSlots = [];

    function shared (frag, vert, uniforms, additive) {
        return new THREE.ShaderMaterial({
            vertexShader: vert || V_PLANE,
            fragmentShader: frag,
            uniforms: uniforms,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending
        });
    }

    function tintUniform () { return { value: state.tint }; }

    /* ---- background field quad ------------------------------------------- */
    var fieldMat = shared(F_FIELD, V_PLANE, {
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uTint: tintUniform(),
        uAlert: { value: 0 },
        uMotion: { value: 1 }
    }, false);
    var field = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fieldMat);
    field.frustumCulled = false;
    bgScene.add(field);

    /* ---- dust motes ------------------------------------------------------- */
    var MOTES = 140;
    var moteGeo = new THREE.BufferGeometry();
    (function () {
        var pos = new Float32Array(MOTES * 3);
        var seed = new Float32Array(MOTES);
        var s = 1234567;
        function rnd () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
        for (var i = 0; i < MOTES; i++) {
            pos[i * 3] = (rnd() - 0.5) * 2400;
            pos[i * 3 + 1] = (rnd() - 0.5) * 1400;
            pos[i * 3 + 2] = -20 - rnd() * 40;
            seed[i] = rnd();
        }
        moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    })();
    var moteMat = new THREE.ShaderMaterial({
        vertexShader: V_MOTES, fragmentShader: F_MOTES,
        uniforms: { uTime: { value: 0 }, uPix: { value: DPR * 2 }, uTint: tintUniform(), uMotion: { value: 1 } },
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
    });
    bgScene.add(new THREE.Points(moteGeo, moteMat));

    /* ---- title reactor: plasma core + 3-ring rig -------------------------- */
    var reactor = new THREE.Group();
    var coreMat = shared(F_CORE, V_CORE, { uTime: { value: 0 }, uTint: tintUniform(), uMotion: { value: 1 } });
    reactor.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), coreMat));
    var ringMats = [];
    [1.45, 1.85, 2.3].forEach(function (r, i) {
        var m = shared(F_RING, V_RING, {
            uTime: { value: 0 }, uTint: tintUniform(), uMotion: { value: 1 },
            uSpeed: { value: 0.10 + i * 0.05 }, uHolo: { value: 1 }
        });
        ringMats.push(m);
        var ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018 + i * 0.006, 8, 128), m);
        ring.rotation.x = Math.PI / 2.2 + i * 0.5;
        ring.rotation.y = i * 0.7;
        reactor.add(ring);
    });
    /* The reactor renders in the FG scene: the title key visual is an opaque
       DOM layer above #ui3d-bg, so a bg-scene reactor would never be seen. */
    fgScene.add(reactor);

    /* ---- fg parts from markup --------------------------------------------- */
    function addGauge (el) {
        var inner = 0.74, outer = 1.0;
        var geo = new THREE.RingGeometry(inner, outer, 96, 1, Math.PI * 0.75, Math.PI * 1.5);
        var mat = shared(F_GAUGE, V_GAUGE, {
            uValue: { value: 0 }, uTint: tintUniform(), uTime: { value: 0 }, uMotion: { value: 1 },
            uInner: { value: inner }, uOuter: { value: outer }
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 2;
        fgScene.add(mesh);
        anchors.push({ el: el, kind: 'gauge', obj: mesh, mat: mat });
    }

    function addRadar (el) {
        var mat = shared(F_RADAR, V_RADAR, { uTime: { value: 0 }, uTint: tintUniform(), uMotion: { value: 1 } });
        var mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 72), mat);
        mesh.renderOrder = 2;
        fgScene.add(mesh);
        anchors.push({ el: el, kind: 'radar', obj: mesh, mat: mat });
    }

    function addRim (el) {
        var mat = shared(F_RIM, V_RIM, {
            uSize: { value: new THREE.Vector2(10, 10) },
            uRadius: { value: 10 }, uThick: { value: 3 },
            uTint: tintUniform(), uMouse: { value: new THREE.Vector2(-9999, -9999) },
            uHot: { value: 0 }, uPress: { value: 0 },
            uTime: { value: 0 }, uMotion: { value: 1 }
        });
        var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.position.z = -1;
        mesh.renderOrder = 3;
        fgScene.add(mesh);
        var a = { el: el, kind: 'rim', obj: mesh, mat: mat, hot: 0, hotT: 0, press: 0 };
        el.addEventListener('pointerenter', function () { a.hotT = 1; }, false);
        el.addEventListener('pointerleave', function () { a.hotT = 0; }, false);
        el.addEventListener('pointerdown', function () { a.press = 1; state.dirty = true; }, false);
        global.addEventListener('pointerup', function () { a.press = 0; state.dirty = true; }, false);
        anchors.push(a);
    }

    function addEmblem (el) {
        var g = new THREE.Group();
        for (var i = 0; i < 3; i++) {
            var m = shared(F_RING, V_RING, {
                uTime: { value: 0 }, uTint: tintUniform(), uMotion: { value: 1 },
                uSpeed: { value: 0.06 + i * 0.04 }, uHolo: { value: 1 }
            });
            var ring = new THREE.Mesh(new THREE.RingGeometry(0.86 + i * 0.16, 0.92 + i * 0.16, 72, 1), m);
            g.add(ring);
        }
        g.renderOrder = 4;
        fgScene.add(g);
        anchors.push({ el: el, kind: 'emblem', obj: g });
    }

    /* Corner bracket orientation table. The L profile's arms run +x/+y from
       its corner, so each panel corner needs its own spin: TL -90°, TR 180°,
       BL 0°, BR +90°. (An earlier mirror-by-signs version read as a bug.) */
    var CORNERS = [
        { sx: -1, sy: 1, rot: -Math.PI / 2 },
        { sx: 1, sy: 1, rot: Math.PI },
        { sx: -1, sy: -1, rot: 0 },
        { sx: 1, sy: -1, rot: Math.PI / 2 }
    ];

    /* corner brackets: one InstancedMesh, four slots per panel */
    function buildBrackets () {
        var L = 26, T = 7, D = 10;
        var shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(L, 0); shape.lineTo(L, T);
        shape.lineTo(T, T); shape.lineTo(T, L); shape.lineTo(0, L); shape.closePath();
        var geo = new THREE.ExtrudeGeometry(shape, {
            depth: D, bevelEnabled: true, bevelSize: 1.6, bevelThickness: 1.6, bevelSegments: 1, steps: 1
        });
        geo.center();
        var mat = new THREE.ShaderMaterial({
            vertexShader: V_METAL, fragmentShader: F_METAL,
            uniforms: { uTint: tintUniform() }
        });
        var n = bracketPanels.length * 4;
        if (!n) { return; }
        bracketMesh = new THREE.InstancedMesh(geo, mat, n);
        bracketMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        bracketMesh.frustumCulled = false;
        bracketMesh.renderOrder = 1;
        fgScene.add(bracketMesh);
        bracketPanels.forEach(function (p, pi) {
            for (var c = 0; c < 4; c++) { bracketSlots.push({ panel: p, corner: c }); }
        });
    }

    /* ---- scan markup ------------------------------------------------------- */
    function scan () {
        var nodes = doc.querySelectorAll('[data-3d]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var kind = el.getAttribute('data-3d');
            if (kind === 'gauge') { addGauge(el); }
            else if (kind === 'radar') { addRadar(el); }
            else if (kind === 'rim') { addRim(el); }
            else if (kind === 'emblem') { addEmblem(el); }
        }
        var panels = doc.querySelectorAll('[data-3d-brackets]');
        for (var j = 0; j < panels.length; j++) { bracketPanels.push({ el: panels[j] }); }
        buildBrackets();

        /* anything with a rect can move: watch it */
        if (global.ResizeObserver) {
            var ro = new ResizeObserver(function () { state.dirty = true; });
            anchors.forEach(function (a) { ro.observe(a.el); });
            bracketPanels.forEach(function (p) { ro.observe(p.el); });
            var stage = doc.querySelector('.stage');
            if (stage) { ro.observe(stage); }
        }
    }

    /* ============================================================== measuring */
    var dummy = new THREE.Object3D();

    function centerOf (rect) {
        return { x: rect.left + rect.width / 2 - W / 2, y: H / 2 - (rect.top + rect.height / 2) };
    }

    function measure () {
        var i, a, rect, c;
        for (i = 0; i < bracketPanels.length; i++) { bracketPanels[i].rectCache = null; }
        for (i = 0; i < anchors.length; i++) {
            a = anchors[i];
            rect = a.el.getBoundingClientRect();
            /* display:none (hidden screen) yields an empty rect: park the part */
            if (rect.width < 1 || rect.height < 1) {
                a.obj.visible = false;
                continue;
            }
            a.obj.visible = true;
            c = centerOf(rect);
            a.rect = rect;
            if (a.kind === 'gauge' || a.kind === 'radar' || a.kind === 'emblem') {
                var s = Math.min(rect.width, rect.height) / 2;
                a.obj.position.set(c.x, c.y, a.kind === 'emblem' ? -2 : -1);
                a.obj.scale.set(s, s, s);
            } else if (a.kind === 'rim') {
                var pad = 7;
                a.obj.position.set(c.x, c.y, -1);
                a.obj.scale.set(1, 1, 1);
                a.mat.uniforms.uSize.value.set(rect.width + pad * 2, rect.height + pad * 2);
                a.mat.uniforms.uRadius.value = Math.min(14, rect.height * 0.3);
            }
        }
        /* brackets hug each panel's four corners; panels on hidden screens
           collapse their instances to zero scale (a stale instance matrix
           would otherwise keep drawing the bracket at its last position). */
        if (bracketMesh) {
            bracketMesh.visible = doc.documentElement.getAttribute('data-brackets') !== 'off';
            for (i = 0; i < bracketSlots.length; i++) {
                var slot = bracketSlots[i];
                rect = slot.panel.rectCache || (slot.panel.rectCache = slot.panel.el.getBoundingClientRect());
                if (rect.width < 1 || rect.height < 1) {
                    dummy.position.set(0, 0, -50);
                    dummy.rotation.set(0, 0, 0);
                    dummy.scale.set(0, 0, 0);
                    dummy.updateMatrix();
                    bracketMesh.setMatrixAt(i, dummy.matrix);
                    continue;
                }
                dummy.scale.set(1, 1, 1);
                var cn = CORNERS[slot.corner];
                var inset = 14;
                dummy.position.set(
                    rect.left + rect.width / 2 - W / 2 + cn.sx * (rect.width / 2 - inset),
                    H / 2 - (rect.top + rect.height / 2) + cn.sy * (rect.height / 2 - inset),
                    -0.5);
                dummy.rotation.set(0, 0, cn.rot);
                dummy.updateMatrix();
                bracketMesh.setMatrixAt(i, dummy.matrix);
            }
            bracketMesh.instanceMatrix.needsUpdate = true;
        }
        if (reactorAnchor) { setReactorAt(reactorAnchor); }
    }

    /* ================================================================= resize */
    function resize () {
        W = global.innerWidth || 1;
        H = global.innerHeight || 1;
        [bgRenderer, fgRenderer].forEach(function (r) {
            r.setSize(W, H, false);
        });
        [bgCam, fgCam].forEach(function (cam) {
            cam.left = -W / 2; cam.right = W / 2;
            cam.top = H / 2; cam.bottom = -H / 2;
            cam.updateProjectionMatrix();
        });
        field.scale.set(W, H, 1);
        fieldMat.uniforms.uRes.value.set(W, H);
        state.dirty = true;
        measure();
    }

    /* ================================================================== loop */
    var clock = new THREE.Clock();
    var frames = 0, fpsTime = 0, fps = 0;

    function tickUniforms (t) {
        fieldMat.uniforms.uTime.value = t;
        fieldMat.uniforms.uMotion.value = state.motion;
        fieldMat.uniforms.uAlert.value = Math.max(0, (state.alert - 40) / 60);
        moteMat.uniforms.uTime.value = t;
        moteMat.uniforms.uMotion.value = state.motion;
        coreMat.uniforms.uTime.value = t;
        coreMat.uniforms.uMotion.value = state.motion;
        ringMats.forEach(function (m) { m.uniforms.uTime.value = t; m.uniforms.uMotion.value = state.motion; });
        for (var i = 0; i < anchors.length; i++) {
            var u = anchors[i].mat && anchors[i].mat.uniforms;
            if (!u) { continue; }
            if (u.uTime) { u.uTime.value = t; }
            if (u.uMotion) { u.uMotion.value = state.motion; }
        }
    }

    function animate () {
        if (!state.alive) { return; }
        global.requestAnimationFrame(animate);
        if (doc.hidden) { return; }

        var dt = Math.min(clock.getDelta(), 0.1);
        if (!state.reduced) { state.time += dt; }

        frames++; fpsTime += dt;
        if (fpsTime >= 0.5) { fps = Math.round(frames / fpsTime); frames = 0; fpsTime = 0; }

        if (state.reduced && !state.dirty) { return; }
        /* Re-measure DOM rects only when something changed (screen switch,
           reflow, ResizeObserver): per-frame getBoundingClientRect would put
           layout thrash on every frame for no gain. */
        if (state.dirty) {
            state.dirty = false;
            measure();
        }

        var t = state.time;
        tickUniforms(t);

        /* reactor spins and breathes */
        reactor.rotation.y = t * 0.22;
        reactor.rotation.z = Math.sin(t * 0.3) * 0.06;
        var breathe = 1 + Math.sin(t * 0.9) * 0.03;
        reactor.children[0].scale.set(breathe, breathe, breathe);

        /* fg animation: emblem rings counter-rotate, rims ease toward hover */
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            if (a.kind === 'emblem') {
                for (var r = 0; r < a.obj.children.length; r++) {
                    a.obj.children[r].rotation.z = t * (0.25 + r * 0.18) * (r % 2 ? -1 : 1);
                }
            } else if (a.kind === 'rim' && a.rect) {
                a.hot += (a.hotT - a.hot) * Math.min(1, dt * 12);
                a.mat.uniforms.uHot.value = a.hot;
                a.mat.uniforms.uPress.value = a.press;
                a.mat.uniforms.uMouse.value.set(
                    state.pointer.x - (a.rect.left + a.rect.width / 2),
                    (a.rect.top + a.rect.height / 2) - state.pointer.y);
            } else if (a.kind === 'gauge') {
                var target = parseFloat(a.el.getAttribute('data-val') || '0') / 100;
                a.mat.uniforms.uValue.value += (target - a.mat.uniforms.uValue.value) * Math.min(1, dt * 6);
            }
        }

        bgRenderer.render(bgScene, bgCam);
        fgRenderer.render(fgScene, fgCam);
    }

    /* =================================================================== API */
    function setAlert (v) {
        state.alert = v;
        var tier = v >= 40 ? 'alarm' : (v >= 15 ? 'caution' : 'nominal');
        doc.documentElement.setAttribute('data-alert-tier', tier);
        var hex = tier === 'alarm' ? 0xff4d5e : (tier === 'caution' ? 0xffb454 : 0x3ae6ff);
        state.tint.setHex(hex);
        state.dirty = true;
    }

    function setReactorAt (elOrRect, visible) {
        var rect = elOrRect && elOrRect.getBoundingClientRect ? elOrRect.getBoundingClientRect() : elOrRect;
        if (!rect || !rect.width) { reactor.visible = false; return; }
        reactor.visible = visible !== false;
        var c = centerOf(rect);
        var s = Math.min(rect.width, rect.height) / 9;
        reactor.position.set(c.x, c.y, -30);
        reactor.scale.set(s, s, s);
    }

    global.addEventListener('resize', resize, false);
    global.addEventListener('orientationchange', resize, false);
    global.addEventListener('pointermove', function (e) {
        state.pointer.x = e.clientX; state.pointer.y = e.clientY;
    }, { passive: true });
    doc.addEventListener('visibilitychange', function () { state.dirty = true; }, false);

    /* ================================================================== boot */
    var reactorAnchor = doc.querySelector('[data-reactor]');
    try {
        scan();
        resize();
        setAlert(12);
        animate();
    } catch (err) {
        if (global.console && console.error) { console.error('three-ui boot failed:', err); }
        noWebGL();
    }

    global.SeirinThreeUI = {
        setAlert: setAlert,
        setReactorAt: setReactorAt,
        markDirty: function () { state.dirty = true; },
        stats: function () {
            return {
                fps: fps,
                dpr: DPR,
                w: W, h: H,
                anchors: anchors.length,
                brackets: bracketSlots.length,
                bgCalls: bgRenderer.info.render.calls,
                fgCalls: fgRenderer.info.render.calls,
                bgTris: bgRenderer.info.render.triangles,
                fgTris: fgRenderer.info.render.triangles,
                reduced: state.reduced,
                webgl: !doc.documentElement.classList.contains('no-webgl')
            };
        },
        refresh: function () { scan(); resize(); },
        dump: function () {
            return anchors.map(function (a) {
                var r = a.rect;
                return {
                    k: a.kind,
                    vis: a.obj.visible,
                    rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
                    pos: [Math.round(a.obj.position.x), Math.round(a.obj.position.y)],
                    scl: Math.round(a.obj.scale.x * 10) / 10
                };
            });
        }
    };
})(window);
