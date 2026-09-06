/* Story arc: nyan — the balcony cat. Hidden beat off Solo1Home_Balcony.
 * An easter egg, not a route: no fork, no ending, no cast entry. The night
 * doesn't stop for a cat (addTime), and the one thing the player can carry
 * out of it is `player.unlocked.met_nyan` — the Archives codex reads it. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('nyan', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            Solo1Home_BalconyCat: [
                vn.goTo('Квартира: Балкон — перила'),
                'show scene cg_balcony with fadeIn duration 1s',
                vn.addTime(4),
                'p {{player.time_hhmm}}. Сначала — звук. Не дрон, не трансформатор за стеной: когти по жести. По карнизу от соседского балкона идёт кошка. Трёхцветная, с хвостом-помпоном, как у половины дворовых котов Тэцубы.',
                'show character nyan normal at center with fadeIn',
                'p Она садится на перила в полуметре от моих рук. Не смотрит на меня — смотрит на город. На башню Акатоми, на фиолетовую дымку, на порт. Уши работают отдельно от головы: одно на дроны, другое на меня.',
                'p Дворник зовёт её Нян. Я слышал, как он говорит с ней утром — единственный, с кем он разговаривает во дворе. Она сидит на его метре асфальта, пока он метёт вокруг неё.',
                { Choice: { Dialog: 'Кошка на перилах. Что делает пилот, у которого накопитель ждёт на столе?',
                    PetNyan: effectChoice('Протянуть руку — медленно, костяшками вперёд', { philosophical_depth: 1 }),
                    WatchNyan: effectChoice('Не трогать. Просто сидеть рядом и смотреть туда же', { philosophical_depth: 2 }),
                    TalkNyan: effectChoice('Сказать ей вслух про накопитель — она хотя бы не перебьёт', { procrastination: 1, philosophical_depth: 1 })
                } },
                vn.reversible({ storage: { 'player.unlocked.met_nyan': { mode: 'set', value: true } } }),
                'p Она позволяет. Не откликается, не мурлычет — позволяет. Тёплая под ладонью, а взгляд всё там же, на башне. Кошки прокрастинируют честнее людей: они не говорят «сначала надо…». Они просто сидят, пока не пора.',
                'p Потом — пора. Она встаёт, потягивается на всю длину перил и уходит по карнизу к следующему балкону — там свет и, наверное, миска. Ни одного лишнего движения. Ни одного «начну завтра».',
                'hide character nyan with fadeOut',
                'p Руки холодные. На перилах — два рыжих волоска. Накопитель на столе за спиной не сдвинулся ни на миллиметр. Но теперь я точно знаю, где в этом городе есть кто-то, кто не откладывает.',
                { Choice: { Dialog: '',
                    NyanToHub: routeChoice('Вернуться в комнату — она показала, как это делается', 'Solo1Hub', { philosophical_depth: 1 })
                } }
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
