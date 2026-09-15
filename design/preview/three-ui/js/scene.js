/* ============================================================================
 * Seirin "Holoframe" mockup — scene, DOM anchoring, render loop (DEV ONLY).
 * ---------------------------------------------------------------------------
 * Architecture in one paragraph: the DOM owns layout, the GPU owns material.
 * Every element carrying [data-plate] keeps its normal HTML/CSS box (fluid,
 * accessible, responsive); a nine-slice 3D plate is anchored to its
 * getBoundingClientRect() and rebuilt — not scaled — whenever the box changes,
 * so the armour follows the responsive layout instead of fighting it. The
 * camera is calibrated so that 1 CSS px == a constant world length on the
 * plate plane (z = 0), which is what makes "rect -> mesh" exact.
 *
 * Nothing here mutates game state; this is a visual mockup.
 * ========================================================================= */
(function (root) {
  'use strict';
  var HF = (root.HF = root.HF || {});
  var doc = root.document;

  var S = {
    ok: false, renderer: null, scene: null, camera: null, clock: null,
    k: 1, vw: 1, vh: 1, dpr: 1, time: 0, anim: true, dirty: true,
    plates: [], holos: [], env: null, pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    quality: 'high', alert: 0,
  };
  HF.scene = S;

  function cssVar(name, fallback) {
    var v = getComputedStyle(doc.documentElement).getPropertyValue(name);
    return (v || '').trim() || fallback;
  }

  /* ------------------------------------------------------------- calibration */
  function calibrate() {
    S.vw = root.innerWidth; S.vh = root.innerHeight;
    S.dpr = Math.min(root.devicePixelRatio || 1, S.quality === 'high' ? 2 : 1.5);
    S.renderer.setPixelRatio(S.dpr);
    S.renderer.setSize(S.vw, S.vh, false);
    S.camera.aspect = S.vw / S.vh;
    S.camera.updateProjectionMatrix();
    // world length of one css px on the z=0 plane
    var dist = S.camera.position.z;
    S.k = (2 * Math.tan((S.camera.fov * Math.PI) / 360) * dist) / S.vh;
    S.dirty = true;
  }

  /* ------------------------------------------------------------------ plates */
  function frameMetrics(variant) {
    var m = root.SEIRIN_TEX.manifest[variant];
    return { C: m.corner, eLen: m.edgeLen, variant: variant };
  }

  /** Richest frame variant whose nine-slice minimum fits the box, else null. */
  function pickVariant(w, h) {
    var order = ['plate', 'chip', 'btn'];
    for (var i = 0; i < order.length; i++) {
      var m = root.SEIRIN_TEX.manifest[order[i]];
      if (w >= 2 * m.corner && h >= 2 * m.corner) return order[i];
    }
    return null;                       // too small for any slice: flat frame
  }

  function makePlate(el) {
    var variant = el.getAttribute('data-plate') || 'auto';
    // z-stacking: nested plates sit in front of their host (coplanar
    // overlapping quads would z-fight), plus an optional per-element offset.
    var depth = 0, n = el.parentElement;
    while (n) { if (n.hasAttribute && n.hasAttribute('data-plate')) depth++; n = n.parentElement; }
    var p = {
      el: el, variant: variant, cur: null, mesh: null, mats: null, geo: null,
      w: 0, h: 0, phase: Math.random() * 6.28, hover: 0, hoverT: 0,
      z: depth * 10 + (el.dataset.plateZ ? +el.dataset.plateZ : 0),
    };
    var glow = new THREE.Color(cssVar('--hf-cyan', '#38bdf8'));
    var texC = HF.loadTex('frame_plate_corner', S.renderer);
    var texH = HF.loadTex('frame_plate_edge_h', S.renderer, { repeat: true });
    var texV = HF.loadTex('frame_plate_edge_v', S.renderer, { repeat: true });
    p.mats = [
      HF.matFramePart(texC), HF.matFramePart(texH), HF.matFramePart(texV),
      HF.matPlateCenter(HF.makeGrain(), HF.loadTex('trace', S.renderer, { repeat: true })),
    ];
    p.mats.forEach(function (m) { m.uniforms.uGlow.value = glow; });
    p.mesh = new THREE.Mesh(new THREE.BufferGeometry(), p.mats);
    p.mesh.frustumCulled = false;
    p.mesh.renderOrder = 5;
    S.scene.add(p.mesh);
    el.addEventListener('pointerenter', function () { p.hoverT = 1; });
    el.addEventListener('pointerleave', function () { p.hoverT = 0; });
    S.plates.push(p);
    syncPlate(p, true);
    return p;
  }

  function syncPlate(p, force) {
    var r = p.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) { p.mesh.visible = false; return; }
    p.mesh.visible = !p.el.closest('[hidden]') && getComputedStyle(p.el).display !== 'none';
    var w = Math.round(r.width), h = Math.round(r.height);
    var variant = p.variant === 'auto' ? pickVariant(w, h) : p.variant;
    if (variant && (w < 2 * frameMetrics(variant).corner || h < 2 * frameMetrics(variant).corner)) variant = pickVariant(w, h);
    if (!variant) {                    // below every nine-slice minimum
      if (p.cur !== 'flat') { p.el.classList.add('hf-plate-flat'); p.cur = 'flat'; }
      p.mesh.visible = false;
      return;
    }
    p.el.classList.remove('hf-plate-flat');
    var m = frameMetrics(variant);
    if (force || variant !== p.cur || Math.abs(w - p.w) > 0.5 || Math.abs(h - p.h) > 0.5) {
      p.cur = variant; p.w = w; p.h = h;
      if (p.geo) p.geo.dispose();
      p.geo = HF.plates.toThree(HF.plates.buildPlate(w, h, m.C, m.eLen));
      p.mesh.geometry = p.geo;
      p.mats[3].uniforms.uSize.value.set(w, h);
    }
    var k = S.k;
    p.mesh.scale.setScalar(k);
    p.mesh.position.set(
      (r.left + r.width / 2 - S.vw / 2) * k,
      (S.vh / 2 - (r.top + r.height / 2)) * k,
      p.z * k
    );
  }

  /* ------------------------------------------------- anchored holo quads */
  function makeHolo(el) {
    var kind = el.getAttribute('data-holo');
    var h = { el: el, kind: kind, w: 0, h: 0 };
    if (kind === 'radar') h.mat = HF.matRadar();
    else if (kind === 'card') {
      var t = HF.loadTex('holo_card', S.renderer);
      h.mat = HF.matHoloCard(t, t.userData.w / t.userData.h);
    } else return null;
    h.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), h.mat);
    h.mesh.frustumCulled = false;
    h.mesh.renderOrder = 6;
    S.scene.add(h.mesh);
    S.holos.push(h);
    syncHolo(h, true);
    return h;
  }

  function syncHolo(h, force) {
    var r = h.el.getBoundingClientRect();
    h.mesh.visible = r.width > 2 && !h.el.closest('[hidden]');
    if (!h.mesh.visible) return;
    var w = r.width, hh = r.height;
    if (force || Math.abs(w - h.w) > 0.5 || Math.abs(hh - h.h) > 0.5) {
      h.w = w; h.h = hh;
      h.mesh.geometry.dispose();
      h.mesh.geometry = new THREE.PlaneGeometry(w, hh);   // px units, mesh scaled by k
      if (h.kind === 'card') h.mat.uniforms.uQuadAspect.value.set(w / hh, 1);
    }
    h.mesh.scale.setScalar(S.k);
    h.mesh.position.set(
      (r.left + w / 2 - S.vw / 2) * S.k,
      (S.vh / 2 - (r.top + hh / 2)) * S.k,
      2 * S.k
    );
  }

  /* ------------------------------------------------------------ environment */
  function buildEnv() {
    var g = new THREE.Group();
    var rnd = HF.mulberry32(77031);

    // holographic floor
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5200), HF.matFloor());
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -S.vh * 0.62 * S.k, -1400 * S.k);
    g.add(floor);
    S.envFloor = floor;

    // resonance core
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(150 * S.k, 3), HF.matCore());
    core.position.set(S.vw * 0.30 * S.k, S.vh * 0.16 * S.k, -700 * S.k);
    g.add(core);
    S.envCore = core;
    var cage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(196 * S.k, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar('--hf-cyan', '#38bdf8')), wireframe: true, transparent: true, opacity: 0.16 })
    );
    cage.position.copy(core.position);
    g.add(cage);
    S.envCage = cage;

    // drifting armour shards, box UVs retiled to constant px density
    var metal = HF.loadTex('metal', S.renderer, { repeat: true });
    S.shards = new THREE.Group();
    var n = S.quality === 'high' ? 14 : 7;
    for (var i = 0; i < n; i++) {
      var d = [40 + rnd() * 90, 14 + rnd() * 40, 6 + rnd() * 14];
      var geo = HF.plates.retileBoxUVs(new THREE.BoxGeometry(d[0] * S.k, d[1] * S.k, d[2] * S.k), d, 220);
      var sh = new THREE.Mesh(geo, HF.matShard(metal));
      sh.position.set((rnd() - 0.5) * S.vw * 1.5 * S.k, (rnd() - 0.35) * S.vh * 1.2 * S.k, (-350 - rnd() * 900) * S.k);
      sh.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      sh.userData.spin = [(rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.08];
      S.shards.add(sh);
    }
    g.add(S.shards);

    // dust motes: shader dots, no sprite texture
    var N = S.quality === 'high' ? 240 : 100;
    var pos = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
    for (var j = 0; j < N; j++) {
      pos[j * 3] = (rnd() - 0.5) * S.vw * 1.6 * S.k;
      pos[j * 3 + 1] = (rnd() - 0.5) * S.vh * 1.4 * S.k;
      pos[j * 3 + 2] = (-100 - rnd() * 1100) * S.k;
      size[j] = 1.2 + rnd() * 3.4;
      ph[j] = rnd();
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    pg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    S.motes = new THREE.Points(pg, HF.matMotes());
    S.motes.frustumCulled = false;
    g.add(S.motes);

    S.scene.add(g);
  }

  /* ------------------------------------------------------------------- boot */
  HF.boot3D = function () {
    if (!root.SEIRIN_TEX || !root.THREE) return false;
    var canvas = doc.getElementById('hf-canvas');
    try {
      S.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    } catch (e) {
      return false;
    }
    S.ok = true;
    S.quality = (root.innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4) ? 'low' : 'high';
    S.scene = new THREE.Scene();
    S.camera = new THREE.PerspectiveCamera(40, 1, 1, 12000);
    S.camera.position.set(0, 0, 1500);
    S.clock = { last: performance.now() };
    calibrate();
    buildEnv();

    doc.querySelectorAll('[data-plate]').forEach(makePlate);
    doc.querySelectorAll('[data-holo]').forEach(makeHolo);

    root.addEventListener('resize', function () { calibrate(); relayout(); });
    root.addEventListener('pointermove', function (e) {
      S.pointer.tx = (e.clientX / S.vw) * 2 - 1;
      S.pointer.ty = (e.clientY / S.vh) * 2 - 1;
    }, { passive: true });
    doc.addEventListener('visibilitychange', function () { S.clock.last = performance.now(); });

    // re-sync plates whenever layout changes (screen switches, font load, ...)
    if (root.ResizeObserver) {
      var ro = new ResizeObserver(function () { relayout(); });
      S.plates.forEach(function (p) { ro.observe(p.el); });
      S.holos.forEach(function (h) { ro.observe(h.el); });
      S.ro = ro;
    }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { relayout(); });
    loop();
    return true;
  };

  function relayout() {
    if (!S.ok) return;
    S.plates.forEach(function (p) { syncPlate(p); });
    S.holos.forEach(function (h) { syncHolo(h); });
    if (S.envFloor) {
      S.envFloor.position.y = -S.vh * 0.62 * S.k;
      S.envCore.position.set(S.vw * 0.30 * S.k, S.vh * 0.16 * S.k, -700 * S.k);
      S.envCage.position.copy(S.envCore.position);
    }
    S.dirty = true;
  }
  HF.relayout3D = relayout;

  /* ------------------------------------------------------------- main loop */
  function loop() {
    root.requestAnimationFrame(loop);
    if (doc.hidden) return;
    var now = performance.now();
    var dt = Math.min(0.05, (now - S.clock.last) / 1000);
    S.clock.last = now;
    var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) S.time += dt;
    // pointer easing
    S.pointer.x += (S.pointer.tx - S.pointer.x) * Math.min(1, dt * 6);
    S.pointer.y += (S.pointer.ty - S.pointer.y) * Math.min(1, dt * 6);

    var t = S.time;
    S.plates.forEach(function (p) {
      p.hover += (p.hoverT - p.hover) * Math.min(1, dt * 8);
      var tilt = reduced ? 0 : 1;
      p.mesh.rotation.y = (S.pointer.x * 0.035 + p.hover * 0.02) * tilt;
      p.mesh.rotation.x = (-S.pointer.y * 0.028) * tilt;
      p.mesh.position.z = p.hover * 14 * S.k * tilt;
      var m = p.mats;
      m[0].uniforms.uTime.value = m[1].uniforms.uTime.value = m[2].uniforms.uTime.value = t;
      m[3].uniforms.uTime.value = t;
      m[3].uniforms.uEnergy.value = 0.45 + p.hover * 0.5;
      m[3].uniforms.uAlert.value = S.alert > 40 ? 1 : 0;
      var sweep = reduced ? -3 : Math.sin(t * 0.5 + p.phase) * 1.6 - 0.4;
      m[0].uniforms.uSweep.value = m[1].uniforms.uSweep.value = m[2].uniforms.uSweep.value = sweep;
    });
    S.holos.forEach(function (h) { h.mat.uniforms.uTime.value = t; });
    if (S.envCore) {
      S.envCore.rotation.y = t * 0.22; S.envCore.rotation.x = Math.sin(t * 0.3) * 0.2;
      S.envCage.rotation.y = -t * 0.12; S.envCage.rotation.z = t * 0.05;
      S.envCore.material.uniforms.uTime.value = t;
      S.envFloor.material.uniforms.uTime.value = t;
      S.motes.material.uniforms.uTime.value = t;
      S.motes.material.uniforms.uPxRatio.value = S.dpr;
      S.shards.children.forEach(function (sh) {
        sh.rotation.x += sh.userData.spin[0] * dt;
        sh.rotation.y += sh.userData.spin[1] * dt;
        sh.rotation.z += sh.userData.spin[2] * dt;
        sh.material.uniforms.uTime.value = t;
      });
    }
    S.renderer.render(S.scene, S.camera);
  }
})(typeof window !== 'undefined' ? window : globalThis);
