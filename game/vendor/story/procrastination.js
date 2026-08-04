/* Story arc: procrastination. Loaded before game.js; receives engine helpers only at boot. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('procrastination', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            SoloRoute1: [
                vn.goTo('Квартира: Комната'),
                'hide character miya with fadeOut',
                'show scene workshop with fadeIn duration 1s',
                'p Дома. Два оборота замка, щёлк щеколды, жалюзи вниз. Комната гаснет ровно наполовину — как аквариум, где я сам себе рыба.',
                'p На столе — разобранный накопитель «Титана-04» и связка ключей от «Стрижа». Рейка велела собрать к понедельнику. Понедельник далеко. Диван близко.',
                { Choice: { Dialog: 'Перед тем как исчезнуть в вечере, можно сделать один крошечный ритуал:',
                    Water: effectChoice('Налить воды и поставить её рядом с инструментами', { philosophical_depth: 1 }),
                    Timer: effectChoice('Поставить таймер на десять минут — без обещаний', { procrastination: 1 }),
                    Curtain: effectChoice('Закрыть жалюзи и отменить внешний мир', { procrastination: 2 })
                } },
                { Choice: { Dialog: 'Вечер распадается на маленькие, очень убедительные «потом»:',
                    CouchMarathon: routeChoice('Открыть ленту «на пять минут»', 'Solo1LoopEnd', { procrastination: 8 }),
                    CouchNap: routeChoice('Поставить будильник и уснуть «на один цикл»', 'Solo1LateRunEnd', { procrastination: 4 }),
                    CouchBench: routeChoice('Взять одну деталь «Титана» — просто посмотреть', 'Solo1Radio', { procrastination: 1, philosophical_depth: 1 })
                } }
            ],
            Solo1LoopEnd: [
                vn.goTo('Квартира: Лента без конца'),
                'show scene workshop with fadeIn duration 1s',
                'p Лента сама подсовывает следующее видео, ещё одно, ещё. У каждого — идеальная длина, чтобы не начинать ничего настоящего.',
                'p Рассвет приходит в виде уведомления: «Вы посмотрели 418 эпизодов чужой жизни». Накопитель так и лежит раскрытым, как недочитанное письмо.',
                vn.reversible({ akatomi_alert: 15 }),
                'sys <span class="t-red">[ ФИНАЛ ПРОКРАСТИНАЦИИ · ЛЕНТА ДО СЛЕДУЮЩЕЙ ВЕРСИИ ]</span> Город менялся, пока палец листал экран.',
                'end'
            ],
            Solo1LateRunEnd: [
                vn.goTo('Квартира: Серый рассвет'),
                'show scene workshop with fadeIn duration 1s',
                'p Будильник звенит. Я выключаю его с первой попытки — слишком опытен в маленьких капитуляциях.',
                'p К куполу я бегу уже на рассвете, с одной собранной деталью в кармане и извинением, которое не успевает за мной.',
                'sys <span class="t-amber">[ ФИНАЛ ПРОКРАСТИНАЦИИ · ПОЗДНИЙ СТАРТ ]</span> Ты вышел из комнаты. Но город уже сделал ход без тебя.',
                'end'
            ],
            Solo1Radio: [
                vn.goTo('Квартира: Частота 103.7'),
                'show scene workshop with fadeIn duration 1s',
                'p Под слоем винтов лежит старый походный радиоприёмник. Я поворачиваю ручку — и сквозь белый шум проступает знакомая мелодия.',
                'show character radio normal at center with fadeIn',
                'radio <span class="radio-line">«…если вы слышите эту передачу, не обязаны улыбаться. Сделайте сегодня одну маленькую вещь для себя. Даже если она — всего один винт».</span>',
                'p Это голос Момо, но здесь нет Момо. Только дрожащая шкала, тёплая лампа и город за жалюзи. Значит, она тоже говорит не из безопасного места.',
                { Choice: { Dialog: 'Радио шипит, а накопитель ждёт ровно одного решения:',
                    StayTuned: routeChoice('Остаться слушать — чужая смелость тоже уютна', 'Solo1RadioEnd', { procrastination: 4 }),
                    OneBolt: routeChoice('Закрутить один винт и ответить действием', 'Solo1RepairEnd', { set: { procrastination: 1 }, momo_affinity: 1 })
                } }
            ],
            Solo1RadioEnd: [
                vn.goTo('Квартира: Эфир после полуночи'),
                'show scene workshop with fadeIn duration 1s',
                'show character radio normal at center with fadeIn',
                'radio <span class="radio-line">«…передача окончена. Берегите себя. И, пожалуйста, выключите автоплей».</span>',
                'p Я слушаю тишину после её голоса и обещаю начать завтра. Завтра звучит красиво именно потому, что никогда не наступает сейчас.',
                'sys <span class="t-violet">[ ФИНАЛ ПРОКРАСТИНАЦИИ · ЧУЖАЯ ПЕСНЯ, СВОЯ ПАУЗА ]</span> Сигнал был честным. Ответа не последовало.',
                'end'
            ],
            Solo1RepairEnd: [
                vn.goTo('Квартира: Один собранный узел'),
                'hide character radio with fadeOut',
                'show scene workshop with fadeIn duration 1s',
                'p Один винт. Потом второй. Накопитель щёлкает, и на панели «Титана» загорается крошечный зелёный огонёк — не победа, а направление.',
                'p Я открываю жалюзи. Город всё ещё огромен, тревожен и не починен. Зато на моём столе больше нет ни одной вещи, которая ждёт меня в одиночестве.',
                vn.reversible({ flags: { happy_ending_achieved: true } }),
                'sys <span class="t-cyan">[ ФИНАЛ ПРОКРАСТИНАЦИИ · МАЛЕНЬКИЙ ХОД ]</span> Не героизм. Один законченный винт — и рассвет уже другой.',
                'end'
            ],
            SoloRoute2: [
                vn.goTo('Тэцуба: клуб «Null-Point»'),
                'hide character miya with fadeOut',
                'show scene port with fadeIn duration 1s',
                'p В «Нулл-Пойнте» под ржавыми сводами порта никогда не бывает солнца. Бас продавливается сквозь подошвы, а вместо рассвета здесь неон.',
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
                'sys <span class="t-red">[ ГОРОДСКАЯ НОТА ]</span> Решётка Резонанса: тест нагрузки 27%. Бас в клубе вздрагивает точно в такт. Никто не заметил. Ты — заметил.',
                vn.reversible({ procrastination: 10 }),
                'p Месяцы слились в шум, головную боль и звон в ушах. Когда за клубом пришли патрули Акатоми, никто из нас даже не смог встать со скамеек.',
                'sys <span class="t-red">[ ТРАГИЧЕСКИЙ ФИНАЛ ]</span> Маршрут: клуб → грузовик → Шельф-4.',
                'end'
            ],
            SoloRoute3: [
                vn.goTo('Башня Акатоми: 84 этаж'),
                'hide character miya with fadeOut',
                'show scene tsukimachi with fadeIn duration 1s',
                'p Лифт башни Акатоми несёт меня мимо этажей, куда мой гостьевой бейдж не пропустит никогда. В кабине пахнет озоном и чужими амбициями.',
                'p Контракт в конверте — сразу два места: клавиатура драйвера подачи инфразвука… и курсантский купол нового «Опекуна-9» в ангаре минус второго этажа. Восемь тысяч кредитов в неделю. Рот здесь открывают только за обедом.',
                { Choice: { Dialog: 'Как пройдёт твоя первая неделя в башне?',
                    TaskPerfect: effectChoice('Оптимизировать драйвер до блеска — премия важнее', { akatomi_alert: 3 }),
                    TaskQuestions: effectChoice('Спросить наставника, зачем городу инфразвук', { philosophical_depth: 2, akatomi_alert: 5 }),
                    TaskLogger: effectChoice('Вшить в код тихий журнал всех команд', { philosophical_depth: 3 })
                } },
                'p Мой код был безупречен. Подача стала мягче, покрытие — ровнее, улыбки дикторов внизу — длиннее. Квартальный бонус пришёл раньше срока.',
                vn.reversible({ flags: { met_kurogane: true } }),
                'show character kurogane normal at center with fadeIn',
                'kurogane Отличная работа, молодой человек! Посмотрите вниз: все слушают нашу музыку и не задают вопросов. Вы богаты, успешны и защищены. А «Опекун» под вашими руками — самый изящный жест в моём арсенале.',
                'p Миллионы на счетах, панорамный купол с видом на океан… и застывший город внизу, где люди ходят, как марионетки. Я выиграл право летать — в клетке, которую собрал собственными руками.',
                'sys <span class="t-red">[ ЗОЛОТАЯ КЛЕТКА ]</span> Личный успех. Глобальный результат — тот же, что и при прокрастинации.',
                'end'
            ],
            SoloRoute4: [
                vn.goTo('Абстрактная Пустота'),
                'hide character miya with fadeOut',
                'p Я сел на старую скамейку на развилке и посмотрел на небо. Текстуры слишком точные. Откуда-то из-за пределов слышен стук клавиш.',
                { Choice: { Dialog: 'Проверка реальности начинается с…',
                    CheckSky: effectChoice('Неба: облака повторяются каждые сорок секунд', { philosophical_depth: 2 }),
                    CheckMemory: effectChoice('Памяти: вчера подозрительно похоже на сегодня', { philosophical_depth: 3 }),
                    CheckMiya: effectChoice('Мысленного звонка Мие — вдруг магия правда есть', { philosophical_depth: 1, miya_affinity: 1 })
                } },
                'p Паттерны сходятся. Мир подогнан идеально — но до целого не хватает ровно одного наблюдателя.',
                'p Эй, ты — за монитором. Я видел переменные нашего мира: procrastination, akatomi_alert, miya_affinity, momo_affinity. Наша боль — это integer в памяти браузера.',
                'p Я делаю шаг за пределы строки текста. Прощай.',
                'sys <span class="t-violet">[ ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ ]</span> Слом 4-й стены выполнен.',
                'end'
            ],
            SoloRoute5: [
                vn.goTo('Тэцуба: заброшенный додзё'),
                'hide character miya with fadeOut',
                'show scene dojo with fadeIn duration 1s',
                'p Никто не пойдёт со мной — и не надо. Паяльник, самодельный ЭМИ-заряд, схема девятой подстанции. Я справлюсь один.',
                'p В старом додзё пахнет татами и озоном. Когда-то здесь учили падать. Сегодня я учусь не попадаться.',
                'p «Титана» не взять: ангар на тройном замке, а Рейке снится каждый мой вдох в куполе. Сегодня моя броня — рюкзак, паяльник и тормозной парашют от «Стрижа».',
                { Choice: { Dialog: 'Последняя проверка снаряжения. Что важнее?',
                    PrepCharges: effectChoice('Тройной запас ЭМИ-зарядов', { akatomi_alert: 2 }),
                    PrepSchedule: effectChoice('Ещё раз сверить расписание патрулей', { philosophical_depth: 2 }),
                    PrepWrench: effectChoice('Разводной ключ из дока Рейки — талисман', { philosophical_depth: 1 })
                } },
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
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
