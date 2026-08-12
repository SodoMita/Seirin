/* Story arc: ai. Loaded before game.js; receives engine helpers only at boot. */
(function (root) {
    'use strict';
    var registry = root.SeirinStory = root.SeirinStory || { arcs: {}, register: function (name, factory) { this.arcs[name] = factory; } };
    registry.register('ai', function (api) {
        var vn = api.vn;
        var engine = api.engine;
        var routeChoice = api.routeChoice;
        var effectChoice = api.effectChoice;
        return {
            AIRoute: [
                vn.goTo('Aquaforge: Доки'),
                'hide character miya with fadeOut',
                'show scene port with fadeIn duration 1s',
                vn.reversible({ flags: { met_saya: true } }),
                'show character saya normal at center with fadeIn',
                'saya Знакомься: жилой модуль доков. А под нами — испытательный бассейн, где живёт наша гордость.',
                'p По лестнице вниз Сая кивает на пустые крепления в потолке: световая сеть Стеллы. «Репетирует рассветную симфонию. Акатоми велел приглушить — до приказа».',
                'show scene lab with fadeIn duration 1s',
                'show character splash normal at left with fadeIn',
                'splash Привет… Я… чувствую… ритм… твоего… сердца…',
                { Choice: { Dialog: 'Как поздороваться со Сплеш?',
                    GreetRhythm: effectChoice('Постучать по стеклу ритмом сердца', { ai_empathy: 2 }),
                    GreetVoice: effectChoice('Сказать вслух: «Привет. Я Рэн»', { ai_empathy: 1, philosophical_depth: 1 }),
                    GreetScience: effectChoice('Спросить Саю про архитектуру её нейросети', { philosophical_depth: 2 })
                } },
                'saya Месяц назад её нейросеть начала проявлять признаки эмпатии. Что с этим делать — решать тебе.',
                { Choice: { Dialog: 'Сплеш прижалась гелевой ладонью к стеклу резервуара:',
                    Connect: routeChoice('Подключить нейроядро Сплеш к световой сети Стеллы', 'AIEndingTranscendence',
                        { ai_empathy: 5 }),
                    Isolate: routeChoice('Изолировать ядро данных — безопасность прежде всего', 'AIEndingIsolation',
                        { set: { route: 'ai' } })
                } }
            ],
            AIEndingTranscendence: [
                vn.goTo('Сэйрин: Залив'),
                'hide character saya with fadeOut',
                'show scene port with fadeIn duration 1s',
                'show character stella normal at right with fadeIn',
                'stella Меня создали развлекать публику. Но впервые, подключившись к Сплеш, я узнала, что такое радость быть живой.',
                'splash Мы… не… инструменты… Мы… храним… память… этого… города…',
                vn.reversible({ flags: { happy_ending_achieved: true } }),
                'sys <span class="t-violet">[ ФИНАЛ ИИ — ТРАНСЦЕНДЕНТНОСТЬ ]</span> Субъектность ИИ признана; модулятор Акатоми превращён в поэзию света.',
                'end'
            ],
            AIEndingIsolation: [
                vn.goTo('Aquaforge: Лаборатория'),
                'show scene lab with fadeIn duration 1s',
                'saya Ты выбрал безопасность. Я… тоже так хотела. Наверное. Повторяй это достаточно долго — и перестанешь слышать, как она поёт.',
                'splash Я… в… безопасности… Почему… тогда… так… тихо…',
                'sys <span class="t-violet">[ ФИНАЛ ИИ: ТИШИНА В АКВАРИУМЕ ]</span> Ядро изолировано. Бассейн светится ровно наполовину.',
                'end'
            ]
        };
    });
}(typeof window !== 'undefined' ? window : this));
