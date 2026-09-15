/* ============================================================================
 * Seirin "Holoframe" mockup — texture service (DEV ONLY).
 * ---------------------------------------------------------------------------
 * Two families, both seam-safe:
 *
 * A. BAKED (AI art, processed by design/tools/three-ui/build-textures.mjs and
 *    inlined as data URIs). Loaded once, configured once:
 *      - colorSpace SRGB for colour maps;
 *      - RepeatWrapping ONLY on parts the builder made periodic (edges, tiles)
 *        and ClampToEdge on corners (wrapping a corner would show its opposite
 *        side in the filtered border texels);
 *      - anisotropy = min(8, max) so oblique plate grain does not shimmer;
 *      - mipmaps on, LinearMipmapLinear — the atlas-free layout (one part per
 *        texture) means no neighbour bleed at any mip level.
 *
 * B. RUNTIME PROCEDURAL (canvas). Things raster beats shaders at: dial tick
 *    rings with numerals, printed cartridge labels, plate grain. Baked at
 *    devicePixelRatio so text stays crisp, and always with the wrap mode the
 *    shader/CSS will use (grain tiles => mirrored edges padded, then Repeat).
 * ========================================================================= */
(function (root) {
  'use strict';
  var HF = (root.HF = root.HF || {});
  var cache = {};

  function maxAniso(renderer) {
    return renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  }

  /** Baked part by manifest name. */
  HF.loadTex = function (name, renderer, opts) {
    opts = opts || {};
    var key = name + (opts.repeat ? ':r' : '');
    if (cache[key]) return cache[key];
    var rec = (root.SEIRIN_TEX && root.SEIRIN_TEX.images[name]);
    if (!rec) return null;
    var img = new Image();
    img.src = rec.uri;                                  // data: URI — never tainted
    var t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = maxAniso(renderer);
    t.needsUpdate = true;                               // img decodes async; three re-uploads
    if (img.decode) { img.decode().then(function () { t.needsUpdate = true; }).catch(function () {}); }
    t.userData.w = rec.w; t.userData.h = rec.h;
    cache[key] = t;
    return t;
  };

  /* ------------------------------------------------- runtime canvas textures */
  function canvasTex(w, h, draw, opts) {
    opts = opts || {};
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    if (!g) return null;                 // headless envs: degrade, never throw
    draw(g, w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.anisotropy = opts.aniso || 4;
    t.needsUpdate = true;
    return t;
  }

  /** Deterministic PRNG so the "procedural" grain is identical on every run. */
  HF.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /**
   * Plate grain: 256px tile, edges mirrored into a 4px pad ring so RepeatWrapping
   * cannot show a clamp seam; value-noise blotches + horizontal brush streaks.
   */
  HF.makeGrain = function () {
    if (cache.grain) return cache.grain;
    var S = 256, P = 4;
    cache.grain = canvasTex(S + P * 2, S + P * 2, function (g, w, h) {
      var rnd = HF.mulberry32(20300715);
      var img = g.createImageData(w, h);
      var d = img.data;
      // base value-noise field on the inner SxS, then mirror-pad
      function val(x, y) {
        x = ((x % S) + S) % S; y = ((y % S) + S) % S;
        var n = 0;
        n += 0.55 * noise2(x / 34, y / 34);
        n += 0.28 * noise2(x / 11 + 7.3, y / 11 + 2.1);
        n += 0.17 * noise2(x / 3.1 + 31.7, y / 47 + 11.2);   // stretched: brush lines
        return n;
      }
      // tiny hash noise (no deps)
      function noise2(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        function hh(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
        var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        return (hh(xi, yi) * (1 - u) + hh(xi + 1, yi) * u) * (1 - v) +
               (hh(xi, yi + 1) * (1 - u) + hh(xi + 1, yi + 1) * u) * v;
      }
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var sx = x - P, sy = y - P;
        if (sx < 0) sx = -sx - 1; if (sy < 0) sy = -sy - 1;      // mirror pad
        if (sx >= S) sx = 2 * S - 1 - sx; if (sy >= S) sy = 2 * S - 1 - sy;
        var n = val(sx, sy);
        var streak = 0.5 + 0.5 * Math.sin(sy * 2.1 + noise2(sx / 21, sy / 2.7) * 9.0);
        var v = Math.round(255 * (0.35 + 0.45 * n + 0.10 * streak));
        var i = (y * w + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      void rnd;
    }, { repeat: true, linear: true, aniso: 8 });
    return cache.grain;
  };

  /** Dial face: tick ring + numerals, baked at DPR for crispness. */
  HF.makeDialFace = function (dpr, label) {
    var S = Math.round(256 * dpr);
    return canvasTex(S, S, function (g, w) {
      var c = w / 2;
      g.clearRect(0, 0, w, w);
      g.strokeStyle = 'rgba(125,211,252,0.9)';
      g.fillStyle = 'rgba(125,211,252,0.95)';
      g.lineWidth = Math.max(1.5, w * 0.008);
      for (var i = 0; i <= 40; i++) {
        var a = (-220 + (i / 40) * 260) * Math.PI / 180;
        var major = i % 5 === 0;
        var r0 = c * (major ? 0.74 : 0.80), r1 = c * 0.88;
        g.beginPath();
        g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
        g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
        g.lineWidth = major ? Math.max(2, w * 0.012) : Math.max(1, w * 0.006);
        g.stroke();
        if (major && i % 10 === 0) {
          g.save();
          g.translate(c + Math.cos(a) * c * 0.58, c + Math.sin(a) * c * 0.58);
          g.font = '600 ' + Math.round(w * 0.085) + 'px Rajdhani, system-ui, sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(String(i / 40 * 100), 0, 0);
          g.restore();
        }
      }
      g.font = '600 ' + Math.round(w * 0.075) + 'px Rajdhani, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(251,191,36,0.9)';
      g.fillText(label || '', c, c * 1.42);
    });
  };

  /** Printed cartridge label: title + meta line, transparent PNG-ish canvas. */
  HF.makeLabel = function (w, h, title, meta, dpr) {
    return canvasTex(Math.round(w * dpr), Math.round(h * dpr), function (g, W, H) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(226,232,240,0.92)';
      g.font = '600 ' + Math.round(H * 0.42) + 'px Rajdhani, system-ui, sans-serif';
      g.textBaseline = 'middle';
      g.fillText(title, W * 0.05, H * 0.36);
      g.fillStyle = 'rgba(148,163,184,0.85)';
      g.font = '500 ' + Math.round(H * 0.26) + 'px "Share Tech Mono", monospace';
      g.fillText(meta, W * 0.05, H * 0.74);
    });
  };

  HF.texCache = cache;
})(typeof window !== 'undefined' ? window : globalThis);
