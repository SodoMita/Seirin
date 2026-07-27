/* ============================================================================
 * THE LAST FREQUENCY — story script (pure data).
 * ----------------------------------------------------------------------------
 * Original work. No text, characters, or UI copied from the Cyber-Nexus
 * example game; only the engine CODE (monogatari.js / failsafe.js /
 * icons-offline.*) was borrowed. See STORY_BIBLE.md for the design anchor and
 * the skepticism log; see README.md for license (code MIT, text CC-BY-4.0).
 *
 * This file is DATA ONLY — no engine calls, no DOM, no functions except the
 * two tiny input callbacks the compiler wires in game.js. That is what lets
 * tests/story.test.mjs machine-check the script: word count (must be >= 10000,
 * target >= 11500), jump-target integrity, asset references, choice/branch
 * legality — all verified without a browser.
 *
 * Step vocabulary (compiled by vendor/game.js into Monogatari statements and
 * FailSafe.vn facade calls — every state mutation stays rollback-safe):
 *
 *   'show scene ID' | 'show character ID SPRITE at POS [with FX]' |
 *   'hide character ID' | 'play voice ID' | 'stop voice' |
 *   'jump LABEL' | 'end' | 'next'                    -> raw engine statements
 *   'CHAR text...'                                   -> dialogue (see cast)
 *   { stat:  { name: delta } }                       -> vn.reversible delta
 *   { flag:  { name: bool } }                        -> vn.reversible set
 *   { go:    'Location — Detail' }                   -> vn.goTo (HUD clock/loc)
 *   { clock: 'HH:MM' }                               -> HUD clock only
 *   { choice:{ Dialog, options: [ { Text, Do:'jump L' [, stat, flag ] } ] } }
 *                                                    -> Choice + vn.choiceEffect
 *   { branch:{ if: ['stat','>=',n] | ['flag','==',true],
 *              True: 'jump L', False: 'jump L' } }   -> vn.branch (both arms)
 *   { inputName: true }                              -> player-name input
 *
 * Cast ids: n (narrator, no nameplate), p (player, {{player.name}}),
 * mira, elara, harlan, jun, sys (station announcements).
 * ========================================================================== */
(function (root, factory) {
    'use strict';
    var story = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = story; }
    if (root) { root.LFStory = story; }
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
    'use strict';

    var labels = {

/* ========================================================================
 * PROLOGUE — the last first watch
 * ====================================================================== */
'Start': [
    { clock: '22:00' },
    { go: 'Meridian Point — Sea Road' },
    'show scene title_exterior with fadeIn duration 2s',
    'n The bus leaves me at the bottom of the sea road with one bag, one thermos, and the particular dread of a person who has volunteered for something symbolic.',
    'n Meridian Point Relay Station sits on its basalt cape like a lighthouse that gave up on romance. Low concrete. A red beacon blinking. A forest of masts against the storm cloud, guy wires already starting to sing in the rising wind.',
    'n Tomorrow at six in the morning, after seventy years of listening to the sea, the Point goes dark. The satellite network swallowed its job years ago; tonight is ceremony, not work. The final watch.',
    'n And because nobody else wanted to be the one who turns out the lights, the final watch is mine.',

    'show scene watch_room with fadeIn duration 2s',
    { go: 'Watch Room — Console' },
    'n The watch room smells the way old stations do: warm dust on tubes, salt in the linoleum, coffee that has become a geological record in the bottom of a mug. The console curves around the window in a horseshoe of dials, half of them decorative now, and two modern screens sit grafted onto the 1950s desk like transplants the body never quite accepted.',
    'n Under a glass lid at the far end sits the oldest thing in the building. A 1951 tube receiver and transmitter, maritime band, 1420 kilohertz. The plaque calls it the Old Set. The staff, according to the note taped above it, called it Grandmother.',
    'n I set my bag down. The console hums under my palms like something alive and patient.',

    { 'inputName': true },

    'sys <span class="t-amber">[ STATION LOG ]</span> Final watch commenced. Operator of record: {{player.name}}. Decommission schedule confirmed — all systems power down at 06:00. Remote transmitter cutoff from the Authority at 05:30.',
    'p Eight hours. One storm. The easiest night of my career, if the sea behaves.',
    'n The sea, naturally, has not agreed to behave. The forecast calls it a resonance storm — one of the big electromagnetic systems that roll off the northern water once every forty-odd years, when solar weather lines up with the magnetite in the cape. The town has a folk name for it. The night the sea repeats itself.',

    'show character jun smile at center with fadeIn',
    'jun Evening, chief. Or should I say — last evening. I brought the good tea, on account of it being historic and all.',
    'p Jun. You are not supposed to call me chief. I am the junior operator who drew the short straw.',
    'jun Sure, sure. And I am just the night guard. Meanwhile I have the master keys and you have a mop bucket of existential responsibility. Hierarchy is a feeling, {{player.name}}.',
    'n Jun Okita sets a paper bag on the console with the ceremony of a man presenting medals. Inside: two bottles of barley tea and a wrapped rice ball shaped, unmistakably, like a radio dial.',
    'jun My mother made them for every night watch she ever worked, thirty years on the fishing boats. I make them now. Do not ask me to explain the dial shape. It is tradition. Tradition does not require justification.',
    'p It is a very good rice ball.',
    'jun It is a load of rice with opinions. Eat. I will do my rounds and haunt the corridors atmospherically.',
    'p You know this place is closing in eight hours, right? You are guarding a museum of itself.',
    'show character jun smile at center',
    'jun Somebody should keep it company. A station like this does not just stop. Seventy years of listening leaves something in the walls. My mother used to say the sea keeps a ledger, and the stations are where it reads back what it wrote.',
    'p Your mother sounds like she would have liked me.',
    'jun My mother would have fed you first and decided about you afterwards. That is the correct order of operations. Eat your dial, chief.',

    'hide character jun with fadeOut',
    'n He goes, flashlight swinging, humming something tuneless. The storm leans against the window and tests the glass.',
    'n I settle into the chair that has held every night operator since 1951. The vinyl is worn into the shape of a thousand midnights. On the desk there is a handover note, a watch log open to a blank page, and a photograph pinned to the console: the station crew of 1986, fourteen people grinning on this very roof, and at the back of the frame, taped like an afterthought, a list of names under a single word. REMEMBERED.',
    'n The MV Cordelia. The research ship that went down in the resonance storm of October 1986 with fourteen souls aboard, no survivors, no wreckage ever found. The Point heard nothing that night. The inquiry said the station failed in its duty. The mandate they wrote into the rebuilding was six words long, and it is still painted on the corridor wall: NO CALL GOES UNANSWERED HERE.',
    'p Forty-five years. And now they are switching us off anyway.',

    { clock: '01:15' },
    { go: 'Watch Room — Storm Front' },
    'n At quarter past one the storm arrives for real. Not gradually the way ordinary weather does — all at once, like a door. Rain comes across the glass sideways. The masts begin to hum a chord I can feel in my teeth.',
    'n Both modern screens flicker. Static blooms across the spectrum analyzer in shapes that look almost organized, like cities seen from a plane.',
    'sys <span class="t-amber">[ AUTOMATED ]</span> Atmospheric interference above nominal. Structured noise pattern detected across bands two through nine. No source identified.',
    'p Structured noise. A polite way of saying the sky is talking and we do not know in what language.',
    'n I log it. I check the grounding straps. I do the things operators do when the hair on their arms is standing up and they would prefer not to examine why. The lights in the corridor go to emergency green. In the sudden dimness the watch room becomes a cave lit by instrument glow, and the sea beyond the window stops being scenery and starts being a fact.',

    { clock: '02:33' },
    'n At 02:33 exactly, Grandmother wakes up.',
    'n Not the screens. Not the modern rack. The Old Set, under its glass lid, the set that has been disconnected from the antenna for six years and was scheduled to go to a museum in the spring. Its dial lights come up warm amber, one by one, the way a house turns on its windows at dusk.',
    'n And out of its speaker, under the static, breathing between the waves — a voice.',
    'play voice signal',
    'elara — to any station, this is MV Cordelia, maritime mobile. We are taking water and we have lost our bearing. Fourteen souls aboard. If anyone receives, please answer. Over.',
    'n The voice is calm the way people get calm when they have been frightened for a long time and have decided to be professional about it. A woman. Young, by the sound of her. The static eats the edges of her words and gives them back older.',
    'n My hand is halfway to the transmit switch before my brain catches up with it. The Old Set is disconnected. It is not receiving anything. It is a museum piece under glass, and museum pieces do not receive distress calls at twenty-two minutes past two on their last night alive.',
    'elara MV Cordelia to any station. We are taking water. Our heading is lost. If anyone receives, please. Answer. Over.',
    'n The logbook lies open on the desk. The regulations are clear: impossible signals are interference, interference is logged, logged things are filed, and filing is how institutions keep from going mad. The transmit switch is right there, warm under the glass, warm like a hand.',

    { choice: {
        Dialog: 'n The voice waits inside the static. The regulations wait on the desk. Choose.',
        options: [
            { Text: '<i class="fas fa-volume-up"></i>&nbsp; Open the channel and answer her', Do: 'jump Act1_Answer', flag: { answered_signal: true }, stat: { trust: 1 } },
            { Text: '<i class="fas fa-book"></i>&nbsp; Log it as structured interference and keep listening', Do: 'jump Act1_Log' }
        ]
    } }
],

/* ---- Act 1, branch A: answer on air ---- */
'Act1_Answer': [
    'n I lift the glass lid. The transmit switch is warm — not warm like electronics, warm like skin, like something that has been waiting to be picked up.',
    'p Unknown vessel calling Meridian Point, this is Meridian Point Relay Station. I receive you. Say your position. Over.',
    'n The static surges, falls, surges. For a long moment there is nothing but the storm and my own breathing and the amber glow of a dial that should not be lit.',
    'elara Meridian Point, this is Cordelia. We read you — God, we read you. Position uncertain. Our compass is spinning and the stars are wrong. We were running for Shiogara harbor on a bearing of two-one-five. We have been on two-one-five for an hour and the harbor is not there.',
    'p Cordelia, copy two-one-five. What is your vessel description? How many aboard? Over.',
    'elara Research vessel, sixty-three meters, out of Hachinohe. Fourteen souls. I am Elara Vance, radio officer, currently the only person aboard who can talk without shouting. Station — what is your timestamp? Ours reads October seventeenth, twenty-three minutes to three.',
    'n I look at the clock on the console. I look at it again.',
    'p Cordelia, Meridian Point. My timestamp reads October eighteenth, two thirty-six in the morning.',
    'elara Copy, Meridian Point. Copy your October eighteenth. Station, I am going to be honest with you because you are the first honest thing that has happened to us tonight — ours reads the seventeenth. October the seventeenth, nineteen eighty-six. I don\u2019t know what that means. I am transmitting anyway.',
    'n Nineteen eighty-six. The year the Cordelia went down with fourteen souls and no wreckage, in a storm exactly like this one, within sight of this cape.',
    'n I should log it. Instead I pull the chair up to Grandmother, and I keep the channel open, and I do what the mandate on the corridor wall says I do.',
    'p Cordelia, Meridian Point. I hear you. Hold your heading and keep this frequency warm. I am going to get someone who can help. Do not stop transmitting. Over.',
    'elara Copy, Meridian Point. We will keep the light on for you. Cordelia, over and standing by.',
    'stop voice',
    'jump Act1_Together'
],

/* ---- Act 1, branch B: log and listen ---- */
'Act1_Log': [
    'n I pick up the pen. I put it down. I pick it up again.',
    'n The voice keeps coming, patient as tide water, the same message every ninety seconds, and each time it comes back the static seems to thin a little, as if the signal is learning the shape of the room.',
    'elara — to any station, this is MV Cordelia. Fourteen souls aboard. If anyone receives, please answer. Over.',
    'n Structured interference, I write. Source unknown. Pattern repeats at ninety-second intervals. And then, because the pen is in my hand and the hand belongs to a person who has been listening to the sea for six years, I write a second line I will regret and defend for the rest of my life: Voice sounds human. Voice sounds afraid.',
    'n At the fourth repetition something changes. The static folds back like a curtain, and suddenly she is not behind the noise anymore — she is in the room, close, the way a voice gets when the distance stops mattering.',
    'elara Cordelia to any station. I have been transmitting for three hours. I know you are there. I can hear your set breathing. Please — if there is anyone in the world still awake, answer me.',
    'n She can hear the set breathing. The set that is not connected to anything.',
    'p — I, I am here. Meridian Point Relay Station, I am here. I read you, Cordelia. I am sorry it took me four repetitions to find my nerve. Over.',
    'n I said it before deciding to say it. The transmit switch was under my hand the whole time, warm as a promise.',
    'elara Oh, thank God. Oh, station, thank God. Elara Vance, radio officer, Cordelia. Fourteen souls, taking water, heading lost, compass dead. And Meridian Point — your signal is strange. You sound like you are calling from very far away. Or very close. I can\u2019t tell which.',
    'p Cordelia, what is your timestamp? Over.',
    'elara October seventeenth, nineteen eighty-six, two minutes to three. Station — why does your side of this channel hum like a whole building full of machines? We can hear a storm on your end too. It sounds like ours, but — different. Newer.',
    'n Because it is the same storm, I think, forty-five years late. I do not say it. Not yet. First I say the only thing that matters.',
    'p Cordelia, I hear you. Keep the frequency warm. I am getting help. Over.',
    'elara Copy, Meridian Point. We will keep the light on. Cordelia standing by.',
    'stop voice',
    'jump Act1_Together'
],

/* ---- Act 1 converges: wake Mira ---- */
'Act1_Together': [
    { clock: '02:48' },
    { go: 'Watch Room — Second Voice' },
    'n I take the stairs to the bunk room two at a time, which is harder than it sounds in a building that was designed by people who had never run. I knock on the door with the Authority sticker on it until the knocking becomes a conversation.',
    'show character mira worried at center with fadeIn',
    'mira This had better be structural. I decommissioned three lighthouses last year and I slept through all of them. It is a talent.',
    'p Mira. Come to the watch room. Bring your brain and whatever instrument measures impossible.',
    'mira You have ninety seconds. I am timing you with my eyes closed, which is how I time everything, because I refuse to witness the seconds I am wasting.',
    'n She comes anyway, in an Authority hoodie and wool socks, because she is the kind of engineer who would investigate a haunting to make sure it was up to code.',

    'show scene watch_room',
    { go: 'Watch Room — The Old Set' },
    'n The voice is mid-cycle when we walk in. Mira stops in the doorway. I watch her face do four things in two seconds: recognition, denial, calibration, and something I can only call grief standing up straight.',
    'elara Cordelia to any station. Fourteen souls. If anyone receives, please answer. Over.',
    'mira That is a maritime distress format. Old format. Pre-satellite. Where is that coming from?',
    'p Grandmother. The Old Set. It is disconnected from the antenna, Mira. It has been disconnected for six years.',
    'mira Then it is interference. Pattern bleed from the storm, resonating in the chassis. Old tubes can rectify strong RF and re-emit it as — ',
    'p Mira. Interference does not breathe. Interference does not answer questions. I spoke to her three minutes ago and she gave me a timestamp. October seventeenth, nineteen eighty-six.',
    'show character mira normal at center',
    'mira ... Say that again, but slower, and pretend I am a very patient person.',
    'p The voice says it is 1986. The storm outside matches the resonance pattern — the forty-five-year cycle. The Cordelia went down in the last one, within sight of this cape. Fourteen souls.',
    'mira And I am supposed to believe the building is receiving a forty-five-year-old distress call on a radio that isn\u2019t plugged in.',
    'p I am not asking you to believe it. I am asking you to measure it. You are the engineer. If this is interference, prove it, and I will log it and we can both go back to our respective denials.',
    'n She looks at me. She looks at the Old Set, glowing its impossible amber. Then she crosses the room the way engineers cross toward problems — like a person who has already lost an argument and wants to lose it properly.',
    'mira Hand me the probe. And {{player.name}}? If this is real, then the decommission schedule is the least interesting thing about tonight, and I say that as the person who wrote the decommission schedule.',
    'n For twenty minutes she works. She solders a tap onto the Old Set\u2019s output. She runs the signal through the modern analyzer and watches the screen with the expression of a woman watching her assumptions pack their bags.',
    'mira The carrier is real. Analog, maritime band, 1420 kilohertz, modulated by a human voice. It is not on any input, because there are no inputs connected. The signal is, as far as my instruments can determine, arriving from inside the receiver. Which is a sentence I did not expect to write in my final report, if I write one, which I might not, because this is insane.',
    'p There is more. I answered. I spoke to her. Elara Vance, radio officer. Fourteen souls, taking water, heading lost.',
    'show character mira worried at center',
    'mira Elara. Vance. I know that name. {{player.name}}, I know that name, and I need a moment to explain why, and I need you to not look at me while I find it.',
    'n She finds it at the back of her wallet, folded to the size of a stamp, soft as cloth from years of folding and unfolding. A photograph, black and white: a young woman in a ship\u2019s radio headset, laughing at something outside the frame.',
    'mira This is from the Cordelia\u2019s crew photo. Elara Vance, radio officer. And next to her, if you look, is the cook. Chiyo Sayo. My grandmother. Twenty-nine years old, lost at sea, no body, no wreckage, nothing — and I grew up on her letters. She wrote me one every port, and the last one says, we\u2019ll be home before the storm season, and the storm season was the resonance storm, the one that is outside our window right now.',
    'n The watch room holds its breath. On the Old Set, between transmissions, the static rises and falls like breathing.',
    'mira So. Either this is the most elaborate interference in the history of radio, or my grandmother is thirty-one years dead and also, apparently, taking water on a heading of two-one-five. I have decided I would like it to be real. Is that allowed? Am I allowed to want the impossible thing?',
    'p You are the engineer. You get to want whatever you can measure.',
    'mira Then we measure. Everything. Tonight. But we need more signal — the carrier is strong but the content is thin, like she is a long way off and walking further. There are two ways to get closer to her.',
    'mira One: the archive. The basement has every watch log since 1951, including the night of 1986. If anyone on this station heard anything that night, it is in that book, and it will tell us what the last people to stand where we are standing actually saw.',
    'mira Two: the rooftop array. The main mast still has its feed line intact — I checked yesterday, out of professional spite. If I can jumper the Old Set\u2019s input to the mast while the storm is peak, we turn Grandmother from a whisper-listener into a shout-receiver. It means going up there. In this. With a cable in my teeth.',
    'p One of us should go to the archive. One of us should climb.',
    'mira Correct. And since I am the only person here who can tell a feed line from a clothesline, the roof is mine either way. Which means the archive is yours — unless you want to argue, in which case I will be delighted to lose an argument properly for once tonight.',
    { stat: { clarity: 0 } },
    { choice: {
        Dialog: 'n The storm presses against the glass like a crowd. Two roads down the same dark building.',
        options: [
            { Text: '<i class="fas fa-book"></i>&nbsp; Take the archive — find out what the station heard in 1986', Do: 'jump Act2_Archive', flag: { went_archive: true }, stat: { clarity: 1 } },
            { Text: '<i class="fas fa-bolt"></i>&nbsp; Take the roof with Mira — boost the signal at the source', Do: 'jump Act2_Rooftop', flag: { went_rooftop: true }, stat: { clarity: 1 } }
        ]
    } }
],

/* ========================================================================
 * placeholder — remaining acts appended in subsequent writing passes
 * ====================================================================== */
'Act2_Archive': [
    'n (Act 2 — archive branch, drafted next.)',
    'jump Act2_BreakRoom'
],
'Act2_Rooftop': [
    'n (Act 2 — rooftop branch, drafted next.)',
    'jump Act2_BreakRoom'
],
'Act2_BreakRoom': [
    'n (Act 2 — break room convergence, drafted next.)',
    'jump Act3_Harlan'
],
'Act3_Harlan': [
    'n (Act 3 — drafted next.)',
    'jump Ending_TheLongMemorial'
],
'Ending_HarborLight': [
    'n (Ending A — drafted next.)',
    'end'
],
'Ending_WeakSignal': [
    'n (A-gate fail variant — drafted next.)',
    'jump Ending_TheLongMemorial'
],
'Ending_TheLongMemorial': [
    'n (Ending B — drafted next.)',
    'end'
],
'Ending_Static': [
    'n (Ending C — drafted next.)',
    'end'
]

    }; /* end labels */

    return {
        title: 'The Last Frequency',
        version: '0.1.0-draft',
        labels: labels
    };
}));
