/* Story arc: miya. Loaded before game.js; receives engine helpers only at boot. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('miya', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
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
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
