/* Story arc: prologue. Loaded before game.js; receives engine helpers only at boot. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('prologue', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            Start: [
                vn.goTo('Тэцуба: Улица'),
                'show scene courtyard with fadeIn duration 1s',
                'sys <span class="t-cyan">[ СЭЙРИН: НОЧНАЯ СМЕНА — РЕЗОНАНС 2030 ]</span>',
                'p Дворник подметает свой метр асфальта у выхода на улочку. Как вчера. Как десять лет назад.',
                'p Мы никогда не разговаривали. Но он ловит мой взгляд и коротко кивает — как старому знакомому. В этом городе присутствие друг друга ещё не обесценили новости.',
                'p «Стриж» остался под аркой — двигатель ещё тёплый, характер уже тяжёлый. Завтра Рейка гоняет меня в учебном куполе «Титана-04» до вечера: четыре метра двадцать гидравлики спасательной платформы не прощают сонного пилота.',
                'miya Эй! Рэн-и-и! Смотреть вверх разрешено бесплатно!',
                'show character miya normal at left with fadeIn',
                'miya Ты опять тарахтел своим мотоциклом на весь двор! Дворник передал: «Пусть стрижи летают, а не тарахтят». А ещё — ты идёшь гулять без волшебной палочки! Стоять. Назначаю тебя хранителем обрядового мела.',
                'p Хранителем мела — у мага с пятилетним стажем спасательных операций? Доверяю.',
                'miya Рэн, а ты веришь в магию? Отвечай честно — это важно.',
                { Choice: { Dialog: 'Мия смотрит с третьего этажа очень серьёзно:',
                    Believe: effectChoice('Верю. Без магии вообще никак.', { miya_affinity: 2 }),
                    Skeptic: effectChoice('Верю в физику. Но мел пригодится.', { philosophical_depth: 2 }),
                    Meta: effectChoice('Я верю в статистику выбора.', { philosophical_depth: 2, miya_affinity: 1 })
                } },
                'miya Ответ принят и занесён в гримуар. И ещё! Если дворник закончит раньше, чем часы на храме пробьют восемь, — день начнётся заново.',
                'p В витрине радиолавки ведущая новостей улыбается чуть дольше, чем вообще умеют улыбаться люди. А уличный киоск зациклил одну и ту же строчку песни Момо Хосизоры — третий круг подряд.',
                vn.reversible({ akatomi_alert: 3 }),
                'sys <span class="t-red">[ ГОРОДСКАЯ НОТА ]</span> Решётка Резонанса: тест нагрузки 12%. Город ещё не заметил. Ты — заметил.',
                'sys <span class="t-cyan">[ НОЧНАЯ СМЕНА ]</span> До рассвета — одна попытка. Выбор маршрута её запускает.',
                { Choice: { Dialog: 'Развилка трёх улиц: порт, арена, чайный квартал, дом. Куда направиться?',
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
                        { set: { route: 'ai' }, ai_empathy: 5, flags: { met_splash: true, met_stella: true } }),
                    Momo: routeChoice('Прикатить на «Стриже» к арене — к голосу, который город слышит по контракту', 'MomoRoute',
                        { set: { route: 'momo' }, momo_affinity: 5, flags: { met_momo: true } })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
