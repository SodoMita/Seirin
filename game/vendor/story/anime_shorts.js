/* Story arc: anime_shorts — ONE video in feed triggers whole anime evening. Linear, no branching. Same day. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('anime_shorts', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            AnimeShorts_Init: [
                vn.goTo('Квартира: Лента — одно видео'),
                'show scene workshop with fadeIn duration 1s',
                vn.setTime(1347),
                'p {{player.time_hhmm}} того же дня. Я листал ленту про пайку и Титана, и алгоритм впервые за вечер сделал не «ещё одно такое же», а «вот тебе одно — другое». Одно видео в ленте среди паяльников.',
                'p Превью: тёмная комната, плед, пар от рамена, на экране — «Фрирен смотрит на звёзды». Заголовок: «Идеальный аниме-вечер за один день: чай, рамен, плед и опенинги». 19 минут. Не шортс, а эссе.',
                'p Я должен пролистать. Я не пролистываю. Палец завис, как будто видео — тоже винт, только мягкий.',
                'p Нажимаю. Не потому что хочу аниме. Потому что хочу, чтобы кто-то уже решил за меня, как провести вечер. Видео решает.',
                { Choice: { Dialog: 'Одно видео в ленте. Один клик. Один вечер:',
                    OneVideo: routeChoice('Нажать — «один ролик и вернусь»', 'AnimeComfort_Start', { procrastination: 5, philosophical_depth: 1 })
                } }
            ],
            AnimeShorts_PhoneInit: [
                vn.goTo('Квартира: Телефон — одно видео'),
                'show scene workshop with fadeIn duration 1s',
                vn.setTime(1347),
                'p {{player.time_hhmm}}. Телефон. Среди бесконечных шортсов — одно длинное видео, застряло в ленте, как будто алгоритм ошибся: «Собери аниме-вечер без стыда: рамен, плейлист, косплей из шкафа».',
                'p Я хотел закрыть. Но там — кадр с Кианой из Honkai, которая говорит «последний урок». И я уже внутри.',
                { Choice: { Dialog: '',
                    OneVideoPhone: routeChoice('Открыть — одно видео, потом точно работа', 'AnimeComfort_Start', { procrastination: 5 })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
