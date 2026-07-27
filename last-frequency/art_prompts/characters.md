# Character sprite prompts — The Last Frequency

Every prompt sent to the image generator is recorded here (project workflow:
"save every prompt you send"). All sprites are generated on flat chroma green
`#00B140` (never in any character's palette) and matted to alpha by
`tools/mat_chroma.py` (dev-only, Pillow, never shipped).

Cast: 100% adult (youngest 26), all-ages, original designs. Seven-section
grammar (FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE)
borrowed from the repo's character-art skill as *workflow*; designs are new.

Common suffix for every sprite:
```
STAGING: full body standing pose, three-quarter view facing viewer, feet near
bottom edge, top of head near top edge, vertical 3:4 portrait composition,
centered, soft even studio lighting, flat solid chroma green background exact
hex #00B140, zero shadow on background, zero background detail.
EXCLUDE: cropped body, floating, ground shadow, background scenery, gradient
background, watermark, text, extra fingers, deformed hands.
```

## Mira Sayo (27) — decommissioning engineer

- **mira_normal** (text-to-image):
```
FORMAT: anime visual novel character sprite, clean lineart, commercial mobile-game quality.
STYLE: modern realistic anime, muted cinematic palette, crisp shading.
IDENTITY: East Asian woman, age 27, sharp warm dark-brown eyes, straight chin-length black bob with two copper-orange inner-color streaks at the left temple (signature detail), light tan skin, confident tired expression, small scar on right thumb.
WARDROBE: dark slate-blue zip-up maritime authority hoodie with tiny anchor crest on chest over grey work t-shirt, black cargo trousers, scuffed brown work boots, reflective safety wristband, tablet tucked under left arm.
COLOR: slate blue #3b5169, copper #b87333, warm grey #8a8178, black.
+ common suffix.
```
- **mira_smile** / **mira_worried** (image-edit of mira_normal, prompt = same
  IDENTITY/WARDROBE + "identical character, identical outfit, identical pose;
  ONLY change: facial expression — relaxed genuine half-smile, eyes softened"
  / "brows drawn together, lips pressed, worried, tense").

## Elara Vance (32) — radio officer, MV Cordelia, 1986

- **elara_normal**:
```
FORMAT: anime visual novel character sprite, clean lineart, commercial quality.
STYLE: modern anime with a subtle 1980s film-grain mood, soft glow around her as if lit by a radio dial.
IDENTITY: European woman, age 32, wavy auburn hair tied back with a navy headscarf, steel-grey eyes, calm professional composure, faint freckles, no makeup, composed under pressure.
WARDROBE: 1980s maritime radio officer — deep navy double-breasted watch coat with brass anchor buttons, cream turtleneck underneath, vintage bakelite radio headset hanging around her neck (signature detail), dark trousers, sturdy boots.
COLOR: deep navy #1c2a3a, brass #b08d57, ivory #f2ece0, auburn #8c4a2f.
+ common suffix.
```
- **elara_sad** / **elara_hopeful**: same character/outfit/pose, only
  expression — "quiet grief held with dignity, eyes glistening but steady" /
  "dawn-light hope, eyes bright, the first real smile, looking slightly up".

## Elias Harlan (61) — station director

- **harlan_normal**:
```
FORMAT: anime visual novel character sprite, clean lineart, commercial quality.
STYLE: mature realistic anime, weathered gentle rendering.
IDENTITY: European man, age 61, salt-and-pepper combed hair, round thin brass-rimmed glasses (signature detail), kind tired grey eyes, neatly trimmed grey stubble, posture carrying long guilt.
WARDROBE: charcoal lambswool cardigan over white collared shirt, station-master brass key chain at belt (signature), dark trousers, worn leather shoes.
COLOR: charcoal #33363b, ivory #f2ece0, brass #b08d57.
+ common suffix.
```
- **harlan_stern**: same, only expression — "jaw set, steady resolute gaze,
  grief converted into decision".

## Jun Okita (34) — night security guard

- **jun_smile**:
```
FORMAT: anime visual novel character sprite, clean lineart, commercial quality.
STYLE: warm approachable anime, friendly lighting.
IDENTITY: Japanese man, age 34, short black hair, broad easy smile, sun-weathered tan skin, strong fisherman's build, crinkled kind eyes.
WARDROBE: chunky navy fisherman's cable-knit sweater under an unzipped hi-vis yellow reflective vest (signature), work trousers, boots, heavy flashlight clipped to belt, paper bag of barley tea in one hand.
COLOR: navy #22304a, hi-vis yellow #e8c832, warm skin.
+ common suffix.
```
- **jun_alert**: same, only expression — "smile gone, wide-eyed alarm, one
  hand raised, body tensed".

## Generation order (per skill workflow)

Base (text-to-image) → expressions (image-edit of the approved base).
Never chain expressions from expressions. Record result notes below.

### Result notes
- (filled as generations complete)
