/* anime_nausicaa — thoughts about Nausicaa of the Valley of the Wind. Linear. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('anime_nausicaa', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            AnimeNausicaa_Start: [
                vn.goTo('Квартира: Навсикая — старт — 00:31'),
                'show scene workshop with fadeIn duration 1s',
                'p 00:31 одного дня. Алгоритм кидает нарезку Навсикаи. Я не включаю фильм целиком — 117 минут сейчас не влезут. Листаю арты, пару сцен из ютуба, тред о концовке.',
                'p Уже видел раньше, сейчас просто вспоминаю и обсуждаю с собой, пока чай стынет. Это не просмотр, это — перебор в голове.',
                { Choice: { Dialog: '',
                    Nausicaa1: routeChoice('Сцена 1 — маска и споры', 'AnimeNausicaa_Spores', { philosophical_depth: 2 })
                } }
            ],
            AnimeNausicaa_Spores: [
                vn.goTo('Квартира: Навсикая — споры — 00:34'),
                'show scene workshop with fadeIn duration 1s',
                'p Сцена: Навсикая в маске в Лесу, споры.   маска — как жалюзи в моей квартире. Я закрыл жалюзи, чтобы не вдыхать город. Она закрыла, чтобы не вдыхать яд Леса. Оба фильтруем.',
                'p Сцена: она снимает маску для ребёнка.   снять маску — как выключить автоплей. Страшно вдохнуть, но иначе не спасти.',
                { Choice: { Dialog: '',
                    Nausicaa2: routeChoice('Ому и ребёнок', 'AnimeNausicaa_Omu', { philosophical_depth: 1 })
                } }
            ],
            AnimeNausicaa_Omu: [
                vn.goTo('Квартира: Ому — 00:37'),
                'show scene workshop with fadeIn duration 1s',
                'p Сцена: Ому, детёныш, раненный, Навсикая успокаивает.   Ому — как Титан-04. Большой, страшный, но ранится, если не собрать. Я — как Навсикая, только вместо песни — отвёртка.',
                'p Сцена: стадо Ому бежит.   стадо — как лента. Бежит, потому что боится, и давит всё. Остановить можно только став между — как она стала. Я не стал между лентой и накопителем.',
                { Choice: { Dialog: '',
                    Nausicaa3: routeChoice('Долина и ветер', 'AnimeNausicaa_Valley', { philosophical_depth: 1 })
                } }
            ],
            AnimeNausicaa_Valley: [
                vn.goTo('Квартира: Долина — 00:41'),
                'show scene workshop with fadeIn duration 1s',
                'p Сцена: долина ветров, где ветер очищает.   моя квартира — долина без ветров. Я закрыл жалюзи, ветер не входит. Проветрить — как один винт.',
                'p Сцена: люди долины против Тольмекии, война за ресурсы.   Акатоми — как Тольмекия — жжёт Лес, чтобы жить. Я — как житель долины, который смотрит и ничего не делает один день.',
                'p Финал: Навсикая идёт по полю, дети.   она не спасла мир за один день. Она прошла один день и не стала ядом. Может, мне достаточно не стать ядом для своего утра?',
                { Choice: { Dialog: '',
                    NausicaaToKey: routeChoice('Дальше — ВН Key', 'AnimeKey_Start', { procrastination: 2 })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
