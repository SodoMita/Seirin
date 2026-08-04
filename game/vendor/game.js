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
            Solo1LoopEnd:           'Соло I · Лента без конца',
            Solo1FeedEnd:           'ФИНАЛ · Лента до следующей версии',
            Solo1LoopExitEnd:       'ФИНАЛ · Выйти без победы',
            Solo1LateRunEnd:        'Соло I · Серый рассвет',
            Solo1LateMissEnd:       'ФИНАЛ · Поздний старт',
            Solo1LateRepairEnd:     'ФИНАЛ · Девять минут честности',
            Solo1Radio:             'Соло I · Частота 103.7',
            Solo1RadioEnd:          'Соло I · Эфир после полуночи',
            Solo1RadioAnswerEnd:    'ФИНАЛ · Ответ, оставленный себе',
            Solo1RadioStaticEnd:    'ФИНАЛ · Белый шум',
            Solo1RepairEnd:         'ФИНАЛ · Маленький ход',
            SoloRoute2:            'Соло II · Клуб «Null-Point»',
            Solo2DriftEnd:          'ФИНАЛ · Танец на месте',
            Solo2MuteEnd:           'ФИНАЛ · Минута тишины',
            Solo2CallEnd:           'ФИНАЛ · Звонок до рассвета',
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
            MomoEndingEncore:      'ФИНАЛ · Бис по контракту',
            AnimeEva_EndSleep:     'ФИНАЛ · Спать с мыслями о Евангелионе',
            AnimeEva_EndMechaArt:  'ФИНАЛ · Искусство про меху',
            AnimeFandom_DescentEcchi:   'Спуск · Этти',
            AnimeFandom_DescentShorts:  'Спуск · Короткие видео',
            AnimeFandom_DescentExit:    'Спуск · Переход с платформ',
            AnimeFandom_DescentHentai:  'Спуск · Хентай',
            AnimeFandom_DescentVN:      'Спуск · ВН и игры',
            AnimeFandom_DescentEroguro: 'Спуск · Эро-гуро',
            AnimeFandom_DescentBattle:  'ФИНАЛ · Спуск ниже дна'
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
                Confirm: 'Выйти из игры? Несохранённый прогресс будет потерян.',
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
        engine.assets('scenes', { courtyard: 'courtyard.webp', miya_room: 'miya_room.webp',
            workshop: 'workshop.webp', tsukimachi: 'tsukimachi.webp', lab: 'lab.webp',
            cathedral: 'cathedral.webp', port: 'port.webp', dojo: 'dojo.webp' });
        engine.characters({
            ren: { name: 'Рэн Акацуки', color: '#facc15', directory: '', sprites: { normal: 'ren_normal.webp' } },
            miya: { name: 'Мия Кагэцуки', color: '#f472b6', directory: '', sprites: { normal: 'miya_normal.webp' } },
            splash: { name: 'S.P.L.A.S.H.', color: '#38bdf8', directory: '', sprites: { normal: 'splash_normal.webp' } },
            stella: { name: 'Стелла', color: '#e879f9', directory: '', sprites: { normal: 'stella_normal.webp' } },
            reika: { name: 'Рейка Такасиро', color: '#f87171', directory: '', sprites: { normal: 'reika_normal.webp' } },
            saya: { name: 'Сая Мизуки', color: '#38bdf8', directory: '', sprites: { normal: 'saya_normal.webp' } },
            kurogane: { name: 'Таиши Курогане', color: '#64748b', directory: '', sprites: { normal: 'kurogane_normal.webp' } },
            kaito: { name: 'Кайто Сиба', color: '#a855f7', directory: '', sprites: { normal: 'kaito_normal.webp' } },
            momo: { name: 'Момо Хосизора', color: '#f472b6', directory: '', sprites: { normal: 'momo_normal.webp' } },
            radio: { name: 'РАДИО · ЭФИР', color: '#67e8f9', directory: '', sprites: { normal: 'radio_signal.svg' } },
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

        /* Story is deliberately split by route in vendor/story/. Every arc is a
         * plain ES5 file registered before this bootstrap runs; this keeps a
         * new route from becoming a risky edit to the engine/UI glue. */
        function buildStoryFromArcs () {
            var registry = window.SeirinStory;
            var order = ['prologue', 'procrastination', 'anime_shorts', 'anime_comfort', 'anime_activities', 'anime_watchlist', 'anime_eva_01_07', 'anime_eva_09_16', 'anime_eva_17_24', 'anime_eva_25_end', 'anime_nausicaa', 'anime_key', 'anime_cicada', 'anime_gacha', 'anime_fandom', 'club', 'tower', 'bench', 'lonewar', 'miya', 'ai', 'momo'];
            var script = {};
            var api = { vn: vn, engine: engine, routeChoice: routeChoice, effectChoice: effectChoice };
            var i, arc, labels, key;
            if (!registry || !registry.arcs) { throw new Error('Не загружены сюжетные арки.'); }
            for (i = 0; i < order.length; i++) {
                arc = registry.arcs[order[i]];
                if (typeof arc !== 'function') { throw new Error('Не загружена арка: ' + order[i]); }
                labels = arc(api);
                for (key in labels) {
                    if (Object.prototype.hasOwnProperty.call(labels, key)) {
                        if (script[key]) { throw new Error('Повтор метки сюжета: ' + key); }
                        script[key] = labels[key];
                    }
                }
            }
            return script;
        }
        engine.script(buildStoryFromArcs());
        /* Tiny build stamp in the corner of the title screen, so a player
         * (and we) can always tell WHICH build is actually running — the
         * difference between "bug not fixed" and "browser cached the old
         * build" is otherwise invisible. */
        function stampBuildBadge () {
            if (document.getElementById('seirin-build-badge')) { return; }
            var b = document.createElement('div');
            b.id = 'seirin-build-badge';
            b.textContent = 'сборка ' + (window.SeirinBoot ? window.SeirinBoot.BUILD : '?');
            /* Sits ABOVE the engine quick-menu bar (2.5rem tall, pinned to the
               bottom on desktop) — at bottom:6px it printed straight through
               the ВЫХОД/Quit button. Left-aligned for the same reason: the
               right end of that bar is where Quit lives. */
            b.setAttribute('style', 'position:fixed;left:10px;bottom:calc(2.5rem + 6px);z-index:95;' +
                'font:10px/1.4 monospace;color:#64748b;opacity:.6;pointer-events:none');
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
