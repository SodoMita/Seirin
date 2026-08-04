/* anime_key — thoughts about VNs by Key: Clannad, Kanon, Air, Little Busters, Rewrite, Summer Pockets. Linear. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('anime_key', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            AnimeKey_Start: [
                vn.goTo('Квартира: Key — старт — 02:32'),
                'show scene workshop with fadeIn duration 1s',
                'p 02:32 одного дня. После Навсикаи алгоритм кидает в Key. Не включаю ВН целиком — 40 часов каждая, один день не резиновый. Листаю VNDB, открываю несколько сцен на ютубе, читаю чужие слёзы.',
                'p Превью: девочка в дождь, «додзё музыки нет, есть чай». Я уже в пледе, уже в том же настроении, но только обсуждаю, не играю.',
                { Choice: { Dialog: '',
                    KeyClannad: routeChoice('Clannad — Нагиса и дождь', 'AnimeKey_Clannad', { philosophical_depth: 2, procrastination: 2 })
                } }
            ],
            AnimeKey_Clannad: [
                vn.goTo('Квартира: Clannad — 02:35'),
                'show scene workshop with fadeIn duration 1s',
                'p Clannad. Сцена: Нагиса с хлебом, говорит «…да?». Сцена с отцом, сцена с ребёнком Ушио.   Clannad — аниме про то, как один день становится семьёй, а семья — временем. Я прокрастинирую один день, а тут — годы в 22 минуты.',
                'p Сцена: Томоя прокрастинирует школу, пока не встречает Нагису.   как я — пока не встретил Момо на 103.7, я тоже прокрастинировал школу жизни.',
                'p   Key любит заставлять плакать из-за мелочи — булочка, фонарь. Я плачу из-за винта, который не закрутил. Тоже мелочь, но — моя.',
                { Choice: { Dialog: '',
                    KeyKanon: routeChoice('Kanon — снег и обещания', 'AnimeKey_Kanon', { procrastination: 1 })
                } }
            ],
            AnimeKey_Kanon: [
                vn.goTo('Квартира: Kanon — 02:39'),
                'show scene workshop with fadeIn duration 1s',
                'p Kanon. Сцена: Юичи возвращается в город, где забыл обещания. Снег, девочка с крылышками, «угу».   я тоже вернулся в свою квартиру, где забыл обещание — собрать контакт к 06:00.',
                'p Сцена, где Аю теряет варежку.   терять варежки — как терять винты. Мелочь, но после — холодно.',
                { Choice: { Dialog: '',
                    KeyAir: routeChoice('Air — лето и крылья', 'AnimeKey_Air', { procrastination: 1 })
                } }
            ],
            AnimeKey_Air: [
                vn.goTo('Квартира: Air — 02:42'),
                'show scene workshop with fadeIn duration 1s',
                'p Air. Сцена: Мисудзу на берегу, «время летит», лето, цикады.   Air — про то, что лето кончается всегда в один день. Как мой день — кончается в 06:00, а я всё ещё в пледе.',
                'p Сцена с вороной.   у меня тоже есть ворон — это будильник, который я выключаю не просыпаясь.',
                { Choice: { Dialog: '',
                    KeyLB: routeChoice('Little Busters! — бейсбол и дружба', 'AnimeKey_LB', { procrastination: 1 })
                } }
            ],
            AnimeKey_LB: [
                vn.goTo('Квартира: LB! — 02:46'),
                'show scene workshop with fadeIn duration 1s',
                'p Little Busters! Сцена: Рики и Рин, бейсбол, «завтра тоже будем вместе».   они создают команду, чтобы не быть одному против мира. Я не создаю — поэтому один против накопителя и проигрываю.',
                'p Сцена рефрена — они уже взрослые, вспоминают.   я тоже буду вспоминать этот день как «тот день, когда я смотрел Key вместо контакта».',
                { Choice: { Dialog: '',
                    KeyRewrite: routeChoice('Rewrite — дерево и конец света', 'AnimeKey_Rewrite', { procrastination: 1 })
                } }
            ],
            AnimeKey_Rewrite: [
                vn.goTo('Квартира: Rewrite — 02:50'),
                'show scene workshop with fadeIn duration 1s',
                'p Rewrite. Сцена: Котаро переписывает себя.   переписать себя — как отформатировать рабочий стол и надеяться, что накопитель соберётся сам.',
                'p Сцена с Кагари: «найди хорошее воспоминание».   моё хорошее воспоминание сегодня — щелчок винта, который ещё не произошёл.',
                { Choice: { Dialog: '',
                    KeySP: routeChoice('Summer Pockets — остров и лето', 'AnimeKey_SP', { procrastination: 1 })
                } }
            ],
            AnimeKey_SP: [
                vn.goTo('Квартира: Summer Pockets — 02:54'),
                'show scene workshop with fadeIn duration 1s',
                'p Summer Pockets. Сцена: остров, цикады, девочка в белом, обещание на лето.   лето — как один день, только длиннее. И там тоже прокрастинируют, только с морем.',
                'p Итог Key: все их ВН — про то, что время — ресурс, который тратишь на мелочи, а потом плачешь, потому что мелочь стала важной. Как я с 21:07 до 02:54 одного дня.',
                { Choice: { Dialog: '',
                    KeyToCicada: routeChoice('Дальше — цикады, когда плачут', 'AnimeCicada_Start', { procrastination: 2 })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
