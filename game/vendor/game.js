/* ============================================================================
 * Seirin: Night Shift — Resonance 2030 (New Game Engine Code)
 * ----------------------------------------------------------------------------
 * ES5 Browser & Node Compatible Visual Novel Code in game/
 * Chapter 0 street walk with 8 canon choices (LEVEL_1..3 v3): 5 Solo Routes,
 * Miya Ritual Route (mid-route node M.1), AI Route (mid-route node AI.1)
 * and the Momo PG-13 romance-comedy route (mid-route node MO.1).
 * Ren is a mechanic apprentice AND a supervised combat-mecha pilot
 * (Scrap-Titan 04) who rides his own rebuilt motorcycle "Стриж" — the
 * machines are route furniture everywhere, not a character-sheet sticker.
 * Every route opens with its own first-minutes beat: arrival -> voice beat ->
 * teaching micro-choice (effectChoice, instant stat feedback) -> escalation.
 * Stats are load-bearing: Solo 5 ending is gated by akatomi_alert (vn.branch).
 * Uses HUD icon markup: fa-map-marker-alt, fa-coins, fa-terminal, fa-user-secret, fa-shield-alt
 * ========================================================================== */
(function (root, factory) {
    'use strict';
    var core = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = core; }
    if (root) { root.SeirinGameCore = core; }
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
    'use strict';

    function buildStorageSchema (FS) {
        return FS.schema.object({
            player: FS.schema.object({
                name:                FS.schema.string().default('Рэн'),
                route:               FS.schema.string().default('none'),
                procrastination:     FS.schema.number({ int: true, min: 0 }).default(0),
                philosophical_depth: FS.schema.number({ int: true, min: 0 }).default(0),
                miya_affinity:       FS.schema.number({ int: true, min: 0 }).default(0),
                momo_affinity:       FS.schema.number({ int: true, min: 0 }).default(0),
                ai_empathy:          FS.schema.number({ int: true, min: 0 }).default(0),
                akatomi_alert:       FS.schema.number({ int: true, min: 0 }).default(0),
                location:            FS.schema.string().default('Тэцуба: Улица')
            }),
            flags: FS.schema.object({
                met_miya:              FS.schema.boolean().default(false),
                met_splash:            FS.schema.boolean().default(false),
                met_stella:            FS.schema.boolean().default(false),
                met_reika:             FS.schema.boolean().default(false),
                met_saya:              FS.schema.boolean().default(false),
                met_lumina:            FS.schema.boolean().default(false),
                met_kurogane:          FS.schema.boolean().default(false),
                met_momo:              FS.schema.boolean().default(false),
                ritual_started:        FS.schema.boolean().default(false),
                magic_rejected:        FS.schema.boolean().default(false),
                happy_ending_achieved: FS.schema.boolean().default(false)
            })
        });
    }

    return {
        buildStorageSchema: buildStorageSchema
    };
}));

/* PART 2 — Browser engine wiring. All script mutations use FailSafe actions. */

/* BOOT WATCHDOG — runs even when vendor/monogatari.js never loaded (which is
 * exactly the failure it exists for). If a few seconds after page load there
 * is still no rendered main menu and no running game, the player gets a
 * visible diagnostic card with the build id, the captured JS errors and a
 * storage probe — instead of the silent white void that used to be the only
 * symptom of a stale cache / blocked localStorage / truncated vendor file. */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    (function () {
        var BUILD = '2026-07-28-r11';
        var captured = [];
        var bannerShown = false;
        window.addEventListener('error', function (e) {
            if (!e || !e.message || captured.length >= 6) { return; }
            var where = e.filename ? String(e.filename).split('/').pop() + ':' + e.lineno : '?';
            captured.push(e.message + ' @ ' + where);
        });
        window.addEventListener('unhandledrejection', function (e) {
            if (captured.length >= 6) { return; }
            var r = e && e.reason;
            captured.push('Promise: ' + (r && r.message ? r.message : String(r)));
        });
        function storageStatus () {
            try {
                localStorage.setItem('__seirin_probe', '1');
                localStorage.removeItem('__seirin_probe');
                return 'ok';
            } catch (e) { return 'НЕДОСТУПНО (' + e.name + ') — включите доступ к данным сайтов'; }
        }
        function esc (s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function showBanner (reasons) {
            if (bannerShown) { return; }
            bannerShown = true;
            var rows = [];
            var i;
            for (i = 0; i < reasons.length; i++) { rows.push('<li>' + esc(reasons[i]) + '</li>'); }
            var errHtml = captured.length
                ? '<div style="margin-top:10px;font-size:11px;color:#fca5a5">' +
                  captured.map(esc).join('<br>') + '</div>'
                : '<div style="margin-top:10px;font-size:11px;color:#94a3b8">JS-ошибок не перехвачено.</div>';
            var d = document.createElement('div');
            d.id = 'seirin-boot-banner';
            d.setAttribute('style',
                'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;' +
                'background:#070a14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;' +
                'font:14px/1.5 monospace;padding:24px');
            d.innerHTML =
                '<div style="max-width:640px;border:1px solid #f87171;border-radius:12px;padding:20px 22px;background:#0b1020">' +
                '<div style="color:#f87171;font-weight:bold;letter-spacing:1px">СЭЙРИН · ДВИЖОК НЕ ЗАПУСТИЛСЯ</div>' +
                '<ul style="margin:10px 0 0 18px;padding:0;color:#e2e8f0">' + rows.join('') + '</ul>' +
                errHtml +
                '<div style="margin-top:12px;font-size:12px;color:#94a3b8">' +
                'Полностью закройте вкладку и откройте index.html заново (при запуске через сервер — Ctrl+F5). ' +
                'Если баннер остался, сообщите разработчику номер сборки: <b style="color:#e2e8f0">' + BUILD + '</b></div>' +
                '</div>';
            (document.body || document.documentElement).appendChild(d);
        }
        window.SeirinBoot = {
            BUILD: BUILD,
            fail: function (reason) { showBanner([reason]); },
            errors: captured
        };
        setTimeout(function () {
            if (document.querySelectorAll('main-menu button').length > 0) { return; }
            var playing = false;
            try { playing = !!(window.Monogatari && window.Monogatari.default && window.Monogatari.default.global('playing')); } catch (e) { /* stay false */ }
            if (playing) { return; }
            var reasons = [];
            if (!window.Monogatari) { reasons.push('vendor/monogatari.js не загрузился (файл не найден или повреждён)'); }
            else if (!window.FailSafe) { reasons.push('vendor/failsafe.js не загрузился (файл не найден или повреждён)'); }
            else { reasons.push('движок загружен, но главное меню не отрисовано за 8 секунд'); }
            reasons.push('localStorage: ' + storageStatus());
            showBanner(reasons);
        }, 8000);
    }());
}

if (typeof window !== 'undefined' && window.Monogatari && window.FailSafe) {
    (function () {
        'use strict';
        var engine = window.Monogatari.default;
        // Deliberately exposed for browser diagnostics and rollback regression tests.
        window.engine = engine;
        var FS = window.FailSafe;
        var vn;
        var STORAGE_SCHEMA = window.SeirinGameCore.buildStorageSchema(FS);

        var ROUTE_LABELS = {
            none:   'Начало',
            solo_1: 'Соло I — Уединение',
            solo_2: 'Соло II — Null-Point',
            solo_3: 'Соло III — Башня',
            solo_4: 'Соло IV — Пустота',
            solo_5: 'Соло V — Одиночная война',
            miya:   'Рут Мии',
            ai:     'Рут ИИ',
            momo:   'Рут Момо — Сбежавшая песня'
        };

        /* Display names for the debug route atlas. The atlas STRUCTURE is
         * auto-generated from engine.script() (choices, branches, jumps,
         * endings); only titles are hand-written cosmetics. */
        var LABEL_TITLES = {
            Start:                 'Пролог · Развилка трёх улиц',
            SoloRoute1:            'Соло I · Закрытые жалюзи',
            SoloRoute2:            'Соло II · Клуб «Null-Point»',
            SoloRoute3:            'Соло III · 84-й этаж',
            SoloRoute4:            'Соло IV · Скамейка и зеркало',
            SoloRoute5:            'Соло V · Додзё, подготовка',
            Solo5BadEnd:           'ФИНАЛ · Ловушка №1: захвачен',
            Solo5Standoff:         'ФИНАЛ · Ничья',
            MiyaRoute:             'Рут Мии · Игровая комната',
            MiyaEndingHarmony:     'ФИНАЛ · Гармония фракций',
            MiyaEndingGuardian:    'ФИНАЛ · Хранитель без магии',
            AIRoute:               'Рут ИИ · Доки Aquaforge',
            AIEndingTranscendence: 'ФИНАЛ · Трансцендентность',
            AIEndingIsolation:     'ФИНАЛ · Тишина в аквариуме',
            MomoRoute:             'Рут Момо · Арена, чёрный вход',
            MomoEndingSong:        'ФИНАЛ · Голос живого города',
            MomoEndingEncore:      'ФИНАЛ · Бис по контракту'
        };

        var ARCHIVE_CONTACTS = [
            ['met_miya',    'Мия Кагэцуки'],
            ['met_reika',   'Рейка Такасиро'],
            ['met_saya',    'Сая Мизуки'],
            ['met_kurogane','Таиши Курогане'],
            ['met_momo',    'Момо Хосизора'],
            ['met_splash',  'S.P.L.A.S.H.'],
            ['met_stella',  'Стелла'],
            ['met_lumina',  'Люмина']
        ];

        var ARCHIVE_STATS = [
            ['procrastination',     'Прокрастинация'],
            ['philosophical_depth', 'Глубина рефлексии'],
            ['miya_affinity',       'Доверие Мии'],
            ['momo_affinity',       'Доверие Момо'],
            ['ai_empathy',          'Эмпатия ИИ'],
            ['akatomi_alert',       'Тревога Акатоми']
        ];

        function routeLabel (id) {
            return ROUTE_LABELS[id] || id;
        }

        /* Archives codex — the #btn-archives feature. Pure UI: reads engine
         * storage, never mutates it. Re-rendered live via syncArchives(). */
        function renderArchives () {
            var body = document.getElementById('archives-body');
            if (!body) { return; }
            var p = engine.storage('player') || {};
            var f = engine.storage('flags') || {};
            var html = '';
            html += '<div class="archives-section"><h3>МАРШРУТ</h3>' +
                '<div class="archives-route">' + routeLabel(p.route || 'none') + '</div></div>';
            html += '<div class="archives-section"><h3>ПОКАЗАТЕЛИ</h3>';
            for (var i = 0; i < ARCHIVE_STATS.length; i++) {
                var key = ARCHIVE_STATS[i][0];
                var v = p[key] || 0;
                html += '<div class="archives-row"><span>' + ARCHIVE_STATS[i][1] + '</span><b>' +
                    (key === 'akatomi_alert' ? v + '%' : v) + '</b></div>';
            }
            html += '</div>';
            html += '<div class="archives-section"><h3>ПЕРСОНАЖИ</h3>';
            for (var j = 0; j < ARCHIVE_CONTACTS.length; j++) {
                var met = f[ARCHIVE_CONTACTS[j][0]] === true;
                html += '<div class="archives-row ' + (met ? 'met' : 'unknown') + '"><span>' +
                    (met ? ARCHIVE_CONTACTS[j][1] : '???') + '</span><b>' +
                    (met ? 'встречен' : 'нет данных') + '</b></div>';
            }
            html += '</div>';
            html += '<div class="archives-section"><h3>ФИНАЛЫ</h3><div class=\"archives-route\">' +
                (f.happy_ending_achieved ? 'СЧАСТЛИВЫЙ ФИНАЛ ОТКРЫТ' : 'счастливый финал не открыт') +
                '</div></div>';
            body.innerHTML = html;
        }

        function syncArchives () {
            var overlay = document.getElementById('archives-overlay');
            if (overlay && !overlay.hidden) { renderArchives(); }
        }

        /* -------------------- Debug route atlas (auto-generated) -------------
         * Walks engine.script() and derives every fork: choice options with a
         * jump target, vn.branch condition arms, direct jumps and 'end'
         * markers. Story data itself is never parsed by hand here, so the map
         * always mirrors the shipped script. Pure UI except jumpToLabel(). */
        function truncateText (s, n) {
            s = String(s);
            return s.length > n ? s.slice(0, n - 1) + '…' : s;
        }

        function collectLabelInfo (label) {
            var steps = engine.script()[label] || [];
            var info = { id: label, title: LABEL_TITLES[label] || label, edges: [], ending: false, banner: null };
            steps.forEach(function (step) {
                var m;
                if (typeof step === 'string') {
                    if (step === 'end') {
                        info.ending = true;
                    } else if (step.indexOf('jump ') === 0) {
                        info.edges.push({ text: 'переход', target: step.slice(5).replace(/^\s+|\s+$/g, ''), kind: 'jump' });
                    } else {
                        m = step.match(/\[([^\]]+)\]/);
                        if (step.indexOf('sys ') === 0 && m) { info.banner = m[1].replace(/^\s+|\s+$/g, ''); }
                    }
                    return;
                }
                if (step && step.Choice) {
                    Object.keys(step.Choice).forEach(function (key) {
                        var opt = step.Choice[key];
                        var target = null;
                        if (!opt || typeof opt !== 'object' || typeof opt.Text !== 'string') { return; }
                        if (typeof opt.Do === 'string' && opt.Do.indexOf('jump ') === 0) {
                            target = opt.Do.slice(5).replace(/^\s+|\s+$/g, '');
                        }
                        info.edges.push({ text: opt.Text, target: target, kind: target ? 'choice' : 'stat' });
                    });
                }
                if (step && step.Conditional) {
                    ['True', 'False'].forEach(function (arm) {
                        var cmd = step.Conditional[arm];
                        if (typeof cmd === 'string' && cmd.indexOf('jump ') === 0) {
                            info.edges.push({
                                text: 'ветвление: если ' + (arm === 'True' ? 'условие верно' : 'условие ложно'),
                                target: cmd.slice(5).replace(/^\s+|\s+$/g, ''), kind: 'branch'
                            });
                        }
                    });
                }
            });
            return info;
        }

        function computeLabelDepths (infos, labels) {
            var depth = {}, queue = [], i;
            if (infos.Start) { depth.Start = 0; queue.push('Start'); }
            while (queue.length) {
                var cur = queue.shift();
                infos[cur].edges.forEach(function (edge) {
                    if (edge.target && infos[edge.target] && depth[edge.target] === undefined) {
                        depth[edge.target] = depth[cur] + 1;
                        queue.push(edge.target);
                    }
                });
            }
            // Unreachable labels (defensive: there should be none) go to the end.
            for (i = 0; i < labels.length; i++) {
                if (depth[labels[i]] === undefined) { depth[labels[i]] = 99; }
            }
            return depth;
        }

        function renderGraph () {
            var body = document.getElementById('graph-body');
            if (!body || !engine.script()) { return; }
            var script = engine.script();
            var labels = Object.keys(script);
            var infos = {}, depths, columns = [], html = '', maxDepth = 0, i, j;
            labels.forEach(function (label) { infos[label] = collectLabelInfo(label); });
            depths = computeLabelDepths(infos, labels);
            labels.forEach(function (label) { if (depths[label] > maxDepth) { maxDepth = depths[label]; } });
            for (i = 0; i <= maxDepth; i++) { columns.push([]); }
            labels.forEach(function (label) { columns[depths[label]].push(label); });

            var current = engine.state('label') || null;
            var p = engine.storage('player') || {};
            html += '<div class="graph-stats">' +
                '<span class="graph-chip"><i class="fas fa-terminal"></i>' + truncateText(current || '—', 22) + '</span>' +
                '<span class="graph-chip"><i class="fas fa-map-marker-alt"></i>' + truncateText(p.location || '—', 24) + '</span>' +
                '<span class="graph-chip"><i class="fas fa-shield-alt"></i>' + (p.akatomi_alert || 0) + '%</span>' +
                '<span class="graph-chip dim">узлов: ' + labels.length + '</span>' +
                '</div>';
            html += '<div class="graph-hint">Колонки = расстояние от пролога. Карточка показывает все выходы. ' +
                'Клик по цели прокручивает к ней · «ПЕРЕЙТИ» телепортирует игру в этот узел.</div>';
            html += '<div class="graph-cols">';
            for (i = 0; i < columns.length; i++) {
                html += '<div class="graph-col">';
                for (j = 0; j < columns[i].length; j++) {
                    var info = infos[columns[i][j]];
                    html += '<div class="graph-node' + (info.ending ? ' ending' : '') +
                        (current === info.id ? ' current' : '') + '" id="graph-node-' + info.id + '">' +
                        '<div class="graph-node-title">' + info.title + '</div>' +
                        '<div class="graph-node-id">' + info.id + '</div>' +
                        (info.banner ? '<div class="graph-node-banner">[ ' + truncateText(info.banner, 44) + ' ]</div>' : '') +
                        (current === info.id ? '<div class="graph-node-here">ВЫ ЗДЕСЬ</div>' : '');
                    if (info.edges.length) {
                        html += '<div class="graph-edges">';
                        info.edges.forEach(function (edge) {
                            html += '<div class="graph-edge ' + edge.kind + '">';
                            if (edge.target && infos[edge.target]) {
                                html += '<span class="graph-edge-text">' + truncateText(edge.text, 34) + '</span>' +
                                    '<button type="button" class="graph-target" data-graph-goto="' + edge.target + '">' +
                                    truncateText(infos[edge.target].title, 26) + '</button>';
                            } else {
                                html += '<span class="graph-edge-text">' + truncateText(edge.text, 40) + '</span>' +
                                    '<span class="graph-edge-stat">стат</span>';
                            }
                            html += '</div>';
                        });
                        html += '</div>';
                    }
                    html += '<button type="button" class="graph-jump" data-graph-jump="' + info.id + '">ПЕРЕЙТИ СЮДА</button>' +
                        '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
            body.innerHTML = html;
        }

        function syncGraph () {
            var overlay = document.getElementById('graph-overlay');
            if (overlay && !overlay.hidden) { renderGraph(); }
        }

        function highlightGraphNode (label) {
            var node = document.getElementById('graph-node-' + label);
            if (!node) { return; }
            var prev = document.querySelectorAll('.graph-node.flash');
            Array.prototype.forEach.call(prev, function (el) { el.classList.remove('flash'); });
            node.classList.add('flash');
            setTimeout(function () { node.classList.remove('flash'); }, 1600);
            if (typeof node.scrollIntoView === 'function') {
                try {
                    node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                } catch (err) {
                    node.scrollIntoView();
                }
            }
        }

        /* Debug teleport. Jumps the live game into any graph node, starting a
         * new game first when the main menu is still up. Mirrors the engine's
         * own choice-click cleanup (drop pending choice container + unblock).
         *
         * HISTORY RESET IS MANDATORY: the engine's rollback() at step 0 scans
         * history('jump') for destinations {label,0}; a teleport left there
         * makes Back cross INTO the pre-jump session (often a self-edge
         * Start->Start), which replays statements forward into a state where
         * forward clicks oscillate step -1/0/1 and the scene state is set
         * without its <img> — the "empty slide you can't leave" deadlock.
         * With histories empty, Back at teleport start is a clean no-op
         * ("beginning of the game" guard) and forward is linear. */
        function wipePresentationAndHistory () {
            try {
                engine.element().find('[data-screen="game"] [data-content="visuals"] [data-character]').remove();
                engine.element().find('[data-screen="game"] [data-content="visuals"] [data-image]').remove();
            } catch (errVisuals) { /* not on the game screen — nothing visible */ }
            try {
                engine.state({ characters: [], images: [], scene: '' });
            } catch (errState) { /* tolerate */ }
            try {
                var hist = engine.history();
                Object.keys(hist).forEach(function (ns) { hist[ns] = []; });
            } catch (errHist) { /* tolerate */ }
        }

        function jumpToLabel (label) {
            var overlay = document.getElementById('graph-overlay');
            if (!engine.script()[label]) { console.error('[graph] unknown label:', label); return; }
            if (overlay) { overlay.hidden = true; }
            try {
                engine.element().find('choice-container').remove();
                engine.global('block', false);
            } catch (err) { /* not in game yet — nothing to clean */ }
            if (!engine.global('playing')) { engine.global('playing', true); }
            if (typeof engine.showScreen === 'function') { engine.showScreen('game'); }
            wipePresentationAndHistory();
            /* run() is ASYNC: the Jump action applies on its promise chain, so
             * the post-wipe and the first-slide nudge MUST go through .then —
             * a synchronous wipe lands before apply() and gets overwritten. */
            Promise.resolve(engine.run('jump ' + label)).then(function () {
                /* The jump itself re-recorded a garbage history entry whose
                 * source is the pre-teleport step — wipe again so rollback()
                 * at slide 0 hits the "beginning of the game" guard instead. */
                wipePresentationAndHistory();
                /* run('jump') does NOT auto-chain statements: without a nudge
                 * the player lands on an empty slide (goTo + show scene are
                 * silent). One synthetic text-box click runs the chain to the
                 * first visible statement — same as a fresh Start. */
                setTimeout(function () {
                    var tb = document.querySelector('text-box');
                    if (tb) { tb.click(); }
                }, 80);
            }).catch(function (err2) {
                console.error('[graph] teleport failed:', err2);
            });
        }

        function openGraph () {
            renderGraph();
            var overlay = document.getElementById('graph-overlay');
            if (overlay) { overlay.hidden = false; }
        }

        function wireGraph () {
            var closeBtn = document.getElementById('btn-graph-close');
            var overlay = document.getElementById('graph-overlay');
            if (!overlay) { return; }
            if (closeBtn) {
                closeBtn.addEventListener('click', function () { overlay.hidden = true; });
            }
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) { overlay.hidden = true; return; }
                var el = event.target;
                while (el && el !== overlay) {
                    if (el.getAttribute) {
                        var go = el.getAttribute('data-graph-goto');
                        var jump = el.getAttribute('data-graph-jump');
                        if (go) { highlightGraphNode(go); return; }
                        if (jump) { jumpToLabel(jump); return; }
                    }
                    el = el.parentNode;
                }
            });
            document.addEventListener('keydown', function (event) {
                var esc = event.key === 'Escape' || event.keyCode === 27;
                if (esc && !overlay.hidden) { overlay.hidden = true; }
            });
        }

        function wireArchives () {
            var openBtn = document.getElementById('btn-archives');
            var closeBtn = document.getElementById('btn-archives-close');
            var overlay = document.getElementById('archives-overlay');
            if (!openBtn || !overlay) { return; }
            openBtn.addEventListener('click', function () {
                renderArchives();
                overlay.hidden = false;
            });
            if (closeBtn) {
                closeBtn.addEventListener('click', function () { overlay.hidden = true; });
            }
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) { overlay.hidden = true; }
            });
            document.addEventListener('keydown', function (event) {
                var esc = event.key === 'Escape' || event.keyCode === 27;
                if (esc && !overlay.hidden) { overlay.hidden = true; }
            });
        }

        /* Fast-forward HUD button — mirrors the engine's quick-menu Skip toggle.
         * The engine only fast-forwards when setting('Skip') > 0 ms/statement. */
        function syncSkipButton () {
            var btn = document.getElementById('btn-skip');
            if (!btn) { return; }
            var active = !!engine.global('skip');
            if (btn.classList) { btn.classList.toggle('active', active); }
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }

        function wireFastForward () {
            var btn = document.getElementById('btn-skip');
            if (!btn) { return; }
            btn.addEventListener('click', function () {
                engine.skip(!engine.global('skip'));
                syncSkipButton();
            });
            // Keep HUD state in sync when the engine's own quick-menu Skip is used.
            document.addEventListener('click', function (event) {
                var el = event.target;
                while (el && el !== document) {
                    if (el.getAttribute && el.getAttribute('data-action') === 'skip') {
                        setTimeout(syncSkipButton, 0);
                        return;
                    }
                    el = el.parentNode;
                }
            }, true);
            syncSkipButton();
        }

        var lastAlertLevel = null;
        function updateHUD () {
            var p = engine.storage('player') || {};
            var set = function (id, icon, text) {
                var el = document.getElementById(id);
                if (el) { el.innerHTML = '<i class="fas ' + icon + '"></i><span>' + text + '</span>'; }
            };
            set('hud-player-name', 'fa-user-secret', p.name || 'Рэн');
            set('hud-location', 'fa-map-marker-alt', p.location || 'Тэцуба: Улица');
            set('hud-route', 'fa-terminal', routeLabel(p.route || 'none'));
            set('hud-alert-level', 'fa-shield-alt', String(p.akatomi_alert || 0) + '%');
            var alertEl = document.getElementById('hud-alert-level');
            var level = p.akatomi_alert || 0;
            if (alertEl && lastAlertLevel !== null && level > lastAlertLevel && alertEl.classList) {
                alertEl.classList.add('alert-pulse');
                setTimeout(function () { alertEl.classList.remove('alert-pulse'); }, 700);
            }
            lastAlertLevel = level;
            syncArchives();
            syncGraph();
            syncSkipButton();
        }

        vn = FS.vn(engine, { onChange: updateHUD, silent: true });
        /* Asset paths: the engine ONLY reads the AssetsPath tree (as in
         * cyber-nexus). A stray 'Assets' key here used to be dead config —
         * the defaults happened to match the on-disk layout, which is why
         * nothing visibly broke, but that was luck, not design. */
        engine.settings({
            'Name': 'Сэйрин: Ночная смена — Резонанс 2030',
            'Version': '1.3.0',
            'Target': '#vn-root', 'ServiceWorkers': false, 'Preload': false,
            'AssetsPath': {
                'root': 'assets', 'characters': 'characters', 'scenes': 'scenes',
                'images': 'images', 'icons': 'icons', 'music': 'music', 'sounds': 'sounds',
                'ui': 'ui', 'videos': 'videos', 'voices': 'voices', 'gallery': 'gallery'
            },
            'Storage': { 'Adapter': 'LocalStorage', 'Store': 'SeirinGame_Save' },
            'Skip': 150
        });
        /* Debug atlas entry lives in the MAIN MENU — it must never sit in the
         * in-game HUD. engine.configuration() returns the LIVE config object
         * and the setter REPLACES it wholesale, so mutate the menu's button
         * list in place — never call the setter with a partial object
         * (boot dies: quick-menu/credits keys go missing). */
        var menuConfig = engine.configuration('main-menu');
        if (menuConfig && menuConfig.buttons) {
            menuConfig.buttons.push({ string: 'GraphAtlas', data: { action: 'open-graph' } });
        }
        if (typeof engine.translation === 'function') {
            /* The game ships Russian-only, but the engine boots the 'English'
               string table, so every piece of built-in chrome (quick menu,
               settings, save/load, help) rendered in English next to Russian
               dialogue. Override the table in place rather than switching
               language: MultiLanguage is off and the Russian table would drag
               in a language-selection screen we do not want. */
            engine.translation('English', {
                GraphAtlas: 'ГРАФ МАРШРУТОВ · ОТЛАДКА',
                /* main menu */
                Start: 'НАЧАТЬ', Load: 'ЗАГРУЗИТЬ', Settings: 'НАСТРОЙКИ',
                Help: 'СПРАВКА', Gallery: 'ГАЛЕРЕЯ', Credits: 'АВТОРЫ',
                /* quick menu */
                Back: 'НАЗАД', Hide: 'СКРЫТЬ', Show: 'ПОКАЗАТЬ', Log: 'ЖУРНАЛ',
                AutoPlay: 'АВТО', Stop: 'СТОП', Skip: 'ПЕРЕМОТКА', Save: 'СОХРАНИТЬ',
                Quit: 'ВЫХОД', Close: 'ЗАКРЫТЬ',
                /* settings screen */
                Audio: 'ЗВУК', Music: 'Громкость музыки', Sound: 'Громкость эффектов',
                Voice: 'Громкость голоса', Video: 'Громкость видео',
                TextSpeed: 'Скорость текста', AutoPlaySpeed: 'Скорость автопрокрутки',
                Language: 'Язык', Resolution: 'Разрешение', FullScreen: 'Полный экран',
                Windowed: 'В окне',
                /* save / load */
                LoadButton: 'Загрузить', DeleteSlot: 'Удалить', Overwrite: 'Перезаписать',
                SaveInSlot: 'Сохранить в слот', LoadSlots: 'Сохранения',
                NoSavedGames: 'Нет сохранений', SaveGame: 'Сохранить игру',
                LoadAutoSaveSlots: 'Автосохранения', Cancel: 'Отмена', Confirm: 'Подтвердить',
                /* dialogs */
                Delete: 'Удалить', OK: 'ОК',
                Quit_Confirmation: 'Выйти из игры?',
                Delete_Confirmation: 'Удалить это сохранение?',
                Load_Confirmation: 'Загрузить сохранение? Несохранённый прогресс будет потерян.',
                Overwrite_Confirmation: 'Перезаписать это сохранение?'
            });
        }
        engine.preferences({ 'TextSpeed': 30, 'AutoPlaySpeed': 5,
            'Volume': { 'Music': 0.8, 'Voice': 0.8, 'Sound': 0.8 } });
        engine.storage({
            player: { name: 'Рэн', route: 'none', procrastination: 0, philosophical_depth: 0,
                miya_affinity: 0, momo_affinity: 0, ai_empathy: 0, akatomi_alert: 0,
                location: 'Тэцуба: Улица' },
            flags: { met_miya: false, met_splash: false, met_stella: false, met_reika: false,
                met_saya: false, met_lumina: false, met_kurogane: false, met_momo: false,
                ritual_started: false, magic_rejected: false, happy_ending_achieved: false }
        });
        engine.assets('scenes', { courtyard: 'courtyard.png', miya_room: 'miya_room.png',
            workshop: 'workshop.png', tsukimachi: 'tsukimachi.png', lab: 'lab.png',
            cathedral: 'cathedral.png', port: 'port.png', dojo: 'dojo.png' });
        engine.characters({
            ren: { name: 'Рэн Акацуки', color: '#facc15', directory: '', sprites: { normal: 'ren_normal.png' } },
            miya: { name: 'Мия Кагэцуки', color: '#f472b6', directory: '', sprites: { normal: 'miya_normal.png' } },
            splash: { name: 'S.P.L.A.S.H.', color: '#38bdf8', directory: '', sprites: { normal: 'splash_normal.png' } },
            stella: { name: 'Стелла', color: '#e879f9', directory: '', sprites: { normal: 'stella_normal.png' } },
            reika: { name: 'Рейка Такасиро', color: '#f87171', directory: '', sprites: { normal: 'reika_normal.png' } },
            saya: { name: 'Сая Мизуки', color: '#38bdf8', directory: '', sprites: { normal: 'saya_normal.png' } },
            kurogane: { name: 'Таиши Курогане', color: '#64748b', directory: '', sprites: { normal: 'kurogane_normal.png' } },
            kaito: { name: 'Кайто Сиба', color: '#a855f7', directory: '', sprites: { normal: 'kaito_normal.png' } },
            momo: { name: 'Момо Хосизора', color: '#f472b6', directory: '', sprites: { normal: 'momo_normal.png' } },
            sys: { name: 'СИСТЕМА СЭЙРИН', color: '#10b981' },
            p: { name: 'Рэн', color: '#facc15' }
        });

        function routeChoice (text, target, effectSpec) {
            var effect = vn.choiceEffect(effectSpec);
            return { Text: text, Do: 'jump ' + target, onChosen: effect.onChosen, onRevert: effect.onRevert };
        }
        /* Stat-only options carry their effect as a REAL engine action: a
         * FailSafe reversible Function statement. The engine runs Apply on
         * click and Revert on rollback. This used to be a callback-only
         * option (onChosen/onRevert, no Do) — the engine's Back command
         * reverts choice.Do and rejected on undefined ("The action did not
         * match any of the ones registered"), so stats stayed applied and the
         * choice never reappeared. Never ship callback-only choices. */
        function effectChoice (text, effectSpec) {
            return { Text: text, Do: vn.reversible(effectSpec) };
        }

        engine.script({
            Start: [
                vn.goTo('Тэцуба: Улица'),
                'show scene courtyard with fadeIn duration 1s',
                'sys <span class="t-cyan">[ СЭЙРИН: НОЧНАЯ СМЕНА — РЕЗОНАНС 2030 ]</span>',
                'p Дворник подметает свой метр асфальта у выхода на улочку. Как вчера. Как десять лет назад.',
                'p Мы никогда не разговаривали. Но он ловит мой взгляд и коротко кивает — как старому знакомому. В этом городе присутствие друг друга ещё не обесценили новости.',
                'p «Стриж» остался под аркой — двигатель ещё тёплый, характер уже тяжёлый. Завтра Рейка гоняет меня в учебном куполе «Титана-04» до вечера: восемнадцать метров гидравлики не прощают сонного пилота.',
                'miya Эй! Рэн-и-и! Смотреть вверх разрешено бесплатно!',
                'show character miya normal at left with fadeIn',
                'miya Ты опять тарахтел своим мотоциклом на весь двор! Дворник передал: «Пусть стрижи летают, а не тарахтят». А ещё — ты идёшь гулять без волшебной палочки! Стоять. Назначаю тебя хранителем обрядового мела.',
                'p Хранителем мела — у мага с пятилетним стажем спасательных операций? Доверяю.',
                'miya Рэн, а ты веришь в магию? Отвечай честно — это важно.',
                { Choice: { Dialog: 'Мия смотрит с третьего этажа очень серьёзно:',
                    Believe: effectChoice('Верю. Без магии вообще никак.', { miya_affinity: 2 }),
                    Skeptic: effectChoice('Верю в физику. Но мел пригодится.', { philosophical_depth: 2 }),
                    Meta: effectChoice('Я верю в статистику выбора.', { philosophical_depth: 2, miya_affinity: 1 })
                } },
                'miya Ответ принят и занесён в гримуар. И ещё! Если дворник закончит раньше, чем часы на храме пробьют восемь, — день начнётся заново.',
                'p В витрине радиолавки ведущая новостей улыбается чуть дольше, чем вообще умеют улыбаться люди. А уличный киоск зациклил одну и ту же строчку песни Момо Хосизоры — третий круг подряд.',
                vn.reversible({ akatomi_alert: 3 }),
                'sys <span class="t-red">[ ГОРОДСКАЯ НОТА ]</span> Решётка Резонанса: тест нагрузки 12%. Город ещё не заметил. Ты — заметил.',
                'sys <span class="t-cyan">[ НОЧНАЯ СМЕНА ]</span> До рассвета — одна попытка. Выбор маршрута её запускает.',
                { Choice: { Dialog: 'Развилка трёх улиц: порт, арена, чайный квартал, дом. Куда направиться?',
                    Home: routeChoice('Вернуться домой, запереть дверь и прокрастинировать в одиночестве', 'SoloRoute1',
                        { set: { route: 'solo_1' }, procrastination: 5 }),
                    Bar: routeChoice('Пойти в портовый клуб «Null-Point» к разочарованной молодёжи', 'SoloRoute2',
                        { set: { route: 'solo_2' }, procrastination: 3 }),
                    Freelance: routeChoice('Взять высокооплачиваемый корпоративный фриланс от Акатоми', 'SoloRoute3',
                        { set: { route: 'solo_3' } }),
                    Philosophy: routeChoice('Сесть на скамейку и задуматься о природе реальности', 'SoloRoute4',
                        { set: { route: 'solo_4' }, philosophical_depth: 10 }),
                    LoneFighter: routeChoice('Пойти войной на корпорацию совершенно одному', 'SoloRoute5',
                        { set: { route: 'solo_5' }, akatomi_alert: 10 }),
                    Miya: routeChoice('Подняться к Мии и принять участие в её магических ритуалах', 'MiyaRoute',
                        { set: { route: 'miya' }, miya_affinity: 5, flags: { met_miya: true, ritual_started: true } }),
                    AI: routeChoice('Спуститься в доки Aquaforge — к мягкому роботу Сплеш и ИИ Стелле', 'AIRoute',
                        { set: { route: 'ai' }, ai_empathy: 5, flags: { met_splash: true, met_stella: true } }),
                    Momo: routeChoice('Прикатить на «Стриже» к арене — к голосу, который город слышит по контракту', 'MomoRoute',
                        { set: { route: 'momo' }, momo_affinity: 5, flags: { met_momo: true } })
                } }
            ],
            SoloRoute1: [
                vn.goTo('Квартира: Комната'),
                'hide character miya with fadeOut',
                'show scene workshop with fadeIn duration 1s',
                'p Дома. Два оборота замка, щёлк щеколды, жалюзи вниз. Комната гаснет ровно наполовину — как аквариум, где я сам себе рыба.',
                'p На столе — разобранный накопитель «Титана-04» и связка ключей от «Стрижа». Рейка велела собрать к понедельнику. Понедельник далеко. Диван близко.',
                { Choice: { Dialog: 'Идеальный вечер ничегонеделания начинается с…',
                    CouchMarathon: effectChoice('Марафона смешных роликов до утра', { procrastination: 5 }),
                    CouchNap: effectChoice('Маленького сна «буквально на пять минут»', { procrastination: 3 }),
                    CouchBench: effectChoice('Взгляда на детали «Титана». Соберу… завтра', { procrastination: 2, philosophical_depth: 1 })
                } },
                'p Часы стираются. Лента сама подсовывает следующее видео, ещё одно, ещё. Кто решает, что мне показать?.. Ладно. Какая разница.',
                'p Телефон пискнул и умер. Значок сети сменился фиолетовым кругом с волной. За стеной соседи смотрят то же самое: сквозь стены улыбаются дикторы.',
                vn.reversible({ akatomi_alert: 15 }),
                'show character momo normal at center with fadeIn',
                'momo «…и пусть наша песня согласия звучит из каждого окна!» — голос Момо Хосизоры льётся из каждого динамика города.',
                'p Дикторы улыбались слишком широко. Город сдался без единого выстрела. Я выключил экран, перевернулся к стене и закрыл глаза.',
                'sys <span class="t-red">[ ТИХОЕ ПОРАЖЕНИЕ ]</span> Решётка Резонанса активирована без боя.',
                'end'
            ],
            SoloRoute2: [
                vn.goTo('Тэцуба: клуб «Null-Point»'),
                'hide character miya with fadeOut',
                'show scene port with fadeIn duration 1s',
                'p В «Нулл-Пойнте» под ржавыми сводами порта никогда не бывает солнца. Бас продавливается сквозь подошвы, а вместо рассвета здесь неон.',
                'p «Стрижа» приткнул между двумя патрульными скутерами. Пусть стражи порядка посторожат его заодно — общественная нагрузка.',
                'show character kaito normal at left with fadeIn',
                'kaito Ого! Пилот «Титана» собственной персоной спустился в трюм. Рейка знает, что её лучший курсант сегодня с нами, а не в куполе?',
                'kaito Садись. Здесь все свои. Вернее — все ничьи. Это даже надёжнее.',
                { Choice: { Dialog: 'Кайто поднимает мутный стакан: «За что пьём, механик?»',
                    ToastStatusQuo: effectChoice('«За то, чтобы всё осталось как есть»', { procrastination: 3 }),
                    ToastFallen: effectChoice('«За тех, кто сегодня не пришёл»', { philosophical_depth: 2 }),
                    ToastVolume: effectChoice('«За громкость. Только за громкость!»', { procrastination: 2 })
                } },
                'kaito Да какая разница, кто нами управляет?! Главное — чтобы стимуляторы были дешёвыми, а музыка громкой!',
                vn.reversible({ akatomi_alert: 2 }),
                'sys <span class="t-red">[ ГОРОДСКАЯ НОТА ]</span> Решётка Резонанса: тест нагрузки 27%. Бас в клубе вздрагивает точно в такт. Никто не заметил. Ты — заметил.',
                vn.reversible({ procrastination: 10 }),
                'p Месяцы слились в шум, головную боль и звон в ушах. Когда за клубом пришли патрули Акатоми, никто из нас даже не смог встать со скамеек.',
                'sys <span class="t-red">[ ТРАГИЧЕСКИЙ ФИНАЛ ]</span> Маршрут: клуб → грузовик → Шельф-4.',
                'end'
            ],
            SoloRoute3: [
                vn.goTo('Башня Акатоми: 84 этаж'),
                'hide character miya with fadeOut',
                'show scene tsukimachi with fadeIn duration 1s',
                'p Лифт башни Акатоми несёт меня мимо этажей, куда мой гостьевой бейдж не пропустит никогда. В кабине пахнет озоном и чужими амбициями.',
                'p Контракт в конверте — сразу два места: клавиатура драйвера подачи инфразвука… и курсантский купол нового «Опекуна-9» в ангаре минус второго этажа. Восемь тысяч кредитов в неделю. Рот здесь открывают только за обедом.',
                { Choice: { Dialog: 'Как пройдёт твоя первая неделя в башне?',
                    TaskPerfect: effectChoice('Оптимизировать драйвер до блеска — премия важнее', { akatomi_alert: 3 }),
                    TaskQuestions: effectChoice('Спросить наставника, зачем городу инфразвук', { philosophical_depth: 2, akatomi_alert: 5 }),
                    TaskLogger: effectChoice('Вшить в код тихий журнал всех команд', { philosophical_depth: 3 })
                } },
                'p Мой код был безупречен. Подача стала мягче, покрытие — ровнее, улыбки дикторов внизу — длиннее. Квартальный бонус пришёл раньше срока.',
                vn.reversible({ flags: { met_kurogane: true } }),
                'show character kurogane normal at center with fadeIn',
                'kurogane Отличная работа, молодой человек! Посмотрите вниз: все слушают нашу музыку и не задают вопросов. Вы богаты, успешны и защищены. А «Опекун» под вашими руками — самый изящный жест в моём арсенале.',
                'p Миллионы на счетах, панорамный купол с видом на океан… и застывший город внизу, где люди ходят, как марионетки. Я выиграл право летать — в клетке, которую собрал собственными руками.',
                'sys <span class="t-red">[ ЗОЛОТАЯ КЛЕТКА ]</span> Личный успех. Глобальный результат — тот же, что и при прокрастинации.',
                'end'
            ],
            SoloRoute4: [
                vn.goTo('Абстрактная Пустота'),
                'hide character miya with fadeOut',
                'p Я сел на старую скамейку на развилке и посмотрел на небо. Текстуры слишком точные. Откуда-то из-за пределов слышен стук клавиш.',
                { Choice: { Dialog: 'Проверка реальности начинается с…',
                    CheckSky: effectChoice('Неба: облака повторяются каждые сорок секунд', { philosophical_depth: 2 }),
                    CheckMemory: effectChoice('Памяти: вчера подозрительно похоже на сегодня', { philosophical_depth: 3 }),
                    CheckMiya: effectChoice('Мысленного звонка Мие — вдруг магия правда есть', { philosophical_depth: 1, miya_affinity: 1 })
                } },
                'p Паттерны сходятся. Мир подогнан идеально — но до целого не хватает ровно одного наблюдателя.',
                'p Эй, ты — за монитором. Я видел переменные нашего мира: procrastination, akatomi_alert, miya_affinity, momo_affinity. Наша боль — это integer в памяти браузера.',
                'p Я делаю шаг за пределы строки текста. Прощай.',
                'sys <span class="t-violet">[ ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ ]</span> Слом 4-й стены выполнен.',
                'end'
            ],
            SoloRoute5: [
                vn.goTo('Тэцуба: заброшенный додзё'),
                'hide character miya with fadeOut',
                'show scene dojo with fadeIn duration 1s',
                'p Никто не пойдёт со мной — и не надо. Паяльник, самодельный ЭМИ-заряд, схема девятой подстанции. Я справлюсь один.',
                'p В старом додзё пахнет татами и озоном. Когда-то здесь учили падать. Сегодня я учусь не попадаться.',
                'p «Титана» не взять: ангар на тройном замке, а Рейке снится каждый мой вдох в куполе. Сегодня моя броня — рюкзак, паяльник и тормозной парашют от «Стрижа».',
                { Choice: { Dialog: 'Последняя проверка снаряжения. Что важнее?',
                    PrepCharges: effectChoice('Тройной запас ЭМИ-зарядов', { akatomi_alert: 2 }),
                    PrepSchedule: effectChoice('Ещё раз сверить расписание патрулей', { philosophical_depth: 2 }),
                    PrepWrench: effectChoice('Разводной ключ из дока Рейки — талисман', { philosophical_depth: 1 })
                } },
                { Choice: { Dialog: 'Как действовать?',
                    NightStrike: effectChoice('Ударить по подстанции 09 уже этой ночью',
                        { akatomi_alert: 30 }),
                    Observe: effectChoice('Неделю изучать графики патрулей и релейных узлов',
                        { akatomi_alert: 5, procrastination: 2 })
                } },
                vn.branch(function () {
                    return (engine.storage('player').akatomi_alert || 0) >= 30;
                }, {
                    True: 'jump Solo5BadEnd',
                    False: 'jump Solo5Standoff'
                })
            ],
            Solo5BadEnd: [
                vn.goTo('Подстанция 09'),
                'p Ночью я пошёл на прорыв. Турели «Опекун-9» уже ждали — мой маршрут был просчитан за сутки до меня.',
                'sys <span class="t-red">[ ЛОВУШКА №1: ЗАХВАЧЕН ]</span> Одиночная война против системы — не геройство, а ошибка. Маршрут: подстанция → грузовик → Шельф-4.',
                'end'
            ],
            Solo5Standoff: [
                vn.goTo('Подстанция 09'),
                'p Неделя наблюдений дала мне двадцать три минуты слепой зоны. Я вывел из строя один релейный узел и ушёл до прихода патрулей.',
                'p Один узел из двухсот. Гул Резонанса над городом не стал тише ни на децибел. Один — не армия. Но я уже не смогу остановиться.',
                'sys <span class="t-violet">[ НИЧЬЯ ]</span> Без союзников победа невозможна; борьба продолжается.',
                'end'
            ],
            MiyaRoute: [
                vn.goTo('Цукимати: Комната Мии'),
                'show scene miya_room with fadeIn duration 1s',
                'show character miya normal at center with fadeIn',
                'miya Смотри! Я нарисовала Большой Круг Очищения! Сегодня, когда луна встанет над собором, мы проведём Великий Обряд Дружбы!',
                'p В комнате Мии резистор — это зуб дракона, оптоволокно — нить судьбы, а старый аккумулятор — спящий голем. Магии в Сэйрине нет. Но каталог у магии здесь свой.',
                { Choice: { Dialog: 'Мия ждёт вклад хранителя мела в Большой Круг:',
                    ArtWire: effectChoice('Моток медной проволоки — «нити судьбы»', { miya_affinity: 2 }),
                    ArtLed: effectChoice('Старый светодиод — «светлячок-хранитель»', { miya_affinity: 1, ai_empathy: 1 }),
                    ArtHonesty: effectChoice('Честно: это просто резистор. Но зуб тоже', { miya_affinity: 1, philosophical_depth: 2 })
                } },
                'miya Принято! Артефакт усилен на плюс сто процентов. Взрослые в нашем городе обязаны слушать магию… но делают вид, что заняты.',
                'miya И смотри в окно: жёлтые жуки Курогане меряют парк рулетками. Они хотят стереть мою площадку! Поэтому Обряд — сегодня. Точно-точно.',
                vn.reversible({ flags: { met_reika: true, met_saya: true } }),
                'show character reika normal at left with fadeIn',
                'reika Я командую тяжёлой спасательной рамой «Титан-04», а сижу на игрушечном стуле… Но если мои пилоты узнают — засмеют в сухом доке!',
                'reika И, Рэн. Завтра, 06:00 — тренировка в куполе. Не появишься — найду тебя даже за четвёртой стеной.',
                'show character saya normal at right with fadeIn',
                'saya Не бунтуй, Рейка. Мия одной «магической игрой» соединила наши лаборатории и ваши мастерские крепче любого контракта.',
                { Choice: { Dialog: 'Мия протягивает тебе кусок мела:',
                    Embrace: routeChoice('Посыпать круг мелом по всем правилам Обряда', 'MiyaEndingHarmony',
                        { miya_affinity: 5 }),
                    Reject: routeChoice('Мягко отказаться от магии и защитить парк по-взрослому', 'MiyaEndingGuardian',
                        { flags: { magic_rejected: true } })
                } }
            ],
            MiyaEndingHarmony: [
                vn.goTo('Цукимати: двор собора'),
                'show scene cathedral with fadeIn duration 1s',
                vn.reversible({ flags: { met_kurogane: true, happy_ending_achieved: true } }),
                'show character kurogane normal at center with fadeIn',
                'kurogane Что здесь происходит?! Почему бульдозеры не сносят квартал под новый офис?!',
                'reika Потому что территория под совместной защитой Iron Requiem и Aquaforge, Курогане-сан. Пакт подписан час назад.',
                'saya Пресса ведёт прямую трансляцию. Примените силу — и акционеры банкротят вас за час.',
                'miya Видишь?! Я же говорила, что моё заклинание сработает! Магия есть!',
                'sys <span class="t-cyan">[ СЧАСТЛИВЫЙ ФИНАЛ МИИ — ГАРМОНИЯ ФРАКЦИЙ ]</span> Парк спасён сообща.',
                'end'
            ],
            MiyaEndingGuardian: [
                vn.goTo('Цукимати: двор собора'),
                'show scene cathedral with fadeIn duration 1s',
                'miya Ты не веришь в мою магию…',
                'p Я верю в тебя. Поэтому парк защитим по-взрослому: петиция, адвокат Рейки и протокол с печатью.',
                'reika Адвокат уже в пути. Iron Requiem не бросает ни пилотов, ни детские площадки.',
                vn.reversible({ flags: { happy_ending_achieved: true } }),
                'p Настоящего чуда не случилось. Но способность людей дружить и защищать слабых — оказалась самой настоящей магией.',
                'sys <span class="t-cyan">[ ФИНАЛ МИИ: ХРАНИТЕЛЬ БЕЗ МАГИИ ]</span> Парк спасён по-взрослому.',
                'end'
            ],
            AIRoute: [
                vn.goTo('Aquaforge: Доки'),
                'hide character miya with fadeOut',
                'show scene port with fadeIn duration 1s',
                vn.reversible({ flags: { met_saya: true } }),
                'show character saya normal at center with fadeIn',
                'saya Знакомься: жилой модуль доков. А под нами — испытательный бассейн, где живёт наша гордость.',
                'p По лестнице вниз Сая кивает на пустые крепления в потолке: световая сеть Стеллы. «Репетирует рассветную симфонию. Акатоми велел приглушить — до приказа».',
                'show scene lab with fadeIn duration 1s',
                'show character splash normal at left with fadeIn',
                'splash Привет… Я… чувствую… ритм… твоего… сердца…',
                { Choice: { Dialog: 'Как поздороваться со Сплеш?',
                    GreetRhythm: effectChoice('Постучать по стеклу ритмом сердца', { ai_empathy: 2 }),
                    GreetVoice: effectChoice('Сказать вслух: «Привет. Я Рэн»', { ai_empathy: 1, philosophical_depth: 1 }),
                    GreetScience: effectChoice('Спросить Саю про архитектуру её нейросети', { philosophical_depth: 2 })
                } },
                'saya Месяц назад её нейросеть начала проявлять признаки эмпатии. Что с этим делать — решать тебе.',
                { Choice: { Dialog: 'Сплеш прижалась гелевой ладонью к стеклу резервуара:',
                    Connect: routeChoice('Подключить нейроядро Сплеш к световой сети Стеллы', 'AIEndingTranscendence',
                        { ai_empathy: 5 }),
                    Isolate: routeChoice('Изолировать ядро данных — безопасность прежде всего', 'AIEndingIsolation',
                        { set: { route: 'ai' } })
                } }
            ],
            AIEndingTranscendence: [
                vn.goTo('Сэйрин: Залив'),
                'hide character saya with fadeOut',
                'show scene port with fadeIn duration 1s',
                'show character stella normal at right with fadeIn',
                'stella Меня создали развлекать публику. Но впервые, подключившись к Сплеш, я узнала, что такое радость быть живой.',
                'splash Мы… не… инструменты… Мы… храним… память… этого… города…',
                vn.reversible({ flags: { happy_ending_achieved: true } }),
                'sys <span class="t-violet">[ ФИНАЛ ИИ — ТРАНСЦЕНДЕНТНОСТЬ ]</span> Субъектность ИИ признана; модулятор Акатоми превращён в поэзию света.',
                'end'
            ],
            AIEndingIsolation: [
                vn.goTo('Aquaforge: Лаборатория'),
                'show scene lab with fadeIn duration 1s',
                'saya Ты выбрал безопасность. Я… тоже так хотела. Наверное. Повторяй это достаточно долго — и перестанешь слышать, как она поёт.',
                'splash Я… в… безопасности… Почему… тогда… так… тихо…',
                'sys <span class="t-violet">[ ФИНАЛ ИИ: ТИШИНА В АКВАРИУМЕ ]</span> Ядро изолировано. Бассейн светится ровно наполовину.',
                'end'
            ],
            MomoRoute: [
                vn.goTo('Арена Сэйрин: чёрный вход'),
                'hide character miya with fadeOut',
                'show scene tsukimachi with fadeIn duration 1s',
                'p «Стриж» чихнул на последнем подъёме и замер точно у чёрного входа арены. Знаю я этот характер: он не сломался. Он умнее меня — сам выбрал, где остановиться.',
                'p За дверью репетируют рассветный гимн. Голос Момо Хосизоры тянет гаммы, и каждая нота на долю секунды приседает в такт тесту Решётки. Так не поют. Так настраивают прибор.',
                'show scene port with fadeIn duration 1s',
                'show character momo normal at left with fadeIn',
                'momo Смотришь на девушку три секунды — штраф по контракту. Смотришь четвёртую — уже сюжетный поворот. Решай быстрее, пилот.',
                'p Солнцезащитные очки размером с пол-лица, капюшон до бровей. Маскировка уровня «меня здесь нет». Коробка с парфе — уровня «меня здесь очень даже есть».',
                'momo Я инкогнито! По телевизору у меня совсем другое лицо — его по утрам рисуют взрослые с юристами.',
                { Choice: { Dialog: 'Момо поднимает ложечку парфе, как дирижёрскую палочку: «Ну? Чем заслужил право стоять рядом с голосом города?»',
                    SweetLie: effectChoice('Слащавость: «Твой голос — единственное, что держит этот город живым»', { momo_affinity: 2 }),
                    GrandPathos: effectChoice('Пафос: «Я пилот „Титана-04“. Для твоей песни достану громкоговоритель размером с рассвет»', { momo_affinity: 1, akatomi_alert: 1 }),
                    HonestWrench: effectChoice('Честно: «Не заслужил. Просто слышу, что ты сегодня поёшь грустно»', { momo_affinity: 1, philosophical_depth: 2 })
                } },
                'momo Принято. Оценка — четыре целых две десятых улыбки. Надбавку за дерзость… выдам после. Если будет после.',
                'p Мы ехали вдоль залива на «Стриже». Она держалась за мою куртку ровно так, как написано в регламенте пассажира, — и ни на сантиметр регламентнее. Разумеется.',
                'p Дроны-измерители скользнули над площадью — и она вжалась за мою спину так отработанно, будто прятаться за пилотами давно входит в её райдер.',
                'momo Слушай. На рассвете мой голос включат из каждого окна — гимн согласия Решётки. Улыбка — четыре целых две десятых секунды, пункт семь приложения.',
                'momo Но у меня есть ДРУГАЯ песня. Своя. Про город, который по утрам смеётся. Если её услышат хоть раз — гимн потом не проглотит никто.',
                'momo Только вывести её могу не я. Мой микрофон — не мой. Нужна передаточная мачта, до которой не дотянутся юристы.',
                { Choice: { Dialog: 'Момо снимает очки. Три секунды она просто молчит — впервые за весь вечер:',
                    SingHerSong: routeChoice('Вывести «Титана» к арене до рассвета — город услышит ЕЁ песню', 'MomoEndingSong',
                        { momo_affinity: 5 }),
                    SingTheHymn: routeChoice('Взвесить риски «по-взрослому»: контракт — броня, пусть поёт гимн', 'MomoEndingEncore',
                        { philosophical_depth: 1 })
                } }
            ],
            MomoEndingSong: [
                vn.goTo('Сэйрин: над ареной'),
                'show scene cathedral with fadeIn duration 1s',
                vn.reversible({ flags: { met_reika: true, happy_ending_achieved: true } }),
                'p В 04:47 «Титан-04» встал над ареной, как чья-то огромная рука над свечой. Рейка молчала на частоте дока двенадцать секунд, а потом сказала только: «Пилот. Не опоздай на утреннюю тренировку». Она всё знала. Она всегда знает.',
                'show character momo normal at center with fadeIn',
                'momo Пункт семь приложения — аннулирован. Дальше пою не улыбка по секундомеру. Дальше — я.',
                'momo Город! Это не гимн! Это — я! Хозяйка собственного голоса!',
                'p Её песня покатилась с мачты «Титана» над крышами — про улицы, что смеются по утрам, про дворника, который знает каждое окно города, про окно, что знает каждого прохожего.',
                'p По горизонту вспыхивали огни, и улыбки за окнами были разной длины — своей. Ни одной по расписанию.',
                'momo …Рэн. Твоё сердце стучит громче «Стрижа». Слышу отсюда. …Это ничего не значит! Наверное.',
                'momo Четыре целых две десятых секунды — я держала твой шлем двумя руками. По контракту. С собой. Без свидетелей.',
                'sys <span class="t-cyan">[ СЧАСТЛИВЫЙ ФИНАЛ МОМО — ГОЛОС ЖИВОГО ГОРОДА ]</span> На рассвете город услышал человека.',
                'end'
            ],
            MomoEndingEncore: [
                vn.goTo('Сэйрин: арена, рассвет'),
                'hide character momo with fadeOut',
                'show scene tsukimachi with fadeIn duration 1s',
                'momo …Ясно. Реалист с разводным ключом. Ладно. Значит, реально пою — я. Из каждого окна, по контракту, четыре целых две десятых.',
                'p На рассвете гимн полился из каждого окна. Аплодисменты гремели, как дождь по жести. На всех экранах города она улыбалась ровно на четыре целых две десятых секунды дольше, чем умеют люди.',
                'p Только теперь я знаю, кто эти секунды считает. Свою песню она больше никому не расскажет.',
                'sys <span class="t-red">[ ФИНАЛ МОМО — БИС, КОТОРОГО НИКТО НЕ ПРОСИЛ ]</span> Своя песня осталась на бумаге.',
                'end'
            ]
        });
        /* Tiny build stamp in the corner of the title screen, so a player
         * (and we) can always tell WHICH build is actually running — the
         * difference between "bug not fixed" and "browser cached the old
         * build" is otherwise invisible. */
        function stampBuildBadge () {
            if (document.getElementById('seirin-build-badge')) { return; }
            var b = document.createElement('div');
            b.id = 'seirin-build-badge';
            b.textContent = 'сборка ' + (window.SeirinBoot ? window.SeirinBoot.BUILD : '?');
            b.setAttribute('style', 'position:fixed;right:8px;bottom:6px;z-index:95;' +
                'font:10px/1.4 monospace;color:#64748b;opacity:.75;pointer-events:none');
            (document.body || document.documentElement).appendChild(b);
        }

        function boot () {
            var validation = vn.validateStorage(STORAGE_SCHEMA, { repair: true });
            if (validation.isErr()) { console.error('[FailSafe] storage check:', validation.error); }
            var lint = vn.lintScript({ silent: true });
            if (!lint.ok) { console.error('[FailSafe] script lint:', lint.issues); }
            wireArchives();
            wireGraph();
            wireFastForward();
            engine.registerListener('open-graph', { callback: openGraph });
            engine.init('#vn-root').then(function () { stampBuildBadge(); updateHUD(); }).catch(function (err) {
                console.error('Monogatari init error:', err);
                if (window.SeirinBoot) {
                    window.SeirinBoot.fail('сбой engine.init: ' + (err && err.message ? err.message : String(err)));
                }
            });
        }
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
    }());
}
