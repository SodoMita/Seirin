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
