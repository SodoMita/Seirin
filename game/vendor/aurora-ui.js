/* ============================================================================
 * Seirin: Night Shift — AURORA GLASS SKIN, runtime driver (ES5, offline)
 * ----------------------------------------------------------------------------
 * Companion of vendor/aurora-ui.css. Everything here is presentation:
 *
 *   1. Appearance preferences — palette, glass transparency, dialogue text
 *      size, interface scale — stored in localStorage and applied as CSS
 *      custom properties / a data attribute on <html>.
 *   2. Icon decoration of engine-rendered buttons (quick menu, screen back
 *      buttons, main menu, slot delete) with the inline SVG sprite from
 *      index.html, plus live on/off states (auto-play, skip, hide UI).
 *   3. The header menu button (in-game menu overlay), the mute toggle, the
 *      status line, the dialogue meta row, the main-menu title block and the
 *      "Appearance" fieldset injected into the engine's settings screen.
 *   4. Quality-of-life carried over from the previous skin: click a log
 *      line to rewind to it (chained engine.rollback, so FailSafe reverts
 *      stats), modal-open flag to pause decorative motion, gesture guard.
 *
 * Contract: NEVER writes story state. Only engine calls used are read-only
 * getters, screen navigation (showScreen / runListener), rollback (the same
 * path as the Back button) and preference('Volume') for the mute toggle.
 * Must stay plain ES5 (no const/let/arrow/template) — see tests/es5-scan.
 * ========================================================================== */
(function (global) {
    'use strict';
    var doc = global.document;
    if (!doc) { return; }

    var KEYS = {
        theme: 'SeirinGame_Theme',
        glass: 'SeirinGame_GlassTransparency',
        text: 'SeirinGame_TextScale',
        scale: 'SeirinGame_UIScale',
        muted: 'SeirinGame_Muted',
        volumes: 'SeirinGame_MutedVolumes'
    };
    var THEMES = [
        { id: 'aurora', label: 'Аврора', accent: '170 229 201', surface: '17 38 37' },
        { id: 'tidal',  label: 'Прилив', accent: '155 210 248', surface: '19 32 49' },
        { id: 'dusk',   label: 'Сумерки', accent: '207 181 241', surface: '35 26 47' },
        { id: 'amber',  label: 'Янтарь', accent: '237 204 145', surface: '43 34 23' },
        { id: 'gray',   label: 'Графит', accent: '216 216 216', surface: '30 30 30' }
    ];
    var GLASS = { min: 0, max: 100, def: 95 };          /* percent transparency */
    var TEXT = { min: 70, max: 160, def: 100, step: 5 }; /* percent of base size */
    var SCALE = { min: 35, max: 230, def: 100, step: 5 };/* percent of 16px      */
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var XLINK_NS = 'http://www.w3.org/1999/xlink';

    /* ------------------------------------------------------------------ *
     * helpers
     * ------------------------------------------------------------------ */
    function store (key, value) {
        try {
            if (!global.localStorage) { return null; }
            if (value === undefined) { return global.localStorage.getItem(key); }
            if (value === null) { global.localStorage.removeItem(key); return null; }
            global.localStorage.setItem(key, String(value));
            return value;
        } catch (e) { return null; }
    }
    function clamp (n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }
    function num (raw, def) {
        var n = parseFloat(raw);
        return (typeof n === 'number' && isFinite(n)) ? n : def;
    }
    function el (tag, cls, html) {
        var node = doc.createElement(tag);
        if (cls) { node.className = cls; }
        if (html !== undefined) { node.innerHTML = html; }
        return node;
    }
    function icon (name, cls) {
        var svg = doc.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'aurora-ico' + (cls ? ' ' + cls : ''));
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        var use = doc.createElementNS(SVG_NS, 'use');
        use.setAttribute('href', '#i-' + name);
        use.setAttributeNS(XLINK_NS, 'xlink:href', '#i-' + name);
        svg.appendChild(use);
        return svg;
    }
    function setIcon (svg, name) {
        var use = svg && svg.firstChild;
        if (!use) { return; }
        if (use.getAttribute('href') === '#i-' + name) { return; }
        use.setAttribute('href', '#i-' + name);
        use.setAttributeNS(XLINK_NS, 'xlink:href', '#i-' + name);
    }
    function hasClass (node, cls) {
        return !!(node && node.classList && node.classList.contains(cls));
    }
    function toggleClass (node, cls, on) {
        if (!node || !node.classList) { return; }
        /* Write ONLY on change. A no-op class write still queues a
         * MutationObserver record (measured: classList.add('x') on an element
         * that already has 'x' produces one record per call), and this driver
         * observes the same subtree it decorates — so an unconditional write
         * made every pass schedule the next one: a self-sustaining rAF loop at
         * 60 fps (~24/s even in jsdom) that re-ran ~50 querySelectors + a
         * forced style recalculation per frame, and made the 2 000-node route
         * atlas crawl. Never reintroduce a blind add/remove here. */
        var has = node.classList.contains(cls);
        if (on && !has) { node.classList.add(cls); }
        else if (!on && has) { node.classList.remove(cls); }
    }
    function closest (node, selector) {
        var n = node;
        while (n && n.nodeType === 1) {
            if (n.matches ? n.matches(selector) : (n.msMatchesSelector && n.msMatchesSelector(selector))) { return n; }
            n = n.parentNode;
        }
        return null;
    }
    function engine () { return global.engine || null; }
    function isPlaying () {
        try { return !!(engine() && engine().global('playing')); } catch (e) { return false; }
    }
    function onEsc (fn) {
        doc.addEventListener('keydown', function (evt) {
            if (evt.key === 'Escape' || evt.keyCode === 27) { fn(evt); }
        }, false);
    }

    /* ------------------------------------------------------------------ *
     * 1. appearance preferences
     * ------------------------------------------------------------------ */
    var root = doc.documentElement;
    var prefs = {
        theme: 'aurora',
        glass: GLASS.def,
        text: TEXT.def,
        scale: SCALE.def
    };

    function themeById (id) {
        var i;
        for (i = 0; i < THEMES.length; i++) { if (THEMES[i].id === id) { return THEMES[i]; } }
        return THEMES[0];
    }
    function applyTheme (id, persist) {
        prefs.theme = themeById(id).id;
        if (prefs.theme === 'aurora') { root.removeAttribute('data-aurora-theme'); }
        else { root.setAttribute('data-aurora-theme', prefs.theme); }
        if (persist) { store(KEYS.theme, prefs.theme); }
        syncAppearanceControls();
    }
    function applyGlass (pct, persist) {
        prefs.glass = clamp(Math.round(num(pct, GLASS.def)), GLASS.min, GLASS.max);
        root.style.setProperty('--ui-transparency', String(prefs.glass / 100));
        if (persist) { store(KEYS.glass, prefs.glass); }
        syncAppearanceControls();
    }
    function applyText (pct, persist) {
        prefs.text = clamp(Math.round(num(pct, TEXT.def)), TEXT.min, TEXT.max);
        root.style.setProperty('--reading-scale', String(prefs.text / 100));
        if (persist) { store(KEYS.text, prefs.text); }
        syncAppearanceControls();
    }
    function applyScale (pct, persist) {
        prefs.scale = clamp(Math.round(num(pct, SCALE.def) / SCALE.step) * SCALE.step, SCALE.min, SCALE.max);
        /* 100% == 16px, the browser default the theme was designed against.
           Every engine measurement is in rem, so the whole UI follows. */
        root.style.fontSize = (16 * prefs.scale / 100).toFixed(3) + 'px';
        if (persist) { store(KEYS.scale, String(prefs.scale / 100)); }
        syncAppearanceControls();
    }
    function restorePrefs () {
        applyTheme(store(KEYS.theme) || 'aurora', false);
        applyGlass(num(store(KEYS.glass), GLASS.def), false);
        applyText(num(store(KEYS.text), TEXT.def), false);
        /* Legacy key stores a factor (1 == 100%); accept both spellings. */
        var rawScale = num(store(KEYS.scale), 1);
        applyScale(rawScale <= 5 ? rawScale * 100 : rawScale, false);
    }

    /* ------------------------------------------------------------------ *
     * 1b. "Appearance" fieldset inside the engine settings screen
     * ------------------------------------------------------------------ */
    function buildAppearance () {
        var screen = doc.querySelector('settings-screen');
        if (!screen) { return; }
        var grid = screen.querySelector(':scope > .row') || screen.querySelector('.row');
        if (!grid || grid.querySelector('.aurora-appearance')) { return; }

        var box = el('fieldset', 'aurora-appearance');
        box.setAttribute('data-settings', 'appearance');
        var themes = '';
        var i, t;
        for (i = 0; i < THEMES.length; i++) {
            t = THEMES[i];
            themes += '<label class="aurora-theme-option" data-theme="' + t.id + '">' +
                '<input type="radio" name="aurora-theme" value="' + t.id + '" aria-label="' + t.label + '">' +
                '<span class="aurora-swatch" style="--sw-accent:' + t.accent + ';--sw-surface:' + t.surface + '"></span>' +
                '<span>' + t.label + '</span></label>';
        }
        box.innerHTML =
            '<legend>Оформление</legend>' +
            '<div class="aurora-theme-picker" role="radiogroup" aria-label="Палитра">' + themes + '</div>' +
            '<label class="aurora-setting">' +
                '<span class="aurora-setting-name"><span>Прозрачность стекла</span><output data-out="glass">' + prefs.glass + '%</output></span>' +
                '<input type="range" data-pref="glass" min="' + GLASS.min + '" max="' + GLASS.max + '" step="1" value="' + prefs.glass + '" aria-label="Прозрачность стекла">' +
                '<span class="aurora-range-ends"><span>Плотное</span><span>Прозрачное</span></span>' +
            '</label>' +
            '<label class="aurora-setting">' +
                '<span class="aurora-setting-name"><span>Размер текста реплик</span><output data-out="text">' + prefs.text + '%</output></span>' +
                '<input type="range" data-pref="text" min="' + TEXT.min + '" max="' + TEXT.max + '" step="' + TEXT.step + '" value="' + prefs.text + '" aria-label="Размер текста реплик">' +
                '<span class="aurora-range-ends"><span>Мельче</span><span>Крупнее</span></span>' +
                '<p class="aurora-preview">Дворник подметает свой метр асфальта у выхода на улочку. Как вчера.</p>' +
            '</label>' +
            '<div class="aurora-setting" data-settings="scale">' +
                '<span class="aurora-setting-name"><span>Масштаб интерфейса</span><output data-out="scale">' + prefs.scale + '%</output></span>' +
                '<div class="aurora-scale-row">' +
                    '<button type="button" class="button icon-button" data-scale-step="-' + SCALE.step + '" aria-label="Уменьшить"><svg class="icon" aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
                    '<button type="button" class="button icon-button" data-scale-step="' + SCALE.step + '" aria-label="Увеличить"><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
                    '<button type="button" class="button" data-scale-reset="1">Сброс</button>' +
                '</div>' +
                '<input type="range" data-pref="scale" min="' + SCALE.min + '" max="' + SCALE.max + '" step="' + SCALE.step + '" value="' + prefs.scale + '" aria-label="Масштаб интерфейса">' +
                '<p class="aurora-note">' + SCALE.min + '–' + SCALE.max + '%. Меняет размер всего интерфейса — полезно на телефоне в горизонтальном режиме.</p>' +
            '</div>';
        grid.insertBefore(box, grid.firstChild);

        box.addEventListener('change', function (evt) {
            var target = evt.target;
            if (target && target.name === 'aurora-theme') { applyTheme(target.value, true); }
        }, false);
        box.addEventListener('input', function (evt) {
            var target = evt.target;
            var pref = target && target.getAttribute && target.getAttribute('data-pref');
            if (pref === 'glass') { applyGlass(target.value, true); }
            else if (pref === 'text') { applyText(target.value, true); }
            else if (pref === 'scale') { applyScale(target.value, true); }
        }, false);
        box.addEventListener('click', function (evt) {
            var btn = closest(evt.target, '[data-scale-step], [data-scale-reset]');
            if (!btn) { return; }
            evt.preventDefault();
            if (btn.getAttribute('data-scale-reset')) { applyScale(SCALE.def, true); return; }
            applyScale(prefs.scale + (parseInt(btn.getAttribute('data-scale-step'), 10) || 0), true);
        }, false);

        /* Audio note: the sliders work and persist, but no audio ships yet. */
        var audio = screen.querySelector('[data-settings="audio"]');
        if (audio && !audio.querySelector('.aurora-note')) {
            audio.appendChild(el('p', 'aurora-note', 'Аудиофайлы ещё не добавлены. Ползунки работают — настройки сохранятся, когда появится звук.'));
        }
        syncAppearanceControls();
    }

    function syncAppearanceControls () {
        var box = doc.querySelector('.aurora-appearance');
        if (!box) { return; }
        var opts = box.querySelectorAll('.aurora-theme-option');
        var i, on;
        for (i = 0; i < opts.length; i++) {
            on = opts[i].getAttribute('data-theme') === prefs.theme;
            toggleClass(opts[i], 'is-on', on);
            var input = opts[i].querySelector('input');
            if (input && input.checked !== on) { input.checked = on; }
        }
        var map = { glass: prefs.glass, text: prefs.text, scale: prefs.scale };
        var key;
        for (key in map) {
            if (!Object.prototype.hasOwnProperty.call(map, key)) { continue; }
            var range = box.querySelector('input[data-pref="' + key + '"]');
            if (range && String(range.value) !== String(map[key])) { range.value = map[key]; }
            var out = box.querySelector('output[data-out="' + key + '"]');
            if (out) { out.textContent = map[key] + '%'; }
        }
    }

    /* ------------------------------------------------------------------ *
     * 2. icon decoration of engine buttons + live states
     * ------------------------------------------------------------------ */
    var QUICK_ICONS = {
        'back': 'back',
        'distraction-free': 'eye',
        'dialog-log': 'history',
        'auto-play': 'play',
        'skip': 'skip',
        'open-screen:save': 'save',
        'open-screen:load': 'load',
        'open-screen:settings': 'settings',
        'open-screen:help': 'help',
        'end': 'power',
        'start': 'play',
        'open-graph': 'routes'
    };
    function iconFor (button) {
        var action = button.getAttribute('data-action') || '';
        var open = button.getAttribute('data-open') || '';
        return QUICK_ICONS[action + ':' + open] || QUICK_ICONS[action] || null;
    }
    function decorateButton (button, name) {
        if (!button || !name) { return null; }
        /* Idempotence marker, not a DOM lookup: the engine re-creates some
         * buttons (quick menu), and a re-created button has no marker, so it is
         * decorated exactly once more. Without the marker the pass re-inserted
         * icons and re-wrote classes every frame (see toggleClass). */
        if (button.getAttribute('data-aurora-decorated') === '1') {
            return button.querySelector('.aurora-ico');
        }
        var svg = button.querySelector('.aurora-ico');
        if (!svg) {
            svg = icon(name);
            button.insertBefore(svg, button.firstChild);
        }
        button.setAttribute('data-aurora-decorated', '1');
        toggleClass(button, 'aurora-decorated', true);
        return svg;
    }
    function decorate () {
        var i, btn, list;
        /* quick menu */
        list = doc.querySelectorAll('quick-menu button[data-action]');
        for (i = 0; i < list.length; i++) {
            btn = list[i];
            decorateButton(btn, iconFor(btn));
            var label = btn.querySelector('[data-string]');
            if (label && label.textContent && btn.getAttribute('title') !== label.textContent) {
                btn.setAttribute('title', label.textContent);
                btn.setAttribute('aria-label', label.textContent);
            }
        }
        /* main menu */
        list = doc.querySelectorAll('main-menu button[data-action]');
        for (i = 0; i < list.length; i++) { decorateButton(list[i], iconFor(list[i]) || 'arrow'); }
        /* system-screen back buttons -> close glyph, slot delete -> close glyph */
        list = doc.querySelectorAll('[data-screen]:not([data-screen="game"]) [data-action="back"], save-slot [data-delete]');
        for (i = 0; i < list.length; i++) { decorateButton(list[i], 'close'); }
    }

    var lastStatus = '';
    function syncStates () {
        var eng = engine();
        var auto = false, skip = false, hidden = false, muted = isMuted();
        var autoBtn = doc.querySelector('quick-menu button[data-action="auto-play"]');
        var skipBtn = doc.querySelector('quick-menu button[data-action="skip"]');
        var hideBtn = doc.querySelector('quick-menu button[data-action="distraction-free"]');
        if (autoBtn) {
            auto = !!autoBtn.querySelector('.fa-stop-circle, [data-icon="stop-circle"]');
            setIcon(autoBtn.querySelector(':scope > .aurora-ico'), auto ? 'pause' : 'play');
            toggleClass(autoBtn, 'is-on', auto);
        }
        try { skip = !!(eng && eng.global('skip')); } catch (e) { skip = false; }
        if (skipBtn) { toggleClass(skipBtn, 'is-on', skip); }
        var headerSkip = doc.getElementById('btn-skip');
        if (headerSkip) { toggleClass(headerSkip, 'is-on', skip); }
        if (hideBtn) {
            hidden = !!hideBtn.querySelector('.fa-eye-slash, [data-icon="eye-slash"]');
            setIcon(hideBtn.querySelector(':scope > .aurora-ico'), hidden ? 'eye-off' : 'eye');
            toggleClass(hideBtn, 'is-on', hidden);
        }
        toggleClass(root, 'aurora-hidden', hidden && isPlaying());

        var status = doc.getElementById('hud-status');
        if (status) {
            var text = auto ? 'Автовоспроизведение' : (skip ? 'Перемотка' : (muted ? 'Звук выключен' : 'Город ещё не спит.'));
            if (text !== lastStatus) { status.textContent = text; lastStatus = text; }
            toggleClass(status.parentNode, 'is-live', auto || skip);
        }
    }

    /* Screen flags: header/footer live only over the game screen. */
    function syncScreens () {
        var game = doc.querySelector('game-screen');
        var playing = !!(game && hasClass(game, 'active'));
        toggleClass(root, 'aurora-playing', playing || (isPlaying() && !!doc.querySelector('[data-screen].active')));
        var other = doc.querySelector('[data-screen].active:not([data-screen="game"])');
        toggleClass(root, 'aurora-screen', !!other);
        var main = doc.querySelector('main-screen');
        if (main) { toggleClass(main, 'has-title', !!main.querySelector('.aurora-title')); }
    }

    /* Mirror the scene behind system screens (settings over the street,
       not over a black void). Falls back to the courtyard in CSS. */
    var lastBackdrop = '';
    function syncBackdrop () {
        var bg = doc.getElementById('background') || doc.querySelector('[data-ui="background"]');
        var vn = doc.querySelector('#vn-root > visual-novel');
        if (!bg || !vn) { return; }
        /* The engine writes the scene as an INLINE background-image, so read
         * that first: getComputedStyle() flushes pending style changes, and
         * asking for it on every pass forced a full style recalculation. The
         * computed fallback stays for markup that sets the scene via classes. */
        var img = (bg.style && bg.style.backgroundImage) || '';
        if (!img) {
            try { img = global.getComputedStyle(bg).backgroundImage || ''; } catch (e) { img = ''; }
        }
        if (!img || img === 'none') { return; }
        if (img === lastBackdrop) { return; }
        lastBackdrop = img;
        vn.style.setProperty('--aurora-backdrop', img);
    }

    /* ------------------------------------------------------------------ *
     * 3a. main-menu title block
     * ------------------------------------------------------------------ */
    function buildTitle () {
        var main = doc.querySelector('main-screen');
        var menu = main && main.querySelector('main-menu');
        if (!main || !menu || main.querySelector('.aurora-title')) { return; }
        var block = el('div', 'aurora-title');
        block.innerHTML =
            '<p class="eyebrow">Визуальная новелла · Ночная смена</p>' +
            '<h1>Сэйрин</h1>' +
            '<p class="small">Резонанс 2030. Одна ночь в Тэцубе — и развилка, после которой город уже не будет прежним.</p>';
        main.insertBefore(block, menu);
        toggleClass(main, 'has-title', true);
    }

    /* ------------------------------------------------------------------ *
     * 3b. dialogue meta row (route · location | advance hint)
     * ------------------------------------------------------------------ */
    function buildMeta () {
        var box = doc.querySelector('text-box');
        if (!box) { return; }
        var meta = box.querySelector(':scope > .aurora-meta');
        if (!meta) {
            meta = el('div', 'aurora-meta');
            meta.setAttribute('aria-hidden', 'true');
            meta.innerHTML = '<span data-meta="where"></span><span data-meta="hint">Клик или пробел — дальше</span>';
            box.appendChild(meta);
        }
        var where = meta.querySelector('[data-meta="where"]');
        var route = doc.getElementById('hud-route');
        var loc = doc.getElementById('hud-location');
        var text = ((route && route.textContent) || '').replace(/\s+/g, ' ').replace(/^\s|\s$/g, '');
        var locText = ((loc && loc.textContent) || '').replace(/\s+/g, ' ').replace(/^\s|\s$/g, '');
        if (locText) { text = text ? text + ' / ' + locText : locText; }
        if (where && where.textContent !== text) { where.textContent = text; }
    }

    /* ------------------------------------------------------------------ *
     * 3c. header: in-game menu overlay, mute toggle, resources -> archives
     * ------------------------------------------------------------------ */
    function menuOverlay () { return doc.getElementById('game-menu-overlay'); }
    function openMenu () {
        var ov = menuOverlay();
        if (!ov) { return; }
        ov.hidden = false;
        var btn = doc.getElementById('btn-menu');
        if (btn) { btn.setAttribute('aria-expanded', 'true'); }
        var first = ov.querySelector('[data-menu="resume"]');
        if (first && first.focus) { try { first.focus(); } catch (e) { /* ignore */ } }
        syncModalFlag();
    }
    function closeMenu () {
        var ov = menuOverlay();
        if (!ov || ov.hidden) { return; }
        ov.hidden = true;
        var btn = doc.getElementById('btn-menu');
        if (btn) { btn.setAttribute('aria-expanded', 'false'); }
        syncModalFlag();
    }
    function runMenu (what) {
        var eng = engine();
        closeMenu();
        if (!eng) { return; }
        try {
            switch (what) {
                case 'save': case 'load': case 'settings': case 'help':
                    eng.showScreen(what); break;
                case 'log':
                    eng.runListener('dialog-log'); break;
                case 'archives':
                    var arch = doc.getElementById('btn-archives');
                    if (arch) { arch.click(); }
                    break;
                case 'quit':
                    eng.runListener('end'); break;
                default: break;
            }
        } catch (e) { /* navigation is best-effort */ }
    }
    function wireMenu () {
        var ov = menuOverlay();
        var btn = doc.getElementById('btn-menu');
        if (!ov || !btn) { return; }
        btn.addEventListener('click', function () { if (ov.hidden) { openMenu(); } else { closeMenu(); } }, false);
        ov.addEventListener('click', function (evt) {
            if (evt.target === ov) { closeMenu(); return; }
            var close = closest(evt.target, '#btn-game-menu-close');
            if (close) { closeMenu(); return; }
            var item = closest(evt.target, '[data-menu]');
            if (item) { runMenu(item.getAttribute('data-menu')); }
        }, false);
        onEsc(function () { closeMenu(); });
        /* Build stamp lives here during play (the corner badge is title-only). */
        var build = global.SeirinBoot && global.SeirinBoot.BUILD;
        var panel = ov.querySelector('.menu-panel');
        if (build && panel && !panel.querySelector('.aurora-build')) {
            panel.appendChild(el('div', 'panel-footer aurora-build',
                '<span class="small">Сборка ' + String(build).replace(/[<>&]/g, '') + '</span><span class="small">Esc — закрыть</span>'));
        }
        /* Resource chips open the codex (money, items, alert live there). */
        var chips = doc.querySelectorAll('[data-open-archives]');
        var i;
        for (i = 0; i < chips.length; i++) {
            chips[i].addEventListener('click', function () {
                var arch = doc.getElementById('btn-archives');
                if (arch) { arch.click(); }
            }, false);
        }
    }

    /* Mute: zero every engine volume, remember the old mix, restore on unmute.
       Preferences are engine settings, not story state. */
    function isMuted () { return store(KEYS.muted) === '1'; }
    function syncMuteButton () {
        var btn = doc.getElementById('btn-mute');
        if (!btn) { return; }
        var muted = isMuted();
        btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        btn.setAttribute('title', muted ? 'Включить звук' : 'Выключить звук');
    }
    function setMuted (muted) {
        var eng = engine();
        var vol = null;
        try { vol = eng ? eng.preference('Volume') : null; } catch (e) { vol = null; }
        if (muted) {
            if (vol) {
                store(KEYS.volumes, JSON.stringify(vol));
                var zero = {}, k;
                for (k in vol) { if (Object.prototype.hasOwnProperty.call(vol, k)) { zero[k] = 0; } }
                try { eng.preference('Volume', zero); } catch (e) { /* ignore */ }
            }
            store(KEYS.muted, '1');
        } else {
            var saved = null;
            try { saved = JSON.parse(store(KEYS.volumes) || 'null'); } catch (e) { saved = null; }
            if (saved && eng) { try { eng.preference('Volume', saved); } catch (e2) { /* ignore */ } }
            store(KEYS.muted, null);
        }
        syncMuteButton();
        syncStates();
        refreshVolumeSliders();
    }
    function refreshVolumeSliders () {
        var eng = engine();
        if (!eng) { return; }
        var vol = null;
        try { vol = eng.preference('Volume'); } catch (e) { return; }
        if (!vol) { return; }
        var inputs = doc.querySelectorAll('settings-screen input[data-action="set-volume"]');
        var i, target;
        for (i = 0; i < inputs.length; i++) {
            target = inputs[i].getAttribute('data-target');
            if (target && vol[target] !== undefined) { inputs[i].value = vol[target]; }
        }
    }
    function wireMute () {
        var btn = doc.getElementById('btn-mute');
        if (!btn) { return; }
        btn.addEventListener('click', function () { setMuted(!isMuted()); }, false);
        syncMuteButton();
        /* Re-apply a remembered mute after the engine loaded its settings. */
        if (isMuted()) {
            global.setTimeout(function () {
                var eng = engine();
                if (!eng) { return; }
                try {
                    var vol = eng.preference('Volume'), zero = {}, k, changed = false;
                    for (k in vol) {
                        if (Object.prototype.hasOwnProperty.call(vol, k)) { zero[k] = 0; if (vol[k] !== 0) { changed = true; } }
                    }
                    if (changed) { eng.preference('Volume', zero); }
                } catch (e) { /* ignore */ }
            }, 800);
        }
    }

    /* ------------------------------------------------------------------ *
     * 4a. history log: click a line to rewind to it
     * ------------------------------------------------------------------
     * Rows are appended in play order, so the Nth row from the END is N
     * rollbacks away. Rewinding chains engine.rollback() (never a jump):
     * every reversal runs the action's own revert, so FailSafe unwinds the
     * stats exactly as the Back button would.
     * ------------------------------------------------------------------ */
    var rewinding = false;
    function rewindSteps (count) {
        var eng = engine();
        if (rewinding || count <= 0 || !eng || typeof eng.rollback !== 'function') { return; }
        rewinding = true;
        var left = count;
        var step = function () {
            if (left <= 0) {
                rewinding = false;
                try {
                    var dl = doc.querySelector('dialog-log');
                    if (dl && dl.setState) { dl.setState({ active: false }); }
                    else if (dl && dl.classList) { dl.classList.remove('modal--active'); }
                } catch (e) { /* leave it open rather than throw */ }
                return;
            }
            left--;
            var r;
            try { r = eng.rollback(); } catch (e) { rewinding = false; return; }
            Promise.resolve(r).then(function () { global.setTimeout(step, 40); }).catch(function () { rewinding = false; });
        };
        step();
    }
    function tagLogRows () {
        var log = doc.querySelector('dialog-log [data-content="log"]');
        if (!log) { return; }
        var rows = log.querySelectorAll('[data-spoke]');
        var total = rows.length;
        var playing = isPlaying();
        var i, row, back;
        for (i = 0; i < total; i++) {
            row = rows[i];
            back = total - 1 - i;
            if (!playing || back <= 0) {
                row.removeAttribute('data-log-jump');
                row.removeAttribute('tabindex');
                row.removeAttribute('role');
                row.removeAttribute('title');
                continue;
            }
            if (row.getAttribute('data-log-jump') !== String(back)) {
                row.setAttribute('data-log-jump', String(back));
                row.setAttribute('tabindex', '0');
                row.setAttribute('role', 'button');
                row.setAttribute('title', 'Вернуться к этой реплике (−' + back + ')');
            }
        }
        if (!log.__auroraBound) {
            log.__auroraBound = true;
            log.addEventListener('click', function (evt) {
                var target = closest(evt.target, '[data-log-jump]');
                if (target) { rewindSteps(parseInt(target.getAttribute('data-log-jump'), 10) || 0); }
            }, false);
            log.addEventListener('keydown', function (evt) {
                if (evt.key !== 'Enter' && evt.key !== ' ' && evt.keyCode !== 13 && evt.keyCode !== 32) { return; }
                var target = evt.target;
                if (target && target.getAttribute && target.getAttribute('data-log-jump')) {
                    evt.preventDefault();
                    rewindSteps(parseInt(target.getAttribute('data-log-jump'), 10) || 0);
                }
            }, false);
        }
        var content = doc.querySelector('dialog-log .modal__content');
        var hint = content && content.querySelector('.aurora-log-hint');
        if (content && playing && total > 1) {
            if (!hint) { content.insertBefore(el('p', 'aurora-log-hint', 'Нажмите на реплику, чтобы вернуться к ней'), content.firstChild); }
        } else if (hint) { hint.parentNode.removeChild(hint); }
    }

    /* ------------------------------------------------------------------ *
     * 4b. modal-open flag (pause decorative motion behind heavy overlays)
     * ------------------------------------------------------------------ */
    function syncModalFlag () {
        var open = false;
        var ids = ['graph-overlay', 'archives-overlay', 'game-menu-overlay'];
        var i, ov;
        for (i = 0; i < ids.length; i++) {
            ov = doc.getElementById(ids[i]);
            if (ov && !ov.hidden) { open = true; break; }
        }
        if (!open && doc.querySelector('dialog-log.modal--active, alert-modal.modal--active, message-modal.modal--active')) { open = true; }
        toggleClass(root, 'aurora-modal-open', open);
    }

    /* ------------------------------------------------------------------ *
     * 4c. gesture guard: no drag ghosts / image context menus over art
     * ------------------------------------------------------------------ */
    function isArtwork (node) {
        var n = node;
        while (n && n !== doc.body) {
            if (n.tagName === 'IMG' || n.tagName === 'CANVAS') { return true; }
            n = n.parentNode;
        }
        return false;
    }
    function isSelectableText (node) {
        return !!closest(node, '[data-ui="say"], [data-content="dialog"], [data-spoke] p, .archives-body, .graph-body');
    }
    function undraggable () {
        var imgs = doc.querySelectorAll('game-screen img, save-slot img, text-box img');
        var i;
        for (i = 0; i < imgs.length; i++) { if (imgs[i].draggable !== false) { imgs[i].draggable = false; } }
    }
    function bindGestureGuard () {
        doc.addEventListener('contextmenu', function (evt) {
            if (isSelectableText(evt.target)) { return; }
            if (isArtwork(evt.target)) { evt.preventDefault(); }
        }, false);
        doc.addEventListener('dragstart', function (evt) {
            if (isArtwork(evt.target)) { evt.preventDefault(); }
        }, false);
        undraggable();
    }

    /* ------------------------------------------------------------------ *
     * scheduler: one rAF-coalesced pass after any engine DOM change
     * ------------------------------------------------------------------ */
    var scheduled = false;
    /* A full-screen overlay covers everything this pass decorates. Running the
     * decorative half while the route atlas is open costs ~50 querySelectors +
     * a forced style recalculation per frame over a 2 600-element document, and
     * nothing it produces is visible. The overlay needs exactly two things kept
     * in sync: the modal flag (pauses decorative motion behind it) and the
     * screen classes. When the overlay closes, its own hidden-attribute change
     * queues a full pass, so nothing is left undecorated. */
    function heavyOverlayOpen () {
        var ids = ['graph-overlay', 'archives-overlay', 'game-menu-overlay'];
        var i, ov;
        for (i = 0; i < ids.length; i++) {
            ov = doc.getElementById(ids[i]);
            if (ov && !ov.hidden) { return true; }
        }
        return false;
    }
    function pass () {
        scheduled = false;
        try { syncModalFlag(); } catch (e) { /* decorative */ }
        try { syncScreens(); } catch (e) { /* decorative */ }
        if (heavyOverlayOpen()) { return; }
        try { decorate(); } catch (e) { /* decorative */ }
        try { syncStates(); } catch (e) { /* decorative */ }
        try { syncBackdrop(); } catch (e) { /* decorative */ }
        try { buildTitle(); } catch (e) { /* decorative */ }
        try { buildMeta(); } catch (e) { /* decorative */ }
        try { buildAppearance(); } catch (e) { /* decorative */ }
        try { tagLogRows(); } catch (e) { /* decorative */ }
        try { undraggable(); } catch (e) { /* decorative */ }
    }
    function schedule () {
        if (scheduled) { return; }
        scheduled = true;
        if (global.requestAnimationFrame) { global.requestAnimationFrame(pass); }
        else { global.setTimeout(pass, 16); }
    }
    function observe () {
        var targets = [doc.getElementById('vn-root'), doc.getElementById('shell-header'),
            doc.getElementById('archives-overlay'), doc.getElementById('graph-overlay')];
        if (!global.MutationObserver) { global.setInterval(pass, 500); return; }
        var mo = new global.MutationObserver(schedule);
        var i;
        for (i = 0; i < targets.length; i++) {
            if (targets[i]) {
                mo.observe(targets[i], { childList: true, subtree: true, attributes: true,
                    attributeFilter: ['class', 'style', 'hidden', 'data-speaking'], characterData: true });
            }
        }
    }

    function start () {
        try { restorePrefs(); } catch (e) { /* defaults stay */ }
        try { wireMenu(); } catch (e) { /* decorative */ }
        try { wireMute(); } catch (e) { /* decorative */ }
        try { bindGestureGuard(); } catch (e) { /* decorative */ }
        try { observe(); } catch (e) { global.setInterval(pass, 500); }
        pass();
        /* The engine mounts asynchronously after game.js' engine.init(). */
        global.setTimeout(pass, 300);
        global.setTimeout(pass, 1200);
        /* Skip / auto-play are engine globals without DOM echoes of their own
           in every path (keyboard shortcuts), so poll them cheaply. */
        global.setInterval(function () { try { syncStates(); } catch (e) { /* ignore */ } }, 700);
    }

    if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start, false); }
    else { start(); }

    global.AuroraUI = {
        setTheme: function (id) { applyTheme(id, true); },
        setGlass: function (pct) { applyGlass(pct, true); },
        setTextSize: function (pct) { applyText(pct, true); },
        setScale: function (pct) { applyScale(pct, true); },
        setMuted: setMuted,
        openMenu: openMenu,
        closeMenu: closeMenu,
        refresh: pass,
        prefs: prefs,
        themes: THEMES
    };
}(typeof window !== 'undefined' ? window : this));
