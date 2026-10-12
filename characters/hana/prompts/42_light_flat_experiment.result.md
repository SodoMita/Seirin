# 42 — light outfit, flat-colour experiment (no gradients) → vtrace SVG under 5 KB

Model: generate_image, identity image plates/hana_light_white.webp (pose and framing kept).
Verdict: KEEP as experiment input. Not a shipped sprite.
Flat result: clean fills, no gradients. The white dress is nearly the same colour as the
background (#F3F4F6 vs #FFFFFF), so the trace step darkens the background to black and drops it.

Trace pipeline (tools/vtrace/):
1. trace_flat.py: scale 0.4 (768x1376 → 307x550), k-means to 5 colours on figure pixels only,
   background painted black, vtracer (stacked, spline, filter_speckle 4, corner 80, length 6),
   black background layer removed.
2. simplify_svg.py: each path → polygon (curves sampled), closed loops split at the farthest
   point, Douglas-Peucker tolerance 1.5 px, integer relative coordinates, areas under 8 px² dropped.
3. render_poly.py: Pillow redraw for review.

Candidates (bytes): A k5 s0.4 tol1.5 = 3092 (KEEP, chosen); B k5 s0.35 tol1.5 = 2991 (eyes lost);
C k4 s0.3 tol1.0 = 2504 (hair colour and face lost).
Deliverable: experiments/hana_flat_vtrace.svg (3092 bytes, valid XML, 13 flat fills).
Known weaknesses: eyes are grey blobs; the nose and mouth are gone; the hair is two-tone grey; the
trim outline on the dress is rough. Fine for a silhouette/icon study, not for a game sprite.
