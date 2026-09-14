# UI trash sheet — generation prompts (session 13)

Scavenger-repair overlays for the "full trash" art direction. All three sheets are
generated as opaque PNG/JPG (the image model has no alpha channel), so each is
authored on a keyed background and composited with `mix-blend-mode` /
`background-blend-mode` instead of transparency:

- rust sheet → painted on **white** → composited with `multiply` (white = no-op);
- tape/scrap sheet and stencil decals → painted on **black** → composited with
  `screen` (black = no-op).

Outputs (converted to webp q90, kept in `assets/ui/`, working PNGs in `_wip/`,
not committed):

| file | key | blend | use |
| --- | --- | --- | --- |
| `ui_trash_rust.webp` | white | multiply | `.panel` background layer, `.stage::after` grime veil |
| `ui_trash_tape.webp` | black | screen | `.tape` scrap clusters (hud / console / sys-card) |
| `ui_trash_decals.webp` | black | screen | `.console::after`, `.hud-strip::before` stencil marks |

## 01 — rust and corrosion sheet (`ui_trash_rust`)

> Seamless-ish texture sheet of rust and corrosion on a pure white background:
> orange-brown iron oxide blooms, dark rust drip streaks running downward,
> pitted speckle clusters and oxidized ring stains, scattered with generous
> white empty space between them so the sheet can be multiply-blended over dark
> UI panels. Flat frontal scan, no objects, no text, no borders, even lighting,
> white background stays pure white.

## 02 — tape and welded scrap cluster (`ui_trash_tape`)

> Scavenger repair kit on a pure black background: strips of worn grey duct
> tape at slight angles, a welded steel patch plate with rough bead seams, a
> piece of wire mesh held by tape, a nylon strap with a buckle, torn paper
> label remnants — arranged as one loose cluster in the centre with pure black
> empty space around it. Flat frontal scan, desaturated cold tones with a few
> warm rust accents, no text, no borders, black background stays pure black so
> the cluster can be screen-blended onto dark surfaces.

## 03 — stencil decals (`ui_trash_decals`)

> Faded industrial stencil marks on a pure black background: pale cyan and
> amber hazard chevrons, a stencilled radiation-like trefoil fragment, cargo
> arrows, hand-painted stripe remnants and half-erased numbering stencils,
> cracked and weathered paint, scattered loosely with pure black space between
> marks. Flat frontal scan, no photorealistic objects, no readable words, black
> background stays pure black so the marks can be screen-blended onto panels.

## Cut note — nine-patch key surface

`k_tl/k_tr/k_bl/k_br/k_t/k_b/k_l/k_r/k_face.webp` are NOT generated: they are an
ImageMagick cut of `ui_button_plate.webp` downscaled to 25% (158×162), sliced
into corners 20×16, edges 118×16 / 20×130 and face 118×130, so the CSS can
compose the plate at native scale (see `--nine` in `three-ui.css`).
