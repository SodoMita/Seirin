/* ============================================================================
 * Seirin "Holoframe" mockup — DOM behaviour (DEV ONLY).
 * ---------------------------------------------------------------------------
 * Keeps the "good parts of HTML/CSS" in charge of everything the GPU has no
 * business doing: layout, flow, focus, type scale, responsive ladder. The JS
 * here only (a) publishes the measured nine-slice metrics as CSS custom
 * properties so CSS can build the SAME plate without WebGL, (b) routes screens,
 * (c) drives the two physical widgets (rotary dial, alert lever) and (d) fills
 * the Materials-lab readouts straight from the texture manifest.
 * ========================================================================= */
(function (root) {
  'use strict';
  var doc = root.document;
  var HF = (root.HF = root.HF || {});

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  /* ------------------------------- publish metrics to CSS (9-slice parity) */
  function publishMetrics() {
    var m = root.SEIRIN_TEX;
    if (!m) return;
    var rs = doc.documentElement.style;
    ['plate', 'chip', 'btn'].forEach(function (v) {
      var mm = m.manifest[v];
      rs.setProperty('--hf9-' + v + '-c', mm.corner + 'px');
      rs.setProperty('--hf9-' + v + '-e', mm.edgeLen + 'px');
      rs.setProperty('--hf9-' + v + '-corner', 'url("' + m.images['frame_' + v + '_corner'].uri + '")');
      rs.setProperty('--hf9-' + v + '-edgeh', 'url("' + m.images['frame_' + v + '_edge_h'].uri + '")');
      rs.setProperty('--hf9-' + v + '-edgev', 'url("' + m.images['frame_' + v + '_edge_v'].uri + '")');
      var c = m.manifest['center_' + v].rgb;
      rs.setProperty('--hf9-' + v + '-center', 'rgb(' + c.join(',') + ')');
    });
  }

  /* --------------------------------------------------------- screen router */
  function route() {
    var nav = $$('#hf-nav button');
    function show(id) {
      $$('main > section').forEach(function (s) {
        var on = s.id === id;
        s.hidden = !on;
        s.setAttribute('aria-current', on ? 'page' : 'false');
      });
      nav.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.screen === id)); });
      doc.body.dataset.screen = id;
      if (HF.relayout3D) HF.relayout3D();
      // layouts settle after fonts/scrollbars; re-sync once more next frame
      requestAnimationFrame(function () { if (HF.relayout3D) HF.relayout3D(); });
    }
    nav.forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.screen); });
    });
    show(nav[0].dataset.screen);
  }

  /* ----------------------------------------------------------- rotary dial */
  function dial() {
    var el = $('#dial-volume');
    if (!el) return;
    var out = $('#dial-volume-out');
    var range = $('#set-volume');
    var val = 62;
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    function paint() {
      el.style.setProperty('--dial-a', String(-130 + (val / 100) * 260) + 'deg');
      el.setAttribute('aria-valuenow', String(val));
      if (out) out.textContent = String(val);
      if (range) range.value = String(val);
    }
    // runtime procedural texture: tick ring baked at DPR, crisp at any zoom
    var face = HF.makeDialFace(dpr, 'ГРОМКОСТЬ');
    if (face) el.style.setProperty('--dial-face', 'url("' + face.image.toDataURL('image/png') + '")');
    var drag = null;
    function angleAt(e) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var a = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI; // -180..180, 0=right
      var deg = a + 90;                      // 0 = up
      if (deg > 180) deg -= 360;             // -180..180
      return Math.max(-130, Math.min(130, deg));
    }
    el.addEventListener('pointerdown', function (e) {
      drag = { a0: angleAt(e), v0: val };
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      val = Math.round(Math.max(0, Math.min(100, drag.v0 + (angleAt(e) - drag.a0) * 0.4)));
      paint();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      el.addEventListener(ev, function () { drag = null; el.classList.remove('is-drag'); });
    });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      val = Math.max(0, Math.min(100, val + (e.deltaY < 0 ? 2 : -2)));
      paint();
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      var d = { ArrowUp: 2, ArrowRight: 2, ArrowDown: -2, ArrowLeft: -2, PageUp: 10, PageDown: -10 }[e.key];
      if (d) { e.preventDefault(); val = Math.max(0, Math.min(100, val + d)); paint(); }
    });
    if (range) range.addEventListener('input', function () { val = +range.value; paint(); });
    paint();
  }

  /* ------------------------------------------------------ sliders + alert */
  function sliders() {
    $$('input[type="range"]').forEach(function (r) {
      var paint = function () {
        var min = +r.min || 0, max = +r.max || 100;
        r.style.setProperty('--fill', ((r.value - min) / (max - min) * 100).toFixed(1) + '%');
        var o = doc.getElementById(r.id + '-out');
        if (o) o.textContent = r.value;
      };
      r.addEventListener('input', paint);
      paint();
    });
    var alert = $('#set-alert');
    if (alert) alert.addEventListener('input', function () {
      var v = +alert.value;
      doc.documentElement.dataset.alert = v >= 40 ? 'critical' : (v >= 15 ? 'caution' : 'nominal');
      if (HF.scene) HF.scene.alert = v;
      var hud = $('#hud-alert');
      if (hud) hud.textContent = String(v);
    });
  }

  /* --------------------------------------------------------- materials lab */
  function lab() {
    var body = $('#lab-table');
    if (!body || !root.SEIRIN_TEX) return;
    var m = root.SEIRIN_TEX;
    var tile = $('#lab-tile');
    if (tile) tile.style.backgroundImage = 'url("' + m.images.metal.uri + '")';
    var rows = [];
    function row(cells) { rows.push('<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'); }
    Object.keys(m.images).forEach(function (k) {
      var im = m.images[k];
      var seam = im.seamAfter ? ('seam/base ' + im.seamBefore.ratio + ' → <b>' + im.seamAfter.ratio + '</b>') : '—';
      var wrap = im.seamless ? 'Repeat (periodic)' : (k.indexOf('corner') >= 0 ? 'Clamp (never tiled)' : 'Clamp');
      row([k, im.w + '×' + im.h, wrap, seam, (im.uri.length * 0.75 / 1024).toFixed(0) + ' KB']);
    });
    ['plate', 'chip', 'btn'].forEach(function (v) {
      var mm = m.manifest[v];
      row(['frame_' + v + ' slices', 'corner ' + mm.corner + 'px · edge tile ' + mm.edgeLen + 'px', 'nine-slice', 'min box ' + (2 * mm.corner) + 'px', '—']);
    });
    body.innerHTML = rows.join('');
  }

  /* ------------------------------------------------------------------ boot */
  HF.bootUI = function () {
    publishMetrics();
    route();
    dial();
    sliders();
    lab();
    var webgl = HF.boot3D && HF.boot3D();
    if (!webgl) {
      doc.documentElement.classList.add('no-webgl');
      var n = $('#hf-nowebgl');
      if (n) n.hidden = false;
      var cssPlates = function () {
        var order = ['plate', 'chip', 'btn'];
        $$('[data-plate]').forEach(function (el) {
          var r = el.getBoundingClientRect();
          var v = null;
          for (var i = 0; i < order.length; i++) {
            var c = root.SEIRIN_TEX.manifest[order[i]].corner;
            if (r.width >= 2 * c && r.height >= 2 * c) { v = order[i]; break; }
          }
          el.classList.toggle('hf-css9', !!v);
          el.classList.toggle('hf-plate-flat', !v);
          if (v) el.dataset.v = v;
        });
      };
      cssPlates();
      root.addEventListener('resize', cssPlates);
    }
    // demo lever for the alarm state
    var alarmBtn = $('#btn-alarm-demo');
    if (alarmBtn) alarmBtn.addEventListener('click', function () {
      var a = $('#set-alert');
      a.value = doc.documentElement.dataset.alert === 'critical' ? '8' : '62';
      a.dispatchEvent(new Event('input'));
    });
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', HF.bootUI);
  else HF.bootUI();
})(typeof window !== 'undefined' ? window : globalThis);
