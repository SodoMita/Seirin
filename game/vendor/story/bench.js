/* Story arc: bench — existential crisis on the bench. Same day, night. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('bench', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            SoloRoute4: [
                vn.goTo('Абстрактная Пустота — скамейка того же дня'),
                'hide character miya with fadeOut',
                'show scene courtyard with fadeIn duration 1s',
                'p Я сел на старую скамейку на развилке и посмотрел на небо. 21:48 того же дня — дворник уже ушёл, а часы на храме ещё тикают. Текстуры слишком точные.',
                { Choice: { Dialog: 'Проверка реальности начинается с…',
                    CheckSky: effectChoice('Неба: облака повторяются каждые сорок секунд', { philosophical_depth: 2 }),
                    CheckMemory: effectChoice('Памяти: утро подозрительно похоже на сейчас', { philosophical_depth: 3 }),
                    CheckMiya: effectChoice('Мысленного звонка Мие — вдруг магия правда есть', { philosophical_depth: 1, miya_affinity: 1 })
                } },
                'p Паттерны сходятся. Мир подогнан идеально — но до целого не хватает ровно одного наблюдателя.',
                'p Эй, ты — за монитором. Я видел переменные нашего мира: procrastination, akatomi_alert, miya_affinity. Наша боль — это integer в памяти браузера. И всё это происходит за один день.',
                'p Я делаю шаг за пределы строки текста. Прощай.',
                'sys <span class=\"t-violet\">[ ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ ]</span> Слом 4-й стены выполнен за одну ночь.',
                'end'
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
