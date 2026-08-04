/* anime_gacha — Honkai Impact, Star Rail, Genshin, rhythm games, bullet hell Touhou, other anime games. Linear. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('anime_gacha', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            AnimeGacha_Start: [
                vn.goTo('Квартира: Гача — старт — 01:27'),
                'show scene workshop with fadeIn duration 1s',
                'p 01:27 одного дня. После цикад — гача. Видео: нарезка пуллов Star Rail, крик «Броня С-ранг!». Я не крутил сегодня, но смотрю, как другие крутят, и получаю дофамин за них.',
                { Choice: { Dialog: '',
                    GachaHI: routeChoice('Honkai Impact 3rd — последний урок', 'AnimeGacha_HI', { procrastination: 2, philosophical_depth: 2 })
                } }
            ],
            AnimeGacha_HI: [
                vn.goTo('Квартира: Honkai Impact — 01:30'),
                'show scene workshop with fadeIn duration 1s',
                'p Honkai Impact 3rd. Сцена: Киана, «последний урок», Химеко.   последний урок — это как контакт к 06:00. Ты должен отдать что-то, чтобы другие полетели.',
                'p Сцена: Кевин, проект Stigma.   Акатоми — как проект Stigma — хочет всех в один сон, чтобы не было боли. Я тоже хочу в сон — в ленту.',
                'p Сцена: Эйлизия и 13 предвестников.   13 предвестников — как 22 вкладки. Много, красиво, и всех жалко удалять.',
                { Choice: { Dialog: '',
                    GachaSR: routeChoice('Star Rail — гача и билеты', 'AnimeGacha_SR', { procrastination: 2 })
                } }
            ],
            AnimeGacha_SR: [
                vn.goTo('Квартира: Star Rail — 01:35'),
                'show scene workshop with fadeIn duration 1s',
                'p Star Rail. Сцена: крутка, 10 билетов, последний — золото.   гача — это прокрастинация, которая продаёт тебе надежду за клик. Как лента — ещё одно видео, ещё один тик.',
                'p Сцена: Броня, Зеле, история Белобога.   Белобог — как мой квартал — замерз, потому что кто-то закрыл отопление (Решётка). И надо идти и включить, но я кручу баннер.',
                'p Сцена: Клара и Сварог.   робот, который защищает ребёнка. Как Титан должен защищать город, а я не собрал ему контакт.',
                { Choice: { Dialog: '',
                    GachaGenshin: routeChoice('Genshin и прочие аниме-игры', 'AnimeGacha_Genshin', { procrastination: 1 })
                } }
            ],
            AnimeGacha_Genshin: [
                vn.goTo('Квартира: Genshin и аниме-игры — 01:41'),
                'show scene workshop with fadeIn duration 1s',
                'p Genshin Impact, Persona, Danganronpa, Ace Attorney — всё аниме-игры.   в каждой — ты главный, но с условием — гриндить. Гриндить — как чистить Загрузки: делаешь много, а толку — один кристалл.',
                'p Сцена из Persona 5: кража сердца.   я бы украл своё собственное сердце прокрастинации и вернул бы его себе в 21:07.',
                { Choice: { Dialog: '',
                    GachaRhythm: routeChoice('Ритм-игры и bullet hell', 'AnimeGacha_Rhythm', { procrastination: 2 })
                } }
            ],
            AnimeGacha_Rhythm: [
                vn.goTo('Квартира: Ритм и пули — 01:47'),
                'show scene workshop with fadeIn duration 1s',
                'p Ритм-игры: Arcaea, Cytus, Bandori, Project Sekai. Сцена: ноты падают, надо попасть в такт.   ритм-игра — это анти-прокрастинация: надо жать сейчас, а не потом. Если опоздал — miss. Как контакт к 06:00 — miss, и всё.',
                'p Bullet hell: Touhou, Reimu, Marisa, «гразинг». Сцена: 200 пуль, маленькая точка — ты.   как мой день — 200 дел-отвлечений, маленькая точка — я с отвёрткой. Надо пролетать между, не задевая, но я задеваю всё.',
                'p Сцена: perfect run Touhou на lunatic.   идеальный ран — как идеальный день без прокрастинации. Возможен, но требует 1000 попыток. У меня одна попытка до 06:00.',
                { Choice: { Dialog: '',
                    GachaToFandom: routeChoice('Дальше — косплей, мерч, фандом, песни', 'AnimeFandom_Start', { procrastination: 2 })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
