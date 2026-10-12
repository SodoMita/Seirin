# 43 — flat-colour Hana, curve trace under 5 KB (v2 after feedback)

Feedback on v1 (polygons): straight lines fit badly, too few colours, transparent holes where the
original is opaque. v2 keeps real curves and fixes each point.

Pipeline (tools/vtrace/trace_curves.py):
1. k-means colours on figure pixels only, background black.
2. vtracer in CUTOUT mode (no stacking, so no holes from removing a background layer).
3. Background shape dropped. Per-path translate() transforms applied.
4. Curve refit: each closed outline re-fitted with the fewest cubic Béziers within a pixel error
   (Schneider-style least squares with Newton reparameterisation). This is what makes it compact.
5. Compact relative integer encoding.
6. Coverage check: rendered silhouette vs original silhouette (IoU).

Chosen setting: scale 0.38, k=10, speckle 10, corner 70, layer_diff 20, refit error 3.0 px.
Result: experiments/hana_flat_curves.svg, 4704 bytes (under 5120), 14 distinct fills, 18 paths,
IoU 0.955 vs the original silhouette.

Rejected candidate: scale 0.40, k=10, speckle 12, refit 3.5 px → 4455 bytes, 11 colours. Eyes lost.
Earlier v1 polygon SVG (experiments/hana_flat_vtrace.svg): superseded.

Known limits: eyes are small dark blobs; the top of the face has a light patch where the fringe
meets the forehead; the dress is near-white on white, so it reads by its trim and shadows only.
