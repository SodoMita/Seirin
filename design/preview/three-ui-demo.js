/* ============================================================================
 * Seirin — three-ui DEMO WIRING (DESIGN PREVIEW HARNESS ONLY)
 * ----------------------------------------------------------------------------
 * Stands in for the Monogatari engine + game.js so the 3D/AI-plate skin can be
 * reviewed without booting the VN: screen routing, a dialogue advance loop,
 * gauge values, alert escalation and the diagnostics readout.
 *
 * It owns NO geometry: every layout decision is in three-ui.css, every 3D part
 * is anchored by three-ui.js to a rect this file never positions.
 * ========================================================================== */
(function (global) {
    'use strict';
    var doc = global.document;
    if (!doc) { return; }

    var T3 = global.SeirinThreeUI || null;

    /* ------------------------------------------------------------- screens */
    var screens = {
        title: doc.getElementById('scr-title'),
        game: doc.getElementById('scr-game'),
        settings: doc.getElementById('scr-settings'),
        save: doc.getElementById('scr-save')
    };

    function show (name) {
        Object.keys(screens).forEach(function (k) {
            var on = k === name;
            screens[k].classList.toggle('is-on', on);
            screens[k].setAttribute('aria-hidden', on ? 'false' : 'true');
        });
        doc.documentElement.setAttribute('data-screen', name);
        if (T3) { T3.markDirty(); }
        var first = screens[name].querySelector('button, h1, h2');
        if (first && first.focus && !global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            /* focus stays put under reduced motion: no scroll jumps */
        }
    }

    /* ------------------------------------------------------------ dialogue */
    var LINES = [
        { who: '', text: 'Дождь над Тэцубой не заканчивается третью ночь подряд. Порт гудит, как трансформатор на грани.' },
        { who: 'РЭН', text: 'Ещё одна смена, ещё один заказ. Курьер не спрашивает, что в коробке. Курьер спрашивает, сколько платят.' },
        { who: '???', text: '…слышишь? Резонанс снова поднялся. Третий раз за час.' },
        { who: 'РЭН', text: 'Рация должна быть выключена. Рация выключена. И всё равно я слышу этот голос сквозь статику.' }
    ];
    var lineIdx = -1;
    var typeTimer = null;

    var nameEl = doc.getElementById('d-name');
    var textEl = doc.getElementById('d-text');
    var caretEl = doc.querySelector('.console-caret');
    var choicesEl = doc.getElementById('choices');

    function setGauges (res, pwr) {
        var g = doc.querySelectorAll('.gauge');
        /* data-val feeds the WebGL arc; --val feeds the CSS conic fallback,
           so the no-WebGL ladder shows the same numbers as the 3D layer. */
        if (g[0]) { g[0].setAttribute('data-val', String(res)); g[0].style.setProperty('--val', res); }
        if (g[1]) { g[1].setAttribute('data-val', String(pwr)); g[1].style.setProperty('--val', pwr); }
    }

    function typeLine (line) {
        nameEl.textContent = line.who || 'СЭЙРИН';
        nameEl.style.visibility = line.who ? 'visible' : 'hidden';
        textEl.textContent = '';
        if (caretEl) { caretEl.style.display = 'none'; }
        var i = 0;
        if (typeTimer) { global.clearInterval(typeTimer); }
        var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            textEl.textContent = line.text;
            if (caretEl) { caretEl.style.display = ''; }
            return;
        }
        typeTimer = global.setInterval(function () {
            i += 2;
            textEl.textContent = line.text.slice(0, i);
            if (i >= line.text.length) {
                global.clearInterval(typeTimer);
                if (caretEl) { caretEl.style.display = ''; }
            }
        }, 16);
    }

    function advance () {
        lineIdx++;
        if (lineIdx >= LINES.length) {
            choicesEl.hidden = false;
            if (caretEl) { caretEl.style.display = 'none'; }
            return;
        }
        choicesEl.hidden = true;
        typeLine(LINES[lineIdx]);
        setGauges(Math.min(96, 30 + lineIdx * 9), 62);
        if (T3) { T3.markDirty(); }
    }

    /* --------------------------------------------------------------- alert */
    var alertInput = doc.getElementById('diag-alert');
    var alertOut = doc.getElementById('diag-alert-out');
    var alertBadge = doc.getElementById('hud-alert');

    function setAlert (v) {
        v = Math.max(0, Math.min(100, v | 0));
        if (alertInput) { alertInput.value = String(v); paintFill(alertInput); }
        if (alertOut) { alertOut.textContent = v + '%'; }
        if (alertBadge) { alertBadge.querySelector('b').textContent = v + '%'; }
        var heat = doc.querySelectorAll('.gauge')[2];
        if (heat) {
            heat.setAttribute('data-val', String(v));
            heat.style.setProperty('--val', v);
            heat.querySelector('b').textContent = v + '%';
        }
        var alr = doc.getElementById('led-alr');
        if (alr) { alr.classList.toggle('on', v >= 40); }
        if (T3) { T3.setAlert(v); }
    }

    function paintFill (input) {
        var min = +input.min || 0, max = +input.max || 100;
        var pct = ((+input.value - min) / (max - min)) * 100;
        input.style.setProperty('--fill', pct + '%');
    }

    /* --------------------------------------------------------------- clock */
    var minutes = 21 * 60;
    var clockEl = doc.getElementById('hud-time');
    global.setInterval(function () {
        minutes = (minutes + 1) % (24 * 60);
        if (clockEl) {
            clockEl.textContent = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' +
                String(minutes % 60).padStart(2, '0');
        }
    }, 4000);

    /* ---------------------------------------------------------------- wire */
    doc.addEventListener('click', function (e) {
        var go = e.target.closest('[data-goto]');
        if (go) { show(go.getAttribute('data-goto')); return; }
        if (e.target.closest('#console') || e.target.closest('.console')) { advance(); return; }
        var choice = e.target.closest('[data-choice]');
        if (choice) {
            choicesEl.hidden = true;
            lineIdx = LINES.length - 1;
            typeLine({ who: 'РЭН', text: choice.getAttribute('data-choice') === 'radio'
                ? '— На связи Рэн. Кто это? …Тишина. Потом — смех сквозь помехи.'
                : '— Принял. Держу курс к порту, не отключайся.' });
            setGauges(78, 71);
            return;
        }
        var press = e.target.closest('[data-press]');
        if (press) {
            var on = press.getAttribute('aria-pressed') === 'true';
            press.setAttribute('aria-pressed', on ? 'false' : 'true');
        }
    }, false);

    doc.addEventListener('input', function (e) {
        var t = e.target;
        if (t.matches && t.matches('input[type="range"]')) {
            paintFill(t);
            var out = t.parentNode.querySelector('output');
            if (out) { out.textContent = t.value; }
            if (t.id === 'diag-alert') { setAlert(+t.value); }
        }
    }, false);

    doc.addEventListener('keydown', function (e) {
        if (e.target.matches && e.target.matches('input, select, textarea')) { return; }
        if (e.key === ' ' || e.key === 'Enter') {
            if (doc.documentElement.getAttribute('data-screen') === 'game') { e.preventDefault(); advance(); }
        } else if (e.key === 'Escape') {
            show('title');
        } else if (e.key === '[') {
            setAlert((+alertInput.value) - 10);
        } else if (e.key === ']') {
            setAlert((+alertInput.value) + 10);
        }
    }, false);

    /* -------------------------------------------------------- diagnostics */
    var diag = doc.getElementById('diag');
    var diagToggle = doc.getElementById('diag-toggle');
    /* On small/short viewports the readout would sit on top of the menu and
       eat taps: start collapsed there, with the toggle in its place. */
    if (diag && diagToggle && (global.innerWidth < 760 || global.innerHeight < 520)) {
        diag.hidden = true;
        diagToggle.hidden = false;
        diagToggle.setAttribute('aria-expanded', 'false');
    }
    if (diagToggle) {
        diagToggle.addEventListener('click', function () {
            diag.hidden = !diag.hidden;
            diagToggle.setAttribute('aria-expanded', diag.hidden ? 'false' : 'true');
            diagToggle.style.display = diag.hidden ? '' : 'none';
        }, false);
    }
    var diagClose = doc.getElementById('diag-close');
    if (diagClose) {
        diagClose.addEventListener('click', function () {
            diag.hidden = true;
            if (diagToggle) { diagToggle.style.display = ''; diagToggle.setAttribute('aria-expanded', 'false'); }
        }, false);
    }

    var bracketsToggle = doc.getElementById('diag-brackets');
    if (bracketsToggle) {
        bracketsToggle.addEventListener('change', function () {
            doc.documentElement.setAttribute('data-brackets', bracketsToggle.checked ? 'off' : 'on');
            if (T3) { T3.markDirty(); }
        }, false);
    }

    var nums = doc.getElementById('diag-nums');
    global.setInterval(function () {
        if (!diag || diag.hidden || !nums) { return; }
        var s = T3 ? T3.stats() : null;
        if (!s) {
            nums.innerHTML = '<span>webgl</span><b>недоступен (CSS-фолбэк)</b>';
            return;
        }
        nums.innerHTML =
            '<span>fps</span><b>' + s.fps + '</b>' +
            '<span>draw calls</span><b>' + s.bgCalls + ' + ' + s.fgCalls + '</b>' +
            '<span>triangles</span><b>' + (s.bgTris + s.fgTris) + '</b>' +
            '<span>anchors / brackets</span><b>' + s.anchors + ' / ' + s.brackets + '</b>' +
            '<span>dpr / res</span><b>' + s.dpr + ' / ' + s.w + '×' + s.h + '</b>' +
            '<span>reduced-motion</span><b>' + (s.reduced ? 'on' : 'off') + '</b>';
    }, 500);

    /* ---------------------------------------------------------------- boot */
    doc.querySelectorAll('input[type="range"]').forEach(paintFill);
    show('title');
    setAlert(12);
    setGauges(30, 62);
    if (T3) { T3.markDirty(); }
})(window);
