/* ============================================================================
 * Seirin: Night Shift — Resonance 2030 (New Game Engine Code)
 * ----------------------------------------------------------------------------
 * ES5 Browser & Node Compatible Visual Novel Code in game/
 * Chapter 0 street walk with 7 canon choices (LEVEL_1..3): 5 Solo Routes,
 * Miya Ritual Route (mid-route node M.1) and AI Route (mid-route node AI.1).
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

        var ROUTE_LABELS = {
            none:   'Начало',
            solo_1: 'Соло I — Уединение',
            solo_2: 'Соло II — Null-Point',
            solo_3: 'Соло III — Башня',
            solo_4: 'Соло IV — Пустота',
            solo_5: 'Соло V — Одиночная война',
            miya:   'Рут Мии',
            ai:     'Рут ИИ'
        };

        var ARCHIVE_CONTACTS = [
            ['met_miya',    'Мия Кагэцуки'],
            ['met_reika',   'Рейка Такасиро'],
            ['met_saya',    'Сая Мизуки'],
            ['met_kurogane','Таиши Курогане'],
            ['met_splash',  'S.P.L.A.S.H.'],
            ['met_stella',  'Стелла'],
            ['met_lumina',  'Люмина']
        ];

        var ARCHIVE_STATS = [
            ['procrastination',     'Прокрастинация'],
            ['philosophical_depth', 'Глубина рефлексии'],
            ['miya_affinity',       'Доверие Мии'],
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
            syncArchives();
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
            kurogane: { name: 'Таиши Курогане', color: '#64748b', directory: '', sprites: { normal: 'kurogane_normal.png' } },
            kaito: { name: 'Кайто Сиба', color: '#a855f7', directory: '', sprites: { normal: 'kaito_normal.png' } },
            momo: { name: 'Момо Хосизора', color: '#f472b6', directory: '', sprites: { normal: 'momo_normal.png' } },
            sys: { name: 'СИСТЕМА СЭЙРИН', color: '#10b981' },
            p: { name: '{{player.name}}', color: '#facc15' }
        });

        function routeChoice (text, target, effectSpec) {
            var effect = vn.choiceEffect(effectSpec);
            return { Text: text, Do: 'jump ' + target, onChosen: effect.onChosen, onRevert: effect.onRevert };
        }
        function effectChoice (text, effectSpec) {
            var effect = vn.choiceEffect(effectSpec);
            return { Text: text, onChosen: effect.onChosen, onRevert: effect.onRevert };
        }

        engine.script({
            Start: [
                vn.goTo('Тэцуба: Улица'),
                'show scene courtyard with fadeIn duration 1s',
                'sys <span class="t-cyan">[ СЭЙРИН: НОЧНАЯ СМЕНА — РЕЗОНАНС 2030 ]</span>',
                'p Утро в Сэйрине начинается с шороха берёзовой метлы дворника — он год за годом подметает один и тот же метр асфальта. На третьем этаже, за окном с геранью, пятилетняя Мия рисует мелками и смотрит на улицу. Я стою на развилке трёх улиц: порт, чайный квартал и мой подъезд.',
                'show character miya normal at left with fadeIn',
                'miya Эй! Ты опять идёшь гулять без волшебной палочки?! Поднимись ко мне — покажу новое заклинание! Или иди, куда шёл. День твой.',
                { Choice: { Dialog: 'Куда направиться дальше?',
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
                        { set: { route: 'ai' }, ai_empathy: 5, flags: { met_splash: true, met_stella: true } })
                } }
            ],
            SoloRoute1: [
                vn.goTo('Квартира: Комната'),
                'hide character miya with fadeOut',
                'show scene workshop with fadeIn duration 1s',
                'p Я запер дверь на два замка и опустил жалюзи. Зачем суетиться? В этой комнате есть тишина, мягкий диван и бесконечная лента видеороликов.',
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
                'p В «Нулл-Пойнте» под ржавыми сводами порта никогда не бывает солнца. Здесь собираются те, кто давно махнул рукой на учёбу, работу и будущее.',
                'show character kaito normal at left with fadeIn',
                'kaito Да какая разница, кто нами управляет?! Главное — чтобы стимуляторы были дешёвыми, а музыка громкой!',
                vn.reversible({ procrastination: 10 }),
                'p Месяцы слились в шум, головную боль и звон в ушах. Когда за клубом пришли патрули Акатоми, никто из нас даже не смог встать со скамеек.',
                'sys <span class="t-red">[ ТРАГИЧЕСКИЙ ФИНАЛ ]</span> Маршрут: клуб → грузовик → Шельф-4.',
                'end'
            ],
            SoloRoute3: [
                vn.goTo('Башня Акатоми: 84 этаж'),
                'hide character miya with fadeOut',
                'show scene tsukimachi with fadeIn duration 1s',
                vn.reversible({ flags: { met_kurogane: true } }),
                'show character kurogane normal at center with fadeIn',
                'kurogane Отличная работа, молодой человек! Посмотрите вниз: все слушают нашу музыку и не задают вопросов. Вы богаты, успешны и защищены.',
                'p Миллионы на счетах, панорамный вид на океан… и застывший город внизу, где люди ходят, как марионетки. Я построил свою клетку на кладбище чужих душ.',
                'sys <span class="t-red">[ ЗОЛОТАЯ КЛЕТКА ]</span> Личный успех. Глобальный результат — тот же, что и при прокрастинации.',
                'end'
            ],
            SoloRoute4: [
                vn.goTo('Абстрактная Пустота'),
                'hide character miya with fadeOut',
                'p Я сел на старую скамейку и посмотрел на небо. Текстуры слишком точные. Откуда-то из-за пределов слышен стук клавиш.',
                'p Эй, ты — за монитором. Я видел переменные нашего мира: procrastination, akatomi_alert, miya_affinity. Наша боль — это integer в памяти браузера.',
                'p Я делаю шаг за пределы строки текста. Прощай.',
                'sys <span class="t-violet">[ ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ ]</span> Слом 4-й стены выполнен.',
                'end'
            ],
            SoloRoute5: [
                vn.goTo('Тэцуба: заброшенный додзё'),
                'hide character miya with fadeOut',
                'show scene dojo with fadeIn duration 1s',
                'p Никто не пойдёт со мной — и не надо. Паяльник, самодельный ЭМИ-заряд, схема девятой подстанции. Я справлюсь один.',
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
                vn.reversible({ flags: { met_reika: true, met_saya: true } }),
                'show character reika normal at left with fadeIn',
                'reika Я командую отрядом тяжёлой спасательной техники, а сижу на игрушечном стуле… Но если мои пилоты узнают — засмеют в сухом доке!',
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
                'show scene lab with fadeIn duration 1s',
                'show character splash normal at left with fadeIn',
                'splash Привет… Я… чувствую… ритм… твоего… сердца…',
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
            ]
        });
        function boot () {
            var validation = vn.validateStorage(STORAGE_SCHEMA, { repair: true });
            if (validation.isErr()) { console.error('[FailSafe] storage check:', validation.error); }
            var lint = vn.lintScript({ silent: true });
            if (!lint.ok) { console.error('[FailSafe] script lint:', lint.issues); }
            wireArchives();
            engine.init('#vn-root').then(updateHUD).catch(function (err) { console.error('Monogatari init error:', err); });
        }
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
    }());
}
