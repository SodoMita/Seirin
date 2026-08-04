/* Story arc: club — port club Null-Point. One night, same day as prologue (21:00-04:00). */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('club', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            SoloRoute2: [
                vn.goTo('Тэцуба: клуб «Null-Point»'),
                'hide character miya with fadeOut',
                'show scene port with fadeIn duration 1s',
                'p В «Нулл-Пойнте» под ржавыми сводами порта никогда не бывает солнца. Бас продавливается сквозь подошвы, а вместо рассвета здесь неон. Сегодня — та же ночь, что и моё утро во дворе. Часы на стене показывают 22:14.',
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
                'sys <span class=\"t-red\">[ ГОРОДСКАЯ НОТА ]</span> Решётка Резонанса: тест нагрузки 27%. Бас в клубе вздрагивает точно в такт. Никто не заметил. Ты — заметил.',
                'p На пульте у диджея мигает незнакомая фиолетовая дорожка. Слишком ровная для музыки, слишком настойчивая для случайности.',
                { Choice: { Dialog: 'Когда бас начинает совпадать с пульсом — а сегодня ночь одного дня, до рассвета часов пять — ты выбираешь:',
                    DanceAway: routeChoice('Раствориться в танце до самого закрытия', 'Solo2DriftEnd', { procrastination: 10 }),
                    MuteIt: routeChoice('Попросить Кайто выключить фиолетовую дорожку хотя бы на минуту', 'Solo2MuteEnd', { philosophical_depth: 2 }),
                    WalkOut: routeChoice('Выйти на воздух и позвонить Рейке, пока ещё можешь говорить прямо', 'Solo2CallEnd', { set: { procrastination: 2 }, akatomi_alert: 3 })
                } }
            ],
            Solo2DriftEnd: [
                vn.goTo('Тэцуба: клуб, после закрытия'),
                'show scene port with fadeIn duration 1s',
                'p Время становится басовой линией: повторяется. Я не замечаю, как Кайто перестаёт шутить, а за окнами светлеет — это уже рассвет того же дня, 04:40.',
                'p Когда за клубом приходят патрули Акатоми, никто из нас даже не может встать со скамеек. Мы так долго откладывали выход, что выход пришёл сам.',
                'sys <span class=\"t-red\">[ ФИНАЛ СОЛО II · ТАНЕЦ НА МЕСТЕ ]</span> Маршрут: клуб → грузовик → Шельф-4.',
                'end'
            ],
            Solo2MuteEnd: [
                vn.goTo('Тэцуба: тихий танцпол'),
                'show scene port with fadeIn duration 1s',
                'kaito Одну минуту тишины? В клубе? Ты умеешь испортить вечер как настоящий инженер.',
                'p Кайто всё-таки сдвигает фейдер. На секунду танцпол слышит себя: дыхание, каблуки, дождь по крыше. Потом публика начинает хлопать — не в ритм, а потому что снова может выбрать свой.',
                'p Мы не спасли город. Но фиолетовая дорожка больше не умеет прятаться в шуме.',
                'sys <span class=\"t-violet\">[ ФИНАЛ СОЛО II · МИНУТА ТИШИНЫ ]</span> Привычка отступила ровно настолько, чтобы её заметили.',
                'end'
            ],
            Solo2CallEnd: [
                vn.goTo('Тэцуба: причал перед рассветом'),
                'hide character kaito with fadeOut',
                'show scene port with fadeIn duration 1s',
                'p Снаружи холодно, и это помогает: холод не обещает ничего на завтра. Он просто есть сейчас — 02:11 той же ночи.',
                'show character radio normal at center with fadeIn',
                'p Из динамика шлема щёлкает помеха. Я называю частоту, время и цвет дорожки.',
                'radio <span class=\"radio-line\">[РЕЙКА · ДОК 04] Принято. Возвращайся домой. И, Рэн… спасибо, что позвонил до того, как решил всё переждать.</span>',
                vn.reversible({ flags: { happy_ending_achieved: true, met_reika: true } }),
                'sys <span class=\"t-cyan\">[ ФИНАЛ СОЛО II · ЗВОНОК ДО РАССВЕТА ]</span> Не каждый шаг должен быть большим, чтобы стать выходом.',
                'end'
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
