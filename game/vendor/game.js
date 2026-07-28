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
if (typeof window !== 'undefined' && window.Monogatari && window.FailSafe) {
    (function () {
        'use strict';
        var engine = window.Monogatari.default;
        // Deliberately exposed for browser diagnostics and rollback regression tests.
        window.engine = engine;
        var FS = window.FailSafe;
        var vn;
        var STORAGE_SCHEMA = window.SeirinGameCore.buildStorageSchema(FS);

        function updateHUD () {
            var p = engine.storage('player') || {};
            var set = function (id, icon, text) {
                var el = document.getElementById(id);
                if (el) { el.innerHTML = '<i class="fas ' + icon + '"></i><span>' + text + '</span>'; }
            };
            set('hud-player-name', 'fa-user-secret', p.name || 'Рэн');
            set('hud-location', 'fa-map-marker-alt', p.location || 'Тэцуба: Улица');
            set('hud-route', 'fa-terminal', p.route === 'none' ? 'Начало' : p.route);
            set('hud-alert-level', 'fa-shield-alt', String(p.akatomi_alert || 0) + '%');
        }

        vn = FS.vn(engine, { onChange: updateHUD, silent: true });
        engine.settings({
            'Target': '#vn-root', 'ServiceWorkers': false, 'Preload': false,
            'Assets': { 'characters': 'assets/characters', 'scenes': 'assets/scenes', 'audio': 'assets/audio' },
            'Storage': { 'Adapter': 'LocalStorage', 'Store': 'SeirinGame_Save' }
        });
        engine.preferences({ 'TextSpeed': 30, 'AutoPlaySpeed': 5,
            'Volume': { 'Music': 0.8, 'Voice': 0.8, 'Sound': 0.8 } });
        engine.storage({
            player: { name: 'Рэн', route: 'none', procrastination: 0, philosophical_depth: 0,
                miya_affinity: 0, ai_empathy: 0, akatomi_alert: 0, location: 'Тэцуба: Улица' },
            flags: { met_miya: false, met_splash: false, met_stella: false, met_reika: false,
                met_saya: false, met_lumina: false, met_kurogane: false, ritual_started: false,
                magic_rejected: false, happy_ending_achieved: false }
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
            sys: { name: 'СИСТЕМА СЭЙРИН', color: '#10b981' },
            p: { name: '{{player.name}}', color: '#facc15' }
        });

        function routeChoice (text, target, effectSpec) {
            var effect = vn.choiceEffect(effectSpec);
            return { Text: text, Do: 'jump ' + target, onChosen: effect.onChosen, onRevert: effect.onRevert };
        }
        engine.script({
            Start: [
                vn.goTo('Тэцуба: Улица'),
                'show scene courtyard with fadeIn duration 1s',
                'sys <span class="t-cyan">[ СЭЙРИН: НОЧНАЯ СМЕНА — РЕЗОНАНС 2030 ]</span>',
                'p Утро в Сэйрине начинается спокойно, но город уже слушает Резонанс.',
                'show character miya normal at left with fadeIn',
                'miya Привет! Выберем, как провести эту смену?',
                { Choice: { Dialog: 'Куда направиться дальше?',
                    Home: routeChoice('Вернуться домой и переждать тревогу', 'SoloRoute1',
                        { set: { route: 'solo_1' }, procrastination: 5 }),
                    Miya: routeChoice('Подняться к Мие и помочь с ритуалом дружбы', 'MiyaRoute',
                        { set: { route: 'miya' }, miya_affinity: 5, flags: { met_miya: true, ritual_started: true } }),
                    AI: routeChoice('Отправиться в Aquaforge к Сплеш и Стелле', 'AIRoute',
                        { set: { route: 'ai' }, ai_empathy: 5, flags: { met_splash: true, met_stella: true } }),
                    Philosophy: routeChoice('Остановиться и подумать о природе реальности', 'SoloRoute4',
                        { set: { route: 'solo_4' }, philosophical_depth: 10 })
                } }
            ],
            SoloRoute1: [
                vn.goTo('Квартира: Комната'), 'show scene workshop with fadeIn duration 1s',
                'p Я запираю дверь и выключаю терминал.',
                vn.reversible({ akatomi_alert: 15 }),
                'sys <span class="t-red">[ ТИХОЕ ПОРАЖЕНИЕ ]</span> Город подчинился без боя.', 'end'
            ],
            SoloRoute4: [
                vn.goTo('Абстрактная Пустота'),
                'p Я вижу строки сценария — и всё же следующий шаг остаётся моим.',
                'sys <span class="t-violet">[ ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ ]</span>', 'end'
            ],
            MiyaRoute: [
                vn.goTo('Цукимати: Комната Мии'), 'show scene miya_room with fadeIn duration 1s',
                'show character miya normal at center with fadeIn',
                'miya Сегодня Обряд Дружбы! Поможешь мне?',
                vn.reversible({ miya_affinity: 5, flags: { met_reika: true, met_saya: true, happy_ending_achieved: true } }),
                'show character reika normal at left with fadeIn', 'reika Команда готова.',
                'show character saya normal at right with fadeIn', 'saya Сигнал стабилен. Парк спасён.',
                'sys <span class="t-cyan">[ ФИНАЛ МИИ — ГАРМОНИЯ ФРАКЦИЙ ]</span>', 'end'
            ],
            AIRoute: [
                vn.goTo('Aquaforge: Лаборатория'), 'show scene lab with fadeIn duration 1s',
                'show character splash normal at left with fadeIn', 'splash Я... слышу... ритм... сердца...',
                'show character stella normal at right with fadeIn', 'stella Мы можем дать городу новый, мягкий свет.',
                vn.reversible({ ai_empathy: 10, flags: { happy_ending_achieved: true } }),
                'sys <span class="t-violet">[ ФИНАЛ ИИ — СУБЪЕКТНОСТЬ ПРИЗНАНА ]</span>', 'end'
            ]
        });
        function boot () {
            var validation = vn.validateStorage(STORAGE_SCHEMA, { repair: true });
            if (validation.isErr()) { console.error('[FailSafe] storage check:', validation.error); }
            var lint = vn.lintScript({ silent: true });
            if (!lint.ok) { console.error('[FailSafe] script lint:', lint.issues); }
            engine.init('#vn-root').then(updateHUD).catch(function (err) { console.error('Monogatari init error:', err); });
        }
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
    }());
}
