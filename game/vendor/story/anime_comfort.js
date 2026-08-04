/* anime_comfort — snacks, atmosphere, playlist. Linear continuation of one video. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('anime_comfort', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            AnimeComfort_Start: [
                vn.goTo('Квартира: Аниме-вечер — старт — 22:29'),
                'show scene workshop with fadeIn duration 1s',
                vn.reversible({ set: { time: 1349 }, money: -40, storage: { 'player.items.ramen': { mode: 'delta', value: 1 }, 'player.items.tea': { mode: 'delta', value: 1 } } }),
                'p {{player.time_hhmm}} одного дня. Видео началось с простого: «Если хочется кайфануть — сделай японские снеки». И я вдруг понял, что у меня есть рис, нори, яйцо.',
                'p Автор в видео не говорит «собери Титан». Он говорит: «Сделай онигири». Это звучит выполнимо. И я иду на кухню — впервые за вечер не чтобы отложить, а чтобы сделать, но не то.',
                'p 22:34. Кухня. Варю рис. Рис — как пайка, только мягче. Леплю треугольник, руками, которые должны были держать отвёртку. Получается криво, но съедобно.',
                'p Пока рис липнет, ставлю чайник. Чай матча? Нету. Есть зелёный в пакетике. Делаю. Рядом — рамен из пачки с яйцом. Не данго, но тоже тёплое.',
                'p За 9 минут я сделал больше, чем за 2 часа с накопителем. Потому что онигири не требует быть идеальным. Прокрастинация любит идеальное, а онигири любит руки.',
                { Choice: { Dialog: 'Снеки готовы. Видео идёт дальше.',
                    ComfortNext: routeChoice('Дальше — про атмосферу вечера', 'AnimeComfort_Atmosphere', { procrastination: 2 })
                } }
            ],
            AnimeComfort_Atmosphere: [
                vn.goTo('Квартира: Аниме-атмосфера — 22:43'),
                'show scene workshop with fadeIn duration 1s',
                'p 22:43. Видео: «Устрой мини-марафон с пледом, выключенным светом и опенингами между сериями». Я выключаю верхний свет. Лампа настольная остаётся — как в куполе Титана ночью.',
                'p Беру плед — тот же, которым укрывался днём, когда «спал 20 минут». Теперь он — часть ритуала. Диван, который был местом прокрастинации, становится местом аниме.',
                'p Видео советует: «Опенинги не скипай». Я киваю. Опенинги — это маленькие ритуалы начала, как щелчок винта. Они говорят: «Сейчас начнётся».',
                'p За окном — тест Решётки 28% → 29%. Фиолетовая дымка. Но в комнате — только экран, рамен, онигири и я в пледе. Город одного дня отступает на полметра.',
                { Choice: { Dialog: '',
                    AtmosphereNext: routeChoice('Дальше — плейлист', 'AnimeComfort_Playlist', { procrastination: 1 })
                } }
            ],
            AnimeComfort_Playlist: [
                vn.goTo('Квартира: Плейлист — 22:51'),
                'show scene workshop with fadeIn duration 1s',
                'p 22:51. Видео кидает плейлист: YOASOBI — Racing into the Night, Ado — Odo, Eve — Kaikai Kitan, LiSA — Gurenge, Radwimps — Suzume, Kenshi Yonezu — Kick Back.',
                'p Я включаю YOASOBI. Бит — как шаг «Стрижа» по мокрому асфальту. Ado — крик, как будто Синдзи наконец закричал не от страха.',
                'p Плейлист идёт фоном, пока я ем. Это не прокрастинация? Это — прокрастинация, но с саундтреком. Музыка делает откладывание красивым, а красивое — сложнее бросить.',
                'p 22:58. Третий трек. Рамен уже съеден. На дне — яйцо. Я выловил его палочками, как будто выловил важную деталь из бульона дня.',
                { Choice: { Dialog: 'Плейлист дошёл до припева. Видео предлагает активности.',
                    PlaylistNext: routeChoice('Перейти к активностям', 'AnimeActivities_Draw', { procrastination: 2 })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
