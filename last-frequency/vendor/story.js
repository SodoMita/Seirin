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
    { clock: '03:05' },
    { go: 'Archive — Basement' },
    'show scene archive with fadeIn duration 1.5s',
    'n The archive is one room and one lamp. Steel shelves stand in ranks like a congregation, and every shelf holds the same book in a different year: the Meridian Point watch log, bound in cloth the color of deep water, seventy years of midnights written by hand.',
    'n Rain is a rumor up here, muffled under concrete and earth. What I can hear instead is the building itself — the tick of cooling pipes, the storm\u2019s bass note in the mast field two floors up, and under all of it, so low it might be my own pulse, a hum that belongs to no machine I can name.',
    'p Nineteen eighty-six. Come on, Grandmother\u2019s generation — where do you keep your ghosts?',
    'n The 1986 volume is where it should be, third shelf from the bottom, between 1985 and 1987, because the archive is the one place in this station that has never once failed to do its job. The cloth is colder than the others. I take the book to the lamp.',
    'n The entries for the seventeenth are ordinary weather work in a careful clerk\u2019s hand. Wind southeast, gusting. Barometer falling. The kind of handwriting that believes paperwork can hold back the sea. And then, at 02:33, the hand changes.',
    'n The letters get smaller, the way handwriting does when a person is no longer sure they want to be read.',
    'p Voice on the Old Set at 0233. Distress format. Could not raise them. Storm noise, probably. God, let it be storm noise. E.H.',
    'n E.H. I turn back to the staffing sheet clipped inside the front cover, and there they are, the night watch of October 1986: T. Okita, operator of record. E. Harlan, technician. Two initials I know, one from the security office and one from the director\u2019s door.',
    'n Elias Harlan was here. The director has been here every day of my employment, and he has never once mentioned that he stood in this building on the night the Cordelia died.',
    'n I read on. At 03:40 the power fails and the log moves to pencil. At 04:44 there is a gap — not a blank page, a torn one, the stub rough where something was written and then ripped out by a hand that was not steady. At 05:07, in pencil, in the operator\u2019s careful clerk\u2019s hand that is no longer careful at all:',
    'p Cordelia gone. All souls. We heard nothing. The sea just — took them out of the sound. I was on watch. I heard nothing. God forgive this station, I heard nothing. T. Okita.',
    'n T. Okita. Takeshi Okita. Jun\u2019s father, dead eleven years now, who worked thirty years on the fishing boats and made rice balls shaped like radio dials for the night watch, and who, according to every story his son has ever told me, never once spoke about the sea without smiling.',
    'n I sit down on the archive floor, because my legs have formed an opinion about this discovery, and I read the last pages of the volume. The inquiry. The findings. The six words they painted on our corridor wall as if paint could answer a distress call. And in the appendix, the reconstruction that makes me stop breathing for a moment, because it is the shape of a key:',
    'p Finding 12: Had MV Cordelia held bearing two-four-one from her 0230 position rather than two-one-five, she would have cleared the Needle shelf to starboard and entered the Shiogara channel. The vessel\u2019s recorded heading of two-one-five placed her directly on the shelf. No explanation for the heading error was found.',
    'p Two-four-one. They were three degrees from living. Three degrees, and somebody on the water gave them the wrong light to steer by.',
    'n I photograph the page with the station camera, because phones are a modern superstition the archive does not permit, and I take the 1986 volume under my arm. The lamp flickers as I pass it, and for exactly one breath the hum in the walls rises into something almost like a voice, and then it lets me go.',
    'p I heard you, E.H. Forty-five years ago you heard her and you wrote it down small. I\u2019m going upstairs, and we are going to answer properly this time.',
    { flag: { read_log: true } },
    'jump Act2_BreakRoom'
],
'Act2_Rooftop': [
    { clock: '03:05' },
    { go: 'Mast Field — Storm Peak' },
    'show scene rooftop with fadeIn duration 1.5s',
    'n The roof of Meridian Point is not a place so much as a weather event with railings. We come out of the stairwell into wind that has weight, rain that arrives horizontally with intent, and a sound like the whole sky being slowly torn along a seam. The masts stand in their lattice ranks, red beacons blinking through the storm like the only patient things left in the world.',
    'mira The feed junction is at the base of mast three! I jumpered it yesterday for the decommission inventory and then forgot to un-jumper it, which is either negligence or prophecy, and tonight I choose prophecy!',
    'p Mira! You said you checked the feed line out of professional spite!',
    'mira Spite and prophecy are the same emotion on different schedules! Hold this cable! Hold it like it owes you money!',
    'n I hold it like it owes me money. Mira goes down on one knee at the junction box and works with the terrifying serenity of an engineer in her element, rain running off her hood while her hands find connectors by touch, because looking is for people who have not done this four hundred times.',
    'mira Your Old Set is a receiver with no antenna and a transmitter with no mouth! The storm is the loudest thing on this cape for the first time in forty-five years, and we are going to introduce it to the biggest voice the building has!',
    'p And if the voice answers?',
    'mira Then we will have achieved the scientific milestone of being right about something insane! Hand me the spanner! The small one! {{player.name}}, that is the big one, you are holding it with great confidence and zero correctness!',
    'n I hand her the spanner. The guy wires sing a chord that climbs, and climbs, and becomes a note I feel behind my eyes, and the beacons all blink at once, in unison, like the whole field taking a breath.',
    'mira Contact! Go! Tell Grandmother to open her ears!',
    'p I cannot tell Grandmother anything, I am holding a cable that owes me money!',
    'mira Then I will!',
    'n She is gone and back in twenty seconds, soaked to the bone, grinning the grin of a person who has just committed a successful act of physics. Nothing happens for three heartbeats. On the fourth, the storm sound changes — not quieter, deeper, as if the night has turned up the gain on something underneath itself.',
    'n And Elara\u2019s voice, which had been a candle behind glass, becomes a person in the room. Not from any speaker we carry — from the mast field itself, the rain and the wires and the whole array turning into one vast throat.',
    'elara Meridian Point, Cordelia. Your signal just — changed. You are loud now. You are the loudest thing in any sky we have. Station, I am going to give you our situation, and I am going to give it to you like a report, because reports are how I am keeping my hands steady.',
    'elara Pump number one is holding. Number two is not holding. The sea is coming in slow and patient, the way it does when it knows it is going to win eventually and prefers not to rush. The captain has us on two-one-five for the Shiogara harbor light, two points off the port bow, and we have been on it for an hour.',
    'mira Say again, Cordelia — the light you are steering on. Describe it.',
    'elara Old pattern. White tower, red cap, a flash every six seconds. It is the only light on this water, and it is exactly where the charts say nothing should be, and I have been too afraid to say that out loud until now.',
    'n Mira has gone very still beside me, rain running down her face like she is the one taking water.',
    'mira Elara. This is Mira Sayo, Maritime Authority. Listen to me carefully. The light you are describing is the old Meridian cape light. It was switched off in 1978. They demolished the tower in 1981. I signed the demolition certificate myself last year, out of professional — ',
    'p Mira.',
    'mira — out of professional completeness. The light you are steering on does not exist. In any year. It is a light the storm is remembering, and it is standing directly over the Needle shelf, and if you hold two-one-five much longer the sea is going to do to you what it did — ',
    'n She stops herself. The mast field hums its impossible hum. Far below us, past the cliff and the dark, the Cordelia is steering on a ghost, three degrees from living, and does not know it.',
    'elara Mira Sayo, Meridian Point. I heard the pause you just made. I have been a radio officer for nine years, and I have learned that pauses carry more truth than signals. Say the rest.',
    'mira If you hold two-one-five, you hit the reef. That is the rest.',
    'n A long silence. The storm fills it without covering it.',
    'elara Copy, Meridian Point. Copy the reef. Then we need a new bearing, and we need it from someone who can see the water we cannot. Mira Sayo — you have charts up there. I can hear in your voice that you have charts. Give us a number to steer by.',
    'mira I — yes. Yes, the demolition survey has the 1986 inquiry charts scanned, I have the whole packet on my tablet, why do I have the whole packet, of course I have the whole packet. Give me two minutes. {{player.name}}, hold the cable like it owes your whole family money.',
    'n She is gone for two minutes that last a week. She comes back with rain in her eyebrows and a number in her mouth like a prayer she has checked the math on.',
    'mira Cordelia, Meridian Point. From your 0230 position, come to bearing two-four-one. That clears the Needle shelf to starboard and puts you in the true Shiogara channel. Two-four-one. Do not trust the light. Trust the number.',
    'elara Two-four-one. Copy. Station — we cannot turn yet. The wheel is jammed against the swell and the pump crew needs every hand. When the sea lets us turn, we will turn to your number. Keep saying it. Keep this channel warm until we do.',
    'mira We will say it all night if that is what it takes. Two-four-one, Cordelia. Meridian Point, over and standing by.',
    'n The array sings. The beacons blink. Somewhere out on a water we cannot see, fourteen people are holding a heading by the sound of our voices, and Mira is writing 241 on her palm in marker, as if her own hand might forget it.',
    'mira Inside. Now. The cable can owe us the rest later, and I am going to be sick in a very professional manner unless I see a wall that is not moving.',
    { flag: { mira_computed_bearing: true } },
    'jump Act2_BreakRoom'
],
'Act2_BreakRoom': [
    { clock: '03:50' },
    { go: 'Break Room — Storm Noodles' },
    'show scene breakroom with fadeIn duration 1.5s',
    'n The break room is the size of a generous closet and the warmest place in the building, physically and otherwise. The kettle has been on since the beginning of time. The noodle cupboard is organized by Jun\u2019s mother\u2019s private taxonomy, which no auditor has ever cracked. Jun himself stands at the counter with the calm of a man who has decided that the apocalypse, if it arrives, will arrive fed.',
    'jun Sit. Both of you. One of you has been in the basement and one of you has been on the roof, and neither of you has been to bed, and I have decided that whatever is happening tonight, it is happening to people who are going to have soup first.',
    'mira Jun, we don\u2019t have time for — ',
    'jun Mira Sayo. My mother made storm noodles every night the sea got angry, thirty years, no exceptions. The Cordelia night was the last night she made them for a man who didn\u2019t come home, and she never said which man, and I never asked, because some questions you hold for people instead of asking them. Eat. That is not an invitation. That is thirty years of policy.',
    'n We eat. It is, absurdly, the best thing I have ever tasted at four in the morning in a building full of ghosts — salt broth and scallion and noodles with the kind of chew that means someone\u2019s hands were involved and proud. Mira eats the way a person puts down something heavy, one spoonful at a time.',
    'mira Her name was Chiyo. My grandmother. I said the name upstairs but I didn\u2019t — I didn\u2019t say her. She wrote me a letter from every port. She drew little maps of the kitchens she worked in, and rated them, one to five pots. The last letter is from Hachinohe, before the run down the coast. It says: the cook on a ship is the person who makes sure everyone remembers they are still alive, three times a day. It says: we\u2019ll be home before the storm season.',
    'mira I became an engineer because of that letter. I wanted to build things that bring ships home. And then the Authority posted the Meridian Point decommission, and I volunteered before the sentence was finished, because I wanted to be the one who turned off the building that failed her. I wanted to look at the console and say, you had one job, and you didn\u2019t do it, and now I\u2019m switching you off.',
    'show character mira worried at center',
    'mira And tonight the console answered. On my grandmother\u2019s frequency, with my grandmother\u2019s ship, and a woman in a radio headset who is exactly the age she is in the photograph in my wallet. So you will forgive me if my working model of reality is, at the moment, out of order, and will be back as soon as we find the spare parts.',
    'jun Mira. For what it\u2019s worth — my mother used to say a station doesn\u2019t fail the sea. People fail the sea. Stations just stand there, doing their best with whoever is holding the switch.',
    'n Mira looks at him for a long moment. Then she does something I have not seen her do: she lets a moment be a moment, without measuring it.',
    'mira Thank you, Jun. That is — yeah. That is the spare part, actually.',
    'jun Good. Now drink your broth. The sea can wait. It has seniority, but it can wait.',

    { clock: '04:05' },
    { go: 'Watch Room — The Long Transmission' },
    'show scene watch_room with fadeIn',
    'n We go back to the watch room, because the channel cannot stay cold, and because Elara Vance has been holding a dying ship together with reports and nerve and we owe her our full attention. Her voice is waiting for us, the way a lamp waits in a window.',
    'elara Meridian Point, Cordelia. Pump two is back in the fight, for now. The wheel is still jammed. The captain says we hold heading until the sea lets us turn, and then we turn to your number, and I believe her, because she has never once in my service said a thing she did not mean.',
    'elara Station — can I tell you something strange? Even for tonight? We can see your storm. Not hear it. See it. Off the starboard quarter there is a second storm, and inside it there are lights. Like a whole building full of windows, standing on the water. Steady windows. And sometimes, when your voices come through, the windows flicker, like something in there is listening with its whole house.',
    'p Elara, that\u2019s — that\u2019s us. That\u2019s the station. You\u2019re seeing the Point.',
    'elara A building full of windows on the water. Yes. That fits. I have been talking to a lighthouse all night, and the lighthouse is a room, and the room is full of people who are awake. Station — I have to ask you something, and I need you to answer me true, because I think you are the only true thing I have left.',
    'elara In your year — is there anyone who remembers us? Forty-five years is a long time to be a question. Does anyone still ask what happened to the Cordelia? Does anyone keep the frequency warm, when nobody is calling?',
    'n The photograph is right there, pinned to the console. Fourteen faces grinning on a roof in better weather. Under it, taped like an afterthought, the list. REMEMBERED. Fourteen names in paint that has been touched up every year for forty-five years, because the town has never once let the letters fade.',
    'n I could read them to her. Every name on the wall. It would tell her the truth about her ship — that over here the story ended, that the names are carved, that her crew became a holiday and a painted word. Or I could keep the wall between her and the ending, and promise instead — promise that whatever happens tonight, on whichever side of the storm, the names will not go cold.',
    { choice: {
        Dialog: 'n The list waits under the lamp. Elara waits inside the static. Some truths are a kindness; some kindnesses are a truth.',
        options: [
            { Text: '<i class="fas fa-book"></i>&nbsp; Read her the fourteen names off the memorial wall', Do: 'jump Act2_NamesRead', flag: { names_read: true }, stat: { trust: 1 } },
            { Text: '<i class="fas fa-hand-holding-heart"></i>&nbsp; Promise to keep the names warm, and leave the ending unwritten', Do: 'jump Act2_Promise', flag: { promise_names: true }, stat: { trust: 1 } }
        ]
    } }
],

'Act2_NamesRead': [
    'n I lift the photograph off the console. I hold it where the lamp can see it too, as if the light might want to help me get the names right.',
    'p Elara, this is the wall in our corridor. Fourteen names. I\u2019m going to read them to you, slow. Ilsa Maro, captain. Elara Vance, radio officer. Tomas Rhen, engineer. Chiyo Sayo, cook — ',
    'elara Say that one again. The cook. Say it like it\u2019s a person and not a list.',
    'p Chiyo Sayo. Cook. Twenty-nine years old in 1986. She wrote letters from every port, and she rated other people\u2019s kitchens.',
    'n I hear Mira make a small sound beside me, and then not make it, and then stand very straight. I read the rest. Ten more names. The last one I read with the lamp full on it, because it deserves a witness.',
    'elara So that is the shape of it. A wall of names, painted up fresh, in a station that still stands. Station — hear me. If the names are already carved in your year, then over there we are already gone. But over here the pumps are still turning and the wheel is still jammed and I am still at this microphone. Do not mistake the memorial for the moment. We are not names yet. We are fourteen people holding a heading. Keep the channel warm.',
    'p We are keeping it warm, Cordelia. Both hands.',
    'elara Then one thing more, before the sea gives us its next opinion. There was someone else. Before you. On our night, hours ago — someone breathed on this channel. One breath, close, like a person lifting a handset and then putting it down. And then nothing. Forty-five years of nothing, until you. Whoever it was, they heard me, Meridian Point. They heard me, and they were afraid. If your storm has a name for that kind of fear, I hope it also has a name for the forgiveness.',
    'n The static breathes between us. Somewhere in the town below the cape, a director is sitting in a dark house with a phone that has not rung yet, and forty-five years of a handset lifted and put down.',
    'jump Act3_Harlan'
],

'Act2_Promise': [
    'p Elara, I am not going to read you an ending. Here is what I can promise you, on a channel I am holding with both hands: whatever happens tonight, on either side of this storm, your names stay warm. Not carved and cold — warm. Someone says them. Someone cooks like Chiyo and rates the kitchens and loses the arguments on purpose. Someone keeps the frequency alive when nobody is calling. That is the promise. I am making it for the whole town, and the town is asleep, but I am making it anyway, and the town will keep it. Towns keep promises better than people do, if you give them a wall to paint.',
    'elara Then remember us warm. That is a good commission for a lighthouse. Station — one thing more, and then I go back to my pumps. Before you, tonight, hours ago in our night — someone breathed on this channel. One breath, close, like a person who had lifted the handset and then couldn\u2019t. And then nothing, for forty-five years. Whoever heard me first was afraid. I hope your year has a word for forgiving that, because I would like to use it, if I ever get the chance to use any words at all.',
    'n Mira is writing 241 on the console margin with a grease pencil, small and steady, a number to steer by. Jun stands in the doorway with three empty bowls, not moving, because he knows a vigil when he hears one.',
    'p We\u2019ll find the word, Cordelia. Meridian Point, over and standing by.',
    'jump Act3_Harlan'
],
'Act3_Harlan': [
    { clock: '04:20' },
    { go: 'Watch Room — The Director\u2019s Watch' },
    'n At 04:20 the front buzzer goes, which is a sound no one alive has a good reason to make in the middle of a resonance storm. Jun goes down with his flashlight and comes back up with a soaking wet director and the expression of a man escorting a weather system.',
    'show character harlan normal at center with fadeIn',
    'jun Found him at the gate. Said he couldn\u2019t sleep. Said he felt the building calling him, which is either a medical event or a poetic one, and at his age I was hoping for the poetic.',
    'harlan I apologize for the hour. I came to spend the last of it here, in the watch room, where a director ought to be. And then, three kilometers down the sea road, in my kitchen, with every window shut — I heard Grandmother wake up. Forty years I have lived with that receiver in my ears, and I know her hum the way you know your own breathing. She was calling. So I came.',
    'mira Director. Before you sit down, you should know what your building is doing tonight. And then you should decide, in full possession of the facts, whether you can keep standing.',
    'n We tell him. Mira gives him the telemetry: the carrier with no input, the timestamp, the resonance match, the ghost light, the number written on her palm. I give him the channel. He stands at the Old Set with his hands clasped behind his back, the way people stand at bedsides, and he listens to Elara Vance give a pump report to a room full of windows, and he does not interrupt once.',
    'elara Meridian Point, Cordelia. I have new voices tonight. One of them stands like a man at a graveside. Station — is he someone who knew us?',
    'n Harlan unclenches his hands. He presses the transmit switch himself, gently, the way you touch something that once burned you.',
    'harlan Cordelia, this is Elias Harlan, Meridian Point. I knew of you. I have known of you every day for forty-five years. And I owe you — I owe your radio officer — a confession, and a word that was said on this channel once before, on your night, in your storm.',
    'harlan I was here. Nineteen eighty-six. I was twenty-two, the night technician, and I was the one on the working set when you called at 02:33. I heard you, Elara Vance. I heard you the first time. I lifted the handset — you will remember, one breath, close, a person who couldn\u2019t — that was me. That breath was me.',
    'harlan I was afraid. Of the storm, of the impossible, of being the young fool who claimed a dead ship had called him on a disconnected receiver. So I wrote six words small in a logbook and I told myself it was wind, and I let Taro Okita take the watch and the blame and the rest of his life carrying a failure that was mine. I built a career on those six words. I became the director of the station that failed you, and I have been standing in this watch room every day since, trying to be worthy of a second chance I did not earn.',
    'show character harlan stern at center',
    'harlan Tonight the sea repeats itself, and the building called me home, and I understand now that it did not call me to witness the end. It called me to answer. I am here. I am not putting the handset down this time. Tell me what you need from this station, Cordelia. Tell me, and I will spend whatever is left of this night spending what I owe.',
    'elara Elias Harlan, Meridian Point. Copy your confession, copy your breath, copy all of it. I have had forty-five years to be angry, and I find I used them all up somewhere around year thirty. What I need is not forgiveness. What I need is a bearing, a channel, and a station that does not put the handset down. You are late. The sea does not care. Neither do I. Welcome to the watch.',
    'n Jun has not moved from the doorway. He crosses the room slowly and stands in front of the director, and the room goes very quiet, because everyone in it knows whose name is in the logbook and who has never been told.',
    'jun My father was operator of record. Taro Okita. He carried your failure for thirty years, Director, and he never once said a hard word about this station, and my mother made storm noodles for him every night until the day he died. Did you know that? Did you ever sit at his table?',
    'harlan Every year, Jun. Every anniversary. Your mother set me a place, and I ate, and I could not tell either of you why I could not meet her eyes. I am telling you now. I am telling you in front of your colleagues, in the building where it happened, because you deserve to hear it standing up, and so do I.',
    'jun ... My mother knew. She must have. That is why the noodles were for the men in the building, not the men on the water — she fed the ones who had to live with the switch in their hands. Sit down, Director. We are not done with tonight, and you are going to need your knees.',

    { flag: { harlan_confessed: true } },
    { clock: '04:38' },
    'mira Everyone. The telemetry. I need three minutes and your attention, because the next forty minutes of this night have a shape, and the shape is a door closing.',
    'mira One: the fold — call it that, it\u2019s as good a word as any — peaks at 05:07. That\u2019s the inquiry\u2019s moment: the last instant anyone can account for the Cordelia. After 05:07 the resonance pattern decays and the channel collapses. Whatever we do, we do it inside that window.',
    'mira Two: at 05:30 the Authority\u2019s remote sequence powers the transmitter down for good. It will not matter by then. The door closes before the plug is pulled.',
    'mira Three: the channel is the Old Set, and only the Old Set. Mira\u2019s law of tonight: what crosses the fold crosses on 1420 kilohertz or it does not cross at all. Which leaves us exactly three options, and I have written them on the back of the decommission schedule, which I find symbolically satisfying.',
    'harlan Option one. We broadcast the bearing. Two-four-one, into the channel, with everything we have, and we talk the Cordelia around the Needle and into the Shiogara channel before 05:07. If the fold is strong enough — and that is a large if, built out of trust and signal and whatever it is that makes this channel hold — the past bends. They live. And everything on this shore that was built out of their dying changes shape overnight, in ways none of us can predict.',
    'mira Option two. We record. The tap I soldered is already feeding my tablet and the station\u2019s reel machine. We capture every word of tonight — Elara\u2019s voice, the pump reports, the confession, the bearing — and when the door closes at 05:07, the history stands: the Cordelia is lost, as it was lost, but no longer unheard. The first voice of the lost, on the record. A building full of ghosts, archived. I can already write the reprieve request. Heritage status. The Point becomes the Cordelia Memorial Archive, and the mandate on the wall finally means what it says.',
    'jun Option three. And I say this as the man who reads the power specifications for fun — if we dump the transmitter\u2019s full load into the mast field at the peak, we force the fold. Hold the door open past 05:07, maybe long enough to get more than a bearing through. Maybe long enough to get people through. But the feed line is already carrying more than spec. Everything above the roofline burns. The masts, the array, maybe the watch room\u2019s heart. You don\u2019t get the station back from option three.',
    'mira And there is a fourth thing nobody is saying, so I will say it. Option one only works if the channel is strong. The fold answers to the connection — to the listening. A station that answered at first contact, that learned the whole shape of the night, that earned its place on that ship\u2019s frequency — that station can push a bearing through the storm. A station that hesitated, that kept the wall up, that never quite convinced a dying ship it was real — that station shouts into thinning static, and hears itself come back alone. The telemetry is not sentimental. It is load-bearing.',
    'n The console hums. The storm leans in. On the Old Set, Elara waits with a jammed wheel and a ghost light and fourteen souls, and the door out of 1986 is closing, and every person in this room is looking at the switch under the glass lid, and the switch is waiting for me.',
    { choice: {
        Dialog: 'n The last forty minutes of the last watch. The handset is warm. Choose what the station is.',
        options: [
            { Text: '<i class="fas fa-volume-up"></i>&nbsp; Broadcast the bearing — talk the Cordelia home <span class="t-emerald">[the channel must be strong]</span>', Do: 'jump Act3_Broadcast' },
            { Text: '<i class="fas fa-save"></i>&nbsp; Record and preserve — let the lost be heard, and let the wall of names stand', Do: 'jump Act3_Record' },
            { Text: '<i class="fas fa-bolt"></i>&nbsp; Overload the array — burn the masts to hold the door open', Do: 'jump Act3_Overload' }
        ]
    } }
],

'Act3_Broadcast': [
    'p We broadcast. Everyone who can speak gets a job. Mira on the bearing and the numbers. Harlan on the channel, because he owes her his voice and she has accepted the debt. Jun on the log, writing this night down large, in handwriting that does not want to be unread. And me on the switch, with both hands, because I am the operator of record and this is the watch I drew.',
    'n The storm reaches up toward 05:07. The masts sing the chord behind my eyes. I open the channel with everything Grandmother has, and the windows of the watch room flicker in time with my voice, and far out on a water we cannot see, I hope — I believe — a building full of windows flickers back.',
    { branch: {
        all: [ ['flag', 'answered_signal'], ['stat', 'clarity', '>=', 2], ['stat', 'trust', '>=', 2] ],
        'True': 'jump Ending_HarborLight',
        'False': 'jump Ending_WeakSignal'
    } }
],

'Act3_Record': [
    'mira Reel one is rolling. Tablet is capturing. Director — if there is a record of tonight, it should have your confession on it, in your voice, with your name. For the inquiry that will reopen. For Taro Okita\u2019s son, who is standing right here.',
    'harlan Record it. All of it. My name, my six words, my forty-five years. Let the file say Elias Harlan heard the Cordelia call in 1986 and put the handset down, and in 2031 picked it up again. Let both sentences be true, in the same document, in my handwriting.',
    'n Jun puts a hand on the director\u2019s shoulder, briefly, the way you steady something that is doing the right thing. Then he goes to the corridor and stands under the painted words, NO CALL GOES UNANSWERED HERE, as if keeping them company while we find out what they cost.',
    'p Cordelia, Meridian Point. We are recording every word you say. Whatever happens to the door, your voice comes home on the reel. You will be heard, Elara Vance — in every year after this one. You have my whole station\u2019s word on it.',
    'elara Copy, Meridian Point. A lighthouse with a memory. That is a fine thing to be. Then I will talk, and you will keep it, and when the static takes me, tell them I talked like a report, with steady hands. Cordelia, transmitting for the record.',
    'jump Ending_TheLongMemorial'
],

'Act3_Overload': [
    'mira You understand what this costs. The feed line, the masts, the array. Maybe Grandmother herself. The heart of the station, traded for minutes.',
    'p I understand. And I would rather explain a burned-down building than a quiet channel. Jun — the breaker panel. Mira — the jumper. Director — you are on the mic. When the door is wide, you talk. You talk like you have forty-five years of things to say, because you do.',
    'harlan I do. God help me, I do.',
    'jun Chief — for the record, as the man who reads power specifications for fun — this is either the bravest thing this building has ever done or the last. Either way, it is the right thing. My mother would have set us all a place at the table. Breakers armed. On your word.',
    'p Cordelia, Meridian Point. We are opening the door as wide as it goes. Hold on to our voices. All of you, hold on.',
    'elara Copy, Meridian Point. The whole ship is at the speakers. The whole ship is holding on. Open the door, station. We are ready.',
    'jump Ending_Static'
],
'Ending_HarborLight': [
    { clock: '04:52' },
    { go: 'Watch Room — Bearing 241' },
    'p Cordelia, Meridian Point. This is a bearing and a truth, and you need both. Come to two-four-one. I say again: two-four-one. The light you are steering on is a memory — the old cape light, gone fifty years. It stands over the Needle shelf. It will kill you if you trust it. Two-four-one clears the Needle to starboard and puts you in the true channel. Elara — we answered. This whole station answered. Turn.',
    'elara Two-four-one. Copy. The wheel — the wheel is coming free, the sea is letting go of it. Stand by. Standing by. All hands, brace for a turn, we are steering on the lighthouse that is a room, we are steering on the voices — ',
    'n Static. The storm climbs toward 05:07 like a wave building. For one long minute there is nothing on the channel but the sound of the sea in two different years, arguing.',
    'elara We are turning! Cordelia is turning, two-four-one, the Needle is — there. There it is. Off the starboard bow, close enough to read the water breaking on it. We are past it. Station, we are past the reef, we are in open water, we can see your windows and they are flickering like the whole building is crying — ',
    { clock: '05:07' },
    'n At 05:07 the storm folds shut. I do not know how else to say it. The chord in the masts resolves into ordinary wind. The dial lights on the Old Set go out one by one, gently, the way a house turns off its windows when the family goes to bed. On the channel, the last thing we hear is not static. It is a sound like fourteen people breathing out at once, and then the sea, only the sea, in one year again.',
    'show character harlan normal at center',
    'harlan Is it — did we — ',
    'mira The carrier is gone. The structured interference is gone. My screens are reading a normal storm in a normal October, and I would very much like someone to tell me which October it is, because the corridor wall — ',
    'n She stops. We all turn. Through the watch room door, down the short corridor, the painted words have changed. Not the letters — the letters are the same, NO CALL GOES UNANSWERED HERE, in the same hand — but underneath them, in paint that looks forty years old and one day old at the same time, a second line:',
    'sys <span class="t-emerald">[ CORRIDOR WALL ]</span> MERIDIAN POINT — THE STATION THAT ANSWERED. MV CORDELIA, ALL FOURTEEN SOULS, HOME BY 06:12, 18 OCTOBER 1986.',
    'n Mira walks to it the way you walk to a tide line. She touches the paint. She stands there for a long time with her hand flat on the wall, and when she turns back her face is doing something I have never seen an engineer\u2019s face do: no calibration at all.',
    'mira My tablet. My demolition packet. It\u2019s — it\u2019s a heritage file. The Point hasn\u2019t been redundant for thirty years. The station that answered. The working relay. The decommission I wrote — I wrote a history exhibit. I have been decommissioning a museum that people visit on school trips. {{player.name}} — I don\u2019t remember writing a history exhibit. I remember writing a demolition.',
    'p You did. You wrote a demolition. In the other version of this night. Mira — you and Jun, you don\u2019t remember the other one. Only me and the director. The fold keeps its circle: whoever was inside the station, inside the storm, keeps both. Harlan was here in 1986 and tonight. I was here tonight. That\u2019s the rule. I don\u2019t make it. I just live in it.',
    'show character jun smile at center with fadeIn',
    'jun I don\u2019t know what a fold is, chief, and I don\u2019t need to. I know my father came home in 1986 — came home, kept working, got old, died in his bed with his boots by the door and my mother\u2019s hand. I remember all of it. What I also remember, as of about thirty seconds ago, is a night when he didn\u2019t, and the noodles, and the silence he carried. Both. I\u2019m holding both, and they weigh different, and the lighter one is the true one now. Thank you. Both of you. For the weight.',
    'n Harlan has not spoken. He is standing at the Old Set with his hand on the glass lid, and he is weeping the way old buildings settle — slowly, and all at once.',
    'harlan I remember putting the handset down. I remember forty-five years of putting it down. And I remember, now, picking it up. Both. Both are mine. I will carry the heavy one so the light one can stand. That is the deal, and it is the best deal I have ever made.',
    'play voice elara_farewell',
    'n And then — one last time, so faint it might be the dial cooling, might be the storm leaving a footprint — Grandmother speaks. Not a distress loop. Not a report. A woman\u2019s voice, warm with distance, the way a letter sounds when it has traveled a very long way to be ordinary:',
    'elara Meridian Point, this is Elara Vance. We are in the channel. The harbor lights are real ones. Fourteen souls, all accounted for, the cook is already complaining about the harbor kitchen. Station — thank you for the bearing. Thank you for the names. And thank you for the first thing anyone ever gave us on that frequency: an answer. Someone has to keep the last frequency warm. Now it\u2019s yours. Cordelia, over — and out.',
    'stop voice',

    { clock: '06:00' },
    { go: 'Cliff Walk — Dawn' },
    'show scene cliff_dawn with fadeIn duration 2s',
    'n At six in the morning the storm goes out to sea like a watch relieved. The dawn comes up the color of the inside of a shell, and the cape below us is just a cape: basalt, gorse, the Needle shelf showing its teeth in the calm water, and beyond it the Shiogara channel, empty and ordinary and crossed a thousand times.',
    'n Mira stands at the rail with her phone to her ear, in the particular stillness of a person waiting for a ninety-two-year-old woman to pick up a phone in a kitchen that, until 05:07, did not exist. It rings twice.',
    'mira Grandma. It\u2019s me. No — no reason. I just — I needed to hear you rate a kitchen this morning. ... Yes, I ate. Yes, at the station. Yes, the one that answered. Grandma — there\u2019s a wall here with your name on it, and a boy who makes your noodles, and I need you to know I did not close it. I couldn\u2019t. It was already a museum. ... I\u2019ll come home for the storm season. Save me a place at the table.',
    'n She hangs up. She looks at me with both histories in her eyes — hers, the true one, where the cook came home; and mine, which she has agreed to hold, because I asked, because some weights are meant to be shared with the person who owns the other half.',
    'mira You can tell me the other one. All of it. Somewhere with soup. I want to know what my grandmother cost, in the version where she cost it, so I can spend the rest of my life being worthy of the version where she didn\u2019t. That\u2019s an engineering decision. Load-bearing.',
    'n The beacon blinks its slow red against the brightening sky. Somewhere below, Jun is putting the kettle on for a breakfast that is, policy-wise, mandatory. Harlan is writing in the watch log, large letters, in a hand that does not want to be unread: 18 October 2031. Final watch. The station answered.',
    'p I took the shift nobody wanted. I turned out to be the shift the whole century was waiting for. Someone has to keep the last frequency warm — and it turns out the warmth was never in the tubes. It was in the willingness to lift the handset. It was always in the willingness.',
    'sys <span class="t-emerald t-big">[ ENDING A — HARBOR LIGHT ]</span> Fourteen souls, home by 06:12. The station that answered stays answered.',
    'sys Thank you for playing THE LAST FREQUENCY. Play again — the sea repeats itself, and other watches keep other promises.',
    'end'
],

'Ending_WeakSignal': [
    { clock: '04:52' },
    { go: 'Watch Room — Thinning Static' },
    'p Cordelia, Meridian Point — come to two-four-one! Two-four-one! The light is a lie, the Needle is ahead of you, TURN — ',
    'n I pour everything into the channel. The words leave the watch room strong. I watch them leave. And somewhere between our storm and theirs, the fold thins — the door we should have spent the whole night holding open begins to close early, and the channel turns to cotton, and then to snow.',
    'elara Station — you\u2019re breaking — Meridian Point, I can hear the shape of a number but not the number — say again — the static has you, I\u2019m losing the windows — ',
    'p TWO-FOUR-ONE! Elara, TWO — ',
    { clock: '05:07' },
    'n At 05:07 the storm folds shut, and the last thing the channel carries is not her voice but the sound of her listening — one long, patient, professional breath, the breath of a radio officer who has learned to hear the shape of things through the snow. And then the dial lights go out, gently, and the sea is in one year again, and keeps its dead.',
    'show character harlan normal at center',
    'harlan We were close. God help me, we were one honest night away from close.',
    'mira The reel kept rolling. The bearing is on the tape — two-four-one, in your voice, Director, and the ghost light, and the confession, and her breath at the end. We did not save them. But we heard them, completely, and it is recorded, and records are how the dead get a second chance at being listened to.',
    'n Mira is right. It is not nothing. In a world of forty-five-year silences, a complete record is a kind of answer — slower than the one we wanted, addressed to whoever keeps the next watch, in whatever year the sea repeats itself again. I close the channel with my own hand, and I write the night down large, so the next operator will not need courage to read it. Only eyes.',
    'p Two-four-one. For the next storm. For whoever is in this chair when the sea repeats itself. We heard you, Cordelia. The whole shape of you. And we are writing it on the wall, under the mandate, where nobody can miss it: BEARING 241. THE LIGHT IS A LIE. SHE WAS REAL.',
    'n It is not the ending I wanted. It is the ending the night could carry. We take the reel downstairs together, four people holding one tape like a stretcher, and outside the storm begins, at last, to be only weather.',
    'jump Ending_TheLongMemorial'
],

'Ending_TheLongMemorial': [
    { clock: '05:30' },
    { go: 'Watch Room — The Reel' },
    'n At 05:30 the Authority\u2019s remote sequence does what it was scheduled to do, and the Point goes dark — every rack, every screen, every modern graft on the old desk. All except the reel machine, running on Mira\u2019s battery, turning its slow circles in the emergency green light. The first voice of the lost, captured. Forty-five years of silence, on the record.',
    'n We sit in the dark and listen to the tape once, all the way through, because Mira says a recording deserves one playback with witnesses, and nobody argues with her while she is holding the soldering iron like a scepter. Elara\u2019s voice fills the watch room calm and steady, giving her ship\u2019s last hours the dignity of a report. When it ends, Jun gets up and puts the kettle on by feel, because some things are older than electricity.',
    { clock: '06:00' },
    { go: 'Cliff Walk — Dawn' },
    'show scene cliff_dawn with fadeIn duration 2s',
    'n Dawn comes gray and gentle, the storm gone south. Mira makes a call from the cliff with the wind pulling at her hair, and then a second call, and a third. By noon, before the demolition crew can even reach the cape road, the reprieve is signed: the recording of the MV Cordelia\u2019s final transmission, verified, on the record, the first voice ever recovered from the resonance storm of 1986. Meridian Point is not demolished. It is rededicated. The Cordelia Memorial Archive — the station that heard, at last, with the mandate on the wall and the bearing written underneath it and the Old Set under its glass, forever mid-listen.',
    'n The town comes up the sea road that evening, all of it, the way towns come when a wound they were born with has finally been cleaned. They bring flowers for the wall. They bring their grandmothers\u2019 stories. Jun\u2019s cousins bring his father\u2019s log handwriting, framed, and hang it in the archive next to the six words that were finally allowed to be small.',
    'show character jun smile at center with fadeIn',
    'jun They read the names at dawn, chief. All fourteen, from the wall, with the tape playing underneath, so Elara Vance heard her own crew remembered, on her own frequency, forty-five years after she asked if anyone would. My mother\u2019s name was on every pot she ever rated, and now Chiyo Sayo\u2019s is on a kitchen in the archive, rated five pots by her granddaughter. That\u2019s the whole job, in the end. Not saving. They were heard. Being heard is what the sea owes the drowned, and tonight the station collected the debt.',
    'show character mira normal at center with fadeIn',
    'mira I am keeping a copy of the reel. For storm season. Every year, when the resonance pattern starts to climb, I play it in my grandmother\u2019s kitchen — the one in the version of the night where she didn\u2019t come home, because that\u2019s the kitchen that needs it. You remember both, don\u2019t you? You and the director. The fold\u2019s circle. I can see it in you — the version where I wrote a demolition.',
    'p I remember both. You wrote a demolition, and you also stood on a roof in the rain and computed a bearing with cold hands, and you also said you would like it to be real. All of it was you.',
    'mira Then I\u2019ll be all of it. Load-bearing, the whole stack. And {{player.name}} — the archive needs a night operator. Someone to keep Grandmother warm, storm season through. The pay is terrible. The ghosts are friendly. I can\u2019t think of anyone I\u2019d rather have holding the switch.',
    'n I take the job. Of course I take the job. Some nights, in storm season, when the resonance climbs and the masts sing their chord and the Old Set\u2019s dial lights flicker on by themselves, I lift the handset and I breathe into it — one breath, close — so that wherever Elara Vance is, in whatever pocket of whatever night, she knows the frequency is warm, and the windows are lit, and the station that failed her once has spent a lifetime making it up to her name.',
    'sys <span class="t-amber t-big">[ ENDING B — THE LONG MEMORIAL ]</span> The lost stay lost, and are heard at last. No call goes unanswered here.',
    'sys Thank you for playing THE LAST FREQUENCY. Other watches keep other promises — play again.',
    'end'
],

'Ending_Static': [
    { clock: '05:01' },
    { go: 'Mast Field — Full Load' },
    'show scene rooftop with fadeIn duration 1s',
    'n Jun throws the breakers one by one, and the mast field answers one by one, and the chord behind my eyes becomes a roar. The guy wires glow faintly in the rain — actually glow, the water on them steaming, the beacons blinking so fast they become a solid red line against the storm. The watch room windows blaze like the building Elara can see, because the building Elara can see is this one, burning itself into a door.',
    'harlan Cordelia! This is Elias Harlan, full voice, the door is as wide as it will go — the bearing is two-four-one, I say again, two-four-one, the light ahead of you is a lie and the number is the truth — TURN, Elara, turn now, the reef is two minutes from your bow — ',
    'elara The wheel is free! We are turning — two-four-one — the whole ship can hear you, the whole ship is turning on your voices — the Needle is off the starboard bow, we are clearing it, we are CLEAR — ',
    'n And then the feed line lets go. Not quietly. The main mast takes it first — a white vein of lightning climbing the lattice, the array blooming into a sound like every receiver in the world finding its station at once. The channel tears. I hear it tear. Elara\u2019s voice cuts in the middle of the word home, and the masts come down in the rain like a forest, one by one, taking the roofline with them, and the watch room fills with the smell of hot metal and forty-five years of patience, spent in one night.',
    'show scene watch_room with flash',
    { clock: '05:07' },
    'n Grandmother\u2019s dial holds until 05:07 — holds past the fire, past the collapse, past every law Mira will later write into her report with shaking hands. At 05:07 the storm folds shut, and the Old Set goes dark mid-glow, and the last sound on 1420 kilohertz is Elara Vance, one final half-second, coming back through the tearing static like a hand reached out of closing water:',
    'elara — the boats are in the water, seven away from the reef, the cook is in the second boat, tell them the cook is in the second boat — the rest of us are staying with the microphone — thank you, lighthouse — ',
    'n Then the channel is only fire, and then the fire is only rain.',

    { clock: '06:00' },
    { go: 'Cliff Walk — Dawn' },
    'show scene cliff_dawn with fadeIn duration 2s',
    'n Dawn finds us on the cliff with soot in our hair and a head count in our hands. The sea, asked for an accounting, gives one: the reef took the Cordelia, but the boats — seven of them, away from the shelf in the two minutes the door was wide — make Shiogara harbor with the tide. Seven souls of fourteen. The cook is in the second boat. The cook always makes it to the second boat, because cooks are the people who make sure everyone remembers they are still alive.',
    'n Mira stands at the rail holding a manifest she is rewriting in real time, and her face is the face of a woman doing arithmetic on her own grandmother. Chiyo Sayo: lived. Eighty-nine years, a kitchen rated five pots in three countries, a granddaughter who became an engineer because of a letter. But Elara Vance: stayed. At the microphone. The radio officer goes down with the signal, because someone had to hold the channel while the boats got clear, and she was the only one who could talk without shouting.',
    'mira Seven. It\u2019s seven. My grandmother came home in this version and I remember her coming home — I remember her kitchen, {{player.name}}, I have a scar from her stove and I did not have it yesterday, and I also remember not having it, and I am going to sit down now.',
    'show character harlan normal at center with fadeIn',
    'harlan The inquiry reopens this week. It will have my confession in it, in my voice, on the reel that survived the fire because Mira carried it like a child. Taro Okita\u2019s name comes off the failure. Mine goes on the record, both sentences, the putting down and the picking up. I will stand for it. I have had forty-five years of practice at standing for things I should have done sooner.',
    'show character jun smile at center with fadeIn',
    'jun Chief. Don\u2019t you dare stand there doing the math that says seven is less than fourteen. Seven is fourteen minus a miracle we bought with a roof. Seven is my father\u2019s handwriting on a log that now says he brought them through. Seven is a kitchen in this town where the noodles come from the recipe itself and not from a nephew doing his best. It\u2019s more than none. Do not ever call it less than everything.',
    'n He is right. I stop doing the math. Behind us the Point smokes gently in the morning light — the masts gone, the roofline gone, the watch room open to the sky like a lantern with its top off. Grandmother sits in the middle of it, under her cracked glass lid, dark and warm, having spent herself to hold a door. They will build the archive around her. Some things deserve to be the center.',

    'n <span class="t-violet">One year later.</span> Storm season. I sit on the cliff with a field receiver and a thermos and the particular patience of a person keeping an appointment with the impossible. The resonance pattern climbs. The masts of the new station blink behind me. I tune to 1420 kilohertz, because some frequencies are load-bearing, and I listen.',
    'n At 02:33, out of the static, warm with a distance no instrument can measure — a voice. Not a distress loop. Not a report. A woman\u2019s voice, wry, unhurried, the way a letter sounds when it has traveled forty-five years to say the ordinary thing:',
    'show image elara_hope at center with fadeIn duration 3s',
    'elara Meridian Point, this is Elara Vance. I don\u2019t know which of your years this reaches. I only know the frequency stayed warm, and a warm frequency means a listener, and a listener means I can say it: I heard you too. In the fire, in the tearing, at the end of the word home — I heard you holding the door. The cook rates your kitchen five pots, wherever she ended up. And the rest of us — we are the light you steer by now, the good kind, the true one. Keep the frequency warm, station. Cordelia, over — and out.',
    'n I log it. Large letters. A hand that does not want to be unread. Then I pour the thermos into the sea, which is tradition, and I go back down to the station that answered, where the kettle is on, and the wall is painted, and someone has to keep the last frequency warm — and tonight, as every night worth anything, that someone is me.',
    'sys <span class="t-violet t-big">[ ENDING C — STATIC ]</span> The door was bought with fire. Seven came home. The frequency stays warm.',
    'sys Thank you for playing THE LAST FREQUENCY. The sea repeats itself — play again, and choose another watch.',
    'end'
]

    }; /* end labels */

    return {
        title: 'The Last Frequency',
        version: '0.1.0-draft',
        labels: labels
    };
}));
