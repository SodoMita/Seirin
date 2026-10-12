/* Story arc: hana — the witness on the other end of the bench. Branches off
 * bench.js (SoloRoute4) through a routeChoice. Loaded before game.js; receives
 * engine helpers only at boot. Hana is 13: she observes and testifies, she is
 * never a combatant, and nothing here pressures her into anything. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('hana', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            HanaRoute: [
                vn.goTo('Сэйрин: скамейка у храма'),
                'show scene courtyard with fadeIn duration 1s',
                'p Я повернулся к дальнему концу скамейки. Там сидела девочка, и её платье меняло цвет от холода: синий у колен, бледно-розовый там, где её касался фонарь. Хана Сироясики. В новостях её называли «волшебницей». Она смотрела не на меня, а на часы на храме.',
                'hana Ты тоже заметил. Стрелка стоит, а небо повторяется. Я считаю облака. Считать — единственное, что у меня получается, когда голова становится ватной.',
                'p Голос у неё ровный, почти как у диктора. Только пальцы сжимают край скамейки так крепко, что побелели костяшки.',
                { Choice: { Dialog: 'Что ответить девочке, которая считает облака?',
                    AskGently: effectChoice('Спросить мягко: «Кто из взрослых знает, что ты сейчас здесь?»', { philosophical_depth: 1 }),
                    PlayMagic: effectChoice('Пошутить: «Ты правда останавливаешь время? Покажи трюк»', { procrastination: 2 }),
                    Honest: effectChoice('Честно: «Не знаю, что здесь происходит. Но одна ты с этим не останешься»', { philosophical_depth: 2 })
                } },
                'hana Папа пытался увести нас оттуда. Он говорил, что магия — это просто внимание, направленное в нужную сторону. После этого я не могу вспомнить несколько недель. Не всё — только куски.',
                'p Хана кивает на ворота храма. Там стоит женщина в сером пальто и машет рукой: «Хана, десять минут — и домой».',
                { Choice: { Dialog: 'Хана тихо спрашивает: «Ты поможешь рассказать правду — или просто посмотришь, как она бывает красивой?»',
                    ToGuardian: routeChoice('Пойти вместе к опекунше и рассказать всё по порядку, с временными метками', 'HanaEndingWitness',
                        { philosophical_depth: 2, flags: { magic_rejected: true } }),
                    StayMyth: routeChoice('Остаться на скамейке и ждать «знамения» — пусть чудо решит за всех', 'HanaEndingMyth',
                        { procrastination: 4 })
                } }
            ],
            HanaEndingWitness: [
                vn.goTo('Сэйрин: ворота храма'),
                'show scene cathedral with fadeIn duration 1s',
                vn.reversible({ flags: { magic_rejected: true, happy_ending_achieved: true } }),
                'hana Я записала всё: 21:48, 21:49, сорок секунд между одними и теми же облаками. Это не магия. Это мои часы.',
                'p Опекунша взяла листок, прочитала первую строку и на секунду закрыла глаза. Потом набрала номер адвоката — того, кому доверяет сама Хана. Показания будут только после консультации с ним.',
                'p Ты стоял рядом и понимал: настоящее чудо здесь — не остановленное время, а взрослые, которые наконец услышали.',
                'sys <span class=\"t-cyan\">[ ФИНАЛ ХАНЫ — СВИДЕТЕЛЬСТВО БЕЗ МИФА ]</span> Записи переданы опекунам. Показания — только после консультации с адвокатом.',
                'end'
            ],
            HanaEndingMyth: [
                vn.goTo('Сэйрин: скамейка у храма'),
                'hana Тогда подожди со мной. Часы пробьют — и всё станет как раньше. А может, и нет.',
                'p Она больше не считает облака. Она смотрит на тебя так, как смотрят на того, кому передали тайну — тайну, которая не по силам ни одному из вас.',
                'p Через квартал у храма собирались люди с фонариками «Хора Бездны». Они обещали простые ответы и «очищение». Хана потянулась к их свету — и не отдёрнула руку.',
                'sys <span class=\"t-violet\">[ ФИНАЛ ХАНЫ — ТЁМНАЯ СИЛА ПО ПРИГЛАШЕНИЮ ]</span> Миф победил тихо. Девочка осталась без взрослых, которым можно доверять.',
                'end'
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
