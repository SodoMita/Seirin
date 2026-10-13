# Hana flat experiment: shared-boundary trace (flat source)

- File: `hana_flat_shared.svg` (83 KB, valid XML, 15 flat fills, no gradients, 15 paths).
- Source: a flat, gradient-free render of the light Hana, generated from `characters/hana/hana_light_normal.webp` with the flat prompt (`prompts/42_light_flat_experiment.txt`). The trace reads the render, not the gradient sprite.
- Tool: `tools/vtrace/trace_shared.py`, run as `trace_shared.py flat_src.png OUT 16 1.0 3 25 1 1.5`.
- Method: k-means colours, 3x3 majority smoothing, merge of regions under 25 px, figure mask smoothed (sigma 1.5 px). Every boundary between two regions is traced once, smoothed, and fitted once with cubic Beziers (1.0 px). Both regions reference the same control points. Coordinates use 1 decimal and relative `c` commands.
- Check: 725 interior boundaries, 0 failures (each used by exactly two paths with identical points).
- Fit vs the flat source: silhouette IoU 0.992; colour RMSE 7.3.
- Known limits: the right eye and the ribbon lose detail; the lower skirt is one blue block.
- Earlier versions traced the gradient sprite directly (RMSE 26–29) and are superseded.
