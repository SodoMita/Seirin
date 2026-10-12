# Experiment — flat, gradient-free Hana traced to a < 5 KB SVG

Owner request: generate Hana without gradients, trace into shapes with heavy rounding and
simplifying, keep the result under 5 KB.

## Result
- `hana_flat_shapes_4933b.svg` — 4,933 bytes (budget 5,120). 8 flat colours, one path per
  colour, fill-rule evenodd, integer coordinates, no gradients, no strokes, no <image>.
- Source: `_wip/flat_light_try1.png`, a flat redraw of the light look (generator output,
  not the approved sprite). Pose and framing close; palette and outlines differ.

## What survived and what did not
- Survived: the peach and blue panels, the blue ribbon, the white dress shapes, the boots,
  the silhouette and the hair mass.
- Lost: the heterochromia. The blue and amber eyes merge into grey. Thin dark outlines are
  absorbed into the mid-greys. Pale white areas are close to the white background, so they
  read faintly on white (on the game's dark UI they would read better; not yet tested).

## Tool notes (what did not work, so no one repeats it)
- vtracer (PyPI, `vtracer` 0.6): output stayed under 5 KB only when colours collapsed to
  greys. At `layer_difference` 8–48 the colours came back, but the file was 13–18 KB.
- PyPI `vtrace` is a traceroute visualiser, not an image tracer. Not used.
- Pillow median-cut quantisation over the whole image (including the key colour) merged the
  pastel palette. k-means on subject pixels only fixed it.
- The shape tracer (OpenCV contours, Gaussian 1.0–1.5 px, Douglas-Peucker 1.0–2.0 px) is the
  one that fits. Scripts: `_wip/shape_trace.py` (depends on `_wip/trace_flat.py` for the
  palette), `_wip/render_svg.py` (review renderer).

## To get eyes back under budget
- More colours for the eye and line regions only (a second, small pass on the face box),
  or a hand-picked palette with blue, amber and a dark line colour. Estimated size grows
  by roughly 1 KB per extra colour. Not done here.
