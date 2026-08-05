# Прокрастинация — CG (руты и концовки)

Все CG — от первого лица (камера = глаза персонажа), тело видно в тёмно-серой
майке и тёмных спортивных штанах. Лицо никогда не видно. Стиль: аниме/VN,
кинематографичный ночной свет, палитра «тёмно-синяя ночь + фиолетовая дымка
Решётки», без текста/логотипов/UI/водяных знаков.

Прогон: 10 изображений (лимит сессии). Исходники PNG — в `cg/`,
рантайм-версии WebP (1600×900) — в `game/assets/images/`.

## Руты

### cg_pc — компьютер / ютуб
Wide 16:9 anime visual novel CG, first-person POV. The view looks down over the
character's own body: arms in a dark grey t-shirt sleeve, hands on a desktop
keyboard, lap with dark track pants. Desk: disassembled mecha power accumulator,
screwdriver, cold tea, smartphone. Monitor glows pale blue-white with abstract
blurred video thumbnails. Night room, faint purple haze at the window blinds.
No face, no readable text, no logos, no UI, no watermark.

### cg_phone — телефон / лента
First-person POV lying on a couch, looking up: own arms in t-shirt sleeves hold
a smartphone above the face, screen with abstract blurred vertical feed. Chest in
t-shirt, legs in track pants along the couch. Coffee table with cold cup and rice
ball. Dark living room, purple haze at window.

### cg_radio — радиоприёмник
First-person POV down at a low table: own hands in t-shirt sleeves tune an old
portable analog radio, dial glowing warm amber, red indicator lamp. Beside it: a
screwdriver, disassembled mecha accumulator, notebook, cold tea. Lap in track
pants at bottom edge. Deep blue night, purple haze.

### cg_balcony — балкон
First-person POV from the balcony at night: own hands in t-shirt sleeves grip the
railing at the bottom, arms from shoulders, hint of track pants. Ahead: night
coastal city — port lights, tower with violet haze, drones with red lights.
Deep blue palette, moonlit clouds.

### cg_kitchen — кухня / онигири
First-person POV down over own body: hands in t-shirt sleeves shaping a rice ball
(onigiri) on a wooden board, kettle steaming, cup of green tea. Chest in t-shirt,
counter edge, track pants. Small cozy night kitchen, warm light, dark window.

## Точка на стене (рут → концовка)

### cg_stare — точка на стене
First-person POV sitting on the floor: straight ahead a bare wall with a single
small dark dot at eye level, dim warm lamp light. Own knees in track pants fill
the lower frame, hands on knees, t-shirt sleeves. Corner of workbench with
accumulator and screwdriver, window with purple haze. Deep quiet night.

### cg_dawn_stare — точка до рассвета (концовка)
Same scene at dawn: the same wall and dot lit by soft pink-gold light through the
window. Knees and hands in the lower frame, tired stillness, dust in the light,
blue walls turning warm.

## Концовки

### cg_fantasy — фантазии
First-person POV dreamlike: own hands in t-shirt sleeves loosely clasped, lap in
track pants. Translucent dream visions float around: assembled mecha in a bright
hangar, peaceful waterfront at sunset, boy on a station bench. Soft bokeh, cyan
and warm amber mixing, blurred daydream edges.

### cg_hospital — больница (аптечка)
First-person POV lying in a hospital bed looking up at a white ceiling with a
cold fluorescent panel; own forearm in a pale gown sleeve with an IV cannula,
drip line to a saline bag. Early morning daylight at a side window. Muted
clinical palette, tired atmosphere.

### cg_window — прыжок из окна
First-person POV leaning out of an open ninth-floor window looking straight down
at the street far below — tiny cars, bus stop, truck, sidewalk, dizzying drop.
Own hands in t-shirt sleeves grip the window frame at the bottom corners, wind
moving the sleeve. Night city: port lights, tower with violet haze, drones.
Vertigo composition, deep blue.

## Последовательность падения (прыжок из окна) — 4 кадра-цепочка

Каждый следующий кадр — редактирование предыдущего (передаётся генератору),
чтобы фон и персонаж совпадали. Место действия — ЯПОНИЯ, ночной портовый
район: портальные краны, контейнеры, огни порта, столбы с проводами.

### cg_fall1 — комната у открытого окна (оригинальный фон)
First-person POV standing at a wide-open ninth-floor apartment window at night.
Only the forearms and hands are visible at the bottom corners, gripping the
window frame, dark-grey t-shirt sleeves — NO pants, no lower body. Room at the
edges: workbench with disassembled mecha accumulator, screws, screwdriver, cold
green tea, glowing smartphone, warm desk lamp. Beyond the window: Japanese port
district at night — gantry cranes, container stacks, port lights, tower with
violet haze, drones. Deep blue palette.

### cg_fall2 — сразу после прыжка
Edit of cg_fall1: just jumped, falling past the building facade. First-person
POV down along own body — arms in the same t-shirt sleeves spread wide, legs in
dark track pants kicking — open window and warm room receding above, facades and
balconies rushing past, the Japanese port district below. Same palette.

### cg_fall3 — ближе к земле
Edit of cg_fall2: much closer to the ground, wind-blown sleeves, facade filling
one side, street with a parked truck and sidewalk rushing up, the open window
tiny and high above with its warm lamp glow. Same palette. (Kept as-is.)

### cg_fall4 — после приземления, ОТ ТРЕТЬЕГО ЛИЦА
Wide elevated shot from across the street (the close-up injury versions
are refused by the generator's safety filter): a small human figure lies
on its back on the wet asphalt beside a parked delivery truck at the
base of a tall dark apartment building with a single tiny open window
glowing warmly high up near the ninth floor. Seen from a distance, limbs
at unnatural angles — the pose and scale make the tragedy readable
without close-up detail. Japanese night port district: street lamps,
utility poles, distant gantry cranes and container stacks, drones,
wet asphalt reflecting lights. Quiet, somber, final. Deep blue palette.

