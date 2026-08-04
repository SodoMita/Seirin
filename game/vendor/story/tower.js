/* Story arc: tower — corporate freelance at Akatomi tower. Same day 21:00-06:00. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('tower', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            SoloRoute3: [
                vn.goTo('Башня Акатоми: 84 этаж'),
                'hide character miya with fadeOut',
                'show scene tsukimachi with fadeIn duration 1s',
                'p Лифт башни Акатоми несёт меня мимо этажей, куда мой гостьевой бейдж не пропустит никогда. 22:03 — сегодня та же ночь, что и утро во дворе. В кабине пахнет озоном и чужими амбициями.',
                'p Контракт в конверте — ночная смена отладки драйвера подачи инфразвука. Восемь тысяч кредитов за ночь. Рот здесь открывают только за обедом.',
                { Choice: { Dialog: 'Как пройдёт твоя ночь в башне?',
                    TaskPerfect: effectChoice('Оптимизировать драйвер до блеска — премия важнее', { akatomi_alert: 3 }),
                    TaskQuestions: effectChoice('Спросить наставника, зачем городу инфразвук ночью', { philosophical_depth: 2, akatomi_alert: 5 }),
                    TaskLogger: effectChoice('Вшить в код тихий журнал всех команд', { philosophical_depth: 3 })
                } },
                'p Мой код был безупречен. Подача стала мягче, покрытие — ровнее. К 03:40 квартальный бонус пришёл сообщением: «Отлично».',
                vn.reversible({ flags: { met_kurogane: true } }),
                'show character kurogane normal at center with fadeIn',
                'kurogane Отличная работа, молодой человек! Посмотрите вниз: все слушают нашу музыку и не задают вопросов. Вы богаты, успешны и защищены сегодня ночью.',
                'p Вид на океан, город внизу застывший, как будто кто-то нажал паузу. Я выиграл право летать — в клетке, которую собрал за одну ночь собственными руками.',
                'sys <span class=\"t-red\">[ ЗОЛОТАЯ КЛЕТКА ]</span> Личный успех. Глобальный результат — тот же, что и при прокрастинации. И всё это — за один день.',
                'end'
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
