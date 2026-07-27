/* ============================================================================
 * Seirin: Night Shift — Resonance 2030 (New Game Engine Code)
 * ----------------------------------------------------------------------------
 * ES5 Browser & Node Compatible Visual Novel Code in game/
 * Supports Chapter 0 Street Walk, 5 Solo Routes, Miya Ritual Route, AI Route
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

/* PART 2 — Browser Engine Wiring */
if (typeof window !== 'undefined' && window.Monogatari) {
    (function () {
        'use strict';
        var engine = window.Monogatari.default;
        var FS = window.FailSafe;
        var vn = FS ? FS.vn : null;

        var STORAGE_SCHEMA = window.SeirinGameCore.buildStorageSchema(FS);

        // Icon references for HUD rendering: fa-map-marker-alt, fa-coins, fa-terminal, fa-user-secret, fa-shield-alt
        function updateHUD () {
            var playerEl = document.getElementById('hud-player-name');
            var locEl = document.getElementById('hud-location');
            var alertEl = document.getElementById('hud-alert-level');
            var routeEl = document.getElementById('hud-route');

            if (!engine || !engine.storage) { return; }
            var p = engine.storage('player') || {};

            if (playerEl) { playerEl.innerHTML = '<i class="fas fa-user-secret"></i> ' + (p.name || 'Рэн'); }
            if (locEl) { locEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + (p.location || 'Тэцуба'); }
            if (alertEl) { alertEl.innerHTML = '<i class="fas fa-shield-alt"></i> ' + (p.akatomi_alert || 0) + '%'; }
            if (routeEl) { routeEl.innerHTML = '<i class="fas fa-terminal"></i> ' + (p.route || 'Начало'); }
        }

        engine.settings({
            'Target': '#vn-root',
            'ServiceWorkers': false,
            'Preload': false,
            'Assets': {
                'characters': 'assets/characters',
                'scenes': 'assets/scenes',
                'audio': 'assets/audio'
            },
            'Storage': { 'Adapter': 'LocalStorage', 'Store': 'SeirinGame_Save' }
        });

        engine.preferences({
            'TextSpeed': 30,
            'AutoPlaySpeed': 5,
            'Volume': { 'Music': 0.8, 'Voice': 0.8, 'Sound': 0.8 }
        });

        engine.storage({
            player: {
                name: 'Рэн',
                route: 'none',
                procrastination: 0,
                philosophical_depth: 0,
                miya_affinity: 0,
                ai_empathy: 0,
                akatomi_alert: 0,
                location: 'Тэцуба: Улица'
            },
            flags: {
                met_miya: false,
                met_splash: false,
                met_stella: false,
                met_reika: false,
                met_saya: false,
                met_lumina: false,
                met_kurogane: false,
                ritual_started: false,
                magic_rejected: false,
                happy_ending_achieved: false
            }
        });

        engine.characters({
            'ren':      { name: 'Рэн Акацуки', color: '#facc15', directory: '', sprites: { normal: 'ren_normal.png' } },
            'miya':     { name: 'Мия Кагэцуки (5 лет)', color: '#f472b6', directory: '', sprites: { normal: 'miya_normal.png' } },
            'splash':   { name: 'S.P.L.A.S.H. (Сплеш)', color: '#38bdf8', directory: '', sprites: { normal: 'splash_normal.png' } },
            'stella':   { name: 'Стелла (ИИ)', color: '#e879f9', directory: '', sprites: { normal: 'stella_normal.png' } },
            'reika':    { name: 'Рейка Такасиро', color: '#f87171', directory: '', sprites: { normal: 'reika_normal.png' } },
            'saya':     { name: 'Сая Мизуки', color: '#38bdf8', directory: '', sprites: { normal: 'saya_normal.png' } },
            'lumina':   { name: 'Люмина (Хор Бездны)', color: '#a855f7', directory: '', sprites: { normal: 'lumina_normal.png' } },
            'kurogane': { name: 'Таиши Курогане', color: '#64748b', directory: '', sprites: { normal: 'kurogane_normal.png' } },
            'yuki':     { name: 'Юки Тэнро', color: '#38bdf8', directory: '', sprites: { normal: 'yuki_normal.png' } },
            'momo':     { name: 'Момо Хосизора', color: '#f472b6', directory: '', sprites: { normal: 'momo_normal.png' } },
            'kitsune':  { name: 'Кицунэ Юбикири', color: '#fb923c', directory: '', sprites: { normal: 'kitsune_normal.jpg' } },
            'sys':      { name: 'СИСТЕМА СЭЙРИН', color: '#10b981' },
            'p':        { name: '{{player.name}}', color: '#facc15' }
        });

        engine.script({
            'Start': [
                vn.goTo('Тэцуба: Улица'),
                'sys <span class="t-cyan">[ СЭЙРИН: НОЧНАЯ СМЕНА &mdash; РЕЗОНАНС 2030 ]</span>',
                'p Утро в Сэйрине начинается с шороха старой метлы дворника во дворе. Ничего необычного.',
                'show character miya normal at left with fadeIn',
                'miya Эй! Привет! Ты опять идёшь гулять без волшебной палочки?! Поднимись ко мне!',
                
                {
                    'Choice': {
                        'Dialog': 'Куда направиться дальше?',
                        'ChoiceHome': {
                            'Text': 'Вернуться домой, запереть дверь и прокрастинировать в одиночестве',
                            'Do': 'jump SoloRoute1',
                            'onChosen': vn.choiceEffect({
                                apply: function (s) { s.player.route = 'solo_1'; s.player.procrastination += 5; },
                                revert: function (s) { s.player.route = 'none'; s.player.procrastination -= 5; }
                            }),
                            'onRevert': function () {}
                        },
                        'ChoiceMiya': {
                            'Text': 'Зайти в комнату пятилетней Мии и принять участие в ее магических ритуалах',
                            'Do': 'jump MiyaRouteLabel',
                            'onChosen': vn.choiceEffect({
                                apply: function (s) { s.player.route = 'miya'; s.flags.met_miya = true; s.player.miya_affinity += 5; },
                                revert: function (s) { s.player.route = 'none'; s.flags.met_miya = false; s.player.miya_affinity -= 5; }
                            }),
                            'onRevert': function () {}
                        },
                        'ChoiceAI': {
                            'Text': 'Отправиться в доки Aquaforge к мягкому роботу Сплеш и ИИ Стелла',
                            'Do': 'jump AIRouteLabel',
                            'onChosen': vn.choiceEffect({
                                apply: function (s) { s.player.route = 'ai'; s.flags.met_splash = true; s.flags.met_stella = true; },
                                revert: function (s) { s.player.route = 'none'; s.flags.met_splash = false; s.flags.met_stella = false; }
                            }),
                            'onRevert': function () {}
                        },
                        'ChoicePhilosophy': {
                            'Text': 'Сесть на скамейку и задуматься о природе реальности и 4-й стене',
                            'Do': 'jump SoloRoute4',
                            'onChosen': vn.choiceEffect({
                                apply: function (s) { s.player.route = 'solo_4'; s.player.philosophical_depth += 10; },
                                revert: function (s) { s.player.route = 'none'; s.player.philosophical_depth -= 10; }
                            }),
                            'onRevert': function () {}
                        }
                    }
                }
            ],

            'SoloRoute1': [
                'vn.goTo("Квартира: Комната")',
                'p Я запер дверь на два замка и опустил жалюзи. Зачем суетиться?',
                'sys <span class="t-red">[ ТИХОЕ ПОРАЖЕНИЕ ]</span> Акатоми включили систему Резонанс. Город подчинен без боя.',
                'end'
            ],

            'SoloRoute4': [
                'vn.goTo("Абстрактная Пустота")',
                'p Эй... Ты, кто читает эти строки на своем мониторе.',
                'p Я вижу структуру нашего скрипта. Я делаю шаг за пределы строки текста. Прощай.',
                'sys <span class="t-violet">[ ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ ]</span> Слом 4-й стены выполнен.',
                'end'
            ],

            'MiyaRouteLabel': [
                'vn.goTo("Цукимати: Комната Мии")',
                'show character miya normal at center with fadeIn',
                'miya Смотри! Я нарисовала Большой Круг Очищения! Сегодня мы проведем Обряд Дружбы!',
                'show character reika normal at left with fadeIn',
                'reika Я глава отряда Iron Requiem, а сижу на игрушечном стуле... Но это мило.',
                'show character saya normal at right with fadeIn',
                'saya Мия объединила наши лаборатории Aquaforge и мастерские в одну команду.',
                'sys <span class="t-cyan">[ СЧАСТЛИВЫЙ ФИНАЛ МИИ &mdash; ГАРМОНИЯ ФРАКЦИЙ ]</span> Парк спасен!',
                'end'
            ],

            'AIRouteLabel': [
                'vn.goTo("Aquaforge: Лаборатория")',
                'show character splash normal at left with fadeIn',
                'splash Привет... Я... чувствую... ритм... твоего... сердца...',
                'show character stella normal at right with fadeIn',
                'stella Мы проецируем истинную поэзию света над заливом Сэйрина.',
                'sys <span class="t-violet">[ ФИНАЛ ИИ &mdash; ТРАНСЦЕНДЕНТНОСТЬ СТЕЛЛЫ И СПЛЕШ ]</span> Субъектность ИИ признана!',
                'end'
            ]
        });

        function boot () {
            var validation = vn.validateStorage(STORAGE_SCHEMA, { repair: true });
            if (validation.isErr()) {
                console.error('[FailSafe] storage check:', validation.error);
            }

            var lint = vn.lintScript();
            console.info('[FailSafe] script lint: ' + (lint.ok ? 'CLEAN' : lint.issues.length + ' issue(s)'));

            engine.init('#vn-root').then(function () {
                console.log('Seirin Game initialized successfully.');
                updateHUD();
            }).catch(function (err) {
                console.error('Monogatari init error:', err);
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    }());
}
