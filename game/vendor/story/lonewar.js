/* Story arc: lonewar — lone fighter against corp, same night. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('lonewar', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            SoloRoute5: [
                vn.goTo('Тэцуба: заброшенный додзё'),
                'hide character miya with fadeOut',
                'show scene dojo with fadeIn duration 1s',
                'p Никто не пойдёт со мной — и не надо. Паяльник, самодельный ЭМИ-заряд, схема девятой подстанции. Сегодня — та же ночь, 22:30, до рассвета шесть часов.',
                'p В старом додзё пахнет татами и озоном. Когда-то здесь учили падать. Сегодня я учусь не попадаться.',
                'p «Титана» не взять: ангар на тройном замке, а Рейке снится каждый мой вдох в куполе. Сегодня моя броня — рюкзак и тормозной парашют от «Стрижа».',
                { Choice: { Dialog: 'Последняя проверка снаряжения. Что важнее за одну ночь?',
                    PrepCharges: effectChoice('Тройной запас ЭМИ-зарядов', { akatomi_alert: 2 }),
                    PrepSchedule: effectChoice('Ещё раз сверить расписание патрулей за сегодня', { philosophical_depth: 2 }),
                    PrepWrench: effectChoice('Разводной ключ из дока Рейки — талисман', { philosophical_depth: 1 })
                } },
                { Choice: { Dialog: 'Как действовать ночью одного дня?',
                    NightStrike: effectChoice('Ударить по подстанции 09 уже этой ночью', { akatomi_alert: 30 }),
                    Observe: effectChoice('Час изучать графики патрулей и релейных узлов', { akatomi_alert: 5, procrastination: 2 })
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
                'show scene lab with fadeIn duration 1s',
                'p Ночью я пошёл на прорыв. Турели «Опекун-9» уже ждали — мой маршрут был просчитан за сутки до меня. 01:15 той же ночи.',
                'sys <span class=\"t-red\">[ ЛОВУШКА №1: ЗАХВАЧЕН ]</span> Одиночная война против системы — не геройство, а ошибка.',
                'end'
            ],
            Solo5Standoff: [
                vn.goTo('Подстанция 09'),
                'show scene lab with fadeIn duration 1s',
                'p Час наблюдений дал мне двадцать три минуты слепой зоны. Я вывел из строя один релейный узел и ушёл до прихода патрулей. Один узел из двухсот.',
                'p Один — не армия. Но я уже не смогу остановиться. И всё это — за одну ночь одного дня.',
                'sys <span class=\"t-violet\">[ НИЧЬЯ ]</span> Без союзников победа невозможна; борьба продолжается.',
                'end'
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
